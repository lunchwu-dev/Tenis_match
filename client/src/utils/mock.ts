// 本地 Mock 数据层
// 当 .env 中 VITE_USE_MOCK=true 时，request() 直接返回此处数据，
// 微信开发者工具中无需后端即可完整预览设计稿与各页面交互流程。
// 真实联调：将 VITE_USE_MOCK 置为 false，并启动后端（见微信端网络超时修复报告）。

const MOCK_USER_ID = 'u_me'

export const mockUser = {
  id: MOCK_USER_ID,
  nickname: '张大力',
  avatar_url: null,
  gender: '男',
  current_score: 62.4,
  radar_data: {
    baseline: 0.72,
    serve: 0.6,
    netplay: 0.5,
    tactics: 0.66,
    receive: 0.55,
  },
  stats: {
    totalMatches: 23,
    winMatches: 15,
    loseMatches: 8,
    winRate: 65,
    recentForm: ['W', 'W', 'L', 'W', 'W'],
  },
}

const mockMatches = [
  {
    matchId: 'm_1',
    matchType: '单打',
    status: 3,
    statusText: '已生效',
    statusColor: '#D4F820',
    scoreA: 6,
    scoreB: 4,
    scoreChange: 12,
    currentUserTeam: 'A',
    teamA: [{ userId: MOCK_USER_ID, nickname: '张大力', avatarUrl: '' }],
    teamB: [{ userId: 'u_2', nickname: '李雷', avatarUrl: '' }],
    opponentNames: '李雷',
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    timeoutAt: null,
    isCreator: true,
  },
  {
    matchId: 'm_2',
    matchType: '单打',
    status: 3,
    statusText: '已生效',
    statusColor: '#EF4444',
    scoreA: 3,
    scoreB: 6,
    scoreChange: -10,
    currentUserTeam: 'A',
    teamA: [{ userId: MOCK_USER_ID, nickname: '张大力', avatarUrl: '' }],
    teamB: [{ userId: 'u_3', nickname: '韩梅梅', avatarUrl: '' }],
    opponentNames: '韩梅梅',
    createdAt: new Date(Date.now() - 26 * 3600 * 1000).toISOString(),
    timeoutAt: null,
    isCreator: false,
  },
  {
    matchId: 'm_3',
    matchType: '单打',
    status: 2,
    statusText: '待确认',
    statusColor: '#FACC15',
    scoreA: 6,
    scoreB: 2,
    scoreChange: 0,
    currentUserTeam: 'A',
    teamA: [{ userId: MOCK_USER_ID, nickname: '张大力', avatarUrl: '' }],
    teamB: [{ userId: 'u_4', nickname: '王伟', avatarUrl: '' }],
    opponentNames: '王伟',
    createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    timeoutAt: new Date(Date.now() + 7 * 3600 * 1000).toISOString(),
    isCreator: true,
  },
  {
    matchId: 'm_4',
    matchType: '单打',
    status: 1,
    statusText: '进行中',
    statusColor: '#9CA3AF',
    scoreA: null,
    scoreB: null,
    scoreChange: 0,
    currentUserTeam: 'A',
    teamA: [{ userId: MOCK_USER_ID, nickname: '张大力', avatarUrl: '' }],
    teamB: [{ userId: 'u_5', nickname: '赵强', avatarUrl: '' }],
    opponentNames: '赵强',
    createdAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    timeoutAt: null,
    isCreator: false,
  },
]

const mockLeaderboard = [
  { rank: 1, userId: 'u_l1', nickname: '球王老王', avatar_url: null, score: 84.2, winRate: 78, totalMatches: 142 },
  { rank: 2, userId: 'u_l2', nickname: '风一样的男子', avatar_url: null, score: 79.5, winRate: 71, totalMatches: 98 },
  { rank: 3, userId: 'u_l3', nickname: '网球小钢炮', avatar_url: null, score: 76.1, winRate: 69, totalMatches: 77 },
  { rank: 4, userId: 'u_l4', nickname: '林志炫', avatar_url: null, score: 71.3, winRate: 64, totalMatches: 65 },
  { rank: 5, userId: 'u_l5', nickname: '陈大文', avatar_url: null, score: 68.0, winRate: 62, totalMatches: 54 },
  { rank: 6, userId: 'u_l6', nickname: '周杰轮', avatar_url: null, score: 64.8, winRate: 60, totalMatches: 41 },
  { rank: 7, userId: MOCK_USER_ID, nickname: '张大力', avatar_url: null, score: 62.4, winRate: 65, totalMatches: 23 },
  { rank: 8, userId: 'u_l8', nickname: '吴彦祖', avatar_url: null, score: 58.9, winRate: 55, totalMatches: 33 },
  { rank: 9, userId: 'u_l9', nickname: '刘德滑', avatar_url: null, score: 55.2, winRate: 52, totalMatches: 28 },
  { rank: 10, userId: 'u_l10', nickname: '张学友', avatar_url: null, score: 51.7, winRate: 49, totalMatches: 19 },
  { rank: 11, userId: 'u_l11', nickname: '郭富城', avatar_url: null, score: 47.3, winRate: 46, totalMatches: 15 },
  { rank: 12, userId: 'u_l12', nickname: '黎明', avatar_url: null, score: 43.0, winRate: 44, totalMatches: 12 },
]

export const getMockResponse = (
  url: string,
  _method = 'GET',
  _data?: any,
): { success: boolean; data?: any } => {
  if (url.includes('/api/users/me')) {
    return { success: true, data: mockUser }
  }
  if (url.includes('/api/login')) {
    return { success: true, data: { token: 'mock-token-' + Date.now(), user: mockUser } }
  }
  if (url.includes('/api/match/list')) {
    return { success: true, data: mockMatches }
  }
  if (url.includes('/api/leaderboard')) {
    return { success: true, data: mockLeaderboard }
  }
  if (url.includes('/api/assessment/submit')) {
    return { success: true, data: { user: { ...mockUser } } }
  }
  if (url.includes('/api/match/') && !url.includes('/api/match/list')) {
    const matchId = url.split('/').pop() || 'm_mock'
    // 对 GET /api/match/:id 返回完整比赛信息，供赛前准备室加载
    if (!['create', 'join', 'start', 'submit-score', 'confirm', 'reject', 'timeout-settlement'].includes(matchId)) {
      return {
        success: true,
        data: {
          matchId,
          matchType: '单打',
          status: 1,
          statusText: '进行中',
          creator: { id: MOCK_USER_ID, nickname: '张大力', avatar_url: null, current_score: 62.4 },
          teamA: [{ userId: MOCK_USER_ID, nickname: '张大力', avatarUrl: '', snapshotScore: 62.4 }],
          teamB: [],
        },
      }
    }
    // create / join / start / submit-score / confirm / reject 等写操作兜底
    return { success: true, data: { matchId: 'm_mock_' + Date.now() } }
  }
  // 兜底：任何未显式覆盖的接口在离线时也不抛 timeout
  return { success: true, data: {} }
}
