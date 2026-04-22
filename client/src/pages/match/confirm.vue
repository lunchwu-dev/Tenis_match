<template>
  <view class="page bg-[#0A0E17] text-white font-body relative confirm-root">

    <!-- 顶部导航 -->
    <view
      class="header px-6"
      :style="{ paddingTop: (statusBarHeight + 12) + 'px' }"
    >
      <view class="flex justify-between items-center mb-6">
        <view @tap="goBack" class="text-gray-400">
          <text class="text-2xl">✕</text>
        </view>
        <text class="text-white font-display font-bold tracking-widest text-lg">确认赛果</text>
        <view class="w-6"></view>
      </view>
    </view>

    <!-- 主内容区：可滚动 -->
    <scroll-view
      scroll-y
      :show-scrollbar="false"
      class="hide-scroll px-6"
      :style="scrollStyle"
    >
      <!-- 待确认提示 -->
      <view class="bg-red-500/10 border border-red-500/50 rounded-xl p-4 mb-6">
        <view class="flex items-center gap-3">
          <text class="text-red-500 text-xl">⚠</text>
          <view>
            <text class="text-sm font-bold text-red-400 block">等待您的确认</text>
            <text class="text-xs text-red-500/70 mt-1 block">
              超过12小时未处理将自动生效
              <text v-if="timeoutRemaining" class="text-red-400">（剩余 {{ timeoutRemaining }}）</text>
            </text>
          </view>
        </view>
      </view>

      <!-- 对阵双方 -->
      <view class="flex justify-between items-center mb-6 relative">
        <view class="flex flex-col items-center">
          <image
            :src="teamA.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=A'"
            class="w-16 h-16 rounded-full border-2 border-tennis-neon"
          ></image>
          <text class="text-sm font-bold mt-2">{{ teamA.name }}</text>
          <text class="text-[10px] text-tennis-neon mt-1">A队</text>
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
          <text class="text-[10px] text-blue-400 mt-1">B队</text>
        </view>
      </view>

      <!-- 比分展示 -->
      <view class="flex justify-center items-center gap-6 mb-6">
        <view class="w-20 h-24 bg-card-bg rounded-2xl flex items-center justify-center border-b-2 border-tennis-neon">
          <text class="font-display text-5xl font-bold text-white">{{ submittedScoreA }}</text>
        </view>
        <text class="font-display font-bold text-2xl text-gray-600">:</text>
        <view class="w-20 h-24 bg-card-bg rounded-2xl flex items-center justify-center border-b-2 border-blue-500">
          <text class="font-display text-5xl font-bold text-white">{{ submittedScoreB }}</text>
        </view>
      </view>

      <!-- 胜负指示 -->
      <view class="text-center mb-6">
        <view
          class="inline-flex items-center gap-2 px-4 py-2 rounded-full"
          :class="winner === 'A' ? 'bg-tennis-neon/20' : 'bg-blue-500/20'"
        >
          <text>🏆</text>
          <text class="font-bold" :class="winner === 'A' ? 'text-tennis-neon' : 'text-blue-400'">
            {{ winner === 'A' ? teamA.name : teamB.name }} 获胜
          </text>
        </view>
      </view>

      <view v-if="rejectReason" class="bg-orange-500/10 border border-orange-500/50 rounded-xl p-4 mb-6">
        <view class="flex items-start gap-3">
          <text class="text-orange-500 text-xl mt-0.5">⚠</text>
          <view>
            <text class="text-sm font-bold text-orange-400 block">上轮被驳回</text>
            <text class="text-xs text-orange-500/70 mt-1 block">原因：{{ rejectReason }}</text>
          </view>
        </view>
      </view>

      <!-- 剩余驳回次数 -->
      <view class="text-center mb-4">
        <text class="text-xs text-gray-500">剩余驳回次数：</text>
        <view class="inline-flex gap-1 ml-1 align-middle">
          <view
            v-for="n in 3"
            :key="n"
            class="w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center"
            :class="n <= remainingRejects ? 'bg-red-500/30 text-red-400' : 'bg-gray-800 text-gray-600'"
          >
            <text>{{ n }}</text>
          </view>
        </view>
      </view>

      <view style="height: 12px;"></view>
    </scroll-view>

    <!-- 底部操作（固定） -->
    <view
      class="footer px-6 pt-3 bg-dark-slate border-t border-gray-900 flex flex-col gap-3"
      :style="{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }"
    >
      <view
        v-if="!isProcessing"
        @tap="confirmScore"
        class="w-full bg-tennis-neon text-dark-slate font-bold py-4 rounded-xl text-lg flex items-center justify-center gap-2 active:scale-95"
      >
        <text class="text-xl">✓</text>
        <text>确认赛果无误</text>
      </view>
      <view
        v-else
        class="w-full bg-gray-600 text-white font-bold py-4 rounded-xl text-lg flex items-center justify-center"
      >
        <text>处理中...</text>
      </view>

      <view
        v-if="!isProcessing"
        @tap="showRejectModal"
        class="w-full bg-red-500/10 border border-red-500/50 text-red-400 font-bold py-4 rounded-xl text-lg flex items-center justify-center gap-2 active:scale-95"
      >
        <text class="text-xl">✕</text>
        <text>比分有误，驳回</text>
      </view>

      <text class="text-center text-[10px] text-gray-500">
        请仔细核对线下实际比赛结果后再确认
      </text>
    </view>

    <!-- 驳回原因弹窗 -->
    <view v-if="rejectModalVisible" class="fixed inset-0 bg-black/60 z-50 flex items-end justify-center">
      <view class="bg-card-bg w-full rounded-t-3xl p-6" :style="{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }">
        <view class="flex justify-between items-center mb-6">
          <text class="text-lg font-bold text-white">驳回原因</text>
          <view @tap="closeRejectModal" class="text-gray-500">
            <text class="text-2xl">✕</text>
          </view>
        </view>

        <view class="flex flex-col gap-3 mb-6">
          <view
            v-for="reason in rejectReasons"
            :key="reason"
            @tap="selectRejectReason(reason)"
            class="p-4 rounded-xl border transition-all"
            :class="selectedRejectReason === reason
              ? 'border-red-500 bg-red-500/10 text-red-400'
              : 'border-gray-700 bg-gray-800/50 text-gray-300'"
          >
            <text class="font-medium">{{ reason }}</text>
          </view>
        </view>

        <view
          v-if="!isRejecting"
          @tap="confirmReject"
          class="w-full bg-red-500 text-white font-bold py-4 rounded-xl text-lg flex items-center justify-center active:scale-95"
        >
          <text>确认驳回</text>
        </view>
        <view
          v-else
          class="w-full bg-gray-600 text-white font-bold py-4 rounded-xl text-lg flex items-center justify-center"
        >
          <text>驳回中...</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';

