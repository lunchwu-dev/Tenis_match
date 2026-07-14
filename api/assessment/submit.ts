/**
 * 测评提交 API
 * POST /api/assessment/submit
 *
 * 提交 NTRP 能力评估答案，计算积分和雷达图数据并更新用户资料
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../shared/database';
import { redis } from '../shared/redis';
import { AppError, UnauthorizedError } from '../shared/errors';
import { computeResultFromObject, assessmentQuestions } from './assessment.dto';

interface SubmitAssessmentBody {
  answers: {
    questionId: number;
    selectedOption: number;
  }[];
}

/**
 * 从请求中获取当前用户ID（Bearer token → Redis → userId）
 */
async function getCurrentUserId(req: VercelRequest): Promise<string | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.substring(7);

  try {
    const userId = await redis.get<string>(token);
    return userId || null;
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const userId = await getCurrentUserId(req);
    if (!userId) {
      throw new UnauthorizedError('未登录或登录已过期');
    }

    const { answers } = req.body as any;

    // 归一化两种提交格式：
    //  - 前端当前格式（对象）：{ q1: { score }, q2: { score }, ... }
    //  - 规范格式（数组）：[{ questionId: number, selectedOption: number }, ...]
    let normalized: { qid: string; score: number }[] = [];
    if (Array.isArray(answers)) {
      normalized = answers.map((a: any) => {
        const q = assessmentQuestions.find((x) => x.id === a.questionId);
        const score = q?.options?.[a.selectedOption]?.score ?? 0;
        return { qid: `q${a.questionId}`, score };
      });
    } else if (answers && typeof answers === 'object') {
      normalized = Object.entries(answers).map(([qid, v]: any) => ({
        qid,
        score: typeof v?.score === 'number' ? v.score : Number(v?.score) || 0,
      }));
    }

    if (normalized.length === 0) {
      throw new AppError('答案不能为空', 'VALIDATION_ERROR', 422);
    }

    // 计算测评结果（与前端本地题库题号对应的维度映射）
    const result = computeResultFromObject(normalized);

    // 更新用户的积分和雷达图数据
    const { data: updatedUser, error: updateError } = await db
      .from('users')
      .update({
        current_score: result.currentScore,
        radar_data: result.radarData,
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) throw updateError;

    return res.status(200).json({
      success: true,
      data: {
        ...result,
        userId,
        user: updatedUser,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        error: error.message,
        code: error.code,
      });
    }
    console.error('Assessment submit error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}
