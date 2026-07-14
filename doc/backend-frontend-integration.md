# 前端所需后端服务 — 契约对齐与联调指引

> 状态：契约已对齐，11 个前端接口后端均可用。本文记录对齐结果、本次修复、联调步骤与已知技术债。

## 一、结论

前端（UniApp Vue3+TS）共真实调用 **11 个后端接口**，后端此前已全部实现，但存在 3 处契约错位与 2 处遗留污染。本次已修复，目前前后端字段/类型对齐，可联调。

## 二、本次修复清单（2026-07-12）

| # | 文件 | 修复内容 |
|---|------|---------|
| 1 | `api/match/list.ts` | 补充 `scoreChange` 字段：按当前用户从 `score_logs` 聚合该场积分变动（已生效比赛展示 ▲/▼ 分数）。此前缺失导致历史战绩卡片恒显示 `▲0/▼0`。 |
| 2 | `api/match/reject.ts` | `disputed_abandoned` 分支补齐 `remainingRejects: 0` 与 `lastRejectReason`，与前端内联泛型一致。 |
| 3 | `api/assessment/submit.ts` + `api/assessment/assessment.dto.ts` | **核心修复**：原端点要求 `[{questionId, selectedOption}]` 数组（固定 12 题题库），但前端实际提交 `{ q1:{score}, q2:{score}, ... }` 对象（本地动态分叉题库，23 题）。改为接受对象格式（并保留旧数组格式兼容），在后端内置「前端题号 → 5 维度 / 单题满分」映射表 `QUESTION_DIMENSION_MAP`，按维度聚合算 `radar_data`（0-1）与 `current_score`（0-100）。 |
| 4 | `api/dist/` | 删除旧架构（NestJS+QStash 风格 controller/service）完整编译产物，避免 Vercel 误将其识别为路由。根 `.gitignore` 的 `dist/` 已全局忽略。 |
| 5 | `api/evaluate.ts` | 顶部加「已废弃」注释。与 `assessment/submit` 重叠且 `radar_data` 字段名（`netPlay`）与全站规范（`netplay`）不符，前端已不调用。 |

## 三、接口契约总览（已对齐）

| 方法 | 路径 | 鉴权 | 关键返回字段（对齐前端内联泛型） |
|------|------|------|-------------------------------|
| POST | `/api/login` | 无（返回 token） | `{ success, data:{ token, user } }` |
| GET | `/api/users/me` | Bearer | `id, nickname, avatar_url, current_score, radar_data{baseline,serve,netplay,tactics,receive}, stats{totalMatches,winMatches,loseMatches,winRate,recentForm[]}` |
| POST | `/api/match/create` | 无（body `userId`） | `{ success, data:{ matchId, inviteCode, matchType:'单打'\|'双打', status } }` |
| GET | `/api/match/:id` | 无 | `matchId, matchType(单/双汉字), status:number, statusText, scoreA, scoreB, creator{snake}, teamA/B[{userId,nickname,avatarUrl,snapshotScore}], timeoutAt, rejectCount, lastRejectReason` |
| POST | `/api/match/start` | 无（body `userId`） | `{ success, data:{ matchId, status:'in_progress', matchType, teamA{players,averageScore}, teamB, message } }` |
| POST | `/api/match/submit-score` | 无（body `userId`） | `{ success, data:{ matchId, scoreA, scoreB, status:'pending_confirmation', timeoutAt, message } }` |
| POST | `/api/match/confirm` | 无（body `userId`） | 全确认：`{ status:'settled', confirmed, winner, eloChanges }`；否则 `{ status:'pending_confirmation', confirmed, confirmedCount, totalCount, remainingConfirmations, message }` |
| POST | `/api/match/reject` | 无（body `userId`） | 作废：`{ status:'disputed_abandoned', rejectCount, remainingRejects:0, lastRejectReason, message }`；否则 `{ status:'pending_resubmit', rejectCount, remainingRejects, lastRejectReason, message }` |
| GET | `/api/match/list?userId=` | 无（query `userId`） | `MatchItem[]`：`matchId, matchType, status:number, statusText, statusColor, scoreA, scoreB, scoreChange, currentUserTeam, teamA/B[{userId,nickname,avatarUrl}], opponentNames, createdAt, timeoutAt, isCreator` |
| GET | `/api/leaderboard?limit=50` | 无 | `LeaderboardEntry[]`：`rank, userId, nickname, avatar_url, score, winRate, totalMatches` |
| POST | `/api/assessment/submit` | Bearer | `{ success, data:{ totalScore, ntrpLevel, radarData, currentScore, userId, user } }`（`user` 含最新 `current_score`/`radar_data`，前端用它覆盖本地 `user_info`） |

