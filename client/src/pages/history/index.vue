<template>
  <view class="page bg-dark-slate text-white font-body relative history-root" :style="rootStyle">

    <!-- 顶部标题区（固定，避开 status bar） -->
    <view
      class="header px-6 pb-4 bg-card-bg border-b border-gray-800"
      :style="{ paddingTop: (statusBarHeight + 12) + 'px' }"
    >
      <view class="flex justify-between items-center mb-1">
        <text class="font-display font-bold text-2xl">战绩大厅</text>
        <view class="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center">
          <text class="text-gray-400 text-sm">≡</text>
        </view>
      </view>
      <text class="text-gray-500 text-xs">近期比赛</text>
    </view>

    <!-- 可滚动内容区：显式高度 = 100vh - header - TabBar - 安全区 -->
    <scroll-view
      scroll-y
      :show-scrollbar="false"
      class="hide-scroll"
      :style="scrollStyle"
    >
      <view class="px-6 pt-4 pb-8">
        <!-- 待确认比赛提示 -->
        <view
          v-if="pendingMatch"
          @tap="goToPending"
          class="bg-yellow-500/10 border border-yellow-500/50 rounded-xl p-4 flex items-center justify-between mb-6"
        >
          <view class="flex items-center gap-3">
            <text class="text-yellow-500 text-lg font-bold">●</text>
            <view class="flex flex-col">
              <text class="text-sm font-bold text-yellow-400">{{ pendingMatchText }}</text>
              <text class="text-[10px] text-yellow-500/70 mt-1">{{ pendingMatchDetail }}</text>
            </view>
          </view>
          <text class="text-yellow-500 text-xl">›</text>
        </view>

        <!-- 历史战绩列表 -->
        <view class="flex flex-col gap-4">
          <view
            v-for="match in historyList"
            :key="match.matchId"
            class="match-card"
            :class="match.isWin ? 'match-win' : 'match-lose'"
            hover-class="card-hover"
          >
            <!-- 行1：时间与积分变化 -->
            <view class="flex justify-between items-center mb-3">
              <text class="text-[10px] text-gray-500">{{ formatDate(match.createdAt) }} · {{ match.matchType }}</text>
              <view class="flex items-center gap-1">
                <text
                  class="font-display font-bold text-xs"
                  :class="match.isWin ? 'text-tennis-neon' : 'text-red-500'"
                >{{ match.isWin ? '▲' : '▼' }}{{ Math.abs(match.scoreChange || 0) }}</text>
              </view>
            </view>
            <!-- 行2：头像 - 我方信息 - 比分 - 对手信息 - 对手头像 -->
            <view class="flex items-center justify-between gap-3">
              <!-- 我方 -->
              <view class="flex items-center gap-2 flex-1 min-w-0">
                <view
                  class="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                  :class="match.isWin ? 'bg-tennis-neon/15 text-tennis-neon' : 'bg-red-500/15 text-red-500'"
                >{{ myTeamInitial(match) }}</view>
                <view class="min-w-0">
                  <text class="text-[10px] font-bold block" :class="match.isWin ? 'text-tennis-neon' : 'text-red-500'">{{ match.isWin ? '胜' : '负' }}</text>
                  <text class="text-xs font-bold text-white truncate block">{{ myTeamNames(match) }}</text>
                </view>
              </view>
              <!-- 比分 -->
              <text class="font-display font-bold text-2xl text-white tracking-widest flex-shrink-0">{{ match.scoreA ?? '-' }} : {{ match.scoreB ?? '-' }}</text>
              <!-- 对手 -->
              <view class="flex items-center gap-2 flex-1 min-w-0 justify-end">
                <view class="min-w-0 text-right">
                  <text class="text-[10px] font-bold block" :class="match.isWin ? 'text-red-500' : 'text-tennis-neon'">{{ match.isWin ? '负' : '胜' }}</text>
                  <text class="text-xs font-bold text-white truncate block">{{ oppTeamNames(match) }}</text>
                </view>
                <view
                  class="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                  :class="match.isWin ? 'bg-red-500/15 text-red-500' : 'bg-tennis-neon/15 text-tennis-neon'"
                >{{ oppTeamInitial(match) }}</view>
              </view>
            </view>
          </view>

          <!-- 进行中/待确认的比赛（非已生效）也展示 -->
          <view
            v-for="match in inProgressList"
            :key="match.matchId"
            class="match-card match-pending"
            hover-class="card-hover"
          >
            <view class="flex justify-between items-center mb-3">
              <text class="text-[10px] text-gray-500">{{ formatDate(match.createdAt) }} · {{ match.matchType }}</text>
              <text class="font-display text-gray-400 font-bold text-sm">{{ match.statusText }}</text>
            </view>
            <view class="flex items-center justify-between gap-3">
              <view class="flex items-center gap-2 flex-1 min-w-0">
                <view class="w-9 h-9 rounded-full bg-tennis-neon/15 flex items-center justify-center text-sm font-bold text-tennis-neon flex-shrink-0">{{ myTeamInitial(match) }}</view>
                <view class="min-w-0">
                  <text class="text-[10px] text-tennis-neon font-bold block">我方</text>
                  <text class="text-xs font-bold text-white truncate block">{{ myTeamNames(match) }}</text>
                </view>
              </view>
              <text class="font-display font-bold text-2xl text-white tracking-widest flex-shrink-0 opacity-60">{{ match.scoreA ?? '-' }} : {{ match.scoreB ?? '-' }}</text>
              <view class="flex items-center gap-2 flex-1 min-w-0 justify-end">
                <view class="min-w-0 text-right">
                  <text class="text-[10px] text-gray-500 font-bold block">对手</text>
                  <text class="text-xs font-bold text-white truncate block">{{ oppTeamNames(match) }}</text>
                </view>
                <view class="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center text-sm font-bold text-gray-400 flex-shrink-0">{{ oppTeamInitial(match) }}</view>
              </view>
            </view>
          </view>

          <view v-if="historyList.length === 0 && inProgressList.length === 0 && !pendingMatch" class="flex flex-col items-center justify-center py-16 gap-4">
            <text class="text-4xl">🎾</text>
            <text class="text-gray-500 text-sm">暂无比赛记录</text>
          </view>
        </view>

        <view class="h-8"></view>
      </view>
    </scroll-view>

    <!-- 自定义 TabBar -->
    <tabbar />

    <!-- 常驻「发起比赛」悬浮按钮（不随滚动，位于 TabBar 之上） -->
    <create-fab />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import tabbar from '@/components/tabbar/index.vue';
