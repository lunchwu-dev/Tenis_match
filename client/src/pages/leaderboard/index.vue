<template>
  <view class="page bg-dark-slate text-white font-body relative rank-root" :style="rootStyle">

    <!-- Header（固定，避开 status bar） -->
    <view
      class="header px-6 pb-3 bg-card-bg"
      :style="{ paddingTop: (statusBarHeight + 12) + 'px' }"
    >
      <view class="flex items-center justify-between mb-1">
        <text class="font-display font-bold text-2xl">排行榜</text>
      </view>
      <!-- 位置信息作为副标题左对齐，避免与小程序右上角胶囊按钮重叠 -->
      <text class="text-gray-500 text-xs block mb-3">上海徐汇 · 好友积分榜</text>
      <!-- 仅保留两个榜单：同城 / 好友（全国已移除） -->
      <view class="flex gap-3">
        <view
          class="px-5 py-2 rounded-full text-sm font-medium transition-all"
          :class="currentTab === 0 ? 'bg-[#D4F820] text-dark-slate font-bold' : 'bg-gray-800/50 text-gray-400'"
          hover-class="tab-hover"
          @tap="currentTab = 0"
        >同城</view>
        <view
          class="px-5 py-2 rounded-full text-sm font-medium transition-all"
          :class="currentTab === 1 ? 'bg-[#D4F820] text-dark-slate font-bold' : 'bg-gray-800/50 text-gray-400'"
          hover-class="tab-hover"
          @tap="currentTab = 1"
        >好友</view>
      </view>
    </view>

    <!-- 可滚动内容 -->
    <scroll-view
      scroll-y
      :show-scrollbar="false"
      class="hide-scroll"
      :style="scrollStyle"
    >
      <view class="p-6">
        <!-- 同城榜单：暂未实现，占位提示 -->
        <view v-if="currentTab === 0" class="flex flex-col items-center justify-center py-20 gap-3">
          <text class="text-4xl">📍</text>
          <text class="text-gray-500 text-sm">同城榜单功能开发中</text>
          <text class="text-gray-600 text-xs">即将支持按城市查看球友排行</text>
        </view>

        <!-- 好友榜单 -->
        <template v-else>
          <!-- Top 3 奖牌台（flex-1 + min-w-0 防止长昵称撑破右边界） -->
          <view v-if="leaderboardData.length >= 3" class="flex gap-2 mb-5">
            <view
              v-for="entry in leaderboardData.slice(0, 3)"
              :key="entry.userId"
              class="flex-1 min-w-0 rounded-2xl p-3 flex flex-col items-center relative overflow-hidden"
              :class="entry.rank === 1 ? 'bg-gradient-to-b from-[#D4F820] to-[#b8d91a]' : entry.rank === 2 ? 'bg-gradient-to-b from-[#C0C0C0] to-[#999]' : 'bg-gradient-to-b from-[#CD7F32] to-[#a06528]'"
            >
              <text class="font-display font-black text-3xl opacity-25 absolute -bottom-1 -right-1 leading-none">{{ entry.rank }}</text>
              <view class="w-12 h-12 rounded-full border-2 overflow-hidden mb-2 relative z-10" :class="entry.rank === 1 ? 'border-white' : entry.rank === 2 ? 'border-gray-300' : 'border-orange-200'">
                <image
                  :src="entry.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + entry.userId"
                  class="w-full h-full"
                  mode="aspectFill"
                ></image>
                <view v-if="!entry.avatar_url" class="absolute inset-0 flex items-center justify-center text-base font-bold" :class="entry.rank === 1 ? 'text-yellow-900' : entry.rank === 2 ? 'text-gray-600' : 'text-orange-900'">{{ entry.nickname?.charAt(0) }}</view>
              </view>
              <text class="font-bold text-xs z-10 relative w-full text-center truncate px-1">{{ entry.nickname }}</text>
              <text class="font-display font-bold text-sm mt-1 z-10 relative" :class="entry.rank === 1 ? 'text-dark-slate' : 'text-white'">{{ Math.round(entry.score) }}</text>
            </view>
          </view>

          <!-- 我的排名（Top 3 下方独立行） -->
          <view v-if="myRankInfo" class="flex items-center justify-between p-4 bg-card-bg rounded-xl mb-4 border border-gray-800">
            <view class="flex items-center gap-3">
              <text class="font-display font-bold text-lg text-gray-400 w-6">#{{ myRankInfo.rank }}</text>
              <view class="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-300">L</view>
              <view class="flex flex-col">
                <text class="text-sm font-bold">{{ myRankInfo.nickname }}（我）</text>
                <text class="text-[10px] text-gray-400">NTRP {{ getNtrpLabel(myRankInfo.score) }}</text>
              </view>
            </view>
            <text class="font-display font-bold text-lg text-white">{{ Math.round(myRankInfo.score) }}</text>
          </view>

          <view class="flex flex-col gap-2">
            <view
              v-for="entry in filteredList"
              :key="entry.userId"
              class="flex items-center justify-between p-3 rounded-xl bg-card-bg/20"
            >
              <view class="flex items-center gap-3 min-w-0 flex-1">
                <text class="font-display font-bold w-6 text-gray-500 flex-shrink-0">{{ entry.rank }}</text>
                <view class="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-400 flex-shrink-0">{{ entry.nickname?.charAt(0) }}</view>
                <view class="flex flex-col items-start gap-1 min-w-0 flex-1">
                  <text class="font-bold text-sm text-gray-200 truncate w-full">{{ entry.nickname }}</text>
                  <text class="text-[10px] text-gray-500">NTRP {{ getNtrpLabel(entry.score) }}</text>
                </view>
              </view>
              <text class="font-display font-bold text-md text-gray-300 flex-shrink-0 ml-2">{{ Math.round(entry.score) }}</text>
            </view>

            <view v-if="filteredList.length === 0 && !myRankInfo" class="flex flex-col items-center justify-center py-16 gap-4">
              <text class="text-4xl">📊</text>
              <text class="text-gray-500 text-sm">暂无排行数据</text>
            </view>
          </view>
        </template>

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

