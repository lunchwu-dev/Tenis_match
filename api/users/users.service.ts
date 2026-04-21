/**
 * 用户 Service - 业务逻辑层
 */
import { usersRepository } from './users.repository';
import { redis } from '../shared/redis';
import { config } from '../shared/config';
import { NotFoundError } from '../shared/errors';
import { supabase } from '../shared/database';
import type { UserProfileResponse, UpdateUserProfileDto, UserMatchStats } from './users.dto';

export class UsersService {
  /**
   * 获取用户完整资料（含比赛统计）
   */
  async getUserProfile(userId: string): Promise<UserProfileResponse & { stats: UserMatchStats }> {
    const user = await usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User', userId);
    }

    const stats = await usersRepository.getUserMatchStats(userId);
    const recentForm = await usersRepository.getRecentMatchResults(userId, 5);

    return {
      ...user,
      stats: {
        ...stats,
        winRate: stats.totalMatches > 0 ? (stats.winMatches / stats.totalMatches) * 100 : 0,
        recentForm,
      },
    };
  }

  /**
   * 根据 OpenID 获取用户（用于登录验证）
   */
  async getUserByOpenId(openId: string): Promise<UserProfileResponse | null> {
    return usersRepository.findByOpenId(openId);
  }

  /**
   * 创建新用户
   */
  async createUser(openId: string, nickname?: string): Promise<UserProfileResponse> {
    // 检查是否已存在
    const existing = await usersRepository.findByOpenId(openId);
    if (existing) {
      return existing;
    }

    const { data, error } = await supabase
      .from('users')
      .insert([{ wx_openid: openId, nickname: nickname || '网球新星' }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * 更新用户资料
   */
  async updateUserProfile(userId: string, dto: UpdateUserProfileDto): Promise<UserProfileResponse> {
    const user = await usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User', userId);
    }

    return usersRepository.updateUser(userId, dto);
  }

  /**
   * 更新用户雷达图数据
   */
  async updateRadarData(userId: string, radarData: any): Promise<UserProfileResponse> {
    const user = await usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User', userId);
    }

    return usersRepository.updateRadarData(userId, radarData);
  }

  /**
   * 生成登录 Token
   */
  async generateToken(userId: string): Promise<string> {
    const token = `token__${Date.now()}_${Math.random().toString(36).substr(2)}`;

    if (config.upstash.redisUrl) {
      await redis.setex(token, 604800, userId); // 7天有效期
    }

    return token;
  }

  /**
   * 验证 Token 并返回用户ID
   */
  async validateToken(token: string): Promise<string | null> {
    if (!config.upstash.redisUrl) {
      return null; // Redis 未配置时跳过验证
    }

    try {
      const userId = await redis.get<string>(token);
      return userId || null;
    } catch {
      return null;
    }
  }
}

export const usersService = new UsersService();