import createFab from '@/components/create-fab/index.vue';
import { TABBAR_HEIGHT } from '@/utils/layout';
import { useViewport } from '@/utils/viewport';
import { request } from '@/utils/request';

interface MatchItem {
  matchId: string;
  matchType: string;
  status: number;
  statusText: string;
  statusColor: string;
  scoreA: number | null;
  scoreB: number | null;
  scoreChange?: number;
  currentUserTeam: 'A' | 'B';
  teamA: Array<{ userId: string; nickname: string; avatarUrl: string }>;
  teamB: Array<{ userId: string; nickname: string; avatarUrl: string }>;
  opponentNames: string;
  createdAt: string;
  timeoutAt: string | null;
  isCreator: boolean;
  isWin?: boolean;
}

const statusBarHeight = ref(20);
const { rootStyle, heightPx } = useViewport();
const matchList = ref<MatchItem[]>([]);
const currentUserId = ref<string>('');

const scrollStyle = computed(() => ({
  height: `calc(${heightPx.value} - ${statusBarHeight.value + 12 + 24 + 40}px - ${TABBAR_HEIGHT}px - env(safe-area-inset-bottom))`,
  width: '100%',
}));

// 待确认比赛（status=2）
const pendingMatch = computed(() => {
  return matchList.value.find((m) => m.status === 2) || null;
});

// 进行中比赛（status=0 或 1，排除已生效和待确认）
const inProgressList = computed(() => {
  return matchList.value.filter((m) => m.status === 0 || m.status === 1);
});

// 已生效的历史比赛（status=3），并计算胜负
const historyList = computed(() => {
  return matchList.value
    .filter((m) => m.status === 3)
    .map((m) => {
      let isWin = false;
      if (m.scoreA != null && m.scoreB != null) {
        if (m.currentUserTeam === 'A') isWin = m.scoreA > m.scoreB;
        else isWin = m.scoreB > m.scoreA;
      }
      return { ...m, isWin };
    });
});

