/**
 * 排行榜 Service
 */
import { redis } from '../shared/redis';
import { usersRepository } from '../users/users.repository';
import type { LeaderboardEntry, UserRank } from './leaderboard.dto';
import { config } from '../shared/config';

export class LeaderboardService {
  /**
   * 获取全局排行榜
   */
  async getGlobalLeaderboard(limit: number = 50): Promise<LeaderboardEntry[]> {
    if (!config.upstash.redisUrl) {
      // Redis 未配置时从数据库获取
      return this.getLeaderboardFromDb(limit);
    }

    try {
      // 从 Redis ZSET 获取排名
      const results = await redis.zrange<string[]>('global_leaderboard', 0, limit - 1, {
        rev: true,
        withScores: true,
      });

      const entries: LeaderboardEntry[] = [];
      for (let i = 0; i < results.length; i += 2) {
        const userId = results[i];
        const score = results[i + 1];
        const user = await usersRepository.findById(userId);

        if (user) {
          const stats = await usersRepository.getUserMatchStats(userId);
          entries.push({
            rank: i / 2 + 1,
            userId,
            nickname: user.nickname,
            avatar_url: user.avatar_url,
            score: parseFloat(score),
            winRate: stats.totalMatches > 0 ? (stats.winMatches / stats.totalMatches) * 100 : 0,
            totalMatches: stats.totalMatches,
          });
        }
      }

      return entries;
    } catch (error) {
      console.error('Redis leaderboard error, falling back to DB:', error);
      return this.getLeaderboardFromDb(limit);
    }
  }

  /**
   * 从数据库获取排行榜（降级方案）
   */
  private async getLeaderboardFromDb(limit: number): Promise<LeaderboardEntry[]> {
    const { supabase } = await import('../shared/database');

    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .order('current_score', { ascending: false })
      .limit(limit);

    if (error) throw error;

    const entries: LeaderboardEntry[] = [];

    for (let i = 0; i < (users || []).length; i++) {
      const user = users![i];
      const stats = await usersRepository.getUserMatchStats(user.id);
      entries.push({
        rank: i + 1,
        userId: user.id,
        nickname: user.nickname,
        avatar_url: user.avatar_url,
        score: user.current_score,
        winRate: stats.totalMatches > 0 ? (stats.winMatches / stats.totalMatches) * 100 : 0,
        totalMatches: stats.totalMatches,
      });
    }

    return entries;
  }

  /**
   * 获取用户排名
   */
  async getUserRank(userId: string): Promise<UserRank | null> {
    if (!config.upstash.redisUrl) {
      return this.getUserRankFromDb(userId);
    }

    try {
      const rank = await redis.zrevrank('global_leaderboard', userId);
      const totalUsers = await redis.zcard('global_leaderboard');

      if (rank === null) {
        return null;
      }

      const percentile = totalUsers > 0 ? ((totalUsers - rank - 1) / totalUsers) * 100 : 0;

      return {
        userId,
        rank: rank + 1,
        totalUsers,
        percentile: Math.round(percentile * 100) / 100,
      };
    } catch (error) {
      console.error('Redis rank error, falling back to DB:', error);
      return this.getUserRankFromDb(userId);
    }
  }

  /**
   * 从数据库获取用户排名（降级方案）
   */
  private async getUserRankFromDb(userId: string): Promise<UserRank | null> {
    const { supabase } = await import('../shared/database');

    // 获取用户
    const user = await usersRepository.findById(userId);
    if (!user) return null;

    // 获取排名
    const { count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gt('current_score', user.current_score);

    const rank = (count || 0) + 1;

    const { count: totalCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    const totalUsers = totalCount || 1;
    const percentile = ((totalUsers - rank) / totalUsers) * 100;

    return {
      userId,
      rank,
      totalUsers,
      percentile: Math.round(percentile * 100) / 100,
    };
  }
}

export const leaderboardService = new LeaderboardService();
