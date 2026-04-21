/**
 * 比赛 Service
 */
import { matchesRepository } from './matches.repository';
import { usersRepository } from '../users/users.repository';
import { redis } from '../shared/redis';
import { NotFoundError, ValidationError, ForbiddenError } from '../shared/errors';
import { calculateEloChange } from './matches.dto';
import type { CreateMatchDto, SubmitScoreDto, ConfirmScoreDto } from './matches.dto';

export class MatchesService {
  /**
   * 创建比赛房间
   */
  async createMatch(userId: string, dto: CreateMatchDto) {
    const user = await usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User', userId);
    }

    const match = await matchesRepository.createMatch(userId, dto.match_type);

    // 创建者自动加入 A 队
    await matchesRepository.joinMatch(
      match.id,
      userId,
      'A',
      user.current_score
    );

    return matchesRepository.findByIdWithParticipants(match.id);
  }

  /**
   * 加入比赛
   */
  async joinMatch(matchId: string, userId: string, team: 'A' | 'B') {
    const match = await matchesRepository.findById(matchId);
    if (!match) {
      throw new NotFoundError('Match', matchId);
    }

    if (match.status !== 0 && match.status !== 1) {
      throw new ValidationError([{ field: 'status', message: 'Match is not joinable' }]);
    }

    // 检查是否已加入
    const alreadyJoined = await matchesRepository.isUserInMatch(matchId, userId);
    if (alreadyJoined) {
      throw new ValidationError([{ field: 'user', message: 'Already joined this match' }]);
    }

    const user = await usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User', userId);
    }

    await matchesRepository.joinMatch(matchId, userId, team, user.current_score);

    return matchesRepository.findByIdWithParticipants(matchId);
  }

  /**
   * 获取比赛详情
   */
  async getMatch(matchId: string) {
    const match = await matchesRepository.findByIdWithParticipants(matchId);
    if (!match) {
      throw new NotFoundError('Match', matchId);
    }
    return match;
  }

  /**
   * 获取用户比赛历史
   */
  async getUserMatches(userId: string, limit?: number) {
    const matches = await matchesRepository.findUserMatches(userId, limit);
    return matches;
  }

  /**
   * 提交比分
   */
  async submitScore(matchId: string, userId: string, dto: SubmitScoreDto) {
    // 分布式锁防止重复提交
    const lockKey = `match_lock_${matchId}`;
    if (config.upstash.redisUrl) {
      const locked = await redis.setnx(lockKey, '1');
      if (!locked) {
        throw new ValidationError([{ field: 'match', message: 'Match is being processed' }]);
      }
      await redis.expire(lockKey, 5); // 5秒自动释放
    }

    try {
      const match = await matchesRepository.findByIdWithParticipants(matchId);
      if (!match) {
        throw new NotFoundError('Match', matchId);
      }

      // 检查用户是否在房间里
      const isInMatch = await matchesRepository.isUserInMatch(matchId, userId);
      if (!isInMatch) {
        throw new ForbiddenError('You are not in this match');
      }

      // 更新比分和状态
      const timeoutAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(); // 12小时后
      await matchesRepository.updateMatchStatus(matchId, 2, {
        score_a: dto.score_a,
        score_b: dto.score_b,
        submitter_id: userId,
        timeout_at: timeoutAt,
      });

      // 更新提交者的确认状态为确认
      await matchesRepository.updateConfirmStatus(matchId, userId, 1);

      return matchesRepository.findByIdWithParticipants(matchId);
    } finally {
      // 释放锁
      if (config.upstash.redisUrl) {
        await redis.del(lockKey);
      }
    }
  }

  /**
   * 确认/驳回比分
   */
  async confirmScore(matchId: string, userId: string, dto: ConfirmScoreDto) {
    const match = await matchesRepository.findByIdWithParticipants(matchId);
    if (!match) {
      throw new NotFoundError('Match', matchId);
    }

    if (match.status !== 2) {
      throw new ValidationError([{ field: 'status', message: 'Match is not pending confirmation' }]);
    }

    // 检查用户是否在房间里
    const isInMatch = await matchesRepository.isUserInMatch(matchId, userId);
    if (!isInMatch) {
      throw new ForbiddenError('You are not in this match');
    }

    if (dto.confirm) {
      // 确认
      await matchesRepository.updateConfirmStatus(matchId, userId, 1);

      // 检查是否所有人都已确认
      const participants = await matchesRepository.getParticipants(matchId);
      const allConfirmed = participants.every((p) => p.confirm_status === 1);

      if (allConfirmed) {
        // 计算并更新积分
        await this.settleMatch(matchId);
      }

      return matchesRepository.findByIdWithParticipants(matchId);
    } else {
      // 驳回 - 标记为争议废弃
      await matchesRepository.updateMatchStatus(matchId, 4);
      return matchesRepository.findByIdWithParticipants(matchId);
    }
  }

  /**
   * 结算比赛（计算 Elo 变动）
   */
  async settleMatch(matchId: string) {
    const match = await matchesRepository.findByIdWithParticipants(matchId);
    if (!match) {
      throw new NotFoundError('Match', matchId);
    }

    if (match.score_a === null || match.score_b === null) {
      throw new ValidationError([{ field: 'score', message: 'Scores are not set' }]);
    }

    // 分组计算平均分
    const teamAParticipants = match.participants.filter((p) => p.team === 'A');
    const teamBParticipants = match.participants.filter((p) => p.team === 'B');

    const teamAAvgScore = teamAParticipants.reduce((sum, p) => sum + p.snapshot_score, 0) / teamAParticipants.length;
    const teamBAvgScore = teamBParticipants.reduce((sum, p) => sum + p.snapshot_score, 0) / teamBParticipants.length;

    // 确定胜负
    const aWins = match.score_a > match.score_b;

    // 计算分数变动
    const { winnerChange, loserChange } = calculateEloChange(
      aWins ? teamAAvgScore : teamBAvgScore,
      aWins ? teamBAvgScore : teamAAvgScore
    );

    // 更新每个参与者的积分
    for (const p of teamAParticipants) {
      const change = aWins ? winnerChange : loserChange;
      const newScore = Math.max(0, p.snapshot_score + change);
      await usersRepository.updateScore(p.user_id, newScore);
      await this.recordScoreLog(p.user_id, matchId, change, newScore);
    }

    for (const p of teamBParticipants) {
      const change = aWins ? loserChange : winnerChange;
      const newScore = Math.max(0, p.snapshot_score + change);
      await usersRepository.updateScore(p.user_id, newScore);
      await this.recordScoreLog(p.user_id, matchId, change, newScore);
    }

    // 更新比赛状态为已生效
    await matchesRepository.updateMatchStatus(matchId, 3);

    // 更新排行榜
    await this.updateLeaderboard(matchId);

    return { winnerChange, loserChange };
  }

  /**
   * 记录积分变动日志
   */
  private async recordScoreLog(userId: string, matchId: string, changeAmount: number, afterScore: number) {
    const { error } = await supabase
      .from('score_logs')
      .insert([{
        user_id: userId,
        match_id: matchId,
        change_amount: changeAmount,
        after_score: afterScore,
      }]);

    if (error) console.error('Failed to record score log:', error);
  }

  /**
   * 更新排行榜
   */
  private async updateLeaderboard(matchId: string) {
    if (!config.upstash.redisUrl) return;

    const match = await matchesRepository.findByIdWithParticipants(matchId);
    if (!match) return;

    for (const p of match.participants) {
      const user = await usersRepository.findById(p.user_id);
      if (user) {
        await redis.zadd('global_leaderboard', user.current_score, p.user_id);
      }
    }
  }

  /**
   * 处理超时未确认的比赛
   */
  async processTimeoutMatches() {
    const timeoutMatches = await matchesRepository.getTimeoutMatches();

    for (const match of timeoutMatches) {
      try {
        await this.settleMatch(match.id);
      } catch (error) {
        console.error(`Failed to settle match ${match.id}:`, error);
      }
    }

    return { processed: timeoutMatches.length };
  }
}

export const matchesService = new MatchesService();