> 字段风格：用户类用 snake_case（`avatar_url`/`current_score`/`radar_data`），比赛成员用 camelCase（`userId`/`avatarUrl`/`snapshotScore`）——与前端一致，勿擅自统一。

## 四、联调步骤

### 1. 配置后端环境变量
复制 `api/.env.example` 为 `api/.env.local`，填入：
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`（必填，缺则函数冷启动失败）
- `UPSTASH_REDIS_REST_KV_REST_API_URL` / `UPSTASH_REDIS_REST_KV_REST_API_TOKEN`（Token 校验、分布式锁、排行榜缓存依赖；未配则登录可用但后续 Bearer 鉴权失效）
- `WX_APP_ID` / `WX_APP_SECRET`（微信登录换 openid，必填）
- `CRON_SECRET`（超时自动结算定时任务鉴权；本地未配则无鉴权）

### 2. 启动/部署后端
- 本地：`npx vercel dev`（需 `vercel login` 并 link 项目），默认 `http://localhost:3000`
- 部署：`npx vercel deploy --prod`，获得 `https://<project>.vercel.app`

> 数据库：先执行 `database/schema.sql` 在 Supabase 建表（users / matches / match_participants / score_logs）。

### 3. 前端切到真实后端
编辑 `client/.env`：
```
VITE_USE_MOCK=false
VITE_BACKEND_URL=https://<project>.vercel.app   # 或 http://localhost:3000（本地）
```
重新构建小程序：`pnpm --filter client run build:mp-weixin`，用微信开发者工具导入 `client/dist/build/mp-weixin`。

### 4. 验证清单（建议顺序）
1. 微信一键登录 → 检查 `auth_token` 写入、`/api/users/me` 刷新资料
2. 发起比赛 → `/api/match/create` 拿到 `inviteCode`
3. 准备室 → `/api/match/:id` 展示双方席位；房主开赛 `/api/match/start`
4. 录入比分 → `/api/match/submit-score`（12h 倒计时）
5. 确认/驳回 → `/api/match/confirm`、`/api/match/reject`
6. 战绩大厅 → `/api/match/list` 已生效比赛显示真实 `scoreChange`
7. 排行榜 → `/api/leaderboard`
8. 能力测评 → `/api/assessment/submit`，提交后 `radar_data`/`current_score` 更新并写回名片页

## 五、已知技术债（非阻断，建议后续处理）

1. **match/* 无 Bearer 鉴权**：全部比赛接口以 body/query 明文 `userId` 作为身份与权限依据，未校验 `Authorization` token，存在越权（伪造他人 `userId`）风险。与 `users/me`、`assessment/submit` 的 Bearer 风格不一致。建议逐步改为 token 解析 `userId`。
2. **两套题库脱节**：前端用本地动态分叉题库（`client/src/pages/assessment/questions.ts`，题号 `q1`~`q23` 字符串，无维度字段），后端用固定 12 题题库（`assessment.dto.ts`）。本次在 `assessment.dto.ts` 内置 `QUESTION_DIMENSION_MAP` 把前端题号映射到 5 维度，属「隐式耦合」——前端改题号/维度会错位。建议将维度信息前移（给前端题库每题加 `dimension` 字段），前后端共享单一事实源。
3. **排行榜「同城」Tab 为占位**：前端不发起独立请求，后端无需实现，仅前端展示「功能开发中」。
4. **新用户 `radar_data` 为 null**：登录后未测评时雷达图无数据，名片页以默认 0.5 兜底；引导用户先完成能力测评即可写入。
5. **`users/controller.ts` 含未暴露函数**：`getUserById`(GET /api/users/:id)、`updateUserRadar`(PUT /api/users/me/radar) 已写好但无对应 Vercel 函数文件，属死代码。
