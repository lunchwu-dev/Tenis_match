/**
 * 测评 DTO
 */
export interface AssessmentQuestion {
  id: number;
  category: 'baseline' | 'serve' | 'netplay' | 'tactics' | 'receive';
  question: string;
  options: {
    label: string;
    score: number;
  }[];
}

export interface AssessmentResult {
  totalScore: number;
  ntrpLevel: string;
  radarData: {
    baseline: number;
    serve: number;
    netplay: number;
    tactics: number;
    receive: number;
  };
  currentScore: number; // 转化后的 0-100 分
}

export interface SubmitAssessmentDto {
  answers: {
    questionId: number;
    selectedOption: number; // 选项索引
  }[];
}

/**
 * 测评题目库
 * 基于网球能力评估 NTRP 标准
 */
export const assessmentQuestions: AssessmentQuestion[] = [
  // 底线能力
  {
    id: 1,
    category: 'baseline',
    question: '在正手击球时，你的击球稳定性和力量如何？',
    options: [
      { label: '经常失误，力量不足', score: 1 },
      { label: '勉强能打多拍，但不稳定', score: 2 },
      { label: '稳定，能打出一定速度', score: 3 },
      { label: '非常稳定，力量充足，能打出角度', score: 4 },
      { label: '专业级，正手是主要得分武器', score: 5 },
    ],
  },
  {
    id: 2,
    category: 'baseline',
    question: '反手击球时你的表现如何？',
    options: [
      { label: '主要用正手，回避反手', score: 1 },
      { label: '勉强能回球，但不稳定', score: 2 },
      { label: '稳定，能配合正手使用', score: 3 },
      { label: '双反稳定有力，单反有一定攻击性', score: 4 },
      { label: '专业级，反手是稳定得分手段', score: 5 },
    ],
  },
  {
    id: 3,
    category: 'baseline',
    question: '面对对手的底线快球，你的反应和脚步如何？',
    options: [
      { label: '经常跟不上节奏', score: 1 },
      { label: '勉强能到位，但回球质量差', score: 2 },
      { label: '步伐灵活，能到位击球', score: 3 },
      { label: '步伐出色，能打出反击', score: 4 },
      { label: '顶级脚步，能在压力下打出精准回球', score: 5 },
    ],
  },
  // 发球
  {
    id: 4,
    category: 'serve',
    question: '你的一发进球率和威力如何？',
    options: [
      { label: '进球率低，威力不足', score: 1 },
      { label: '进球率一般，威力有限', score: 2 },
      { label: '进球率尚可，有一定威力', score: 3 },
      { label: '进球率高，威力十足', score: 4 },
      { label: '专业级，一发是主要得分手段', score: 5 },
    ],
  },
  {
    id: 5,
    category: 'serve',
    question: '你的二发能力和成功率如何？',
    options: [
      { label: '经常双误', score: 1 },
      { label: '偶尔双误，二发偏软', score: 2 },
      { label: '稳定性不错，有一定旋转', score: 3 },
      { label: '二发稳定且有深度，能限制对手', score: 4 },
      { label: '专业级，二发有攻击性', score: 5 },
    ],
  },
  {
    id: 6,
    category: 'serve',
    question: '你的发球战术运用如何？',
    options: [
      { label: '只会单一发球，没有战术', score: 1 },
      { label: '偶尔变换落点，但效果一般', score: 2 },
      { label: '能根据对手调整发球策略', score: 3 },
      { label: '战术丰富，能有效调动对手', score: 4 },
      { label: '发球战术精湛，能主导比赛节奏', score: 5 },
    ],
  },
  // 网前
  {
    id: 7,
    category: 'netplay',
    question: '你的网前截击能力如何？',
    options: [
      { label: '很少上网，截击技术生疏', score: 1 },
      { label: '偶尔上网，截击不稳定', score: 2 },
      { label: '能完成基本截击，有一定稳定性', score: 3 },
      { label: '截击稳定，能处理快球', score: 4 },
      { label: '网前技术精湛，截击是主要得分手段', score: 5 },
    ],
  },
  {
    id: 8,
    category: 'netplay',
    question: '你在网前的移动和决策如何？',
    options: [
      { label: '上网时机差，容易被打穿', score: 1 },
      { label: '时机一般，有时判断失误', score: 2 },
      { label: '时机合理，能做出正确选择', score: 3 },
      { label: '时机精准，能有效控制网前', score: 4 },
      { label: '网前意识顶级，是战术核心', score: 5 },
    ],
  },
  // 战术
  {
    id: 9,
    category: 'tactics',
    question: '你在比赛中的战术调整能力如何？',
    options: [
      { label: '只会一种打法，不懂变通', score: 1 },
      { label: '偶尔能调整，但效果不明显', score: 2 },
      { label: '能根据对手调整基本战术', score: 3 },
      { label: '战术多样，调整及时有效', score: 4 },
      { label: '战术大师，能主导比赛节奏', score: 5 },
    ],
  },
  {
    id: 10,
    category: 'tactics',
    question: '面对不同类型对手，你的应对能力？',
    options: [
      { label: '不知道如何应对不同风格', score: 1 },
      { label: '勉强应对，效果一般', score: 2 },
      { label: '能识别对手类型并做出应对', score: 3 },
      { label: '应对自如，能克制对手', score: 4 },
      { label: '能针对任何对手制定并执行战术', score: 5 },
    ],
  },
  // 接发
  {
    id: 11,
    category: 'receive',
    question: '你的接发球稳定性和攻击性如何？',
    options: [
      { label: '经常失误，接发很被动', score: 1 },
      { label: '勉强能接，但缺乏攻击性', score: 2 },
      { label: '稳定，能打出一定攻击性', score: 3 },
      { label: '接发稳定有力，能破发', score: 4 },
      { label: '专业级，接发是主要得分手段', score: 5 },
    ],
  },
  {
    id: 12,
    category: 'receive',
    question: '面对强力发球，你的应对能力？',
    options: [
      { label: '很难接住，经常失误', score: 1 },
      { label: '能勉强接起，但质量差', score: 2 },
      { label: '能稳定接起，有一定深度', score: 3 },
      { label: '接起重炮游刃有余，能打出反击', score: 4 },
      { label: '顶级接发，能破掉对手的发球局', score: 5 },
    ],
  },
];

