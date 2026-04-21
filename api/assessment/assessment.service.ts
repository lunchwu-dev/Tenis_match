/**
 * 测评 Service
 */
import { supabase } from '../shared/database';
import { usersRepository } from '../users/users.repository';
import { calculateAssessmentResult } from './assessment.dto';
import { NotFoundError } from '../shared/errors';

export class AssessmentService {
  /**
   * 提交测评答案，计算并保存结果
   */
  async submitAssessment(userId: string, answers: { questionId: number; selectedOption: number }[]) {
    // 验证用户存在
    const user = await usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User', userId);
    }

    // 计算测评结果
    const result = calculateAssessmentResult(answers);

    // 更新用户的积分和雷达图数据
    await supabase
      .from('users')
      .update({
        current_score: result.currentScore,
        radar_data: result.radarData,
      })
      .eq('id', userId);

    return {
      ...result,
      userId,
    };
  }

  /**
   * 获取测评题目
   */
  async getQuestions() {
    const { assessmentQuestions } = await import('./assessment.dto');
    return assessmentQuestions;
  }
}

export const assessmentService = new AssessmentService();
