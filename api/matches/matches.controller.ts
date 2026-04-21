/**
 * 比赛 Controller
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { matchesService } from './matches.service';
import { redis } from '../shared/redis';
import { config } from '../shared/config';

/**
 * 从请求中获取当前用户ID
 */
async function getCurrentUserId(req: VercelRequest): Promise<string | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  if (!config.upstash.redisUrl) {
    return null;
  }

  try {
    const userId = await redis.get<string>(token);
    return userId || null;
  } catch {
    return null;
  }
}

/**
 * POST /api/matches
 * 创建比赛房间
 */
export async function createMatch(req: VercelRequest, res: VercelResponse) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { match_type } = req.body;
    if (!match_type || ![1, 2].includes(match_type)) {
      return res.status(400).json({ error: 'match_type must be 1 (singles) or 2 (doubles)' });
    }

    const match = await matchesService.createMatch(userId, { match_type });
    return res.status(201).json({ success: true, data: match });
  } catch (error: any) {
    console.error('Create match error:', error);
    if (error.name === 'NotFoundError') {
      return res.status(404).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/matches/:id
 * 获取比赛详情
 */
export async function getMatch(req: VercelRequest, res: VercelResponse) {
  try {
    const matchId = req.query.id as string;
    if (!matchId) {
      return res.status(400).json({ error: 'Match ID is required' });
    }

    const match = await matchesService.getMatch(matchId);
    return res.status(200).json({ success: true, data: match });
  } catch (error: any) {
    console.error('Get match error:', error);
    if (error.name === 'NotFoundError') {
      return res.status(404).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/matches/:id/join
 * 加入比赛
 */
export async function joinMatch(req: VercelRequest, res: VercelResponse) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const matchId = req.query.id as string;
    if (!matchId) {
      return res.status(400).json({ error: 'Match ID is required' });
    }

    const { team } = req.body;
    if (!team || !['A', 'B'].includes(team)) {
      return res.status(400).json({ error: 'team must be A or B' });
    }

    const match = await matchesService.joinMatch(matchId, userId, team);
    return res.status(200).json({ success: true, data: match });
  } catch (error: any) {
    console.error('Join match error:', error);
    if (error.name === 'NotFoundError') {
      return res.status(404).json({ error: error.message });
    }
    if (error.name === 'ForbiddenError') {
      return res.status(403).json({ error: error.message });
    }
    if (error.name === 'ValidationError') {
      return res.status(422).json({ error: error.message, details: error.errors });
    }
    return res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/matches/:id/score
 * 提交比分
 */
export async function submitScore(req: VercelRequest, res: VercelResponse) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const matchId = req.query.id as string;
    if (!matchId) {
      return res.status(400).json({ error: 'Match ID is required' });
    }

    const { score_a, score_b } = req.body;
    if (typeof score_a !== 'number' || typeof score_b !== 'number') {
      return res.status(400).json({ error: 'score_a and score_b are required' });
    }

    const match = await matchesService.submitScore(matchId, userId, { score_a, score_b });
    return res.status(200).json({ success: true, data: match });
  } catch (error: any) {
    console.error('Submit score error:', error);
    if (error.name === 'NotFoundError') {
      return res.status(404).json({ error: error.message });
    }
    if (error.name === 'ForbiddenError') {
      return res.status(403).json({ error: error.message });
    }
    if (error.name === 'ValidationError') {
      return res.status(422).json({ error: error.message, details: error.errors });
    }
    return res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/matches/:id/confirm
 * 确认/驳回比分
 */
export async function confirmScore(req: VercelRequest, res: VercelResponse) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const matchId = req.query.id as string;
    if (!matchId) {
      return res.status(400).json({ error: 'Match ID is required' });
    }

    const { confirm } = req.body;
    if (typeof confirm !== 'boolean') {
      return res.status(400).json({ error: 'confirm must be boolean' });
    }

    const match = await matchesService.confirmScore(matchId, userId, { confirm });
    return res.status(200).json({ success: true, data: match });
  } catch (error: any) {
    console.error('Confirm score error:', error);
    if (error.name === 'NotFoundError') {
      return res.status(404).json({ error: error.message });
    }
    if (error.name === 'ForbiddenError') {
      return res.status(403).json({ error: error.message });
    }
    if (error.name === 'ValidationError') {
      return res.status(422).json({ error: error.message, details: error.errors });
    }
    return res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/matches/my/history
 * 获取我的比赛历史
 */
export async function getMyMatches(req: VercelRequest, res: VercelResponse) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const limit = parseInt(req.query.limit as string) || 20;
    const matches = await matchesService.getUserMatches(userId, limit);
    return res.status(200).json({ success: true, data: matches });
  } catch (error: any) {
    console.error('Get my matches error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/matches/cron/timeout
 * 处理超时比赛 (由 Cron 调用)
 */
export async function processTimeoutMatches(req: VercelRequest, res: VercelResponse) {
  try {
    // 简单的认证检查
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await matchesService.processTimeoutMatches();
    return res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    console.error('Process timeout error:', error);
    return res.status(500).json({ error: error.message });
  }
}
