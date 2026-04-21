-- 用户表
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wx_openid VARCHAR(100) UNIQUE NOT NULL,
    nickname VARCHAR(50),
    avatar_url TEXT,
    gender SMALLINT,
    current_score NUMERIC(5, 2) DEFAULT 0, -- 允许保留两位小数的 Elo 分数
    radar_data JSONB, -- 存底线、发球等雷达图数据
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 比赛房间表
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID REFERENCES users(id),
    match_type SMALLINT CHECK (match_type IN (1, 2)), -- 1: 单打, 2: 双打
    status SMALLINT DEFAULT 0, -- 0等候, 1进行中, 2待确认, 3已生效, 4争议废弃
    score_a SMALLINT,
    score_b SMALLINT,
    submitter_id UUID REFERENCES users(id),
    timeout_at TIMESTAMP WITH TIME ZONE, -- 12小时后的自动结算时间
    reject_count SMALLINT DEFAULT 0, -- 累计驳回次数
    last_reject_reason TEXT, -- 最后驳回原因
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 比赛参与明细与快照表
CREATE TABLE match_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID REFERENCES matches(id),
    user_id UUID REFERENCES users(id),
    team VARCHAR(10), -- 'A' 或 'B'
    snapshot_score NUMERIC(5, 2), -- 极其重要：开赛落座瞬间的积分快照，用于 Elo 计算基数
    confirm_status SMALLINT DEFAULT 0 -- 0未操作, 1确认, 2驳回
);

-- 积分变动流水表
CREATE TABLE score_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    match_id UUID REFERENCES matches(id), -- 关联导致变动的赛事
    change_amount NUMERIC(5, 2), -- 变动值 (如 +2.5 或 -1.8)
    after_score NUMERIC(5, 2), -- 变更后的总分
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
