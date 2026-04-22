<template>
  <view class="page bg-[#0A0E17] text-white font-body relative score-root">

    <!-- 顶部导航 -->
    <view
      class="header px-6"
      :style="{ paddingTop: (statusBarHeight + 12) + 'px' }"
    >
      <view class="flex justify-between items-center mb-6">
        <view @tap="goBack" class="text-gray-400">
          <text class="text-2xl">✕</text>
        </view>
        <text class="text-white font-display font-bold tracking-widest text-lg">录入赛果</text>
        <view class="w-6"></view>
      </view>
    </view>

    <!-- 可滚动上半区：对阵 + 比分 -->
    <scroll-view
      scroll-y
      :show-scrollbar="false"
      class="hide-scroll px-6"
      :style="topStyle"
    >
      <!-- 对阵双方 -->
      <view class="flex justify-between items-center mb-8 relative">
        <view class="flex flex-col items-center">
          <image
            :src="teamA.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=A'"
            class="w-16 h-16 rounded-full border-2 border-tennis-neon"
          ></image>
          <text class="text-sm font-bold mt-2">{{ teamA.name }}</text>
          <text v-if="isTeamA" class="text-[10px] text-tennis-neon mt-1">我方</text>
        </view>

        <view class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-8 bg-card-bg border border-gray-700 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-gray-400 italic z-10">
          VS
        </view>

        <view class="flex flex-col items-center">
          <image
            :src="teamB.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=B'"
            class="w-16 h-16 rounded-full border-2 border-blue-500"
          ></image>
          <text class="text-sm font-bold mt-2">{{ teamB.name }}</text>
          <text v-if="isTeamB" class="text-[10px] text-blue-400 mt-1">我方</text>
        </view>
      </view>

      <!-- 比分显示 -->
      <view class="flex justify-center items-center gap-6 mb-4">
        <view
          class="w-20 h-24 rounded-2xl flex items-center justify-center transition-all"
          :class="scoreAFocus ? 'bg-card-bg border-b-2 border-tennis-neon shadow-[0_0_20px_rgba(212,248,32,0.2)]' : 'bg-card-bg/50 border-b-2 border-gray-700'"
          @tap="currentEditing = 'A'"
        >
          <text
            class="font-display text-5xl font-bold"
            :class="scoreAFocus ? 'text-tennis-neon' : 'text-white'"
          >{{ displayScoreA }}</text>
        </view>

        <text class="font-display font-bold text-2xl text-gray-600">:</text>

        <view
          class="w-20 h-24 rounded-2xl flex items-center justify-center transition-all"
          :class="scoreBFocus ? 'bg-card-bg border-b-2 border-blue-500 shadow-[0_0_20px_rgba(46,104,255,0.2)]' : 'bg-card-bg/50 border-b-2 border-gray-700'"
          @tap="currentEditing = 'B'"
        >
          <text
            class="font-display text-5xl font-bold"
            :class="scoreBFocus ? 'text-blue-400' : 'text-white'"
          >{{ displayScoreB }}</text>
        </view>
      </view>

      <view class="text-center mb-2">
        <text class="text-xs text-gray-500">请输入 {{ currentEditing === 'A' ? 'A队' : 'B队' }} 比分</text>
      </view>
    </scroll-view>

    <!-- 底部键盘 + 提交按钮（固定） -->
    <view
      class="footer px-6 pt-3 bg-dark-slate border-t border-gray-900"
      :style="{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }"
    >
      <view class="grid grid-cols-3 gap-3 mb-3">
        <view
          v-for="num in [1, 2, 3, 4, 5, 6, 7, 8, 9]"
          :key="num"
          @tap="inputNumber(num)"
          class="bg-card-bg text-white font-display text-2xl py-3 rounded-xl flex items-center justify-center active:bg-gray-800"
        >
          <text>{{ num }}</text>
        </view>
        <view
          @tap="inputNumber(0)"
          class="bg-card-bg text-white font-display text-2xl py-3 rounded-xl flex items-center justify-center active:bg-gray-800"
        >
          <text>0</text>
        </view>
        <view
          @tap="switchSide"
          class="bg-card-bg text-white font-display text-lg py-3 rounded-xl flex items-center justify-center active:bg-gray-800"
        >
          <text>换边</text>
        </view>
        <view
          @tap="deleteDigit"
          class="bg-transparent text-gray-500 font-display text-2xl py-3 rounded-xl flex items-center justify-center"
        >
          <text class="text-xl">⌫</text>
        </view>
      </view>

      <view
        v-if="!isSubmitting"
        @tap="submitScore"
        class="w-full bg-white text-dark-slate font-bold py-4 rounded-xl text-lg flex items-center justify-center gap-2 active:scale-95 relative"
      >
        <text>提交比分至对手确认</text>
        <text class="absolute right-6">›</text>
      </view>
      <view
        v-else
        class="w-full bg-gray-600 text-white font-bold py-4 rounded-xl text-lg flex items-center justify-center"
      >
        <text>提交中...</text>
      </view>

      <text class="text-center text-[10px] text-gray-500 mt-2 block">
        提交后对手将收到通知，超过12小时未处理将自动生效
      </text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

