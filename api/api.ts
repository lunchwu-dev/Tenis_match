import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { Redis } from '@upstash/redis';
import { config } from './shared/config';
import { redis } from './shared/redis';

// 导入所有 controller
import * as usersController from './users/users.controller';
import * as assessmentController from './assessment/assessment.controller';
import * as matchesController from './matches/matches.controller';
import * as leaderboardController from './leaderboard/leaderboard.controller';

/**
 * 全局错误处理
 */
function handleError(error: any, res: VercelResponse) {
  console.error('API Error:', error);

  if (error.name === 'AppError' && error.isOperational) {
    return res.status(error.statusCode).json({
      error: error.message,
      code: error.code,
    });
  }

  return res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
}

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
 * 统一 API 路由处理
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url } = req;
  const path = url?.split('?')[0] || '';

  try {
    // 健康检查
    if (path === '/api/health') {
      return res.status(200).json({ status: 'ok', time: new Date().toISOString() });
    }

    // 用户相关路由
    if (path === '/api/users/me') {
      if (req.method === 'GET') {
        return usersController.getCurrentUser(req, res);
      }
      if (req.method === 'PUT') {
        return usersController.updateCurrentUser(req, res);
      }
    }

    if (path === '/api/users/me/radar' && req.method === 'PUT') {
      return usersController.updateUserRadar(req, res);
    }

    if (path.startsWith('/api/users/') && req.method === 'GET') {
      req.query.id = path.split('/')[3];
      return usersController.getUserById(req, res);
    }

    // 测评路由
    if (path === '/api/assessment/questions' && req.method === 'GET') {
      return assessmentController.getQuestions(req, res);
    }

    if (path === '/api/assessment/submit' && req.method === 'POST') {
      return assessmentController.submitAssessment(req, res);
    }

    // 比赛路由
    if (path === '/api/matches' && req.method === 'POST') {
      return matchesController.createMatch(req, res);
    }

    if (path === '/api/matches/my/history' && req.method === 'GET') {
      return matchesController.getMyMatches(req, res);
    }

    if (path === '/api/matches/cron/timeout' && req.method === 'POST') {
      return matchesController.processTimeoutMatches(req, res);
    }

    // 比赛详情/加入/比分/确认
    const matchIdMatch = path.match(/^\/api\/matches\/([^/]+)(\/.*)?$/);
    if (matchIdMatch) {
      const matchId = matchIdMatch[1];
      const action = matchIdMatch[2];

      req.query.id = matchId;

      if (!action || action === '/') {
        if (req.method === 'GET') {
          return matchesController.getMatch(req, res);
        }
      }

      if (action === '/join' && req.method === 'POST') {
        return matchesController.joinMatch(req, res);
      }

      if (action === '/score' && req.method === 'POST') {
        return matchesController.submitScore(req, res);
      }

      if (action === '/confirm' && req.method === 'POST') {
        return matchesController.confirmScore(req, res);
      }
    }

    // 排行榜路由
    if (path === '/api/leaderboard' && req.method === 'GET') {
      return leaderboardController.getLeaderboard(req, res);
    }

    if (path === '/api/leaderboard/my-rank' && req.method === 'GET') {
      return leaderboardController.getMyRank(req, res);
    }

    // 登录路由 (保留原有逻辑)
    if (path === '/api/login' && req.method === 'POST') {
      return handleLogin(req, res);
    }

    // 未知路由
    return res.status(404).json({ error: 'Not found' });

  } catch (error: any) {
    return handleError(error, res);
  }
}

/**
 * 登录处理
 */
async function handleLogin(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { code, userInfo } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Missing wechat login code' });
  }

  try {
    // 1. 调用微信接口获取 openid
    const wxResponse = await fetch(
      `https://api.weixin.qq.com/sns/jscode2session?appid=${config.wx.appId}&secret=${config.wx.appSecret}&js_code=${code}&grant_type=authorization_code`
    );
    const wxData = await wxResponse.json() as any;

    if (!wxData.openid) {
      console.error('WeChat login failed:', wxData);
      return res.status(400).json({ error: 'WeChat login failed', details: wxData.errmsg });
    }

    const finalOpenId = wxData.openid;

    // 2. 初始化 Supabase 客户端
    const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);

    // 3. 查询数据库是否已有该用户
    let { data: users, error: selectError } = await supabase
      .from('users')
      .select('*')
      .eq('wx_openid', finalOpenId);

    if (selectError) throw selectError;

    let user = users && users.length > 0 ? users[0] : null;

    // 4. 如果没有，则创建新用户
    if (!user) {
      const nickname = userInfo?.nickName || '网球新星';
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert([{ wx_openid: finalOpenId, nickname }])
        .select()
        .single();

      if (insertError) throw insertError;
      user = newUser;
    }

    // 5. 生成自定义登录态 (Token)
    const token = `token__${Date.now()}_${Math.random().toString(36).substr(2)}`;

    if (config.upstash.redisUrl) {
      await redis.setex(token, 604800, user.id); // 7天有效期
    }

    return res.status(200).json({
      success: true,
      data: {
        token,
        user,
      },
    });

  } catch (error: any) {
    console.error('Login Error:', error);
    return res.status(500).json({ error: 'Login failed', details: error.message });
  }
}
