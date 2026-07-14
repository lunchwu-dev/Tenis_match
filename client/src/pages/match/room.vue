<template>
  <view class="page bg-dark-slate text-white font-body relative room-root" :style="rootStyle">
    <!-- 顶部导航 -->
    <view
      class="header px-6"
      :style="{ paddingTop: (statusBarHeight + 12) + 'px' }"
    >
      <view class="flex justify-between items-center mb-6">
        <view @tap="goBack" class="text-gray-400" hover-class="icon-hover">
          <text class="text-2xl">‹</text>
        </view>
        <text class="text-white font-display font-bold tracking-widest text-lg">比赛准备室</text>
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
      <!-- 状态横幅 -->
      <view
        class="status-banner"
      >
        <view class="w-2 h-2 rounded-full bg-tennis-neon mr-3"></view>
        <text class="text-tennis-neon text-sm font-bold">{{ statusText }}</text>
      </view>

      <!-- 比赛席位 -->
      <text class="section-label">比赛席位</text>
      <view class="slots-card">
        <!-- A 队：已加入 / 空位 -->
        <view
          v-for="(player, idx) in teamA"
          :key="'a' + idx"
          class="slot-filled"
        >
          <view class="flex items-center gap-3 flex-1 min-w-0">
            <view class="w-12 h-12 rounded-full border-2 border-tennis-neon flex items-center justify-center bg-dark-slate overflow-hidden">
              <image
                v-if="player.avatar_url"
                :src="player.avatar_url"
                class="w-full h-full"
                mode="aspectFill"
              ></image>
              <text v-else class="text-lg font-bold text-tennis-neon">{{ player.nickname?.charAt(0) || '?' }}</text>
            </view>
            <view class="min-w-0">
              <text class="text-white text-sm font-bold truncate block">{{ player.nickname }} <text v-if="isCreator" class="text-tennis-neon text-xs">(房主)</text></text>
              <text class="text-gray-500 text-xs">ELO {{ Math.round(player.snapshotScore || 0) }} · NTRP {{ getNtrpLabel(player.snapshotScore) }}</text>
            </view>
          </view>
          <view class="px-2 py-1 rounded-md bg-tennis-neon/15">
            <text class="text-tennis-neon text-xs font-bold">主队</text>
          </view>
        </view>

        <view
          v-for="n in emptySlotA"
          :key="'emptyA' + n"
          class="slot-empty"
        >
          <view class="flex items-center gap-3 flex-1">
            <view class="w-12 h-12 rounded-full border border-dashed border-gray-600 flex items-center justify-center bg-gray-900">
              <text class="text-2xl text-gray-500">+</text>
            </view>
            <view>
              <text class="text-gray-400 text-sm font-bold">等待对手加入</text>
              <text class="text-gray-600 text-xs block">分享小程序码给对手</text>
            </view>
          </view>
          <view class="px-2 py-1 rounded-md bg-gray-800">
            <text class="text-gray-400 text-xs">主队</text>
          </view>
        </view>

        <!-- B 队：已加入 / 空位 -->
        <view
          v-for="(player, idx) in teamB"
          :key="'b' + idx"
          class="slot-filled"
          style="border-color: rgba(255,255,255,0.2); background-color: rgba(255,255,255,0.03);"
        >
          <view class="flex items-center gap-3 flex-1 min-w-0">
            <view class="w-12 h-12 rounded-full border-2 border-gray-600 flex items-center justify-center bg-dark-slate overflow-hidden">
              <image
                v-if="player.avatar_url"
                :src="player.avatar_url"
                class="w-full h-full"
                mode="aspectFill"
              ></image>
              <text v-else class="text-lg font-bold text-gray-400">{{ player.nickname?.charAt(0) || '?' }}</text>
            </view>
            <view class="min-w-0">
              <text class="text-white text-sm font-bold truncate block">{{ player.nickname }}</text>
              <text class="text-gray-500 text-xs">ELO {{ Math.round(player.snapshotScore || 0) }} · NTRP {{ getNtrpLabel(player.snapshotScore) }}</text>
            </view>
          </view>
          <view class="px-2 py-1 rounded-md bg-gray-800">
            <text class="text-gray-400 text-xs">客队</text>
          </view>
        </view>

        <view
          v-for="n in emptySlotB"
          :key="'emptyB' + n"
          class="slot-empty"
        >
          <view class="flex items-center gap-3 flex-1">
            <view class="w-12 h-12 rounded-full border border-dashed border-gray-600 flex items-center justify-center bg-gray-900">
              <text class="text-2xl text-gray-500">+</text>
            </view>
            <view>
              <text class="text-gray-400 text-sm font-bold">等待对手加入</text>
              <text class="text-gray-600 text-xs block">分享小程序码给对手</text>
            </view>
          </view>
          <view class="px-2 py-1 rounded-md bg-gray-800">
            <text class="text-gray-400 text-xs">客队</text>
          </view>
        </view>
      </view>

      <!-- 邀请对手扫码加入 -->
      <text class="section-label">邀请对手扫码加入</text>
      <view class="qr-card">
        <view class="qr-box">
          <view class="qr-grid">
            <view
              v-for="(cell, i) in qrFlat"
              :key="i"
              class="qr-cell"
              :class="cell ? 'qr-cell-on' : 'qr-cell-off'"
            ></view>
          </view>
        </view>
        <text class="qr-hint">长按识别二维码 · 邀请码 #{{ inviteCode }}</text>
      </view>

      <!-- 复制邀请码（辅助操作） -->
      <view
        class="copy-invite-row"
        hover-class="copy-hover"
        @tap="copyInvite"
      >
        <text class="text-gray-400 text-sm">或复制邀请码</text>
        <text class="font-display font-bold text-tennis-neon tracking-widest">{{ inviteCode }}</text>
      </view>

      <view style="height: 12px;"></view>
    </scroll-view>

    <!-- 底部操作区（固定） -->
    <view
      class="footer px-6 pt-3 bg-dark-slate border-t border-gray-900"
      :style="{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }"
    >
      <view
        v-if="isCreator"
        @tap="confirmStart"
        class="w-full font-bold py-4 rounded-xl text-lg flex justify-center items-center transition-all"
        :class="isFull && !isStarting
          ? 'bg-tennis-neon text-dark-slate shadow-[0_10px_25px_-5px_rgba(212,248,32,0.4)] active:scale-95'
          : 'bg-gray-800 text-gray-500'"
      >
        <text v-if="isStarting">处理中...</text>
        <text v-else>{{ isFull ? '对手到达后开启比赛' : `等待${requiredPlayers - currentPlayers}人加入` }}</text>
      </view>

      <text v-if="isCreator" class="text-center text-[10px] text-gray-500 mt-3 block">
        开赛后将记录当前双方积分快照进行 Elo 计算
      </text>
      <text v-else class="text-center text-[10px] text-gray-500 mt-3 block">
        等待房主开启比赛
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
const matchType = ref<1 | 2>(1);
const isCreator = ref(true);
const isStarting = ref(false);
const inviteCode = ref('');
const qrFlat = ref<boolean[]>([]);
const matchStatus = ref<number>(0);

