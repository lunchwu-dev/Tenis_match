<template>
  <view class="page bg-dark-slate text-white font-body relative rank-root">

    <!-- Header（固定，避开 status bar） -->
    <view
      class="header px-6 pb-0 bg-card-bg"
      :style="{ paddingTop: (statusBarHeight + 12) + 'px' }"
    >
      <text class="font-display font-bold text-2xl mb-4 block">排行榜</text>
      <view class="flex gap-6 border-b border-gray-800">
        <view
          class="pb-3 text-sm transition-colors"
          :class="currentTab === 0 ? 'text-tennis-neon font-bold border-b-2 border-tennis-neon' : 'text-gray-500 font-medium border-b-2 border-transparent'"
          @tap="currentTab = 0"
        >好友榜</view>
        <view
          class="pb-3 text-sm transition-colors"
          :class="currentTab === 1 ? 'text-tennis-neon font-bold border-b-2 border-tennis-neon' : 'text-gray-500 font-medium border-b-2 border-transparent'"
          @tap="currentTab = 1"
        >同城榜单</view>
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
        <!-- 我的排名 Banner -->
        <view class="bg-gradient-to-r from-gray-800 to-card-bg border border-gray-700 rounded-xl p-4 flex items-center justify-between mb-8 shadow-md">
          <view class="flex items-center gap-3">
            <text class="font-display font-bold text-xl text-gray-400 w-6">#8</text>
            <image src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=d4f820" class="w-10 h-10 rounded-full border border-gray-600"></image>
            <view class="flex flex-col">
              <text class="text-sm font-bold">张哥</text>
              <text class="text-[10px] text-gray-400">还差3分进前五</text>
            </view>
          </view>
          <text class="font-display font-bold text-xl text-tennis-neon">55.4</text>
        </view>

        <view v-if="currentTab === 0" class="flex flex-col gap-2">
          <!-- #1 -->
          <view class="flex items-center justify-between p-3 rounded-xl bg-card-bg/50">
            <view class="flex items-center gap-4">
              <text class="font-display font-bold text-2xl text-[#FFD700] w-6 italic">1</text>
              <image src="https://api.dicebear.com/7.x/avataaars/svg?seed=King&backgroundColor=FFD700" class="w-12 h-12 rounded-full border-2 border-[#FFD700]"></image>
              <view class="flex flex-col items-start gap-1">
                <text class="text-sm font-bold text-white">Ace王师傅</text>
                <text class="text-[10px] bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded">宗师 (≈ NTRP 5.5)</text>
              </view>
            </view>
            <text class="font-display font-bold text-xl text-white">92.1</text>
          </view>

          <!-- #2 -->
          <view class="flex items-center justify-between p-3 rounded-xl bg-card-bg/50">
            <view class="flex items-center gap-4">
              <text class="font-display font-bold text-xl text-[#C0C0C0] w-6 italic">2</text>
              <image src="https://api.dicebear.com/7.x/avataaars/svg?seed=Queen&backgroundColor=C0C0C0" class="w-10 h-10 rounded-full border border-[#C0C0C0]"></image>
              <view class="flex flex-col items-start gap-1">
                <text class="text-sm font-bold text-white">发球机器赵</text>
                <text class="text-[10px] bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded">大魔王 (≈ NTRP 5.0)</text>
              </view>
            </view>
            <text class="font-display font-bold text-lg text-white">78.5</text>
          </view>

          <!-- #3 -->
          <view class="flex items-center justify-between p-3 rounded-xl bg-card-bg/50">
            <view class="flex items-center gap-4">
              <text class="font-display font-bold text-xl text-[#CD7F32] w-6 italic">3</text>
              <image src="https://api.dicebear.com/7.x/avataaars/svg?seed=Brook&backgroundColor=CD7F32" class="w-10 h-10 rounded-full border border-[#CD7F32]"></image>
              <view class="flex flex-col items-start gap-1">
                <text class="text-sm font-bold text-white">底线推土机</text>
                <text class="text-[10px] bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded">真大神 (≈ NTRP 4.5)</text>
              </view>
            </view>
            <text class="font-display font-bold text-lg text-white">65.0</text>
          </view>

          <view class="h-0.5 bg-gray-800 my-2 mx-4"></view>

          <!-- #4 -->
          <view class="flex items-center justify-between p-3 rounded-xl bg-card-bg/20">
            <view class="flex items-center gap-4">
              <text class="font-display font-bold text-lg text-gray-500 w-6 italic">4</text>
              <image src="https://api.dicebear.com/7.x/avataaars/svg?seed=Nadal&backgroundColor=444444" class="w-8 h-8 rounded-full border border-gray-600"></image>
              <view class="flex flex-col items-start gap-1">
                <text class="text-sm text-gray-200">红土小子</text>
                <text class="text-[10px] text-gray-500">狠角色</text>
              </view>
            </view>
            <text class="font-display font-bold text-md text-gray-300">58.2</text>
          </view>
        </view>

        <view v-else class="flex flex-col items-center justify-center py-16 gap-4">
          <text class="text-4xl">🏙️</text>
          <text class="text-gray-500 text-sm">同城榜单功能开发中</text>
        </view>

        <view class="h-8"></view>
      </view>
    </scroll-view>

    <!-- 自定义 TabBar -->
    <tabbar />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import tabbar from '@/components/tabbar/index.vue';

const statusBarHeight = ref(20);
const currentTab = ref(0);

// header 高度估算：statusBar + 12(上) + 标题块 40 + Tab 48 ≈ statusBar + 100
const scrollStyle = computed(() => ({
  height: `calc(100vh - ${statusBarHeight.value + 100}px - 80px - env(safe-area-inset-bottom))`,
  width: '100%',
}));

onMounted(() => {
  const sysInfo = uni.getSystemInfoSync();
  statusBarHeight.value = sysInfo.statusBarHeight || 20;
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
</style>