/**
 * NTRP 等级映射
 */
function getNtrpLevel(score: number): { level: string; range: [number, number] } {
  if (score <= 20) return { level: 'NTRP 2.0', range: [0, 20] };
  if (score <= 30) return { level: 'NTRP 2.5', range: [21, 30] };
  if (score <= 40) return { level: 'NTRP 3.0', range: [31, 40] };
  if (score <= 50) return { level: 'NTRP 3.5', range: [41, 50] };
  if (score <= 60) return { level: 'NTRP 4.0', range: [51, 60] };
  if (score <= 70) return { level: 'NTRP 4.5', range: [61, 70] };
  if (score <= 80) return { level: 'NTRP 5.0', range: [71, 80] };
  if (score <= 90) return { level: 'NTRP 5.5', range: [81, 90] };
  return { level: 'NTRP 6.0+', range: [91, 100] };
}

/**
 * 计算测评结果
 */
export function calculateAssessmentResult(
  answers: { questionId: number; selectedOption: number }[]
): AssessmentResult {
  // 初始化各维度得分
  const categoryScores = {
    baseline: [] as number[],
    serve: [] as number[],
    netplay: [] as number[],
    tactics: [] as number[],
    receive: [] as number[],
  };

  // 收集每个维度的得分
  for (const answer of answers) {
    const question = assessmentQuestions.find((q) => q.id === answer.questionId);
    if (!question) continue;

    const selectedScore = question.options[answer.selectedOption]?.score || 1;
    categoryScores[question.category].push(selectedScore);
  }

  // 计算每个维度的平均分（转换为0-100）
  const radarData = {
    baseline: Math.round((categoryScores.baseline.reduce((a, b) => a + b, 0) / categoryScores.baseline.length) * 20),
    serve: Math.round((categoryScores.serve.reduce((a, b) => a + b, 0) / categoryScores.serve.length) * 20),
    netplay: Math.round((categoryScores.netplay.reduce((a, b) => a + b, 0) / categoryScores.netplay.length) * 20),
    tactics: Math.round((categoryScores.tactics.reduce((a, b) => a + b, 0) / categoryScores.tactics.length) * 20),
    receive: Math.round((categoryScores.receive.reduce((a, b) => a + b, 0) / categoryScores.receive.length) * 20),
  };

  // 计算总分
  const allScores = [
    ...categoryScores.baseline,
    ...categoryScores.serve,
    ...categoryScores.netplay,
    ...categoryScores.tactics,
    ...categoryScores.receive,
  ];
  const avgScore = allScores.reduce((a, b) => a + b, 0) / allScores.length;
  const totalScore = Math.round(avgScore * 20); // 转换为0-100

  const ntrpInfo = getNtrpLevel(totalScore);

  return {
    totalScore,
    ntrpLevel: ntrpInfo.level,
    radarData,
    currentScore: totalScore,
  };
}