const statusBarHeight = ref(20);
const matchId = ref<string>('');
const scoreA = ref<number>(0);
const scoreB = ref<number>(0);
const currentEditing = ref<'A' | 'B'>('A');
const isSubmitting = ref(false);

const teamA = ref<{ name: string; avatar: string }>({ name: '张哥', avatar: '' });
const teamB = ref<{ name: string; avatar: string }>({ name: '李雷', avatar: '' });
const currentUserId = ref<string>('');
const isTeamA = ref(true);
const isTeamB = ref(false);

const scoreAFocus = computed(() => currentEditing.value === 'A');
const scoreBFocus = computed(() => currentEditing.value === 'B');
const displayScoreA = computed(() => scoreA.value === 0 ? '_' : scoreA.value.toString());
const displayScoreB = computed(() => scoreB.value === 0 ? '_' : scoreB.value.toString());

// header ≈ statusBar + 12 + 48 = statusBar + 60
// footer ≈ keypad(4行 * ~60 + 间距 36) + submit 64 + tip 20 + padding ≈ 380
const topStyle = computed(() => ({
  height: `calc(100vh - ${statusBarHeight.value + 60}px - 380px - env(safe-area-inset-bottom))`,
  width: '100%',
}));

onMounted(() => {
  const sys = uni.getSystemInfoSync();
  statusBarHeight.value = sys.statusBarHeight || 20;

  const storedUser = uni.getStorageSync('user_info');
  if (storedUser) {
    try {
      const user = JSON.parse(storedUser);
      currentUserId.value = user.id;
      teamA.value.name = user.nickname || '张哥';
      teamA.value.avatar = user.avatar_url || '';
    } catch (e) {}
  }

  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1];
  const options = (currentPage as any)?.options || {};

  if (options.matchId) {
    matchId.value = options.matchId;
    loadMatch(options.matchId);
  } else {
    teamA.value = { name: '张哥', avatar: '' };
    teamB.value = { name: '李雷', avatar: '' };
    isTeamA.value = true;
    isTeamB.value = false;
  }
});

const goBack = () => { uni.navigateBack(); };

const inputNumber = (num: number) => {
  if (currentEditing.value === 'A') {
    const newScore = scoreA.value * 10 + num;
    if (newScore <= 99) scoreA.value = newScore;
  } else {
    const newScore = scoreB.value * 10 + num;
    if (newScore <= 99) scoreB.value = newScore;
  }
};

const deleteDigit = () => {
  if (currentEditing.value === 'A') {
    scoreA.value = Math.floor(scoreA.value / 10);
  } else {
    scoreB.value = Math.floor(scoreB.value / 10);
  }
};

const switchSide = () => {
  const tempScore = scoreA.value;
  scoreA.value = scoreB.value;
  scoreB.value = tempScore;

  const tempTeam = { ...teamA.value };
  teamA.value = { ...teamB.value };
  teamB.value = tempTeam;

  const tempIsA = isTeamA.value;
  isTeamA.value = isTeamB.value;
  isTeamB.value = tempIsA;

  currentEditing.value = 'A';
};

const submitScore = async () => {
  if (scoreA.value === 0 && scoreB.value === 0) {
    uni.showToast({ title: '请输入有效比分', icon: 'none' });
    return;
  }
  if (scoreA.value === scoreB.value) {
    uni.showToast({ title: '比分不能为平局', icon: 'none' });
    return;
  }

  isSubmitting.value = true;
  try {
    uni.showToast({ title: '比分已提交，等待确认', icon: 'success' });
    setTimeout(() => {
      uni.switchTab({ url: '/pages/history/index' });
    }, 1500);
  } catch (error: any) {
    uni.showToast({ title: error.message || '提交失败', icon: 'none' });
  } finally {
    isSubmitting.value = false;
  }
};

const loadMatch = async (id: string) => {
  try {
    matchId.value = id;
  } catch (error) {
    uni.showToast({ title: '加载失败', icon: 'none' });
  }
};
</script>

<style>
page {
  background-color: #0A0E17;
}
.score-root {
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
</style>