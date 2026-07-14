/**
 * CloudBase PostgreSQL 数据库客户端（postgREST 风格，API 与 Supabase JS 完全一致）
 *
 * 原 Supabase 客户端：supabase = createClient(url, serviceRoleKey)
 * 现 CloudBase 客户端：db = app.rdb()
 *
 * 两者方法签名一致（.from().select().eq().single() / .insert() / .update().eq() / .delete() / .rpc()），
 * 因此业务代码只需把 `supabase` 换成 `db`，无需改动查询逻辑。
 */
import * as tcb from '@cloudbase/node-sdk';
import { config } from './config';

const app = tcb.init({ env: config.cloudbase.envId });

/**
 * postgREST 链式客户端，等价于原 supabase。
 * 注意：CloudBase node-sdk 的 rdb() 会把 options.database 当作 postgREST 的
 * schema（通过 Accept-Profile / Content-Profile 头下发）。默认值是 envId，
 * 而我们的表建在 public schema，因此必须显式传 database: 'public'，否则会报
 * "Invalid schema: <envId>"。
 */
export const db = app.rdb({ database: process.env.DB_SCHEMA || 'public' });
