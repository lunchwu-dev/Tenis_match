/**
 * 比分驳回 API
 * POST /api/match/reject
 *
 * 参与者驳回比分，进入争议流程
 * 驳回超过3次，比赛作废
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

interface RejectScoreBody {
  matchId: string;
  userId: string;
  reason?: string; // 驳回原因
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { matchId, userId, reason } = req.body as RejectScoreBody;

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

      // 验证驳回者是参与者
      const participant = participants?.find((p: any) => p.user_id === userId);
      if (!participant) {
        throw new ForbiddenError('您不是该比赛的参与者');
      }

      // 驳回者不能是提交者
      if (match.submitter_id === userId) {
        throw new AppError('提交者不能驳回自己的比分，请取消后重新提交', 'CANNOT_REJECT_OWN', 400);
      }

      // 记录驳回次数
      const currentRejectCount = (match.reject_count || 0) + 1;

      if (currentRejectCount >= 3) {
        // 驳回超过3次，比赛作废
        await supabase
          .from('matches')
          .update({
            status: 4, // 4=争议废弃
            reject_count: currentRejectCount,
          })
          .eq('id', matchId);

        return res.status(200).json({
          success: true,
          data: {
            matchId,
            status: 'disputed_abandoned',
            rejectCount: currentRejectCount,
            message: '驳回次数超过3次，比赛已作废，双方不计入积分',
          },
        });
      }

      // 更新驳回状态
      await supabase
        .from('match_participants')
        .update({ confirm_status: 2 })
        .eq('id', participant.id);

      // 更新比赛状态（打回进行中，让房主重新提交）
      await supabase
        .from('matches')
        .update({
          status: 1,
          reject_count: currentRejectCount,
          last_reject_reason: reason || '比分有误',
          score_a: null,
          score_b: null,
          submitter_id: null,
        })
        .eq('id', matchId);

      return res.status(200).json({
        success: true,
        data: {
          matchId,
          status: 'pending_resubmit',
          rejectCount: currentRejectCount,
          remainingRejects: 3 - currentRejectCount,
          message: `驳回成功，还剩${3 - currentRejectCount}次机会。请等待房主重新提交正确比分。`,
          lastRejectReason: reason || '比分有误',
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
    console.error('Reject score error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}