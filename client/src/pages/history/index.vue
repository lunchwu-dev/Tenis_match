<template>
  <view class="page bg-dark-slate relative min-h-screen text-white font-body flex flex-col" :style="{'--status-bar-height': statusBarHeight + 'px'}">

    <!-- 顶部标题区 -->
    <view class="pt-[calc(var(--status-bar-height)+12px)] px-6 pb-4 bg-card-bg border-b border-gray-800 z-10 sticky top-0">
      <text class="font-display font-bold text-2xl">战绩大厅</text>
    </view>

    <!-- 可滚动内容 -->
    <scroll-view scroll-y class="flex-1 px-6 pt-4 pb-[calc(80px+env(safe-area-inset-bottom))] hide-scroll" :show-scrollbar="false">
      <!-- Alert Banner - 待确认比赛提示 -->
      <view @tap="goToScore" class="bg-red-500/10 border border-red-500/50 rounded-xl p-4 flex items-center justify-between mb-6 cursor-pointer">
        <view class="flex items-center gap-3">
          <text class="text-red-500 text-xl font-bold">⚠</text>
          <view class="flex flex-col">
            <text class="text-sm font-bold text-red-400">1场双打待确认</text>
            <text class="text-[10px] text-red-500/70 mt-1">超过12小时将自动生效</text>
          </view>
        </view>
        <text class="text-red-500 text-xl">›</text>
      </view>

      <!-- 历史战绩列表 -->
      <view class="flex flex-col gap-4">
        <!-- 胜局 -->
        <view class="bg-card-bg p-4 rounded-2xl border border-gray-800 relative overflow-hidden">
          <view class="absolute left-0 top-0 bottom-0 w-1 bg-tennis-neon"></view>
          <view class="flex justify-between items-center mb-3">
            <text class="text-[10px] text-gray-500">2026-04-16 · 单打</text>
            <text class="font-display text-tennis-neon font-bold text-sm">+2.3 分</text>
          </view>
          <view class="flex items-center justify-between">
            <view class="flex items-center gap-2">
              <image src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=d4f820" class="w-8 h-8 rounded-full border border-gray-700"></image>
              <text class="text-sm font-bold">我</text>
            </view>
            <view class="px-3 py-1 bg-gray-800 rounded font-display font-bold text-lg tracking-widest text-white">6 : 4</view>
            <view class="flex items-center gap-2 flex-row-reverse">
              <image src="https://api.dicebear.com/7.x/avataaars/svg?seed=Jack&backgroundColor=2E68FF" class="w-8 h-8 rounded-full border border-gray-700"></image>
              <text class="text-sm text-gray-400">老王</text>
            </view>
          </view>
        </view>

        <!-- 败局 -->
        <view class="bg-card-bg p-4 rounded-2xl border border-gray-800 relative overflow-hidden opacity-70">
          <view class="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></view>
          <view class="flex justify-between items-center mb-3">
            <text class="text-[10px] text-gray-500">2026-04-10 · 双打</text>
            <text class="font-display text-red-500 font-bold text-sm">-1.8 分</text>
          </view>
          <view class="flex items-center justify-between">
            <view class="flex flex-col gap-1 items-start">
              <text class="text-sm font-bold">我方</text>
              <text class="text-[10px] text-gray-500">均分 56</text>
            </view>
            <view class="px-3 py-1 bg-gray-800 rounded font-display font-bold text-lg tracking-widest text-gray-400">3 : 6</view>
            <view class="flex flex-col gap-1 items-end">
              <text class="text-sm text-gray-400">李雷队伍</text>
              <text class="text-[10px] text-gray-500">均分 58</text>
            </view>
          </view>
        </view>

        <!-- 进行中 -->
        <view class="bg-card-bg p-4 rounded-2xl border border-gray-800 relative overflow-hidden">
          <view class="absolute left-0 top-0 bottom-0 w-1 bg-gray-500"></view>
          <view class="flex justify-between items-center mb-3">
            <text class="text-[10px] text-gray-500">2026-04-08 · 单打</text>
            <text class="font-display text-gray-400 font-bold text-sm">待对手确认</text>
          </view>
          <view class="flex items-center justify-between opacity-50">
            <view class="flex items-center gap-2">
              <image src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=d4f820" class="w-8 h-8 rounded-full border border-gray-700"></image>
              <text class="text-sm font-bold">我</text>
            </view>
            <view class="px-3 py-1 bg-gray-800 rounded font-display font-bold text-lg tracking-widest text-gray-400">6 : 2</view>
            <view class="flex items-center gap-2 flex-row-reverse">
              <image src="https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah&backgroundColor=FF9800" class="w-8 h-8 rounded-full border border-gray-700"></image>
              <text class="text-sm text-gray-400">莎莎</text>
            </view>
          </view>
        </view>
      </view>

      <view class="h-8"></view>
    </scroll-view>

    <!-- 自定义 TabBar -->
    <tabbar />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import tabbar from '@/components/tabbar/index.vue';

const statusBarHeight = ref(20);
const pendingMatch = ref<any>(null);

onMounted(() => {
  const sysInfo = uni.getSystemInfoSync();
  statusBarHeight.value = sysInfo.statusBarHeight || 20;

  // 模拟加载待确认比赛
  // 实际应从API获取
  pendingMatch.value = {
    id: 'pending-match-001',
    type: '双打',
    status: 'pending_confirmation', // pending_confirmation | pending_submit
    scoreA: 6,
    scoreB: 4,
    isMySubmission: false, // true=我提交的，等待确认 | false=对方提交的，需要我确认
  };
});

const pendingMatchText = computed(() => {
  if (!pendingMatch.value) return '暂无待处理比赛';
  const type = pendingMatch.value.type;
  if (pendingMatch.value.status === 'pending_confirmation') {
    return `1场${type}待确认`;
  }
  return `1场${type}待录入`;
});

const goToScore = () => {
  if (!pendingMatch.value) {
    // 没有待处理比赛，创建新比赛
    uni.navigateTo({ url: '/pages/match/create' });
    return;
  }

  if (pendingMatch.value.status === 'pending_confirmation') {
    // 需要确认比分
    uni.navigateTo({
      url: `/pages/match/confirm?matchId=${pendingMatch.value.id}`
    });
  } else {
    // 需要录入比分
    uni.navigateTo({
      url: `/pages/match/score-entry?matchId=${pendingMatch.value.id}`
    });
  }
};
</script>

<style scoped>
page {
  background-color: #0A0E17;
}
.hide-scroll::-webkit-scrollbar {
  display: none;
}
.hide-scroll {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