const teamA = ref<any[]>([]);
const teamB = ref<any[]>([]);
const userInfo = ref<any>(null);

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

const statusText = computed(() => {
  if (isFull.value) return '全员就绪，可开启比赛';
  return `等待对手加入 · ${currentPlayers.value}/${requiredPlayers.value}`;
});

// header ≈ statusBar + 12 + 48 + 24 ≈ statusBar + 84
// footer ≈ button 64 + tip 24 + padding ≈ 110，保守留 130
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

  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1];
  const options = (currentPage as any)?.options || {};

  if (options.matchId) {
    matchId.value = options.matchId;
    loadMatch(options.matchId).then((ok: boolean) => {
      if (ok) maybeJoinAsOpponent();
    });
  } else {
    uni.showToast({ title: '缺少比赛信息', icon: 'none' });
  }
});

const goBack = () => { uni.navigateBack(); };

const getNtrpLabel = (score?: number): string => {
  const s = score || 0;
  if (s >= 75) return '4.5';
  if (s >= 65) return '4.0';
  if (s >= 55) return '3.5';
  if (s >= 45) return '3.0';
  if (s >= 35) return '2.5';
  return '2.0';
};

// 基于邀请码确定性生成 21x21 的二维码风格点阵（含三角定位块）。
const QR_SIZE = 21;
const buildQr = (code: string): boolean[] => {
  const size = QR_SIZE;
  const grid: boolean[] = new Array(size * size).fill(false);
  const idx = (r: number, c: number) => r * size + c;
  const setFinder = (or: number, oc: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const onBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const inCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        grid[idx(or + r, oc + c)] = onBorder || inCenter;
      }
    }
  };
  setFinder(0, 0);
  setFinder(0, size - 7);
  setFinder(size - 7, 0);
  let seed = 0;
  for (let i = 0; i < code.length; i++) seed = (seed * 31 + code.charCodeAt(i)) >>> 0;
  let s = seed || 1;
  const rand = () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return (s >>> 0) / 4294967296;
  };
  const inFinder = (r: number, c: number): boolean => {
    const zones: Array<[number, number]> = [[0, 0], [0, size - 7], [size - 7, 0]];
    return zones.some(([or, oc]) => r >= or && r < or + 7 && c >= oc && c < oc + 7);
  };
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (inFinder(r, c)) continue;
      grid[idx(r, c)] = rand() > 0.5;
    }
  }
  return grid;
};

const buildInviteCode = () => {
  if (!matchId.value) return;
  inviteCode.value = matchId.value.replace(/-/g, '').slice(-6).toUpperCase();
  qrFlat.value = buildQr(inviteCode.value);
};

const copyInvite = () => {
  if (!inviteCode.value) return;
  uni.setClipboardData({
    data: inviteCode.value,
    success: () => uni.showToast({ title: '已复制', icon: 'success' }),
  });
};

