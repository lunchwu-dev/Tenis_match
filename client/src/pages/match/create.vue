<template>
  <view class="page bg-dark-slate pt-12 pb-8 px-6 min-h-screen text-white font-body flex flex-col relative">
    <!-- 顶部导航 -->
    <view class="flex justify-between items-center mb-8">
      <view @tap="goBack" class="text-gray-400">
        <text class="text-2xl">✕</text>
      </view>
      <text class="text-white font-display font-bold tracking-widest text-lg">比赛准备室</text>
      <view class="w-6"></view>
    </view>

    <!-- 模式切换：单打/双打 -->
    <view class="bg-card-bg p-1 rounded-xl flex mb-8">
      <view
        @tap="switchMode(1)"
        class="flex-1 py-3 rounded-lg text-center text-sm font-bold transition-all"
        :class="matchType === 1 ? 'bg-gray-800 text-white shadow' : 'text-gray-500'"
      >单打 1v1</view>
      <view
        @tap="switchMode(2)"
        class="flex-1 py-3 rounded-lg text-center text-sm font-bold transition-all"
        :class="matchType === 2 ? 'bg-gray-800 text-white shadow' : 'text-gray-500'"
      >双打 2v2</view>
    </view>

    <!-- A队 -->
    <view class="mb-4">
      <text class="text-[10px] text-tennis-neon font-bold uppercase tracking-wider mb-2 block">A 队</text>
      <view class="bg-card-bg border border-tennis-neon/30 rounded-2xl overflow-hidden">
        <view
          v-for="(player, idx) in teamA"
          :key="idx"
          class="p-4 flex items-center justify-between border-b border-gray-800 last:border-b-0"
        >
          <view class="flex items-center gap-3">
            <image
              :src="player.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + player.userId"
              class="w-12 h-12 rounded-full border-2 border-tennis-neon"
            ></image>
            <view>
              <text v-if="idx === 0" class="text-[10px] text-tennis-neon font-bold uppercase tracking-wider block mb-1">A 队 {{ isCreator ? '(房主)' : '' }}</text>
              <text class="text-sm font-bold text-white">{{ player.nickname || '等待加入' }}</text>
            </view>
          </view>
          <text class="font-display font-bold text-lg text-white">{{ player.snapshotScore || '--' }}</text>
        </view>
        <!-- 空位 -->
        <view
          v-for="n in emptySlotA"
          :key="'emptyA' + n"
          @tap="shareInvite"
          class="p-4 flex items-center justify-center border-b border-gray-800 last:border-b-0"
        >
          <view class="text-center text-accent-blue font-bold flex items-center gap-2">
            <text class="text-lg">+</text>
            <text>邀请</text>
          </view>
        </view>
      </view>
    </view>

    <!-- VS 分隔 -->
    <view class="flex justify-center -my-3 relative z-10">
      <view class="bg-dark-slate px-4 py-1 rounded-full">
        <text class="text-xs font-bold text-gray-500 italic">VS</text>
      </view>
    </view>

    <!-- B队 -->
    <view class="mt-4 mb-8">
      <text class="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2 block">B 队</text>
      <view class="bg-card-bg border border-gray-700 rounded-2xl overflow-hidden">
        <view
          v-for="(player, idx) in teamB"
          :key="idx"
          class="p-4 flex items-center justify-between border-b border-gray-800 last:border-b-0"
        >
          <view class="flex items-center gap-3">
            <image
              :src="player.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + player.userId"
              class="w-12 h-12 rounded-full border-2 border-gray-600"
            ></image>
            <text class="text-sm font-bold text-white">{{ player.nickname || '等待加入' }}</text>
          </view>
          <text class="font-display font-bold text-lg text-white">{{ player.snapshotScore || '--' }}</text>
        </view>
        <!-- 空位 -->
        <view
          v-for="n in emptySlotB"
          :key="'emptyB' + n"
          @tap="shareInvite"
          class="p-4 flex items-center justify-center border-b border-gray-800 last:border-b-0"
        >
          <view class="text-center text-gray-500 font-bold flex items-center gap-2">
            <text class="text-lg">+</text>
            <text>邀请</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 平均分显示 -->
    <view class="flex justify-center gap-8 mb-6">
      <view class="text-center">
        <text class="text-[10px] text-gray-500 uppercase tracking-wider">A队均分</text>
        <text class="font-display font-bold text-xl text-tennis-neon block">{{ avgA }}</text>
      </view>
      <view class="text-center">
        <text class="text-[10px] text-gray-500 uppercase tracking-wider">B队均分</text>
        <text class="font-display font-bold text-xl text-white block">{{ avgB }}</text>
      </view>
    </view>

    <!-- 底部操作 -->
    <view class="mt-auto w-full pt-4 pb-[env(safe-area-inset-bottom)]">
      <!-- 分享邀请按钮 -->
      <view
        v-if="!isFull"
        @tap="shareInvite"
        class="w-full bg-card-bg border border-dashed border-gray-600 text-gray-300 font-bold py-4 rounded-xl text-lg flex justify-center items-center gap-2 mb-3"
      >
        <text class="text-xl">↗</text>
        <text>分享邀请卡</text>
      </view>

      <!-- 确认开赛按钮 -->
      <view
        v-if="isCreator"
        @tap="confirmStart"
        :disabled="!isFull || isStarting"
        class="w-full font-bold py-4 rounded-xl text-lg flex justify-center items-center transition-all"
        :class="isFull && !isStarting
          ? 'bg-tennis-neon text-dark-slate shadow-[0_10px_25px_-5px_rgba(212,248,32,0.4)] active:scale-95'
          : 'bg-gray-800 text-gray-500'"
      >
        <text v-if="isStarting">处理中...</text>
        <text v-else>{{ isFull ? '确认开赛' : `等待${requiredPlayers - currentPlayers}人加入` }}</text>
      </view>

      <text class="text-center text-[10px] text-gray-500 mt-4 block w-full">
        开赛后将记录当前双方积分快照进行 Elo 计算
      </text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

