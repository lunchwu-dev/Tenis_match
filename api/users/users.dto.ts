/**
 * 用户 DTO (Data Transfer Object)
 */
export interface UserProfileResponse {
  id: string;
  wx_openid: string;
  nickname: string;
  avatar_url: string | null;
  gender: number | null;
  current_score: number;
  radar_data: RadarData | null;
  created_at: string;
}

export interface RadarData {
  baseline: number;    // 底线
  serve: number;        // 发球
  netplay: number;      // 网前
  tactics: number;      // 战术
  receive: number;      // 接发
}

export interface UpdateUserProfileDto {
  nickname?: string;
  avatar_url?: string;
  gender?: number;
}

export interface UserMatchStats {
  totalMatches: number;
  winMatches: number;
  loseMatches: number;
  winRate: number;
  recentForm: ('W' | 'L')[];
}
