/**
 * 比赛超时自动结算 API
 * POST /api/match/timeout-settlement
 *
 * 由 QStash 或 Vercel Cron 调用
 * 检查所有"待确认"状态超过12小时的比赛，自动结算
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { Redis } from '@upstash/redis';
import { calculateEloChange, calculateDoublesEloChange } from '../shared/elo';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_KV_REST_API_URL || '',
  token: process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN || '',
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const now = new Date().toISOString();

    // 查找所有超时（当前时间 > timeout_at）且状态为"待确认(2)"的比赛
    const { data: expiredMatches, error: queryError } = await supabase
      .from('matches')
      .select(`
        *,
        match_participants (
          user_id,
          team,
          snapshot_score
        )
      `)
      .eq('status', 2) // 待确认
      .lt('timeout_at', now); // 已超时

    if (queryError) {
      console.error('Timeout settlement query error:', queryError);
      return res.status(500).json({ error: 'Database query failed' });
    }

    if (!expiredMatches || expiredMatches.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          processed: 0,
          message: '没有需要自动结算的比赛',
        },
      });
    }

    const results = [];

    for (const match of expiredMatches) {
      const lockKey = `match_lock_${match.id}`;
      const lockAcquired = await redis.set(lockKey, '1', { px: 10000, nx: true });

      if (!lockAcquired) {
        results.push({
          matchId: match.id,
          status: 'skipped',
          reason: 'LOCKED',
        });
        continue;
      }

      try {
        const settleResult = await settleExpiredMatch(match);
        results.push({
          matchId: match.id,
          status: 'settled',
          ...settleResult,
        });
      } catch (error: any) {
        console.error(`Failed to settle match ${match.id}:`, error);
        results.push({
          matchId: match.id,
          status: 'failed',
          error: error.message,
        });
      } finally {
        await redis.del(lockKey);
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        processed: results.length,
        results,
      },
    });
  } catch (error: any) {
    console.error('Timeout settlement error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}

/**
 * 结算超时的比赛（静默生效 = 默认同意）
 */
async function settleExpiredMatch(match: any): Promise<any> {
  const scoreA = match.score_a;
  const scoreB = match.score_b;
  const isDoubles = match.match_type === 2;
  const participants = match.match_participants || [];

  // 如果没有比分（已被驳回清空），跳过
  if (scoreA === null || scoreB === null) {
    // 更新状态为已废弃
    await supabase
      .from('matches')
      .update({ status: 4 })
      .eq('id', match.id);
    return { reason: 'NO_SCORE' };
  }

  const teamA = participants.filter((p: any) => p.team === 'A');
  const teamB = participants.filter((p: any) => p.team === 'B');

  // A队实际得分
  const teamAActualScore = scoreA > scoreB ? 1 : scoreA < scoreB ? 0 : 0.5;

  const eloChanges: any = {};

  if (isDoubles) {
    const teamAscores = teamA.map((p: any) => p.snapshot_score || 50);
    const teamBscores = teamB.map((p: any) => p.snapshot_score || 50);

    const result = calculateDoublesEloChange(teamAscores, teamBscores, teamAActualScore);

    for (let i = 0; i < teamA.length; i++) {
      const userId = teamA[i].user_id;
      const newScore = result.newScoresA[i];

      await supabase.from('users').update({ current_score: newScore }).eq('id', userId);
      await supabase.from('score_logs').insert({
        user_id: userId,
        match_id: match.id,
        change_amount: result.changesA[i],
        after_score: newScore,
      });

      eloChanges[userId] = { change: result.changesA[i], newScore };
    }

    for (let i = 0; i < teamB.length; i++) {
      const userId = teamB[i].user_id;
      const newScore = result.newScoresB[i];

      await supabase.from('users').update({ current_score: newScore }).eq('id', userId);
      await supabase.from('score_logs').insert({
        user_id: userId,
        match_id: match.id,
        change_amount: result.changesB[i],
        after_score: newScore,
      });

      eloChanges[userId] = { change: result.changesB[i], newScore };
    }
  } else {
    const scoreAVal = teamA[0]?.snapshot_score || 50;
    const scoreBVal = teamB[0]?.snapshot_score || 50;

    const result = calculateEloChange(scoreAVal, scoreBVal, teamAActualScore);

    if (teamA[0]) {
      await supabase.from('users').update({ current_score: result.newScoreA }).eq('id', teamA[0].user_id);
      await supabase.from('score_logs').insert({
        user_id: teamA[0].user_id,
        match_id: match.id,
        change_amount: result.changeA,
        after_score: result.newScoreA,
      });
      eloChanges[teamA[0].user_id] = { change: result.changeA, newScore: result.newScoreA };
    }

    if (teamB[0]) {
      await supabase.from('users').update({ current_score: result.newScoreB }).eq('id', teamB[0].user_id);
      await supabase.from('score_logs').insert({
        user_id: teamB[0].user_id,
        match_id: match.id,
        change_amount: result.changeB,
        after_score: result.newScoreB,
      });
      eloChanges[teamB[0].user_id] = { change: result.changeB, newScore: result.newScoreB };
    }
  }

  // 更新比赛状态为已生效（静默）
  await supabase
    .from('matches')
    .update({ status: 3 })
    .eq('id', match.id);

  return {
    scoreA,
    scoreB,
    winner: scoreA > scoreB ? 'A' : 'B',
    eloChanges,
    method: 'AUTO_TIMEOUT',
  };
}