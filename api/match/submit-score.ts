/**
 * 比分提交 API
 * POST /api/match/submit-score
 *
 * 房主或胜方提交比分，比赛进入"待确认"状态
 * 设置12小时超时自动生效
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

interface SubmitScoreBody {
  matchId: string;
  userId: string;
  scoreA: number; // A队得分
  scoreB: number; // B队得分
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { matchId, userId, scoreA, scoreB } = req.body as SubmitScoreBody;

    // 参数校验
    if (!matchId || !userId) {
      throw new ValidationError([
        { field: 'matchId', message: '比赛ID不能为空' },
        { field: 'userId', message: '用户ID不能为空' },
      ]);
    }

    if (typeof scoreA !== 'number' || typeof scoreB !== 'number') {
      throw new ValidationError([
        { field: 'scoreA', message: 'A队比分必须是数字' },
        { field: 'scoreB', message: 'B队比分必须是数字' },
      ]);
    }

    // 比分合理性检查（0-99）
    if (scoreA < 0 || scoreA > 99 || scoreB < 0 || scoreB > 99) {
      throw new ValidationError([
        { field: 'score', message: '比分必须在0-99之间' },
      ]);
    }

    // 获取分布式锁（防止重复提交）
    const lockKey = `match_lock_${matchId}`;
    const lockAcquired = await redis.set(lockKey, '1', { px: 5000, nx: true });

    if (!lockAcquired) {
      return res.status(429).json({
        error: '比赛正在处理中，请勿重复提交',
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

      // 验证比赛状态（必须是进行中）
      if (match.status !== 1) {
        throw new AppError('比赛不在进行中状态，无法提交比分', 'INVALID_STATUS', 400);
      }

      // 获取参与者
      const { data: participants, error: participantsError } = await supabase
        .from('match_participants')
        .select('*')
        .eq('match_id', matchId);

      if (participantsError) throw participantsError;

      // 验证提交者是比赛参与者
      const isParticipant = participants?.some((p: any) => p.user_id === userId);
      if (!isParticipant) {
        throw new ForbiddenError('您不是该比赛的参与者');
      }

      // 计算12小时后的超时时间
      const timeoutAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();

      // 更新比赛记录比分和状态
      const { error: updateError } = await supabase
        .from('matches')
        .update({
          score_a: scoreA,
          score_b: scoreB,
          submitter_id: userId,
          status: 2, // 2=待确认
          timeout_at: timeoutAt,
        })
        .eq('id', matchId);

      if (updateError) throw updateError;

      // 重置所有参与者的确认状态（待确认=0）
      for (const participant of participants || []) {
        await supabase
          .from('match_participants')
          .update({ confirm_status: 0 })
          .eq('id', participant.id);
      }

      // 获取完整的比赛信息用于返回
      const { data: updatedMatch } = await supabase
        .from('matches')
        .select(`
          *,
          match_participants (
            user_id,
            team,
            snapshot_score
          )
        `)
        .eq('id', matchId)
        .single();

      return res.status(200).json({
        success: true,
        data: {
          matchId,
          scoreA,
          scoreB,
          status: 'pending_confirmation',
          timeoutAt,
          message: '比分已提交，等待对手确认。超过12小时未处理将自动生效。',
          match: updatedMatch,
        },
      });
    } finally {
      // 释放锁
      await redis.del(lockKey);
    }
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        error: error.message,
        code: error.code,
      });
    }
    console.error('Submit score error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}