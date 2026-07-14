/**
 * Redis 兼容层（CloudBase PostgreSQL 实现）
 *
 * 用两张 PG 表 + 两个 PL/pgSQL 函数替代原 Upstash Redis：
 * - tennis_sessions(token, user_id, expires_at)：token → user_id 会话存储（替代 redis.setex/get）
 * - tennis_locks(key, owner, expires_at) + acquire_lock / release_lock 函数：分布式锁（替代 redis.set px nx / del）
 *
 * 对外暴露与原 Upstash Redis 完全相同的接口（get / setex / set / del），
 * 业务代码（login、users、match 锁、assessment）无需任何改动即可继续工作。
 */
import { db } from './database';

export interface RedisShim {
  get<T = string>(key: string): Promise<T | null>;
  setex(key: string, ttlSeconds: number, value: string): Promise<void>;
  set(
    key: string,
    value: string,
    opts?: { px?: number; nx?: boolean }
  ): Promise<'OK' | null>;
  del(key: string): Promise<void>;
}

class PgRedisShim implements RedisShim {
  /** 读取会话 user_id，过期自动失效 */
  async get<T = string>(key: string): Promise<T | null> {
    const { data, error } = await db
      .from('tennis_sessions')
      .select('user_id')
      .eq('token', key)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) return null;
    return (data.user_id as unknown as T) ?? null;
  }

  /** 写入/刷新会话，7 天有效期由调用方传入 ttl */
  async setex(key: string, ttlSeconds: number, value: string): Promise<void> {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    const { error } = await db
      .from('tennis_sessions')
      .upsert({ token: key, user_id: value, expires_at: expiresAt }, { onConflict: 'token' });
    if (error) throw new Error(`session setex failed: ${error.message}`);
  }

  /**
   * 分布式锁：nx 模式下用 tennis_locks 表 + ON CONFLICT DO NOTHING 实现原子抢占。
   *
   * 注意：CloudBase 的 app.rdb() postgREST 客户端没有 .rpc() 方法，
   * 因此原 acquire_lock / release_lock PL/pgSQL 函数不可用，改为纯表操作：
   *   1) 先惰性清理本 key 的过期锁（expires_at 已过）
   *   2) INSERT ... ON CONFLICT (key) DO NOTHING
   *      - 插入成功（data 有行）→ 抢占成功，返回 'OK'
   *      - 冲突（被占用，data 为空数组）→ 返回 null
   * 云函数网关角色 bypass RLS，故对 tennis_locks 的读写不受 RLS 策略限制。
   *
   * 成功返回 'OK'，被占用返回 null，与原 Upstash 行为一致。
   */
  async set(
    key: string,
    value: string,
    opts?: { px?: number; nx?: boolean }
  ): Promise<'OK' | null> {
    if (opts?.nx) {
      const ttl = opts.px ? Math.floor(opts.px / 1000) : 30;
      const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
      const nowIso = new Date().toISOString();

      // 1) 惰性清理本 key 的过期锁（不影响仍生效的锁）
      await db
        .from('tennis_locks')
        .delete()
        .eq('key', key)
        .lt('expires_at', nowIso);

      // 2) 原子抢占：直接 INSERT，靠 key 主键唯一约束保证只有一个赢家。
      //    成功（无 error）→ 抢占成功返回 'OK'
      //    唯一冲突（Postgres 23505，锁已被占用）→ 返回 null
      //    不依赖 data 判定，避免 ignoreDuplicates 下成功/冲突都返回空数组的歧义。
      const { error } = await db
        .from('tennis_locks')
        .insert({ key, owner: value, expires_at: expiresAt });

      if (error) return null;
      return 'OK';
    }
    // 非 nx 场景在代码中未使用，兜底视为成功
    return 'OK';
  }

  /** 删除会话或释放锁（按 key 同时清理两张表，无匹配则 no-op） */
  async del(key: string): Promise<void> {
    await db.from('tennis_locks').delete().eq('key', key);
    await db.from('tennis_sessions').delete().eq('token', key);
  }
}

export const redis: RedisShim = new PgRedisShim();