const statusBarHeight = ref(20);
const matchId = ref<string>('');
const submittedScoreA = ref<number>(6);
const submittedScoreB = ref<number>(4);
const winner = computed(() => submittedScoreA.value > submittedScoreB.value ? 'A' : 'B');

const teamA = ref<{ name: string; avatar: string }>({ name: '张哥', avatar: '' });
const teamB = ref<{ name: string; avatar: string }>({ name: '李雷', avatar: '' });

const remainingRejects = ref<number>(3);
const rejectReason = ref<string>('');
const rejectModalVisible = ref<boolean>(false);
const selectedRejectReason = ref<string>('');
const isRejecting = ref<boolean>(false);
const isProcessing = ref<boolean>(false);

const rejectReasons = [
  '比分反了（实际是X:Y）',
  '比分录入错误',
  '比赛未完成/取消',
  '其他原因',
];

const timeoutRemaining = ref<string>('');
let countdownTimer: number | null = null;

// header ≈ statusBar + 12 + 48 ≈ statusBar + 60
// footer ≈ 确认 64 + 驳回 64 + tip 20 + gap 24 + padding ≈ 200
const scrollStyle = computed(() => ({
  height: `calc(100vh - ${statusBarHeight.value + 60}px - 200px - env(safe-area-inset-bottom))`,
  width: '100%',
}));

onMounted(() => {
  const sys = uni.getSystemInfoSync();
  statusBarHeight.value = sys.statusBarHeight || 20;

  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1];
  const options = (currentPage as any)?.options || {};

  if (options.matchId) {
    matchId.value = options.matchId;
    loadMatch(options.matchId);
  } else {
    teamA.value = { name: '张哥', avatar: '' };
    teamB.value = { name: '李雷', avatar: '' };
    remainingRejects.value = 3;
    startCountdown();
  }
});

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer);
});

const goBack = () => { uni.navigateBack(); };

const startCountdown = () => {
  const totalSeconds = 12 * 60 * 60 - 1000;
  let remaining = totalSeconds;

  countdownTimer = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(countdownTimer!);
      timeoutRemaining.value = '已超时';
    } else {
      const hours = Math.floor(remaining / 3600);
      const minutes = Math.floor((remaining % 3600) / 60);
      timeoutRemaining.value = `${hours}小时${minutes}分钟`;
    }
  }, 1000) as unknown as number;
};

const loadMatch = async (id: string) => {
  try {
    matchId.value = id;
    startCountdown();
  } catch (error) {
    uni.showToast({ title: '加载失败', icon: 'none' });
  }
};

const confirmScore = async () => {
  isProcessing.value = true;
  try {
    uni.showToast({ title: '确认成功！', icon: 'success' });
    setTimeout(() => {
      uni.switchTab({ url: '/pages/history/index' });
    }, 1500);
  } catch (error: any) {
    uni.showToast({ title: error.message || '确认失败', icon: 'none' });
  } finally {
    isProcessing.value = false;
  }
};

const showRejectModal = () => {
  rejectModalVisible.value = true;
  selectedRejectReason.value = '';
};

const closeRejectModal = () => {
  rejectModalVisible.value = false;
};

const selectRejectReason = (reason: string) => {
  selectedRejectReason.value = reason;
};

const confirmReject = async () => {
  if (!selectedRejectReason.value) {
    uni.showToast({ title: '请选择驳回原因', icon: 'none' });
    return;
  }
  isRejecting.value = true;
  try {
    closeRejectModal();
    uni.showToast({ title: '已驳回，等待房主重新提交', icon: 'success' });
    setTimeout(() => {
      uni.switchTab({ url: '/pages/history/index' });
    }, 1500);
  } catch (error: any) {
    const msg = error.message || '驳回失败';
    uni.showToast({ title: msg, icon: 'none' });
  } finally {
    isRejecting.value = false;
  }
};
</script>

<style>
page {
  background-color: #0A0E17;
}
.confirm-root {
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