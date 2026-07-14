/**
 * 测评题目 API
 * GET /api/assessment/questions
 *
 * 返回 NTRP 能力评估问卷题库（12 题，5 维度）
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { assessmentQuestions } from './assessment.dto';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  return res.status(200).json({
    success: true,
    data: assessmentQuestions,
  });
}
