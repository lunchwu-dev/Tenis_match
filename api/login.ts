import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { Redis } from '@upstash/redis';

// 初始化 Supabase 客户端
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// 初始化 Upstash Redis 客户端
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_KV_REST_API_URL || '',
  token: process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN || '',
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { code, userInfo } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Missing wechat login code' });
  }

  try {
    // 1. 调用微信接口获取 openid
    const appId = process.env.WX_APP_ID || 'wx414c6b38efdb1735';
    const secret = process.env.WX_APP_SECRET || 'ddfa04366a176cf1fc5ee59aa5469381';
    console.log('Using AppID:', appId);
    
    const wxResponse = await fetch(`https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${secret}&js_code=${code}&grant_type=authorization_code`);
    const wxData = await wxResponse.json() as any;
    
    if (!wxData.openid) {
      console.error('WeChat login failed:', wxData);
      return res.status(400).json({ error: 'WeChat login failed', details: wxData.errmsg });
    }
    
    const finalOpenId = wxData.openid;

    // 2. 查询数据库是否已有该用户
    let { data: users, error: selectError } = await supabase
      .from('users')
      .select('*')
      .eq('wx_openid', finalOpenId);

    if (selectError) throw selectError;

    let user = users && users.length > 0 ? users[0] : null;

    // 3. 如果没有，则创建新用户
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

    // 4. 生成自定义登录态 (Token)，使用 Upstash Redis 缓存
    const token = `token__${Date.now()}_${Math.random().toString(36).substr(2)}`;
    
    try {
      if (process.env.UPSTASH_REDIS_REST_KV_REST_API_URL) {
        // 存储 7 天 (7 * 24 * 60 * 60 = 604800 秒)
        await redis.setex(token, 604800, user.id);
      }
    } catch(err) {
      console.warn('Redis 存储跳过 (未配置)', err);
    }

    return res.status(200).json({
      success: true,
      data: {
        token,
        user
      }
    });

  } catch (error: any) {
    console.error('Login Error:', error);
    return res.status(500).json({ error: 'Login failed', details: error.message });
  }
}
