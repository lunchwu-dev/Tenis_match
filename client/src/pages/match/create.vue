<template>
  <view class="page bg-dark-slate text-white font-body relative create-root" :style="rootStyle">
    <!-- 顶部导航 -->
    <view
      class="header px-6"
      :style="{ paddingTop: (statusBarHeight + 12) + 'px' }"
    >
      <view class="flex justify-between items-center mb-6">
        <view @tap="goBack" class="text-gray-400" hover-class="icon-hover">
          <text class="text-2xl">‹</text>
        </view>
        <text class="text-white font-display font-bold tracking-widest text-lg">发起比赛</text>
        <view class="w-6"></view>
      </view>
    </view>

    <!-- 可滚动主内容 -->
    <scroll-view
      scroll-y
      :show-scrollbar="false"
      class="hide-scroll px-6"
      :style="scrollStyle"
    >
      <!-- 比赛模式 -->
      <text class="section-label">比赛模式</text>
      <view class="mode-group">
        <view
          @tap="matchType = 1"
          hover-class="mode-hover"
          class="mode-card"
          :class="matchType === 1 ? 'mode-selected' : 'mode-normal'"
        >
          <text class="mode-icon">∞</text>
          <text class="mode-title">单打 1v1</text>
          <text class="mode-sub">2 人</text>
        </view>
        <view
          @tap="matchType = 2"
          hover-class="mode-hover"
          class="mode-card"
          :class="matchType === 2 ? 'mode-selected' : 'mode-normal'"
        >
          <text class="mode-icon">⛓</text>
          <text class="mode-title">双打 2v2</text>
          <text class="mode-sub">4 人</text>
        </view>
      </view>

      <!-- 比赛场地 -->
      <text class="section-label">比赛场地</text>
      <view
        class="venue-card"
        hover-class="venue-hover"
        @tap="pickVenue"
      >
        <view class="venue-icon">
          <text class="text-tennis-neon text-lg">📍</text>
        </view>
        <view class="flex-1 min-w-0">
          <text class="venue-title truncate">{{ venue.name }}</text>
          <text class="venue-sub truncate">{{ venue.court }}</text>
        </view>
        <text class="text-gray-500 text-xl">›</text>
      </view>

      <!-- 机制提醒 -->
      <view class="tip-card">
        <view class="flex items-center gap-2 mb-2">
          <view class="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center">
            <text class="text-blue-400 text-xs font-bold">i</text>
          </view>
          <text class="text-accent-blue text-sm font-bold">比赛机制提醒</text>
        </view>
        <text class="tip-body">比赛创建后将生成专属小程序码。完赛后 12 小时内对方未确认将自动结算。</text>
      </view>

      <view style="height: 12px;"></view>
    </scroll-view>

    <!-- 底部创建按钮（固定） -->
    <view
      class="footer px-6 pt-3 bg-dark-slate border-t border-gray-900"
      :style="{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }"
    >
      <view
        @tap="createMatch"
        class="w-full bg-tennis-neon text-dark-slate font-bold py-4 rounded-xl text-lg flex justify-center items-center gap-2 shadow-[0_10px_25px_-5px_rgba(212,248,32,0.4)] active:scale-95 transition-all"
        :class="isCreating ? 'opacity-70' : ''"
      >
        <text v-if="isCreating">创建中...</text>
        <text v-else>创建比赛</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { request } from '@/utils/request';
import { useViewport } from '@/utils/viewport';

const { rootStyle } = useViewport();
const statusBarHeight = ref(20);
const matchType = ref<1 | 2>(1);
const isCreating = ref(false);
const userInfo = ref<any>(null);

const venue = ref({
  name: '上海徐汇 网球中心',
  court: '室外硬地 · 3 号场',
});

// header ≈ statusBar + 12 + 48 + 24 ≈ statusBar + 84
// footer ≈ button 64 + padding ≈ 80，保守留 100
const scrollStyle = computed(() => ({
  flexGrow: '1',
  flexShrink: '1',
  flexBasis: '0%',
  minHeight: '0',
  width: '100%',
}));

