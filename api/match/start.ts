/**
 * 比赛开始 API
 * POST /api/match/start
 *
 * 房主确认开赛，锁定参赛人员并记录积分快照
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { Redis } from '@upstash/redis';
import { AppError, ValidationError, ForbiddenError } from '../shared/errors';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_KV_REST_API_URL || '',
  token: process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN || '',
});

interface StartMatchBody {
  matchId: string;
  userId: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { matchId, userId } = req.body as StartMatchBody;

    if (!matchId || !userId) {
      throw new ValidationError([
        { field: 'matchId', message: '比赛ID不能为空' },
        { field: 'userId', message: '用户ID不能为空' },
      ]);
    }

    // 获取比赛信息
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (matchError || !match) {
      throw new AppError('比赛不存在', 'MATCH_NOT_FOUND', 404);
    }

    // 验证是房主
    if (match.creator_id !== userId) {
      throw new ForbiddenError('只有房主可以开始比赛');
    }

    // 验证比赛状态（必须等待中）
    if (match.status !== 0) {
      throw new AppError('比赛已经开始或已结束', 'INVALID_STATUS', 400);
    }

    // 获取所有参与者
    const { data: participants, error: participantsError } = await supabase
      .from('match_participants')
      .select('*')
      .eq('match_id', matchId);

    if (participantsError) throw participantsError;

    // 验证人数是否满足
    const requiredPlayers = match.match_type === 1 ? 2 : 4;
    if (!participants || participants.length < requiredPlayers) {
      throw new AppError(
        `参赛人数不足，需要${requiredPlayers}人，当前${participants?.length || 0}人`,
        'NOT_ENOUGH_PLAYERS',
        400
      );
    }

    // 验证每队是否都有至少一人
    const teamA = participants.filter((p: any) => p.team === 'A');
    const teamB = participants.filter((p: any) => p.team === 'B');
    if (teamA.length === 0 || teamB.length === 0) {
      throw new AppError('两队都必须至少有一名成员', 'INVALID_TEAMS', 400);
    }

    // 获取所有用户的最新积分（更新快照）
    const userIds = participants.map((p: any) => p.user_id);
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, current_score')
      .in('id', userIds);

    if (usersError) throw usersError;

    const userScoreMap = new Map(users?.map((u: any) => [u.id, u.current_score || 50]));

    // 更新每个参与者的积分快照
    for (const participant of participants) {
      const currentScore = userScoreMap.get(participant.user_id) || 50;
      await supabase
        .from('match_participants')
        .update({ snapshot_score: currentScore })
        .eq('id', participant.id);
    }

    // 更新比赛状态为"进行中"
    const { error: updateError } = await supabase
      .from('matches')
      .update({ status: 1 })
      .eq('id', matchId);

    if (updateError) throw updateError;

    // 返回队伍快照信息
    const teamAInfo = teamA.map((p: any) => ({
      userId: p.user_id,
      team: 'A',
      snapshotScore: userScoreMap.get(p.user_id) || 50,
    }));

    const teamBInfo = teamB.map((p: any) => ({
      userId: p.user_id,
      team: 'B',
      snapshotScore: userScoreMap.get(p.user_id) || 50,
    }));

    const avgA = teamAInfo.reduce((sum, p) => sum + p.snapshotScore, 0) / teamAInfo.length;
    const avgB = teamBInfo.reduce((sum, p) => sum + p.snapshotScore, 0) / teamBInfo.length;

    return res.status(200).json({
      success: true,
      data: {
        matchId,
        status: 'in_progress',
        matchType: match.match_type === 1 ? '单打' : '双打',
        teamA: {
          players: teamAInfo,
          averageScore: Math.round(avgA * 10) / 10,
        },
        teamB: {
          players: teamBInfo,
          averageScore: Math.round(avgB * 10) / 10,
        },
        message: '比赛已开始，请线下完成比赛后回来录入比分',
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        error: error.message,
        code: error.code,
      });
    }
    console.error('Start match error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}