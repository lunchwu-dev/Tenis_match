/**
 * API 类型定义
 * 前端调用后端接口的类型声明
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// 用户相关类型
export interface UserProfile {
  id: string;
  wx_openid: string;
  nickname: string;
  avatar_url: string | null;
  gender: number | null;
  current_score: number;
  radar_data: RadarData | null;
  created_at: string;
  stats: UserStats;
}

export interface RadarData {
  baseline: number;
  serve: number;
  netplay: number;
  tactics: number;
  receive: number;
}

export interface UserStats {
  totalMatches: number;
  winMatches: number;
  loseMatches: number;
  winRate: number;
  recentForm: ('W' | 'L')[];
}

// 测评相关类型
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
  radarData: RadarData;
  currentScore: number;
  userId: string;
}

// 比赛相关类型
export interface MatchResponse {
  id: string;
  creator_id: string;
  match_type: 1 | 2;
  status: 0 | 1 | 2 | 3 | 4;
  score_a: number | null;
  score_b: number | null;
  submitter_id: string | null;
  timeout_at: string | null;
  created_at: string;
  participants: MatchParticipant[];
}

export interface MatchParticipant {
  id: string;
  match_id: string;
  user_id: string;
  team: 'A' | 'B';
  snapshot_score: number;
  confirm_status: 0 | 1 | 2;
  user?: {
    nickname: string;
    avatar_url: string | null;
    current_score: number;
  };
}

// 排行榜相关类型
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

// 登录相关类型
export interface LoginResponse {
  token: string;
  user: UserProfile;
}