interface LeaderboardEntry {
  rank: number;
  userId: string;
  nickname: string;
  avatar_url: string | null;
  score: number;
  winRate: number;
  totalMatches: number;
}

const statusBarHeight = ref(20);
const { rootStyle, heightPx } = useViewport();
// 默认展示「好友」榜单（同城暂未实现，仅占位）
const currentTab = ref(1);
const leaderboardData = ref<LeaderboardEntry[]>([]);
const myRankInfo = ref<LeaderboardEntry | null>(null);
const currentUserId = ref<string>('');

// header 高度估算：statusBar + 12(上) + 标题 36 + 副标题 28 + Tab 44 ≈ statusBar + 120
const scrollStyle = computed(() => ({
  height: `calc(${heightPx.value} - ${statusBarHeight.value + 120}px - ${TABBAR_HEIGHT}px - env(safe-area-inset-bottom))`,
  width: '100%',
}));

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

  fetchLeaderboard();
});

const fetchLeaderboard = async () => {
  try {
    const res = await request<{
      success: boolean;
      data?: LeaderboardEntry[];
      error?: string;
    }>({
      url: '/api/leaderboard?limit=50',
      method: 'GET',
    });

    if (res.success && res.data) {
      leaderboardData.value = res.data;
      // 从列表中查找当前用户的位置
      if (currentUserId.value) {
        myRankInfo.value = res.data.find((e) => e.userId === currentUserId.value) || null;
      }
    }
  } catch (error) {
    console.error('Fetch leaderboard failed:', error);
  }
};

// 根据积分返回 NTRP 等级
const getNtrpLabel = (score: number): string => {
  if (score >= 75) return '4.5';
  if (score >= 65) return '4.0';
  if (score >= 55) return '3.5';
  if (score >= 45) return '3.0';
  if (score >= 35) return '2.5';
  return '2.0';
};

// 过滤列表：排除 Top 3 和当前用户（已在 myRankInfo 展示）
const filteredList = computed(() => {
  return leaderboardData.value.filter((e, idx) => idx >= 3 && e.userId !== currentUserId.value);
});
</script>

<style scoped>
page {
  background-color: #0A0E17;
}
.rank-root {
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
.tab-hover { opacity: 0.8; }
</style>
