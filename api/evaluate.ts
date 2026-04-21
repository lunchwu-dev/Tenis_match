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

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    
    // Mock user for local testing if token__
    let userId = '';
    if (token.startsWith('token__')) {
      // get from redis
      if (process.env.UPSTASH_REDIS_REST_KV_REST_API_URL) {
        const cachedId = await redis.get(token);
        userId = cachedId ? String(cachedId) : '';
      }
    }

    if (!userId) {
      return res.status(401).json({ error: 'Token expired or invalid' });
    }

    const { answers } = req.body;
    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ error: 'Invalid answers' });
    }

    // 计算总分
    let totalScore = 0;
    const radarData = {
      baseline: 0,
      serve: 0,
      return: 0,
      netPlay: 0,
      tactics: 0
    };

    // 这里实现一个简化版的雷达图数据计算
    for (const [qId, data] of Object.entries<any>(answers)) {
      const score = data.score || 0;
      totalScore += score;
      
      // 根据题号映射雷达图维度
      // 新手通道: q4正手→baseline, q5反手→baseline, q6发球→serve, q7跑动→tactics, q8规则→tactics, q9甜区→baseline
      if (['q4', 'q5', 'q9', 'q10', 'q11', 'q12', 'q13', 'q14'].includes(qId)) radarData.baseline += score;
      if (['q6', 'q15', 'q16'].includes(qId)) radarData.serve += score;
      if (['q17', 'q18'].includes(qId)) radarData.return += score;
      if (['q19', 'q20', 'q21'].includes(qId)) radarData.netPlay += score;
      if (['q7', 'q8', 'q22', 'q23'].includes(qId)) radarData.tactics += score;
    }

    // 更新用户
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({ current_score: totalScore, radar_data: radarData })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Supabase Update Error:', error);
      return res.status(500).json({ error: 'Failed to save evaluation' });
    }

    return res.status(200).json({
      success: true,
      data: {
        score: totalScore,
        radarData,
        user: updatedUser
      }
    });

  } catch (error: any) {
    console.error('Evaluation Error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}
