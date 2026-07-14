/**
 * 比赛超时自动结算服务（核心逻辑）
 *
 * 把原 timeout-settlement.ts 中的查询 + 逐场结算逻辑抽取为可复用函数，
 * 同时供两个入口消费：
 *   1) HTTP 接口（api/match/timeout-settlement.ts）—— 手动/外部触发，带 CRON_SECRET 鉴权
 *   2) CloudBase Timer 事件函数（api/settlement-entry.ts）—— 每 12 小时自动触发
 *
 * 业务含义：检查所有"待确认(status=2)"且已超过 timeout_at 的比赛，
 * 以提交方提交的比分静默生效（默认同意），完成 Elo 结算。
 */
import { db } from './database';
import { redis } from './redis';
import { calculateEloChange, calculateDoublesEloChange } from './elo';

export interface SettlementResult {
  processed: number;
  results: any[];
  message?: string;
}

/**
 * 执行一次全量超时结算扫描。
 * 返回本次处理了多少场比赛及其逐场结果。
 */
export async function runTimeoutSettlement(): Promise<SettlementResult> {
  const now = new Date().toISOString();

  // 查找所有超时（当前时间 > timeout_at）且状态为"待确认(2)"的比赛
  const { data: expiredMatches, error: queryError } = await db
    .from('matches')
    .select(`
      *,
      match_participants (
        user_id,
        team,
        snapshot_score
      )
    `)
    .eq('status', 2) // 待确认
    .lt('timeout_at', now); // 已超时

  if (queryError) {
    console.error('[settlement] query error:', queryError);
    throw queryError;
  }

  if (!expiredMatches || expiredMatches.length === 0) {
    return {
      processed: 0,
      results: [],
      message: '没有需要自动结算的比赛',
    };
  }

  const results: any[] = [];

  for (const match of expiredMatches) {
    const lockKey = `match_lock_${match.id}`;
    const lockAcquired = await redis.set(lockKey, '1', { px: 30000, nx: true });

    if (!lockAcquired) {
      results.push({
        matchId: match.id,
        status: 'skipped',
        reason: 'LOCKED',
      });
      continue;
    }

    try {
      const settleResult = await settleExpiredMatch(match);
      results.push({
        matchId: match.id,
        status: 'settled',
        ...settleResult,
      });
    } catch (error: any) {
      console.error(`[settlement] failed to settle match ${match.id}:`, error);
      results.push({
        matchId: match.id,
        status: 'failed',
        error: error.message,
      });
    } finally {
      await redis.del(lockKey);
    }
  }

  return { processed: results.length, results };
}

/**
 * 结算单场超时的比赛（静默生效 = 默认同意）
 */
async function settleExpiredMatch(match: any): Promise<any> {
  const scoreA = match.score_a;
  const scoreB = match.score_b;
  const isDoubles = match.match_type === 2;
  const participants = match.match_participants || [];

  // 如果没有比分（已被驳回清空），跳过
  if (scoreA === null || scoreB === null) {
    // 更新状态为已废弃
    await db
      .from('matches')
      .update({ status: 4 })
      .eq('id', match.id);
    return { reason: 'NO_SCORE' };
  }

  const teamA = participants.filter((p: any) => p.team === 'A');
  const teamB = participants.filter((p: any) => p.team === 'B');

  // A队实际得分
  const teamAActualScore = scoreA > scoreB ? 1 : scoreA < scoreB ? 0 : 0.5;

  const eloChanges: any = {};

  if (isDoubles) {
    const teamAscores = teamA.map((p: any) => p.snapshot_score || 50);
    const teamBscores = teamB.map((p: any) => p.snapshot_score || 50);

    const result = calculateDoublesEloChange(teamAscores, teamBscores, teamAActualScore);

    for (let i = 0; i < teamA.length; i++) {
      const userId = teamA[i].user_id;
      const newScore = result.newScoresA[i];

      await db.from('users').update({ current_score: newScore }).eq('id', userId);
      await db.from('score_logs').insert({
        user_id: userId,
        match_id: match.id,
        change_amount: result.changesA[i],
        after_score: newScore,
      });

      eloChanges[userId] = { change: result.changesA[i], newScore };
    }

    for (let i = 0; i < teamB.length; i++) {
      const userId = teamB[i].user_id;
      const newScore = result.newScoresB[i];

      await db.from('users').update({ current_score: newScore }).eq('id', userId);
      await db.from('score_logs').insert({
        user_id: userId,
        match_id: match.id,
        change_amount: result.changesB[i],
        after_score: newScore,
      });

      eloChanges[userId] = { change: result.changesB[i], newScore };
    }
  } else {
    const scoreAVal = teamA[0]?.snapshot_score || 50;
    const scoreBVal = teamB[0]?.snapshot_score || 50;

    const result = calculateEloChange(scoreAVal, scoreBVal, teamAActualScore);

    if (teamA[0]) {
      await db.from('users').update({ current_score: result.newScoreA }).eq('id', teamA[0].user_id);
      await db.from('score_logs').insert({
        user_id: teamA[0].user_id,
        match_id: match.id,
        change_amount: result.changeA,
        after_score: result.newScoreA,
      });
      eloChanges[teamA[0].user_id] = { change: result.changeA, newScore: result.newScoreA };
    }

    if (teamB[0]) {
      await db.from('users').update({ current_score: result.newScoreB }).eq('id', teamB[0].user_id);
      await db.from('score_logs').insert({
        user_id: teamB[0].user_id,
        match_id: match.id,
        change_amount: result.changeB,
        after_score: result.newScoreB,
      });
      eloChanges[teamB[0].user_id] = { change: result.changeB, newScore: result.newScoreB };
    }
  }

  // 更新比赛状态为已生效（静默）
  await db
    .from('matches')
    .update({ status: 3 })
    .eq('id', match.id);

  return {
    scoreA,
    scoreB,
    winner: scoreA > scoreB ? 'A' : 'B',
    eloChanges,
    method: 'AUTO_TIMEOUT',
  };
}
