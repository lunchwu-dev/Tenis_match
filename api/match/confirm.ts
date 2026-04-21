/**
 * 比分确认 API
 * POST /api/match/confirm
 *
 * 参与者确认比分，触发 Elo 结算
 * 如果所有人（或除提交者外所有人）都确认，触发结算
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { Redis } from '@upstash/redis';
import { AppError, ValidationError, ForbiddenError } from '../shared/errors';
import { calculateEloChange, calculateDoublesEloChange } from '../shared/elo';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_KV_REST_API_URL || '',
  token: process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN || '',
});

interface ConfirmScoreBody {
  matchId: string;
  userId: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { matchId, userId } = req.body as ConfirmScoreBody;

    if (!matchId || !userId) {
      throw new ValidationError([
        { field: 'matchId', message: '比赛ID不能为空' },
        { field: 'userId', message: '用户ID不能为空' },
      ]);
    }

    // 获取分布式锁
    const lockKey = `match_lock_${matchId}`;
    const lockAcquired = await redis.set(lockKey, '1', { px: 5000, nx: true });

    if (!lockAcquired) {
      return res.status(429).json({
        error: '比赛正在处理中，请稍后再试',
        code: 'MATCH_LOCKED',
      });
    }

    try {
      // 获取比赛信息
      const { data: match, error: matchError } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();

      if (matchError || !match) {
        throw new AppError('比赛不存在', 'MATCH_NOT_FOUND', 404);
      }

      // 验证比赛状态（必须是待确认）
      if (match.status !== 2) {
        throw new AppError('比赛不在待确认状态', 'INVALID_STATUS', 400);
      }

      // 获取参与者
      const { data: participants, error: participantsError } = await supabase
        .from('match_participants')
        .select('*')
        .eq('match_id', matchId);

      if (participantsError) throw participantsError;

      // 验证确认者是参与者
      const participant = participants?.find((p: any) => p.user_id === userId);
      if (!participant) {
        throw new ForbiddenError('您不是该比赛的参与者');
      }

      // 验证是否已经确认过
      if (participant.confirm_status === 1) {
        throw new AppError('您已经确认过该比分', 'ALREADY_CONFIRMED', 400);
      }

      // 更新确认状态
      await supabase
        .from('match_participants')
        .update({ confirm_status: 1 }) // 1=已确认
        .eq('id', participant.id);

      // 重新获取所有参与者状态
      const { data: allParticipants } = await supabase
        .from('match_participants')
        .select('*')
        .eq('match_id', matchId);

      const allConfirmed = allParticipants?.every((p: any) => p.confirm_status === 1);
      const submittedByCurrentUser = match.submitter_id === userId;

      // 如果提交者也确认了，或者所有人都确认了，触发结算
      if (allConfirmed) {
        const settlementResult = await settleMatch(matchId, match, allParticipants || []);

        return res.status(200).json({
          success: true,
          data: {
            matchId,
            status: 'settled',
            confirmed: true,
            alreadySettled: false,
            ...settlementResult,
          },
        });
      }

      // 返回当前确认状态
      const confirmedCount = allParticipants?.filter((p: any) => p.confirm_status === 1).length || 0;
      const totalCount = allParticipants?.length || 0;

      return res.status(200).json({
        success: true,
        data: {
          matchId,
          status: 'pending_confirmation',
          confirmed: true,
          confirmedCount,
          totalCount,
          remainingConfirmations: totalCount - confirmedCount,
          message: submittedByCurrentUser
            ? '您是比分提交者，等待对手确认'
            : '确认成功，等待其他参与者确认',
        },
      });
    } finally {
      await redis.del(lockKey);
    }
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        error: error.message,
        code: error.code,
      });
    }
    console.error('Confirm score error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}

/**
 * 执行比赛结算
 */
async function settleMatch(
  matchId: string,
  match: any,
  participants: any[]
): Promise<any> {
  const scoreA = match.score_a;
  const scoreB = match.score_b;
  const isDoubles = match.match_type === 2;

  // 分队
  const teamA = participants.filter((p: any) => p.team === 'A');
  const teamB = participants.filter((p: any) => p.team === 'B');

  // A队实际得分（胜=1，负=0）
  const teamAActualScore = scoreA > scoreB ? 1 : scoreA < scoreB ? 0 : 0.5;

  let eloChanges: any = {};

  if (isDoubles) {
    // 双打：使用平均分计算
    const teamAscores = teamA.map((p: any) => p.snapshot_score || 50);
    const teamBscores = teamB.map((p: any) => p.snapshot_score || 50);

    const result = calculateDoublesEloChange(teamAscores, teamBscores, teamAActualScore);

    // 更新每个队员的积分
    for (let i = 0; i < teamA.length; i++) {
      const userId = teamA[i].user_id;
      const newScore = result.newScoresA[i];

      await supabase
        .from('users')
        .update({ current_score: newScore })
        .eq('id', userId);

      // 记录流水
      await supabase.from('score_logs').insert({
        user_id: userId,
        match_id: matchId,
        change_amount: result.changesA[i],
        after_score: newScore,
      });

      eloChanges[userId] = {
        change: result.changesA[i],
        newScore,
      };
    }

    for (let i = 0; i < teamB.length; i++) {
      const userId = teamB[i].user_id;
      const newScore = result.newScoresB[i];

      await supabase
        .from('users')
        .update({ current_score: newScore })
        .eq('id', userId);

      await supabase.from('score_logs').insert({
        user_id: userId,
        match_id: matchId,
        change_amount: result.changesB[i],
        after_score: newScore,
      });

      eloChanges[userId] = {
        change: result.changesB[i],
        newScore,
      };
    }
  } else {
    // 单打
    const scoreAVal = teamA[0]?.snapshot_score || 50;
    const scoreBVal = teamB[0]?.snapshot_score || 50;

    const result = calculateEloChange(scoreAVal, scoreBVal, teamAActualScore);

    // 更新A队
    if (teamA[0]) {
      await supabase
        .from('users')
        .update({ current_score: result.newScoreA })
        .eq('id', teamA[0].user_id);

      await supabase.from('score_logs').insert({
        user_id: teamA[0].user_id,
        match_id: matchId,
        change_amount: result.changeA,
        after_score: result.newScoreA,
      });

      eloChanges[teamA[0].user_id] = {
        change: result.changeA,
        newScore: result.newScoreA,
      };
    }

    // 更新B队
    if (teamB[0]) {
      await supabase
        .from('users')
        .update({ current_score: result.newScoreB })
        .eq('id', teamB[0].user_id);

      await supabase.from('score_logs').insert({
        user_id: teamB[0].user_id,
        match_id: matchId,
        change_amount: result.changeB,
        after_score: result.newScoreB,
      });

      eloChanges[teamB[0].user_id] = {
        change: result.changeB,
        newScore: result.newScoreB,
      };
    }
  }

  // 更新比赛状态为已生效
  await supabase
    .from('matches')
    .update({ status: 3 }) // 3=已生效
    .eq('id', matchId);

  return {
    scoreA,
    scoreB,
    winner: scoreA > scoreB ? 'A' : 'B',
    eloChanges,
  };
}