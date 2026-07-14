<template>
  <view class="page bg-[#0A0E17] text-white font-body relative score-root" :style="rootStyle">

    <!-- 顶部导航 -->
    <view
      class="header px-6"
      :style="{ paddingTop: (statusBarHeight + 12) + 'px' }"
    >
      <view class="flex justify-between items-center mb-6">
        <view @tap="goBack" class="text-gray-400">
          <text class="text-2xl">‹</text>
        </view>
        <text class="text-white font-display font-bold tracking-widest text-lg">提交比分</text>
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
      <!-- 对阵信息 -->
      <view class="text-center mb-6">
        <text class="text-gray-500 text-xs block mb-1">对阵</text>
        <text class="text-white font-bold text-base">{{ teamA.name }} vs {{ teamB.name }}</text>
        <text class="text-gray-500 text-[10px] mt-1 block">{{ matchTypeLabel }} · {{ venueLabel }}</text>
      </view>

      <!-- 比分录入标题 -->
      <text class="text-white text-sm font-medium mb-4 block">请录入比分</text>

      <!-- 对阵双方 / 比分录入 -->
      <view class="score-board">
        <!-- 队伍 A 行 -->
        <view class="team-row">
          <view class="team-info">
            <image
              :src="teamA.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=A'"
              class="w-12 h-12 rounded-full border-2"
              :class="scoreAFocus ? 'border-tennis-neon' : 'border-gray-700'"
            ></image>
            <view class="ml-3">
              <text class="text-xs font-bold" :class="scoreAFocus ? 'text-tennis-neon' : 'text-gray-500'">{{ isTeamA ? '我方' : '客队' }}</text>
              <text class="text-sm font-bold text-white block">{{ teamA.name }}</text>
            </view>
          </view>
          <view
            class="score-box"
            :class="scoreAFocus ? 'score-box-active' : 'score-box-normal'"
            @tap="currentEditing = 'A'"
          >
            <text
              class="font-display text-4xl font-bold"
              :class="scoreAFocus ? 'text-tennis-neon' : 'text-white'"
            >{{ displayScoreA }}</text>
          </view>
        </view>

        <!-- VS 分隔 -->
        <view class="vs-line">
          <text class="text-sm font-bold text-gray-500">VS</text>
        </view>

        <!-- 队伍 B 行 -->
        <view class="team-row">
          <view class="team-info">
            <image
              :src="teamB.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=B'"
              class="w-12 h-12 rounded-full border-2"
              :class="scoreBFocus ? 'border-blue-500' : 'border-gray-700'"
            ></image>
            <view class="ml-3">
              <text class="text-xs font-bold" :class="scoreBFocus ? 'text-blue-400' : 'text-gray-500'">{{ isTeamB ? '我方' : '客队' }}</text>
              <text class="text-sm font-bold text-white block">{{ teamB.name }}</text>
            </view>
          </view>
          <view
            class="score-box"
            :class="scoreBFocus ? 'score-box-active-blue' : 'score-box-normal'"
            @tap="currentEditing = 'B'"
          >
            <text
              class="font-display text-4xl font-bold"
              :class="scoreBFocus ? 'text-blue-400' : 'text-white'"
            >{{ displayScoreB }}</text>
          </view>
        </view>
      </view>

      <view class="text-center mb-4">
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
        class="w-full bg-[#D4F820] text-dark-slate font-bold py-4 rounded-xl text-lg flex items-center justify-center gap-2 active:scale-95 relative"
      >
        <text>提交比分</text>
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
import { request } from '@/utils/request';
import { useViewport } from '@/utils/viewport';

const { rootStyle } = useViewport();
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

// 对阵信息标签
const matchTypeLabel = ref('单打');
const venueLabel = ref('上海徐汇 网球中心');

// header ≈ statusBar + 12 + 48 = statusBar + 60
// footer ≈ keypad(4行 * ~60 + 间距 36) + submit 64 + tip 20 + padding ≈ 380
const topStyle = computed(() => ({
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
  if (!matchId.value || !currentUserId.value) {
    uni.showToast({ title: '信息缺失，无法提交', icon: 'none' });
    return;
  }

  isSubmitting.value = true;
  try {
    const res = await request<{
      success: boolean;
      data?: { matchId: string; status: string; timeoutAt: string; message: string };
      error?: string;
    }>({
      url: '/api/match/submit-score',
      method: 'POST',
      data: {
        matchId: matchId.value,
        userId: currentUserId.value,
        scoreA: scoreA.value,
        scoreB: scoreB.value,
      },
    });

    if (!res.success) {
      throw new Error(res.error || '提交失败');
    }

    uni.showToast({ title: '比分已提交，等待确认', icon: 'success' });
    setTimeout(() => {
      uni.reLaunch({ url: '/pages/history/index' });
    }, 1500);
  } catch (error: any) {
    uni.showToast({ title: error.message || '提交失败', icon: 'none' });
  } finally {
    isSubmitting.value = false;
  }
};

const loadMatch = async (id: string) => {
  try {
    const res = await request<{
      success: boolean;
      data?: {
        matchId: string;
        matchType: string;
        status: number;
        scoreA: number | null;
        scoreB: number | null;
        teamA: Array<{ userId: string; nickname: string; avatarUrl: string; snapshotScore: number }>;
        teamB: Array<{ userId: string; nickname: string; avatarUrl: string; snapshotScore: number }>;
      };
      error?: string;
    }>({
      url: `/api/match/${id}`,
      method: 'GET',
    });

    if (!res.success || !res.data) {
      throw new Error(res.error || '加载比赛失败');
    }

    matchId.value = id;
    // 取 A 队/B 队第一个玩家作为显示
    const a = res.data.teamA?.[0];
    const b = res.data.teamB?.[0];
    if (a) {
      teamA.value = {
        name: a.nickname || 'A 队',
        avatar: a.avatarUrl || '',
      };
      isTeamA.value = a.userId === currentUserId.value;
    }
    if (b) {
      teamB.value = {
        name: b.nickname || 'B 队',
        avatar: b.avatarUrl || '',
      };
      isTeamB.value = b.userId === currentUserId.value;
    }
  } catch (error: any) {
    uni.showToast({ title: error.message || '加载失败', icon: 'none' });
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
.score-board {
  background-color: #151A26;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  padding: 16px 20px;
  margin-bottom: 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.team-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.team-info {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}
.score-box {
  width: 60px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
}
.score-box-normal {
  background-color: rgba(255, 255, 255, 0.05);
  border-bottom: 2px solid #374151;
}
.score-box-active {
  background-color: #151A26;
  border: 1px solid #D4F820;
  box-shadow: 0 0 16px rgba(212, 248, 32, 0.2);
}
.score-box-active-blue {
  background-color: #151A26;
  border: 1px solid #2E68FF;
  box-shadow: 0 0 16px rgba(46, 104, 255, 0.2);
}
.vs-line {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 4px 0;
}
</style>