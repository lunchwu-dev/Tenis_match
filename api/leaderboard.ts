/**
 * 排行榜 API
 * GET /api/leaderboard?limit=50
 *
 * 获取全局积分排行榜（基于 users.current_score 降序）
 * 原 Redis ZSET 排序集已迁移为 CloudBase PostgreSQL 查询，无外部缓存依赖。
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './shared/database';
import { AppError } from './shared/errors';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  nickname: string;
  avatar_url: string | null;
  score: number;
  winRate: number;
  totalMatches: number;
}

/**
 * 获取用户的比赛胜率统计（从 DB 聚合）
 */
async function getUserMatchStats(userId: string): Promise<{
  totalMatches: number;
  winMatches: number;
}> {
  const { data: participants, error } = await db
    .from('match_participants')
    .select(`
      team,
      matches:match_id (
        status,
        score_a,
        score_b
      )
    `)
    .eq('user_id', userId);

  if (error) throw error;

  const completedMatches = (participants || []).filter((p: any) => {
    const match = p.matches;
    return match && match.status === 3; // 已生效
  });

  let wins = 0;
  for (const p of completedMatches) {
    const match: any = p.matches;
    const team = p.team;
    if (team === 'A' && match.score_a > match.score_b) wins++;
    if (team === 'B' && match.score_b > match.score_a) wins++;
  }

  return {
    totalMatches: completedMatches.length,
    winMatches: wins,
  };
}

/**
 * 直接从数据库按 current_score 降序获取排行榜
 */
async function getLeaderboard(limit: number): Promise<LeaderboardEntry[]> {
  const { data: users, error } = await db
    .from('users')
    .select('id, nickname, avatar_url, current_score')
    .order('current_score', { ascending: false })
    .limit(limit);

  if (error) throw error;

  const entries: LeaderboardEntry[] = [];
  for (let i = 0; i < (users || []).length; i++) {
    const user = users![i];
    const stats = await getUserMatchStats(user.id);
    entries.push({
      rank: i + 1,
      userId: user.id,
      nickname: user.nickname,
      avatar_url: user.avatar_url,
      score: user.current_score,
      winRate: stats.totalMatches > 0 ? (stats.winMatches / stats.totalMatches) * 100 : 0,
      totalMatches: stats.totalMatches,
    });
  }

  return entries;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const limit = Math.min(parseInt((req.query.limit as string) || '50', 10), 100);
    const entries = await getLeaderboard(limit);

    return res.status(200).json({
      success: true,
      data: entries,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        error: error.message,
        code: error.code,
      });
    }
    console.error('Leaderboard error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}
