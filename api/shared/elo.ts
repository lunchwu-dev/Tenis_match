/**
 * Elo 积分引擎
 * 核心算法参考：https://www.geeksforgeeks.org/elo-rating-algorithm/
 */

export interface EloConfig {
  kFactor: number;          // K因子：初学者K=32，熟手K=24，高手K=16
  minK: number;            // 最低K因子（高手）
  decayThreshold: number;   // 衰减阈值（天数）
  decayRate: number;        // 每次比赛衰减率
}

export const DEFAULT_ELO_CONFIG: EloConfig = {
  kFactor: 32,              // 新用户/初学者
  minK: 16,                // 高手（2000+积分）
  decayThreshold: 30,      // 30天不比赛开始衰减
  decayRate: 0.05,         // 每次比赛衰减5%
};

/**
 * 根据积分确定K因子
 * 积分越高，K因子越小（防止高分用户波动过大）
 */
export function getKFactor(score: number, config: EloConfig = DEFAULT_ELO_CONFIG): number {
  if (score >= 2000) return config.minK;
  if (score >= 1500) return 24;
  if (score >= 1000) return 32;
  return 40; // 低于1000的新手
}

/**
 * 计算预期胜率 (Elo核心公式)
 * @param ratingA A方积分
 * @param ratingB B方积分
 */
export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * 计算单场比赛积分变动
 * @param scoreA A方当前积分
 * @param scoreB B方当前积分
 * @param actualA A方实际得分 (1=胜, 0=负, 0.5=平)
 * @param isDoubles 是否双打（使用平均分）
 */
export function calculateEloChange(
  scoreA: number,
  scoreB: number,
  actualA: number,
  isDoubles: boolean = false
): { changeA: number; changeB: number; newScoreA: number; newScoreB: number } {
  const K = getKFactor(scoreA);
  
  const expectedA = expectedScore(scoreA, scoreB);
  const changeA = Math.round(K * (actualA - expectedA));
  
  // Elo是零和系统，一人加的分等于另一人扣的分
  const changeB = -changeA;
  const newScoreA = Math.max(0, scoreA + changeA);
  const newScoreB = Math.max(0, scoreB + changeB);

  return {
    changeA,
    changeB,
    newScoreA,
    newScoreB,
  };
}

/**
 * 计算双打队伍平均积分
 */
export function calculateTeamAverage(scores: number[]): number {
  if (scores.length === 0) return 0;
  const sum = scores.reduce((a, b) => a + b, 0);
  return Math.round(sum / scores.length);
}

/**
 * 计算双打队伍积分变动
 * 双打采用"短板效应"：取两人平均分作为队伍基准
 */
export function calculateDoublesEloChange(
  teamAScores: number[], // A队成员积分数组
  teamBScores: number[], // B队成员积分数组
  teamAActualScore: number, // A队实际得分 (1=胜, 0=负, 0.5=平)
): { changesA: number[]; changesB: number[]; newScoresA: number[]; newScoresB: number[] } {
  // 队伍平均分作为Elo计算基准
  const teamAAvg = calculateTeamAverage(teamAScores);
  const teamBAvg = calculateTeamAverage(teamBScores);

  const { changeA, changeB } = calculateEloChange(teamAAvg, teamBAvg, teamAActualScore);

  // 变动按个人积分占比分配（可选，这里简化：平均分配）
  const countA = teamAScores.length;
  const countB = teamBScores.length;
  
  // 简化处理：每人承担相同的积分变动
  const changesA = teamAScores.map(() => changeA);
  const changesB = teamBScores.map(() => changeB);
  
  const newScoresA = teamAScores.map((s, i) => Math.max(0, s + changesA[i]));
  const newScoresB = teamBScores.map((s, i) => Math.max(0, s + changesB[i]));

  return {
    changesA,
    changesB,
    newScoresA,
    newScoresB,
  };
}

/**
 * 判断是否需要惩罚（防刷分）
 * 同一组合高频交手且一方持续获胜，收益递减
 */
export function shouldReduceReward(
  recentMatches: { opponentId: string; result: 'win' | 'lose' }[],
  currentOpponentId: string
): number {
  // 最近10场与同一对手的比赛
  const sameOpponentMatches = recentMatches
    .filter(m => m.opponentId === currentOpponentId)
    .slice(-10);

  if (sameOpponentMatches.length < 3) return 1.0; // 不够3场，正常奖励

  const winCount = sameOpponentMatches.filter(m => m.result === 'win').length;
  const winRate = winCount / sameOpponentMatches.length;

  // 如果胜率超过80%，奖励减半
  if (winRate > 0.8) return 0.5;
  // 如果胜率超过60%，奖励打8折
  if (winRate > 0.6) return 0.8;
  
  return 1.0;
}

/**
 * 将0-100分数映射到NTRP等级
 */
export function scoreToNTRP(score: number): string {
  if (score >= 90) return '5.5+';
  if (score >= 80) return '5.0';
  if (score >= 70) return '4.5';
  if (score >= 60) return '4.0';
  if (score >= 50) return '3.5';
  if (score >= 40) return '3.0';
  if (score >= 30) return '2.5';
  if (score >= 20) return '2.0';
  return '1.5';
}

/**
 * 根据积分获取段位称号
 */
export function getRankTitle(score: number): string {
  if (score >= 90) return '宗师';
  if (score >= 80) return '大魔王';
  if (score >= 70) return '真大神';
  if (score >= 60) return '狠角色';
  if (score >= 50) return '实力派';
  if (score >= 40) return '潜力股';
  if (score >= 30) return '初出茅庐';
  return '网球新人';
}