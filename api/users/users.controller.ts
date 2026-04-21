/**
 * 用户 Controller - HTTP 层
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { usersService } from './users.service';
import { UnauthorizedError, ValidationError } from '../shared/errors';
import { config } from '../shared/config';
import { redis } from '../shared/redis';
import { createClient } from '@supabase/supabase-js';

// 临时数据库客户端（用于查询）
const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);

/**
 * 从请求中获取当前用户ID
 */
async function getCurrentUserId(req: VercelRequest): Promise<string | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  if (!config.upstash.redisUrl) {
    return null;
  }

  try {
    const userId = await redis.get<string>(token);
    return userId || null;
  } catch {
    return null;
  }
}

/**
 * GET /api/users/me
 * 获取当前登录用户资料
 */
export async function getCurrentUser(req: VercelRequest, res: VercelResponse) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userProfile = await usersService.getUserProfile(userId);
    return res.status(200).json({ success: true, data: userProfile });
  } catch (error: any) {
    console.error('Get current user error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * PUT /api/users/me
 * 更新当前用户资料
 */
export async function updateCurrentUser(req: VercelRequest, res: VercelResponse) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { nickname, avatar_url, gender } = req.body;

    const updatedUser = await usersService.updateUserProfile(userId, {
      nickname,
      avatar_url,
      gender,
    });

    return res.status(200).json({ success: true, data: updatedUser });
  } catch (error: any) {
    console.error('Update user error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * PUT /api/users/me/radar
 * 更新用户雷达图数据
 */
export async function updateUserRadar(req: VercelRequest, res: VercelResponse) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { radar_data } = req.body;
    if (!radar_data) {
      return res.status(400).json({ error: 'radar_data is required' });
    }

    const updatedUser = await usersService.updateRadarData(userId, radar_data);
    return res.status(200).json({ success: true, data: updatedUser });
  } catch (error: any) {
    console.error('Update radar error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/users/:id
 * 获取指定用户资料（公开）
 */
export async function getUserById(req: VercelRequest, res: VercelResponse) {
  try {
    const userId = req.query.id as string;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const userProfile = await usersService.getUserProfile(userId);
    return res.status(200).json({ success: true, data: userProfile });
  } catch (error: any) {
    if (error.name === 'NotFoundError') {
      return res.status(404).json({ error: error.message });
    }
    console.error('Get user error:', error);
    return res.status(500).json({ error: error.message });
  }
}