const pendingMatchText = computed(() => {
  if (!pendingMatch.value) return '';
  return `您有 1 场待确认比分比赛`;
});

const pendingMatchDetail = computed(() => {
  if (!pendingMatch.value) return '';
  const opp = pendingMatch.value.opponentNames || '对手';
  const sa = pendingMatch.value.scoreA ?? '-';
  const sb = pendingMatch.value.scoreB ?? '-';
  const time = formatTimeAgo(pendingMatch.value.createdAt);
  return `vs ${opp} · ${sa}:${sb} · ${time}前提交`;
});

// 格式化相对时间
const formatTimeAgo = (isoString: string): string => {
  if (!isoString) return '';
  const diff = Date.now() - new Date(isoString).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return '刚刚';
  if (hours < 24) return `${hours}小时`;
  const days = Math.floor(hours / 24);
  return `${days}天`;
};

onMounted(() => {
  const sysInfo = uni.getSystemInfoSync();
  statusBarHeight.value = sysInfo.statusBarHeight || 20;

  const storedUser = uni.getStorageSync('user_info');
  if (storedUser) {
    try {
      const user = typeof storedUser === 'string' ? JSON.parse(storedUser) : storedUser;
      currentUserId.value = user.id;
    } catch (e) {}
  }

  if (currentUserId.value) {
    fetchMatchList();
  }
});

const fetchMatchList = async () => {
  try {
    const res = await request<{
      success: boolean;
      data?: MatchItem[];
      error?: string;
    }>({
      url: `/api/match/list?userId=${currentUserId.value}`,
      method: 'GET',
    });

    if (res.success && res.data) {
      matchList.value = res.data;
    }
  } catch (error) {
    console.error('Fetch match list failed:', error);
  }
};

// 格式化日期
const formatDate = (isoString: string): string => {
  if (!isoString) return '';
  const d = new Date(isoString);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
};

// 组合名拼接（双打时为“A、B”，单打为单人）
const joinNames = (team: Array<{ nickname: string }>): string => {
  if (!team || team.length === 0) return '待定';
  return team.map((p) => p.nickname || '球友').join('、');
};

// 我方组合名（依据 currentUserTeam 判断归属）
const myTeamNames = (match: MatchItem): string => {
  const team = match.currentUserTeam === 'A' ? match.teamA : match.teamB;
  return joinNames(team);
};

// 对手组合名
const oppTeamNames = (match: MatchItem): string => {
  const team = match.currentUserTeam === 'A' ? match.teamB : match.teamA;
  return joinNames(team);
};

// 我方首字（用于头像占位）
const myTeamInitial = (match: MatchItem): string => {
  const team = match.currentUserTeam === 'A' ? match.teamA : match.teamB;
  const name = team?.[0]?.nickname || '我';
  return name.charAt(0);
};

// 对手首字
const oppTeamInitial = (match: MatchItem): string => {
  const team = match.currentUserTeam === 'A' ? match.teamB : match.teamA;
  const name = team?.[0]?.nickname || '?';
  return name.charAt(0);
};

const goToPending = () => {
  if (!pendingMatch.value) {
    uni.navigateTo({ url: '/pages/match/create' });
    return;
  }
  uni.navigateTo({ url: `/pages/match/confirm?matchId=${pendingMatch.value.matchId}` });
};
</script>

<style scoped>
page {
  background-color: #0A0E17;
}
.history-root {
  width: 100%;
  height: 100vh;
  overflow: hidden;
}
.header {
  position: relative;
  z-index: 10;
}
.hide-scroll::-webkit-scrollbar { display: none; }
.hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
.card-hover { transform: scale(0.985); transition: transform 0.1s ease; }
.match-card {
  background-color: #151A26;
  padding: 16px;
  border-radius: 16px;
  position: relative;
  overflow: hidden;
}
.match-win { border: 1px solid rgba(212, 248, 32, 0.3); }
.match-lose { border: 1px solid rgba(255, 255, 255, 0.06); opacity: 0.9; }
.match-pending { border: 1px solid rgba(255, 255, 255, 0.06); }
</style>
