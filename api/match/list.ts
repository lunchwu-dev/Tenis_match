/**
 * 比赛列表 API
 * GET /api/match/list?userId=xxx&status=1,2
 *
 * 获取用户的比赛列表
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { AppError, ValidationError } from '../shared/errors';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const userId = req.query.userId as string;
    const statusFilter = req.query.status as string; // e.g., "1,2"

    if (!userId) {
      throw new ValidationError([{ field: 'userId', message: '用户ID不能为空' }]);
    }

    // 构建查询
    let query = supabase
      .from('matches')
      .select(`
        *,
        match_participants (
          user_id,
          team,
          confirm_status
        )
      `)
      .order('created_at', { ascending: false });

    // 如果指定了状态过滤
    if (statusFilter) {
      const statuses = statusFilter.split(',').map(Number);
      query = query.in('status', statuses);
    }

    const { data: matches, error: matchError } = await query;

    if (matchError) throw matchError;

    // 过滤出用户参与的比赛
    const userMatches = matches?.filter((m: any) => {
      const participants = m.match_participants || [];
      return participants.some((p: any) => p.user_id === userId);
    }) || [];

    // 获取所有相关用户信息
    const allUserIds = new Set<string>();
    userMatches.forEach((m: any) => {
      (m.match_participants || []).forEach((p: any) => {
        allUserIds.add(p.user_id);
      });
    });

    const { data: users } = await supabase
      .from('users')
      .select('id, nickname, avatar_url')
      .in('id', Array.from(allUserIds));

    const userMap = new Map(users?.map((u: any) => [u.id, u]) || []);

    // 格式化返回数据
    const result = userMatches.map((m: any) => {
      const participants = m.match_participants || [];
      const teamA = participants.filter((p: any) => p.team === 'A');
      const teamB = participants.filter((p: any) => p.team === 'B');

      // 获取当前用户的队伍
      const currentUserParticipant = participants.find((p: any) => p.user_id === userId);
      const currentUserTeam = currentUserParticipant?.team || 'A';

      // 获取对手信息
      const opponents = participants.filter((p: any) => p.user_id !== userId);
      const opponentNames = opponents
        .map((p: any) => userMap.get(p.user_id)?.nickname || '未知')
        .join(', ');

      // 状态映射
      const statusMap: Record<number, { text: string; color: string }> = {
        0: { text: '等待加入', color: 'gray' },
        1: { text: '进行中', color: 'blue' },
        2: { text: '待确认', color: 'red' },
        3: { text: '已生效', color: 'green' },
        4: { text: '已废弃', color: 'gray' },
      };

      return {
        matchId: m.id,
        matchType: m.match_type === 1 ? '单打' : '双打',
        status: m.status,
        statusText: statusMap[m.status]?.text || '未知',
        statusColor: statusMap[m.status]?.color || 'gray',
        scoreA: m.score_a,
        scoreB: m.score_b,
        currentUserTeam,
        teamA: teamA.map((p: any) => ({
          userId: p.user_id,
          nickname: userMap.get(p.user_id)?.nickname || '未知',
          avatarUrl: userMap.get(p.user_id)?.avatar_url || '',
        })),
        teamB: teamB.map((p: any) => ({
          userId: p.user_id,
          nickname: userMap.get(p.user_id)?.nickname || '未知',
          avatarUrl: userMap.get(p.user_id)?.avatar_url || '',
        })),
        opponentNames,
        createdAt: m.created_at,
        timeoutAt: m.timeout_at,
        isCreator: m.creator_id === userId,
      };
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        error: error.message,
        code: error.code,
      });
    }
    console.error('List match error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}