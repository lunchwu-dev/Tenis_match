/**
 * 比赛详情 API
 * GET /api/match/:id
 *
 * 获取比赛详细信息
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { AppError, NotFoundError } from '../shared/errors';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const matchId = req.query.id as string;

    if (!matchId) {
      return res.status(400).json({ error: 'Match ID is required' });
    }

    // 获取比赛详情
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select(`
        *,
        creator:users!matches_creator_id_fkey (
          id,
          nickname,
          avatar_url,
          current_score
        )
      `)
      .eq('id', matchId)
      .single();

    if (matchError || !match) {
      throw new NotFoundError('比赛', matchId);
    }

    // 获取参与者详情
    const { data: participants, error: participantsError } = await supabase
      .from('match_participants')
      .select(`
        *,
        user:users!match_participants_user_id_fkey (
          id,
          nickname,
          avatar_url
        )
      `)
      .eq('match_id', matchId);

    if (participantsError) throw participantsError;

    // 整理数据
    const teamA = participants
      ?.filter((p: any) => p.team === 'A')
      .map((p: any) => ({
        userId: p.user_id,
        nickname: p.user?.nickname || '未知',
        avatarUrl: p.user?.avatar_url || '',
        team: 'A',
        snapshotScore: p.snapshot_score,
        confirmStatus: p.confirm_status,
      })) || [];

    const teamB = participants
      ?.filter((p: any) => p.team === 'B')
      .map((p: any) => ({
        userId: p.user_id,
        nickname: p.user?.nickname || '未知',
        avatarUrl: p.user?.avatar_url || '',
        team: 'B',
        snapshotScore: p.snapshot_score,
        confirmStatus: p.confirm_status,
      })) || [];

    // 状态映射
    const statusMap: Record<number, string> = {
      0: '等待加入',
      1: '进行中',
      2: '待确认',
      3: '已生效',
      4: '已废弃',
    };

    return res.status(200).json({
      success: true,
      data: {
        matchId: match.id,
        matchType: match.match_type === 1 ? '单打' : '双打',
        status: match.status,
        statusText: statusMap[match.status] || '未知',
        scoreA: match.score_a,
        scoreB: match.score_b,
        creator: match.creator,
        submitterId: match.submitter_id,
        timeoutAt: match.timeout_at,
        rejectCount: match.reject_count || 0,
        lastRejectReason: match.last_reject_reason,
        teamA,
        teamB,
        createdAt: match.created_at,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        error: error.message,
        code: error.code,
      });
    }
    console.error('Get match error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}