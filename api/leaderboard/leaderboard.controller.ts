/**
 * 排行榜 Controller
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { leaderboardService } from './leaderboard.service';
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
 * GET /api/leaderboard
 * 获取排行榜
 */
export async function getLeaderboard(req: VercelRequest, res: VercelResponse) {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const leaderboard = await leaderboardService.getGlobalLeaderboard(limit);
    return res.status(200).json({ success: true, data: leaderboard });
  } catch (error: any) {
    console.error('Get leaderboard error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/leaderboard/my-rank
 * 获取我的排名
 */
export async function getMyRank(req: VercelRequest, res: VercelResponse) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const rank = await leaderboardService.getUserRank(userId);
    if (!rank) {
      return res.status(404).json({ error: 'User not found in leaderboard' });
    }

    return res.status(200).json({ success: true, data: rank });
  } catch (error: any) {
    console.error('Get my rank error:', error);
    return res.status(500).json({ error: error.message });
  }
}
