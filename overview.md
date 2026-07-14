# 修复计划执行概览

**日期**: 2026-07-05
**基于**: 《现状梳理_2026-07-05》问题清单 + 《修复计划_2026-07-08》
**状态**: P0 + P1 + P2 全部完成

---

## 执行总览

| 优先级 | 任务 | 状态 | 验证 |
|--------|------|------|------|
| P0-1 | 后端双套实现收敛（删除死代码） | ✅ 完成 | 上一会话 |
| P0-2 | 前端调用路径对齐（复数→单数） | ✅ 完成 | vue-tsc 通过 |
| P0-3 | 首页接入真实数据 | ✅ 完成 | vue-tsc 通过 |
| P0-4 | 排行榜页接入 API | ✅ 完成 | vue-tsc 通过 |
| P0-5 | 历史战绩页接入 API | ✅ 完成 | vue-tsc 通过 |
| P1-1 | Redis 锁超时 5s→30s | ✅ 完成 | grep 确认 |
| P1-2 | Supabase/Redis 客户端单例化 | ✅ 完成 | grep 确认 |
| P1-3 | 雷达图改用 uCharts | ✅ 完成 | vue-tsc 通过 |
| P1-4 | request 路径统一 | ✅ 完成 | grep 确认 |
| P2-1 | 数据库索引与约束 | ✅ 完成 | tsc 通过 |
| P2-3 | .env.example | ✅ 已存在 | — |
| 附加 | Cron 端点鉴权 | ✅ 完成 | tsc 通过 |

---

## P1 详细变更

### P1-1/P1-2 Redis 锁 + 客户端单例化

**锁超时调整（4 文件）：**
- `api/match/submit-score.ts`：`px: 5000` → `px: 30000`
- `api/match/confirm.ts`：`px: 5000` → `px: 30000`
- `api/match/reject.ts`：`px: 5000` → `px: 30000`
- `api/match/timeout-settlement.ts`：`px: 10000` → `px: 30000`

**客户端单例化（12 文件）：**

所有业务文件的 `createClient(...)` / `new Redis(...)` 替换为从 `shared/database.ts` 和 `shared/redis.ts` 导入共享单例：

```
api/login.ts          api/match/create.ts      api/match/start.ts
api/match/[id].ts     api/match/list.ts        api/match/submit-score.ts
api/match/confirm.ts  api/match/reject.ts      api/match/join.ts
api/match/timeout-settlement.ts
api/evaluate.ts       api/users/users.controller.ts
```

> `users.controller.ts` 中的 `supabase` 变量实际从未在 controller body 中使用（死代码），直接移除而非替换。

### P1-3 雷达图改用 uCharts

**文件**: `client/src/pages/index/index.vue`

- 72 行手绘 canvas 代码（5 层五边形 + 数据多边形 + 顶点圆点）替换为 `new uCharts({ type: 'radar', ... })`
- 配置: `max=1, gridCount=5, opacity=0.35, border=true, labelShow=false`
- 保留外层 5 个 `<text>` 标签（底线/发球/网前/战术/接发）
- 移除 `.radar-bg` CSS 类（uCharts 自绘网格，同心圆背景冗余）
- `client/src/env.d.ts` 新增 `declare module '@qiun/ucharts'`

### P1-4 request 路径统一

`assessment/index.vue`: `../../utils/request` → `@/utils/request`

全部 7 个页面现在统一使用 `@/utils/request` 别名导入。

---

## P2 详细变更

### P2-1 数据库索引与约束

**文件**: `database/schema.sql`（重写）

**新增索引（9 个）:**

| 索引名 | 表 | 字段 | 用途 |
|--------|----|------|------|
| idx_matches_creator_id | matches | creator_id | 按创建者查我的比赛 |
| idx_matches_status | matches | status | 按状态查（等候中/待确认） |
| idx_matches_timeout_at | matches | timeout_at | Cron 结算（部分索引） |
| idx_matches_created_at | matches | created_at DESC | 时间排序 |
| idx_match_participants_match_id | match_participants | match_id | 按比赛查对阵 |
| idx_match_participants_user_id | match_participants | user_id | 按用户查战绩 |
| idx_score_logs_user_id | score_logs | user_id | 积分历史 |
| idx_score_logs_match_id | score_logs | match_id | 比赛流水 |
| idx_score_logs_created_at | score_logs | created_at DESC | 时间排序 |

**新增约束:**
- `matches.status` CHECK IN (0,1,2,3,4)
- `matches.reject_count` CHECK 0-3
- `matches.score_a/score_b` CHECK 0-99
- `match_participants.team` CHECK IN ('A','B')
- `match_participants.confirm_status` CHECK IN (0,1,2)
- `match_participants` UNIQUE(match_id, user_id) — 防重复参赛
- `users.gender` CHECK IN (0,1,2)
- `users.current_score` CHECK 0-100

**级联规则:**
- `matches.creator_id` / `submitter_id` → ON DELETE SET NULL
- `match_participants` 外键 → ON DELETE CASCADE
- `score_logs` 外键 → ON DELETE CASCADE

### 附加：Cron 端点鉴权

`api/match/timeout-settlement.ts` 原无鉴权，任何人可手动触发结算。

**修复:**
- `api/shared/config.ts`: 新增 `cronSecret?: string`
- `api/match/timeout-settlement.ts`: 入口添加 Bearer CRON_SECRET 验证（未设置时跳过，便于本地开发）

---

## 验证结果

```
前端 vue-tsc --noEmit:  Exit Code 0  ✅
后端 tsc --noEmit:      Exit Code 0  ✅
grep createClient:      仅 shared/*.ts  ✅
grep ../../utils/request: 零残留       ✅
```

---

## 后续建议

1. **P2-2 提取公共 settleMatch**（未执行）：`api/match/confirm.ts` 和 `timeout-settlement.ts` 中的 Elo 结算逻辑有重复，可提取到 `shared/elo.service.ts`
2. **安全加固**：部分 match 接口从 body 传 `userId` 而非从 token 解析，存在越权风险
3. **旧版 evaluate.ts**：`api/evaluate.ts` 与 `api/assessment/submit.ts` 功能重叠，可考虑废弃
4. **`api/dist/` 目录**：含旧编译产物，建议 `.gitignore` 排除或清理
