/**
 * 测评 Controller
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { assessmentService } from './assessment.service';
import { redis } from '../shared/redis';
import { config } from '../shared/config';

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
 * GET /api/assessment/questions
 * 获取测评题目列表
 */
export async function getQuestions(req: VercelRequest, res: VercelResponse) {
  try {
    const questions = await assessmentService.getQuestions();
    return res.status(200).json({
      success: true,
      data: questions,
    });
  } catch (error: any) {
    console.error('Get questions error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/assessment/submit
 * 提交测评答案
 */
export async function submitAssessment(req: VercelRequest, res: VercelResponse) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { answers } = req.body;
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'answers array is required' });
    }

    const result = await assessmentService.submitAssessment(userId, answers);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Submit assessment error:', error);
    if (error.name === 'NotFoundError') {
      return res.status(404).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message });
  }
}
