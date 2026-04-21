/**
 * 比赛创建 API
 * POST /api/match/create
 * 
 * 创建一场新的比赛房间
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { Redis } from '@upstash/redis';
import { AppError, ValidationError, UnauthorizedError } from '../shared/errors';

// 初始化 Supabase
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// 初始化 Redis
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_KV_REST_API_URL || '',
  token: process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN || '',
});

interface CreateMatchBody {
  matchType: 1 | 2; // 1=单打, 2=双打
  userId: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { matchType, userId } = req.body as CreateMatchBody;

    // 参数校验
    if (!matchType || !userId) {
      throw new ValidationError([
        { field: 'matchType', message: '必须指定比赛类型（1=单打, 2=双打）' },
        { field: 'userId', message: '用户ID不能为空' },
      ]);
    }

    if (matchType !== 1 && matchType !== 2) {
      throw new ValidationError([{ field: 'matchType', message: '比赛类型只能是1(单打)或2(双打)' }]);
    }

    // 验证用户存在
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, nickname, current_score')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      throw new UnauthorizedError('用户不存在或未登录');
    }

    // 创建比赛房间
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .insert({
        creator_id: userId,
        match_type: matchType,
        status: 0, // 0=等待加入
      })
      .select()
      .single();

    if (matchError || !match) {
      throw new AppError('创建比赛失败', 'CREATE_MATCH_FAILED', 500);
    }

    // 添加房主为A队参与者（状态=已确认参与）
    const { error: participantError } = await supabase
      .from('match_participants')
      .insert({
        match_id: match.id,
        user_id: userId,
        team: 'A',
        snapshot_score: user.current_score || 50, // 记录当前积分快照
        confirm_status: 1, // 房主自动确认参与
      });

    if (participantError) {
      throw new AppError('添加参与者失败', 'ADD_PARTICIPANT_FAILED', 500);
    }

    // 生成邀请码（用于URL/扫码加入）
    const inviteCode = generateInviteCode(match.id);

    return res.status(200).json({
      success: true,
      data: {
        matchId: match.id,
        inviteCode,
        matchType: matchType === 1 ? '单打' : '双打',
        status: 'waiting',
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        error: error.message,
        code: error.code,
      });
    }
    console.error('Create match error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}

/**
 * 生成6位邀请码
 */
function generateInviteCode(matchId: string): string {
  // 使用matchId的最后6位作为邀请码
  const code = matchId.replace(/-/g, '').slice(-6).toUpperCase();
  return code;
}