const confirmStart = async () => {
  if (!isFull.value || isStarting.value) return;
  if (!userInfo.value?.id) {
    uni.showToast({ title: '请先登录', icon: 'none' });
    return;
  }
  isStarting.value = true;
  try {
    const res = await request<{
      success: boolean;
      data?: any;
      error?: string;
    }>({
      url: '/api/match/start',
      method: 'POST',
      data: {
        matchId: matchId.value,
        userId: userInfo.value.id,
      },
    });

    if (!res.success) {
      throw new Error(res.error || '开赛失败');
    }

    uni.showToast({ title: '比赛已开始！', icon: 'success' });
    setTimeout(() => {
      uni.navigateTo({ url: `/pages/match/score-entry?matchId=${matchId.value}` });
    }, 1500);
  } catch (error: any) {
    uni.showToast({ title: error.message || '开赛失败', icon: 'none' });
  } finally {
    isStarting.value = false;
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
        statusText: string;
        creator: { id: string; nickname: string; avatar_url: string; current_score: number };
        teamA: Array<{
          userId: string;
          nickname: string;
          avatarUrl: string;
          snapshotScore: number;
        }>;
        teamB: Array<{
          userId: string;
          nickname: string;
          avatarUrl: string;
          snapshotScore: number;
        }>;
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
    matchType.value = res.data.matchType === '单打' ? 1 : 2;
    teamA.value = (res.data.teamA || []).map((p) => ({
      userId: p.userId,
      nickname: p.nickname,
      avatar_url: p.avatarUrl,
      snapshotScore: p.snapshotScore,
    }));
    teamB.value = (res.data.teamB || []).map((p) => ({
      userId: p.userId,
      nickname: p.nickname,
      avatar_url: p.avatarUrl,
      snapshotScore: p.snapshotScore,
    }));
    if (userInfo.value) {
      isCreator.value = res.data.creator?.id === userInfo.value.id;
    }
    matchStatus.value = res.data.status;
    buildInviteCode();
    return true;
  } catch (error: any) {
    uni.showToast({ title: error.message || '加载失败', icon: 'none' });
    return false;
  }
};

/**
 * 对手扫码/深链进入准备室后，若尚未加入且比赛仍在等待阶段，自动加入对应队伍。
 * 关闭「房主在 A 队、对手仅围观」的前端缺口，使 /api/match/join 在真实交互中被调用。
 */
const maybeJoinAsOpponent = async () => {
  const myId = userInfo.value?.id;
  if (!myId || !inviteCode.value) return;
  if (isCreator.value) return;            // 房主已在 A 队
  if (matchStatus.value !== 0) return;    // 仅等待加入阶段可加入
  const amParticipant = [...teamA.value, ...teamB.value].some((p) => p.userId === myId);
  if (amParticipant) return;

  try {
    const res = await request<any>({
      url: '/api/match/join',
      method: 'POST',
      data: { inviteCode: inviteCode.value, userId: myId },
    });
    if (res?.success) {
      await loadMatch(matchId.value); // 刷新席位，使自身显示在 B 队
    }
  } catch (e) {
    // 加入失败（如比赛已满/已开赛）不影响已加载的房间
    console.warn('auto-join skipped:', e);
  }
};
</script>

<style>
page {
  background-color: #0A0E17;
}
.room-root {
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

.status-banner {
  display: flex;
  align-items: center;
  background-color: rgba(16, 40, 12, 1);
  border: 1px solid rgba(212, 248, 32, 0.3);
  border-radius: 10px;
  padding: 12px 16px;
  margin-bottom: 20px;
}
.section-label {
  display: block;
  font-size: 12px;
  color: #9BA0AA;
  font-weight: 700;
  margin-bottom: 12px;
  letter-spacing: 0.05em;
}
.slots-card {
  background-color: #151A26;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.slot-filled {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background-color: rgba(16, 40, 12, 1);
  border: 1px solid rgba(212, 248, 32, 0.4);
  border-radius: 12px;
  padding: 12px;
}
.slot-empty {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background-color: #0A0E12;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 12px;
}
.qr-card {
  background-color: #ffffff;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.qr-box {
  background-color: #0A0E17;
  border-radius: 8px;
  padding: 10px;
  width: fit-content;
}
.qr-grid {
  display: flex;
  flex-wrap: wrap;
  width: 147px;
  height: 147px;
}
.qr-cell {
  width: 7px;
  height: 7px;
  box-sizing: border-box;
}
.qr-cell-on { background-color: #0A0E17; }
.qr-cell-off { background-color: #ffffff; }
.qr-hint {
  color: #0A0E17;
  font-size: 11px;
  font-weight: 500;
}
.copy-invite-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: #151A26;
  border-radius: 12px;
  padding: 14px 16px;
  margin-bottom: 12px;
}
.copy-hover { opacity: 0.82; }
.icon-hover { opacity: 0.6; }
</style>
