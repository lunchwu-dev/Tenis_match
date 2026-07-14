-- ============================================================
-- 网球名片小程序 - 数据库 Schema（腾讯云 CloudBase PostgreSQL）
-- 含表结构、约束、索引、级联规则
-- ============================================================

-- 启用 UUID 生成扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 0. 会话与分布式锁表（替代原 Upstash Redis）
--    由 api/shared/redis.ts 的 PG 兼容层使用：
--    - tennis_sessions：登录态 token -> user_id 存储（替代 redis.setex/get）
--    - tennis_locks：分布式锁（替代 redis.set px nx / del）
--    云函数网关角色 bypass RLS，读写不受 RLS 策略限制。
-- ============================================================
CREATE TABLE IF NOT EXISTS tennis_sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE IF NOT EXISTS tennis_locks (
    key TEXT PRIMARY KEY,
    owner TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tennis_sessions_expires
    ON tennis_sessions (expires_at);
CREATE INDEX IF NOT EXISTS idx_tennis_locks_expires
    ON tennis_locks (expires_at);

-- ============================================================
-- 1. 用户表
-- ============================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wx_openid VARCHAR(100) UNIQUE NOT NULL,
    nickname VARCHAR(50),
    avatar_url TEXT,
    gender SMALLINT CHECK (gender IN (0, 1, 2)), -- 0未知, 1男, 2女
    current_score NUMERIC(5, 2) DEFAULT 0 CHECK (current_score >= 0 AND current_score <= 100),
    radar_data JSONB, -- {baseline, serve, netplay, tactics, receive} 均为 0-1 范围
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 2. 比赛房间表
-- ============================================================
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID REFERENCES users(id) ON DELETE SET NULL,
    match_type SMALLINT CHECK (match_type IN (1, 2)), -- 1: 单打, 2: 双打
    status SMALLINT DEFAULT 0 CHECK (status IN (0, 1, 2, 3, 4)), -- 0等候, 1进行中, 2待确认, 3已生效, 4争议废弃
    score_a SMALLINT CHECK (score_a IS NULL OR (score_a >= 0 AND score_a <= 99)),
    score_b SMALLINT CHECK (score_b IS NULL OR (score_b >= 0 AND score_b <= 99)),
    submitter_id UUID REFERENCES users(id) ON DELETE SET NULL,
    timeout_at TIMESTAMP WITH TIME ZONE, -- 12小时后的自动结算时间
    reject_count SMALLINT DEFAULT 0 CHECK (reject_count >= 0 AND reject_count <= 3), -- 累计驳回次数，3次后废弃
    last_reject_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 3. 比赛参与明细与快照表
-- ============================================================
CREATE TABLE match_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    team VARCHAR(10) CHECK (team IN ('A', 'B')),
    snapshot_score NUMERIC(5, 2), -- 开赛落座瞬间的积分快照，用于 Elo 计算基数
    confirm_status SMALLINT DEFAULT 0 CHECK (confirm_status IN (0, 1, 2)), -- 0未操作, 1确认, 2驳回
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- 加入时间，用于战绩按时间排序
    -- 同一比赛中同一用户不可重复参与
    UNIQUE (match_id, user_id)
);

-- ============================================================
-- 4. 积分变动流水表
-- ============================================================
CREATE TABLE score_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
    change_amount NUMERIC(5, 2), -- 变动值 (如 +2.5 或 -1.8)
    after_score NUMERIC(5, 2), -- 变更后的总分
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 索引
-- ============================================================

-- matches: 按创建者查（我的比赛）、按状态查（等候中/待确认）、按超时查（Cron结算）
CREATE INDEX idx_matches_creator_id ON matches(creator_id);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_timeout_at ON matches(timeout_at) WHERE timeout_at IS NOT NULL;
CREATE INDEX idx_matches_created_at ON matches(created_at DESC);

-- match_participants: 按比赛查（对阵信息）、按用户查（战绩统计）
CREATE INDEX idx_match_participants_match_id ON match_participants(match_id);
CREATE INDEX idx_match_participants_user_id ON match_participants(user_id);
-- (match_id, user_id) 的唯一约束已自动创建索引

-- score_logs: 按用户查（积分历史）、按比赛查（比赛流水）
CREATE INDEX idx_score_logs_user_id ON score_logs(user_id);
CREATE INDEX idx_score_logs_match_id ON score_logs(match_id);
CREATE INDEX idx_score_logs_created_at ON score_logs(created_at DESC);

-- ============================================================
-- 说明
-- ============================================================
-- 1. ON DELETE CASCADE: 删除比赛时自动清理参与者和积分流水；删除用户时自动清理其参赛记录和流水
-- 2. ON DELETE SET NULL: 删除用户时，其创建的比赛和提交的比分记录的 creator_id/submitter_id 置空（保留历史）
-- 3. UNIQUE(match_id, user_id): 防止同一用户重复加入同一比赛
-- 4. CHECK 约束覆盖所有枚举字段，防止非法状态值
-- 5. 部分索引 idx_matches_timeout_at: 仅索引非空 timeout_at，提高 Cron 结算查询效率
