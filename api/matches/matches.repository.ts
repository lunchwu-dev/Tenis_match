/**
 * 比赛 Repository
 */
import { supabase } from '../shared/database';
import type { MatchResponse, MatchParticipant } from './matches.dto';

type UserMatchRow = {
  team: 'A' | 'B';
  matches: (MatchResponse & { participants?: MatchParticipant[] })[] | (MatchResponse & { participants?: MatchParticipant[] }) | null;
};

export class MatchesRepository {
  /**
   * 创建比赛房间
   */
  async createMatch(creatorId: string, matchType: 1 | 2): Promise<MatchResponse> {
    const { data, error } = await supabase
      .from('matches')
      .insert([{ creator_id: creatorId, match_type: matchType }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * 根据ID获取比赛详情
   */
  async findById(matchId: string): Promise<MatchResponse | null> {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  /**
   * 获取比赛及参与者信息
   */
  async findByIdWithParticipants(matchId: string): Promise<MatchResponse & { participants: MatchParticipant[] }> {
    const match = await this.findById(matchId);
    if (!match) return null;

    const { data: participants, error } = await supabase
      .from('match_participants')
      .select(`
        *,
        user:users (nickname, avatar_url, current_score)
      `)
      .eq('match_id', matchId);

    if (error) throw error;

    return {
      ...match,
      participants: participants || [],
    };
  }

  /**
   * 加入比赛
   */
  async joinMatch(matchId: string, userId: string, team: 'A' | 'B', snapshotScore: number): Promise<MatchParticipant> {
    const { data, error } = await supabase
      .from('match_participants')
      .insert([{
        match_id: matchId,
        user_id: userId,
        team,
        snapshot_score: snapshotScore,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * 获取用户参与的比赛列表
   */
  async findUserMatches(userId: string, limit: number = 20): Promise<MatchResponse[]> {
    const { data, error } = await supabase
      .from('match_participants')
      .select(`
        match_id,
        team,
        matches:matches (
          *,
          participants:match_participants (
            *,
            user:users (nickname, avatar_url, current_score)
          )
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // 去重并格式化
    const matchMap = new Map<string, MatchResponse & { userTeam: 'A' | 'B' }>();
    for (const item of (data || []) as UserMatchRow[]) {
      const match = Array.isArray(item.matches) ? item.matches[0] : item.matches;
      if (!match) {
        continue;
      }

      if (!matchMap.has(match.id)) {
        matchMap.set(match.id, {
          ...match,
          userTeam: item.team,
        });
      }
    }

    return Array.from(matchMap.values()).slice(0, limit);
  }

  /**
   * 更新比赛状态
   */
  async updateMatchStatus(matchId: string, status: number, updates?: {
    score_a?: number;
    score_b?: number;
    submitter_id?: string;
    timeout_at?: string;
  }): Promise<MatchResponse> {
    const { data, error } = await supabase
      .from('matches')
      .update({ status, ...updates })
      .eq('id', matchId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * 更新参与者确认状态
   */
  async updateConfirmStatus(matchId: string, userId: string, confirmStatus: number): Promise<void> {
    const { error } = await supabase
      .from('match_participants')
      .update({ confirm_status: confirmStatus })
      .eq('match_id', matchId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  /**
   * 获取房间所有参与者
   */
  async getParticipants(matchId: string): Promise<MatchParticipant[]> {
    const { data, error } = await supabase
      .from('match_participants')
      .select(`
        *,
        user:users (nickname, avatar_url, current_score)
      `)
      .eq('match_id', matchId);

    if (error) throw error;
    return data || [];
  }

  /**
   * 检查用户是否已加入房间
   */
  async isUserInMatch(matchId: string, userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('match_participants')
      .select('id')
      .eq('match_id', matchId)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
  }

  /**
   * 获取超时的待确认比赛
   */
  async getTimeoutMatches(): Promise<MatchResponse[]> {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('status', 2) // 待确认状态
      .lt('timeout_at', new Date().toISOString());

    if (error) throw error;
    return data || [];
  }
}

export const matchesRepository = new MatchesRepository();
