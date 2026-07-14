/**
 * Express 单入口（CloudBase HTTP / Web 云函数）
 * ------------------------------------------------------------------
 * 将原本 Vercel 文件系统路由下的各个 handler 统一挂载到 Express 路由，
 * 使项目可作为「长期监听的 HTTP 服务」部署到腾讯云 CloudBase。
 *
 * - Vercel 把路径参数（如 /api/match/[id].ts）放进 req.query.id；
 *   Express 放在 req.params.id。wrap() 在调用 handler 前将 params 合并进 query，
 *   保证所有「读取 req.query.xxx」的 handler 行为与原 Vercel 路由一致。
 * - 登录态 token 经由 CloudBase PostgreSQL 会话表校验（见 shared/redis.ts shim），
 *   不再依赖外部 Redis。
 */
import express from 'express';
import { config } from './shared/config';

import indexHandler from './index';
import loginHandler from './login';
import leaderboardHandler from './leaderboard';
import assessmentQuestionsHandler from './assessment/questions';
import assessmentSubmitHandler from './assessment/submit';
import usersMeHandler from './users/me';
import {
  getCurrentUser,
  updateCurrentUser,
  updateUserRadar,
  getUserById,
} from './users/users.controller';
import matchCreateHandler from './match/create';
import matchJoinHandler from './match/join';
import matchStartHandler from './match/start';
import matchListHandler from './match/list';
import matchSubmitScoreHandler from './match/submit-score';
import matchConfirmHandler from './match/confirm';
import matchRejectHandler from './match/reject';
import matchTimeoutHandler from './match/timeout-settlement';
import matchIdHandler from './match/[id]';

import type { VercelRequest, VercelResponse } from '@vercel/node';

// 处理器实际返回 res.status().json()（即 VercelResponse），用 any 兼容 Express Handler 签名
type Handler = (req: VercelRequest, res: VercelResponse) => any;

/** 把 Express 的 req/res 适配为 handler 期望的 VercelRequest/VercelResponse。 */
const wrap = (h: Handler): express.RequestHandler => (req, res, next) => {
  // Express 5 的 req.query 是只读 getter，且每次访问都会重新解析 URL，
  // 因此「整体赋值」或「就地 Object.assign」都会被下一次 req.query 访问丢弃。
  // 这里把 req.query 重新定义为一个普通数据属性，合并 params 后持久生效，
  // 保证 /api/match/:id、/api/users/:id 等路径参数对 handler 可见。
  const merged = { ...(req as any).query, ...(req as any).params };
  try {
    Object.defineProperty(req, 'query', {
      configurable: true,
      enumerable: true,
      writable: true,
      value: merged,
    });
  } catch {
    (req as any).query = merged;
  }
  return h(req as any, res as any);
};

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// 宽松 CORS：小程序、本地联调、浏览器 E2E 均可用
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

// --- 根路由（健康检查）---
app.get('/api', wrap(indexHandler));

// --- 认证 ---
app.post('/api/login', wrap(loginHandler));

// --- 用户 ---
app.get('/api/users/me', wrap(usersMeHandler));
app.put('/api/users/me', wrap(usersMeHandler));
app.put('/api/users/me/radar', wrap(updateUserRadar));
app.get('/api/users/:id', wrap(getUserById));

// --- 测评 ---
app.get('/api/assessment/questions', wrap(assessmentQuestionsHandler));
app.post('/api/assessment/submit', wrap(assessmentSubmitHandler));

// --- 排行榜 ---
app.get('/api/leaderboard', wrap(leaderboardHandler));

// --- 比赛（注意顺序：具体路径必须在 :id 之前注册）---
app.post('/api/match/create', wrap(matchCreateHandler));
app.post('/api/match/join', wrap(matchJoinHandler));
app.post('/api/match/start', wrap(matchStartHandler));
app.get('/api/match/list', wrap(matchListHandler));
app.post('/api/match/submit-score', wrap(matchSubmitScoreHandler));
app.post('/api/match/confirm', wrap(matchConfirmHandler));
app.post('/api/match/reject', wrap(matchRejectHandler));
app.post('/api/match/timeout-settlement', wrap(matchTimeoutHandler));
app.get('/api/match/:id', wrap(matchIdHandler));

// 兜底 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.path });
});

const port = Number(process.env.PORT) || config.port || 9000;
app.listen(port, () => {
  console.log(`🎾 Tennis Match API listening on port ${port}`);
});