const matchId = ref<string>('');
const matchType = ref<1 | 2>(1);
const isCreator = ref(true);
const isStarting = ref(false);
const isLoading = ref(true);

// 队伍数据
const teamA = ref<any[]>([]);
const teamB = ref<any[]>([]);

const userInfo = ref<any>(null);

// 计算属性
const requiredPlayers = computed(() => matchType.value === 1 ? 2 : 4);
const currentPlayers = computed(() => teamA.value.length + teamB.value.length);
const isFull = computed(() => currentPlayers.value >= requiredPlayers.value);
const emptySlotA = computed(() => {
  const maxA = matchType.value === 1 ? 1 : 2;
  return Math.max(0, maxA - teamA.value.length);
});
const emptySlotB = computed(() => {
  const maxB = matchType.value === 1 ? 1 : 2;
  return Math.max(0, maxB - teamB.value.length);
});

const avgA = computed(() => {
  if (teamA.value.length === 0) return '--';
  const sum = teamA.value.reduce((acc: number, p: any) => acc + (p.snapshotScore || 0), 0);
  return (sum / teamA.value.length).toFixed(1);
});

const avgB = computed(() => {
  if (teamB.value.length === 0) return '--';
  const sum = teamB.value.reduce((acc: number, p: any) => acc + (p.snapshotScore || 0), 0);
  return (sum / teamB.value.length).toFixed(1);
});

onMounted(() => {
  // 获取用户信息
  const storedUser = uni.getStorageSync('user_info');
  if (storedUser) {
    try {
      userInfo.value = JSON.parse(storedUser);
    } catch (e) {}
  }

  // 获取页面参数
  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1];
  const options = (currentPage as any)?.options || {};

  if (options.matchId) {
    // 已有matchId，加载比赛详情
    matchId.value = options.matchId;
    loadMatch(options.matchId);
  } else {
    // 创建新比赛
    createMatch();
  }

  // 模拟加载已有队伍数据（实际应该从API获取）
  if (userInfo.value) {
    teamA.value = [{
      userId: userInfo.value.id,
      nickname: userInfo.value.nickname || '张哥',
      avatar_url: userInfo.value.avatar_url || '',
      snapshotScore: userInfo.value.current_score || 55.4,
    }];
  }
});

const goBack = () => {
  uni.navigateBack();
};

const switchMode = (mode: 1 | 2) => {
  if (mode === matchType.value) return;
  if (currentPlayers.value > (mode === 1 ? 2 : 4)) {
    uni.showToast({ title: '当前人数不支持此模式', icon: 'none' });
    return;
  }
  matchType.value = mode;
};

const shareInvite = () => {
  // 生成邀请码/小程序码分享
  if (!matchId.value) {
    uni.showToast({ title: '请先创建比赛', icon: 'none' });
    return;
  }
  const inviteCode = matchId.value.replace(/-/g, '').slice(-6).toUpperCase();
  uni.showModal({
    title: '邀请球友',
    content: `邀请码：${inviteCode}\n\n将此邀请码分享给球友，让他们扫码加入比赛。`,
    confirmText: '复制邀请码',
    success: (res) => {
      if (res.confirm) {
        // #ifdef H5 || MP-WEIXIN
        uni.setClipboardData({
          data: inviteCode,
          success: () => uni.showToast({ title: '已复制', icon: 'success' }),
        });
        // #endif
      }
    },
  });
};

    const confirmStart = async () => {
      if (!isFull.value || isStarting.value) return;

      isStarting.value = true;

      try {
        // 实际应调用API
        // const res = await request('POST', '/api/match/start', { matchId: matchId.value, userId: userInfo.value.id });

        // 模拟成功
        uni.showToast({ title: '比赛已开始！', icon: 'success' });

        // 跳转到比分录入页
        setTimeout(() => {
          uni.navigateTo({
            url: `/pages/match/score-entry?matchId=${matchId.value}`
          });
        }, 1500);
      } catch (error: any) {
        uni.showToast({ title: error.message || '开赛失败', icon: 'none' });
      } finally {
        isStarting.value = false;
      }
    };

const createMatch = async () => {
  isLoading.value = true;
  try {
    // 实际应调用API
    // const res = await request('POST', '/api/match/create', { matchType: matchType.value, userId: userInfo.value?.id });
    // matchId.value = res.data.matchId;

    // 模拟
    matchId.value = 'mock-match-' + Date.now();
    isCreator.value = true;
  } catch (error: any) {
    uni.showToast({ title: error.message || '创建失败', icon: 'none' });
  } finally {
    isLoading.value = false;
  }
};

const loadMatch = async (id: string) => {
  isLoading.value = true;
  try {
    // 实际应调用API
    // const res = await request('GET', `/api/match/${id}`);
    // 更新本地数据

    // 模拟
    matchId.value = id;
  } catch (error: any) {
    uni.showToast({ title: '加载失败', icon: 'none' });
  } finally {
    isLoading.value = false;
  }
};
</script>

<style>
page {
  background-color: #0A0E17;
}
</style>