/**
 * 前端本地题库题号 → 维度/满分 映射
 * 前端 assessment 页面使用本地动态题库（base/newbie/advanced 三套分叉），
 * 提交体为 { q1: { score }, q2: { score }, ... } 对象格式，题号 q1~q23 为字符串，
 * 且无显式维度字段。此处建立与前端题号一一对应的维度映射与单题满分，
 * 用于把前端提交的成绩聚合为 5 维雷达数据（0-1）与综合积分（0-100）。
 * 维度归类遵循题目语义：底线相持/正反手→baseline，发球→serve，网前→netplay，
 * 战术/心理/步伐/规则→tactics，接发球→receive。
 */
export const QUESTION_DIMENSION_MAP: Record<
  string,
  { dimension: keyof AssessmentResult['radarData']; maxScore: number }
> = {
  // baseline（底线相持 / 正反手 / 经验）
  q1: { dimension: 'baseline', maxScore: 5 },
  q2: { dimension: 'baseline', maxScore: 6 },
  q4: { dimension: 'baseline', maxScore: 5 },
  q5: { dimension: 'baseline', maxScore: 4 },
  q10: { dimension: 'baseline', maxScore: 8 },
  q11: { dimension: 'baseline', maxScore: 9 },
  q12: { dimension: 'baseline', maxScore: 8 },
  q14: { dimension: 'baseline', maxScore: 6 },
  // serve（发球）
  q6: { dimension: 'serve', maxScore: 4 },
  q15: { dimension: 'serve', maxScore: 8 },
  q16: { dimension: 'serve', maxScore: 6 },
  // netplay（网前）
  q13: { dimension: 'netplay', maxScore: 8 },
  q19: { dimension: 'netplay', maxScore: 8 },
  q20: { dimension: 'netplay', maxScore: 7 },
  q21: { dimension: 'netplay', maxScore: 8 },
  // tactics（战术 / 心理 / 步伐 / 规则 / 比赛经验）
  q3: { dimension: 'tactics', maxScore: 10 },
  q7: { dimension: 'tactics', maxScore: 3 },
  q8: { dimension: 'tactics', maxScore: 2 },
  q9: { dimension: 'tactics', maxScore: 5 },
  q22: { dimension: 'tactics', maxScore: 9 },
  q23: { dimension: 'tactics', maxScore: 8 },
  // receive（接发球）
  q17: { dimension: 'receive', maxScore: 6 },
  q18: { dimension: 'receive', maxScore: 7 },
};

/**
 * 根据前端对象格式答案计算测评结果。
 * @param answers 形如 [{ qid: 'q1', score: 3 }, ...]
 */
export function computeResultFromObject(
  answers: { qid: string; score: number }[],
): AssessmentResult {
  const buckets: Record<string, number[]> = {
    baseline: [],
    serve: [],
    netplay: [],
    tactics: [],
    receive: [],
  };
  let totalScore = 0;
  let totalMax = 0;

  for (const { qid, score } of answers) {
    const meta = QUESTION_DIMENSION_MAP[qid];
    if (!meta) continue;
    const ratio = meta.maxScore > 0 ? score / meta.maxScore : 0;
    buckets[meta.dimension].push(ratio);
    totalScore += score;
    totalMax += meta.maxScore;
  }

  const avgOr = (arr: number[]): number =>
    arr.length
      ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100
      : 0.5; // 未作答维度取中间值

  const radarData = {
    baseline: avgOr(buckets.baseline),
    serve: avgOr(buckets.serve),
    netplay: avgOr(buckets.netplay),
    tactics: avgOr(buckets.tactics),
    receive: avgOr(buckets.receive),
  };

  const currentScore = totalMax > 0 ? Math.round((totalScore / totalMax) * 1000) / 10 : 50;
  const ntrpInfo = getNtrpLevel(currentScore);

  return {
    totalScore: currentScore,
    ntrpLevel: ntrpInfo.level,
    radarData,
    currentScore,
  };
}
