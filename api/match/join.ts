/**
 * 比赛加入 API
 * POST /api/match/join
 *
 * 用户通过邀请码加入比赛
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { AppError, ValidationError, UnauthorizedError, NotFoundError } from '../shared/errors';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

interface JoinMatchBody {
  inviteCode: string; // 6位邀请码
  userId: string;
  team?: 'A' | 'B'; // 可选：指定加入A队或B队
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { inviteCode, userId, team } = req.body as JoinMatchBody;

    // 参数校验
    if (!inviteCode || !userId) {
      throw new ValidationError([
        { field: 'inviteCode', message: '邀请码不能为空' },
        { field: 'userId', message: '用户ID不能为空' },
      ]);
    }

    // 验证用户存在
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, nickname, current_score')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      throw new UnauthorizedError('用户不存在');
    }

    // 通过邀请码查找比赛（取最后6位匹配）
    const { data: matches, error: matchError } = await supabase
      .from('matches')
      .select(`
        id,
        creator_id,
        match_type,
        status,
        match_participants (
          id,
          user_id,
          team,
          snapshot_score
        )
      `)
      .eq('status', 0) // 只查找等待中的比赛
      .order('created_at', { ascending: false })
      .limit(10);

    if (matchError) throw matchError;

    // 匹配邀请码
    const match = matches?.find((m: any) => {
      const code = m.id.replace(/-/g, '').slice(-6).toUpperCase();
      return code === inviteCode.toUpperCase();
    });

    if (!match) {
      throw new NotFoundError('比赛', inviteCode);
    }

    // 检查是否已满员
    const participants = match.match_participants || [];
    const teamACount = participants.filter((p: any) => p.team === 'A').length;
    const teamBCount = participants.filter((p: any) => p.team === 'B').length;
    const maxPerTeam = match.match_type === 1 ? 1 : 2; // 单打每队1人，双打每队2人

    // 确定加入哪队
    let targetTeam: 'A' | 'B';
    if (team) {
      targetTeam = team;
    } else {
      // 默认加入人数较少的那队
      targetTeam = teamACount <= teamBCount ? 'A' : 'B';
    }

    // 检查目标队伍是否已满
    const targetCount = targetTeam === 'A' ? teamACount : teamBCount;
    if (targetCount >= maxPerTeam) {
      throw new AppError('该队伍已满，请选择另一队', 'TEAM_FULL', 400);
    }

    // 检查用户是否已在比赛中
    const alreadyJoined = participants.some((p: any) => p.user_id === userId);
    if (alreadyJoined) {
      throw new AppError('您已经在该比赛中', 'ALREADY_JOINED', 400);
    }

    // 添加参与者
    const { data: newParticipant, error: participantError } = await supabase
      .from('match_participants')
      .insert({
        match_id: match.id,
        user_id: userId,
        team: targetTeam,
        snapshot_score: user.current_score || 50,
        confirm_status: 1, // 加入即确认参与
      })
      .select()
      .single();

    if (participantError) {
      throw new AppError('加入比赛失败', 'JOIN_FAILED', 500);
    }

    // 重新计算是否满员
    const updatedParticipants = await supabase
      .from('match_participants')
      .select('*')
      .eq('match_id', match.id);

    const totalParticipants = updatedParticipants.data?.length || 0;
    const requiredPlayers = match.match_type === 1 ? 2 : 4;
    const isFull = totalParticipants >= requiredPlayers;

    return res.status(200).json({
      success: true,
      data: {
        matchId: match.id,
        matchType: match.match_type === 1 ? '单打' : '双打',
        status: isFull ? 'ready_to_start' : 'waiting',
        participants: updatedParticipants.data,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        error: error.message,
        code: error.code,
      });
    }
    console.error('Join match error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}