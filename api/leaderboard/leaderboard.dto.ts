/**
 * 排行榜 DTO
 */

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  nickname: string;
  avatar_url: string | null;
  score: number;
  winRate: number;
  totalMatches: number;
}

export interface UserRank {
  userId: string;
  rank: number;
  totalUsers: number;
  percentile: number;
}