onMounted(() => {
  const sys = uni.getSystemInfoSync();
  statusBarHeight.value = sys.statusBarHeight || 20;

  const storedUser = uni.getStorageSync('user_info');
  if (storedUser) {
    try { userInfo.value = typeof storedUser === 'string' ? JSON.parse(storedUser) : storedUser; } catch (e) {}
  }
});

const goBack = () => { uni.navigateBack(); };

const pickVenue = () => {
  // 场地选择暂用示例列表；真实环境可接入地图/场馆选择器
  uni.showActionSheet({
    title: '选择场地',
    itemList: ['上海徐汇 网球中心', '静安体育中心', '卢湾体育场', '东方体育中心'],
    success: (res: any) => {
      const names = ['上海徐汇 网球中心', '静安体育中心', '卢湾体育场', '东方体育中心'];
      const courts = ['室外硬地 · 3 号场', '室内硬地 · 2 号场', '室外红土 · 1 号场', '室内草地 · 5 号场'];
      venue.value = { name: names[res.tapIndex], court: courts[res.tapIndex] };
    },
  });
};

const createMatch = async () => {
  if (!userInfo.value?.id) {
    uni.showToast({ title: '请先登录', icon: 'none' });
    return;
  }
  if (isCreating.value) return;

  isCreating.value = true;
  try {
    const res = await request<{
      success: boolean;
      data?: { matchId: string; inviteCode: string; matchType: string; status: string };
      error?: string;
    }>({
      url: '/api/match/create',
      method: 'POST',
      data: {
        matchType: matchType.value,
        userId: userInfo.value.id,
      },
    });

    if (!res.success || !res.data) {
      throw new Error(res.error || '创建比赛失败');
    }

    uni.showToast({ title: '比赛创建成功', icon: 'success' });
    setTimeout(() => {
      uni.navigateTo({ url: `/pages/match/room?matchId=${res.data?.matchId}` });
    }, 800);
  } catch (error: any) {
    uni.showToast({ title: error.message || '创建失败', icon: 'none' });
  } finally {
    isCreating.value = false;
  }
};
</script>

<style>
page {
  background-color: #0A0E17;
}
.create-root {
  width: 100%;
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.header { flex-shrink: 0; }
.footer { flex-shrink: 0; }
.hide-scroll::-webkit-scrollbar { display: none; }
.hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }

.section-label {
  display: block;
  font-size: 12px;
  color: #9BA0AA;
  font-weight: 700;
  margin-top: 20px;
  margin-bottom: 12px;
  letter-spacing: 0.05em;
}
.mode-group {
  display: flex;
  flex-direction: row;
  gap: 12px;
  width: 100%;
  box-sizing: border-box;
}
.mode-card {
  flex: 1;
  min-width: 0;
  height: 100px;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.2s ease;
}
.mode-selected {
  background-color: rgba(16, 40, 12, 1);
  border: 1px solid #D4F820;
  box-shadow: 0 0 16px rgba(212, 248, 32, 0.2);
}
.mode-normal {
  background-color: #151A26;
  border: 1px solid rgba(255, 255, 255, 0.06);
}
.mode-icon {
  font-size: 22px;
  line-height: 1;
}
.mode-title {
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
}
.mode-sub {
  font-size: 12px;
  color: #9BA0AA;
}
.mode-hover { transform: scale(0.97); }

.venue-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background-color: #151A26;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  padding: 16px;
  transition: all 0.2s ease;
}
.venue-hover { opacity: 0.85; }
.venue-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background-color: #0A0E12;
  display: flex;
  align-items: center;
  justify-content: center;
}
.venue-title {
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
  display: block;
}
.venue-sub {
  font-size: 12px;
  color: #9BA0AA;
  display: block;
}
.tip-card {
  background-color: #151A26;
  border: 1px solid rgba(46, 104, 255, 0.3);
  border-radius: 12px;
  padding: 16px;
  margin-top: 20px;
}
.tip-body {
  font-size: 12px;
  color: #9BA0AA;
  line-height: 1.5;
  display: block;
}
.icon-hover { opacity: 0.6; }
</style>
