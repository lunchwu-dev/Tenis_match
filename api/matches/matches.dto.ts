/**
 * 比赛 DTO
 */

export type MatchStatus = 0 | 1 | 2 | 3 | 4; // 0等候, 1进行中, 2待确认, 3已生效, 4争议废弃
export type MatchType = 1 | 2; // 1: 单打, 2: 双打
export type ConfirmStatus = 0 | 1 | 2; // 0未操作, 1确认, 2驳回

export interface MatchResponse {
  id: string;
  creator_id: string;
  match_type: MatchType;
  status: MatchStatus;
  score_a: number | null;
  score_b: number | null;
  submitter_id: string | null;
  timeout_at: string | null;
  created_at: string;
  participants?: MatchParticipant[];
}

export interface MatchParticipant {
  id: string;
  match_id: string;
  user_id: string;
  team: 'A' | 'B';
  snapshot_score: number;
  confirm_status: ConfirmStatus;
  user?: {
    nickname: string;
    avatar_url: string | null;
    current_score: number;
  };
}

export interface CreateMatchDto {
  match_type: MatchType;
}

export interface SubmitScoreDto {
  score_a: number;
  score_b: number;
}

export interface ConfirmScoreDto {
  confirm: boolean; // true: 确认, false: 驳回
}

export interface JoinMatchDto {
  team: 'A' | 'B';
}

/**
 * 计算 Elo 分数变动
 * 基于标准 Elo 算法
 */
export function calculateEloChange(
  winnerScore: number,
  loserScore: number,
  kFactor: number = 32
): { winnerChange: number; loserChange: number } {
  const expectedWinner = 1 / (1 + Math.pow(10, (loserScore - winnerScore) / 400));
  const expectedLoser = 1 / (1 + Math.pow(10, (winnerScore - loserScore) / 400));

  const winnerChange = Math.round(kFactor * (1 - expectedWinner) * 100) / 100;
  const loserChange = Math.round(kFactor * (0 - expectedLoser) * 100) / 100;

  return {
    winnerChange,
    loserChange,
  };
}
