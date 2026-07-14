import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './shared/database';
import { redis } from './shared/redis';
import { config } from './shared/config';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { code, userInfo } = req.body as any;

  if (!code) {
    return res.status(400).json({ error: 'Missing wechat login code' });
  }

  try {
    let finalOpenId: string;

    // 端到端测试钩子：绕过微信 code 换 openid（仅当 ALLOW_TEST_LOGIN=true 时生效）
    if (config.allowTestLogin && code === 'TEST_LOGIN') {
      finalOpenId = (req.body as any).testOpenId || 'test_openid_default';
    } else {
      const appId = process.env.WX_APP_ID;
      const secret = process.env.WX_APP_SECRET;

      if (!appId || !secret) {
        console.error('Missing WeChat credentials');
        return res.status(500).json({ error: 'Server configuration error' });
      }

      const wxResponse = await fetch(`https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${secret}&js_code=${code}&grant_type=authorization_code`);
      const wxData = await wxResponse.json() as any;

      if (!wxData.openid) {
        console.error('WeChat login failed:', wxData);
        return res.status(400).json({ error: 'WeChat login failed', details: wxData.errmsg });
      }

      finalOpenId = wxData.openid;
    }

    // 查询数据库是否已有该用户
    let { data: users, error: selectError } = await db
      .from('users')
      .select('*')
      .eq('wx_openid', finalOpenId);

    if (selectError) throw selectError;

    let user = users && users.length > 0 ? users[0] : null;

    // 如果没有，则创建新用户
    if (!user) {
      const nickname = userInfo?.nickName || '网球新星';
      const { data: newUser, error: insertError } = await db
        .from('users')
        .insert([{ wx_openid: finalOpenId, nickname }])
        .select()
        .single();

      if (insertError) throw insertError;
      user = newUser;
    }

    // 生成自定义登录态 (Token)，使用 CloudBase PG 会话表存储
    const token = `token__${Date.now()}_${Math.random().toString(36).substr(2)}`;

    await redis.setex(token, 604800, user.id); // 存储 7 天 (604800 秒)

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
