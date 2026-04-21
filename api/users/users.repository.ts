/**
 * 用户 Repository - 数据访问层
 */
import { supabase } from '../shared/database';
import type { UserProfileResponse } from './users.dto';

export class UsersRepository {
  /**
   * 根据用户ID获取用户信息
   */
  async findById(userId: string): Promise<UserProfileResponse | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * 根据微信 OpenID 获取用户信息
   */
  async findByOpenId(openId: string): Promise<UserProfileResponse | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('wx_openid', openId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  /**
   * 更新用户资料
   */
  async updateUser(userId: string, updates: {
    nickname?: string;
    avatar_url?: string;
    gender?: number;
  }): Promise<UserProfileResponse> {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * 更新用户积分
   */
  async updateScore(userId: string, newScore: number): Promise<UserProfileResponse> {
    const { data, error } = await supabase
      .from('users')
      .update({ current_score: newScore })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * 更新雷达图数据
   */
  async updateRadarData(userId: string, radarData: any): Promise<UserProfileResponse> {
    const { data, error } = await supabase
      .from('users')
      .update({ radar_data: radarData })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * 获取用户比赛胜率统计
   */
  async getUserMatchStats(userId: string): Promise<{
    totalMatches: number;
    winMatches: number;
    loseMatches: number;
  }> {
    // 查询用户参与的比赛
    const { data: participants, error } = await supabase
      .from('match_participants')
      .select(`
        match_id,
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
      return match && match.status === 3; // 已生效的比赛
    });

    let wins = 0;
    for (const p of completedMatches) {
      const match: any = p.matches;
      const team = p.team;
      const teamAScore = match.score_a;
      const teamBScore = match.score_b;

      if (team === 'A' && teamAScore > teamBScore) wins++;
      if (team === 'B' && teamBScore > teamAScore) wins++;
    }

    return {
      totalMatches: completedMatches.length,
      winMatches: wins,
      loseMatches: completedMatches.length - wins,
    };
  }

  /**
   * 获取用户最近N场比赛结果
   */
  async getRecentMatchResults(userId: string, limit: number = 5): Promise<('W' | 'L')[]> {
    const { data: participants, error } = await supabase
      .from('match_participants')
      .select(`
        team,
        matches:match_id (
          status,
          score_a,
          score_b
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const results: ('W' | 'L')[] = [];

    for (const p of (participants || []).slice(0, limit)) {
      const match: any = p.matches;
      if (match && match.status === 3) {
        const team = p.team;
        const teamAScore = match.score_a;
        const teamBScore = match.score_b;

        if (team === 'A' && teamAScore > teamBScore) results.push('W');
        else if (team === 'B' && teamBScore > teamAScore) results.push('W');
        else results.push('L');
      }
    }

    return results;
  }
}

export const usersRepository = new UsersRepository();
