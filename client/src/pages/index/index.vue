<template>
  <view class="page-root bg-dark-slate text-white relative" :style="rootStyle">

    <!-- ================= 未登录态 ================= -->
    <view
      v-if="!userInfo"
      class="login-view relative flex flex-col"
      :style="{ ...rootStyle, paddingTop: statusBarHeight + 'px' }"
    >
      <view class="absolute inset-0 bg-gradient-to-br from-card-bg to-dark-slate opacity-80"></view>

      <view class="relative z-10 flex-1 flex flex-col items-center px-8 pb-8 text-center">
        <!-- 中部 Logo 区：上下居中 -->
        <view class="flex-1 flex flex-col items-center justify-center">
          <view class="w-32 h-32 rounded-full border-4 border-tennis-neon flex items-center justify-center mb-8 shadow-neon-glow">
            <text class="text-7xl">🎾</text>
          </view>
          <text class="font-display text-5xl font-bold text-white tracking-tight mb-2 text-shadow">网球名片</text>
          <text class="text-gray-400 text-sm">严肃业余网球爱好者的数字身份</text>
        </view>

        <!-- 底部登录区 -->
        <view class="w-full" :style="{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }">
          <button
            @tap="handleWechatLogin"
            class="w-full bg-tennis-neon text-dark-slate font-bold py-4 rounded-xl text-lg flex items-center justify-center gap-2 m-0"
          >
            <text>微信一键登录</text>
          </button>
          <view class="flex items-center gap-2 justify-center mt-4 text-xs text-gray-500" @tap="toggleAgree">
            <view
              class="w-4 h-4 rounded-sm border border-tennis-neon flex items-center justify-center"
              :class="isAgreed ? 'bg-tennis-neon' : ''"
            >
              <text v-if="isAgreed" class="text-dark-slate text-xs font-bold">✓</text>
            </view>
            <text>已阅读并同意 <text class="text-tennis-neon">用户协议</text> 与 <text class="text-tennis-neon">隐私政策</text></text>
          </view>
        </view>
      </view>
    </view>

    <!-- ================= 已登录态：我的名片 ================= -->
    <view v-else class="card-root" :style="rootStyle">
      <!-- 可滚动内容区：显式高度 = 100vh - TabBar - 安全区 -->
      <scroll-view
        scroll-y
        :show-scrollbar="false"
        class="hide-scroll"
        :style="cardScrollStyle"
      >
        <!-- 名片头部 -->
        <view
          class="bg-gradient-to-b from-card-bg to-dark-slate px-6 pb-6 rounded-b-3xl relative"
          :style="{ paddingTop: (statusBarHeight + 20) + 'px' }"
        >
          <!-- 用户信息 -->
          <view class="flex items-center gap-4 mb-6">
            <view class="w-16 h-16 rounded-full border-2 border-tennis-neon flex items-center justify-center bg-gradient-to-br from-card-bg to-dark-slate overflow-hidden">
              <image
                v-if="userInfo.avatar_url"
                :src="userInfo.avatar_url"
                class="w-full h-full"
                mode="aspectFill"
              ></image>
              <text v-else class="text-2xl font-bold text-tennis-neon">{{ avatarInitial }}</text>
            </view>
            <view>
              <view class="flex items-center gap-1">
                <text class="text-xl font-bold text-white">{{ userInfo.nickname || '网球爱好者' }}</text>
              </view>
              <text class="text-gray-400 text-xs mt-1 block">NTRP {{ ntrpLevel }} · {{ userInfo.gender || '男' }}</text>
            </view>
          </view>

          <!-- 综分卡片 -->
          <view class="bg-card-bg/60 backdrop-blur-sm rounded-2xl p-5 relative overflow-hidden">
            <view class="flex justify-between items-start mb-1">
              <text class="text-gray-400 text-xs">综合积分</text>
              <view class="flex items-center gap-1 bg-tennis-neon/15 px-2 py-0.5 rounded-full">
                <text class="text-tennis-neon text-xs font-bold">+24</text>
                <text class="text-tennis-neon text-[10px]">▲</text>
              </view>
            </view>
            <view class="flex justify-between items-end mb-3">
              <view class="flex items-baseline gap-2">
                <text class="font-display font-bold text-5xl text-tennis-neon leading-none">{{ scoreInt }}</text>
                <text class="text-gray-500 text-sm font-medium tracking-wider">ELO</text>
              </view>
            </view>
            <view class="flex items-center gap-3">
              <text class="text-white text-sm font-medium">NTRP {{ ntrpLevel }}</text>
              <view class="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <view class="h-full bg-tennis-neon rounded-full" :style="{ width: ntrpProgress + '%' }"></view>
              </view>
              <text class="text-gray-500 text-[10px]">{{ winCount }}-{{ loseCount }}</text>
            </view>
          </view>

        </view>

        <!-- 能力雷达卡片 -->
        <view class="px-6 py-4">
          <view class="bg-card-bg/60 backdrop-blur-sm rounded-2xl p-5">
            <view class="flex justify-between items-center mb-4">
              <text class="text-white text-sm font-bold">能力雷达</text>
              <text class="text-tennis-neon text-xs font-medium">详情 ›</text>
            </view>
            <view class="w-full flex justify-center relative">
              <view class="w-44 h-44 relative flex items-center justify-center">
                <canvas canvas-id="radarCanvas" id="radarCanvas" class="absolute inset-0 w-44 h-44" style="z-index: 2;"></canvas>
                <text class="absolute text-xs text-gray-300 whitespace-nowrap" style="top: -16px; left: 50%; transform: translateX(-50%);">底线</text>
                <text class="absolute text-xs text-gray-300 whitespace-nowrap" style="top: 26%; right: -10px;">发球</text>
                <text class="absolute text-xs text-gray-300 whitespace-nowrap" style="bottom: -16px; right: 6%;">网前</text>
                <text class="absolute text-xs text-gray-300 whitespace-nowrap" style="bottom: -16px; left: 6%;">战术</text>
                <text class="absolute text-xs text-gray-300 whitespace-nowrap" style="top: 26%; left: -10px;">接发</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 战绩摘要 -->
        <view class="px-6 py-6">
          <text class="font-bold text-[10px] text-gray-400 uppercase tracking-widest mb-4 block">战绩摘要</text>
          <view class="match-summary-grid">
            <view class="summary-card">
              <text class="text-gray-500 text-[10px] mb-1">总场次</text>
              <text class="text-xl font-bold font-display text-white">{{ matchCount }}</text>
            </view>
            <view class="summary-card">
              <text class="text-gray-500 text-[10px] mb-1">胜率</text>
              <text class="text-xl font-bold font-display text-tennis-neon">{{ winRate }}%</text>
            </view>
            <view class="summary-card">
              <text class="text-gray-500 text-[10px] mb-1">近期状态</text>
              <text class="text-xl font-bold font-display text-white">{{ recentStreak }}</text>
            </view>
          </view>
        </view>

        <!-- 底部占位给 TabBar -->
        <view style="height: 20px;"></view>
      </scroll-view>

      <!-- 自定义 TabBar -->
      <tabbar />

      <!-- 常驻「发起比赛」悬浮按钮（不随滚动，位于 TabBar 之上） -->
      <create-fab />
    </view>

  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import tabbar from '@/components/tabbar/index.vue'
import createFab from '@/components/create-fab/index.vue'
import { TABBAR_HEIGHT } from '@/utils/layout'
import { useViewport } from '@/utils/viewport'
import { request, USE_MOCK } from '@/utils/request'
import uCharts from '@qiun/ucharts'

let radarChart: any = null

const statusBarHeight = ref(20)
const { rootStyle, heightPx } = useViewport()
const userInfo = ref<any>(null)
const matchCount = ref(0)
const winRate = ref(0)
const rankTitle = computed(() => {
  const s = userInfo.value?.current_score ?? 50
  if (s >= 80) return '宗师'
  if (s >= 70) return '大魔王'
  if (s >= 60) return '真大神'
  if (s >= 50) return '狠角色'
  if (s >= 40) return '入门'
  return '新手'
})
const isAgreed = ref(true)

const scoreInt = computed(() => {
  const s = userInfo.value?.current_score ?? 55.4
  return Math.floor(s)
})
const scoreFrac = computed(() => {
  const s = userInfo.value?.current_score ?? 55.4
  return Math.round((s - Math.floor(s)) * 10)
})

// 新增：设计稿对齐属性
const winCount = ref(0)
const loseCount = ref(0)
const recentForm = ref<(string | number)[]>([])

const avatarInitial = computed(() => {
  const name = userInfo.value?.nickname || '网'
  return name.charAt(0)
})

const ntrpLevel = computed(() => {
  const s = userInfo.value?.current_score ?? 55.4
  if (s >= 75) return '4.5'
  if (s >= 65) return '4.0'
  if (s >= 55) return '3.5'
  if (s >= 45) return '3.0'
  if (s >= 35) return '2.5'
  return '2.0'
})

const ntrpProgress = computed(() => {
  const s = userInfo.value?.current_score ?? 55.4
  // 映射到 30-95% 进度范围
  return Math.min(95, Math.max(30, ((s - 20) / 80) * 65 + 30))
})

const recentStreak = computed(() => {
  if (!recentForm.value.length) return '-'
  let streak = 0
  const last = recentForm.value[recentForm.value.length - 1]
  for (let i = recentForm.value.length - 1; i >= 0; i--) {
    if (recentForm.value[i] === last) streak++
    else break
  }
  const label = last === 'W' ? '连胜' : '连败'
  return `${streak}${label}`
})

// 可滚动区域高度：真实视口高度（windowHeight，px）减去底部 TabBar 与底部安全区
const cardScrollStyle = computed(() => ({
  height: `calc(${heightPx.value} - ${TABBAR_HEIGHT}px - env(safe-area-inset-bottom))`,
  width: '100%',
}))

onMounted(() => {
  const sys = uni.getSystemInfoSync()
  statusBarHeight.value = sys.statusBarHeight || 20

  // 恢复用户信息（如果已登录）
  const storedUserInfo = uni.getStorageSync('user_info')
  if (storedUserInfo) {
    userInfo.value = storedUserInfo
  }

  drawRadar()

  // 已登录则从服务端刷新最新数据
  const token = uni.getStorageSync('auth_token')
  if (token) {
    refreshUserInfo()
  }
})

const drawRadar = () => {
  // 页面级选择器查询（无需 .in() 作用域）；并提供兜底尺寸，避免微信端 rect 为 null 时雷达不绘制
  const query = uni.createSelectorQuery()
  query.select('#radarCanvas').boundingClientRect((rect: any) => {
    const width = rect?.width || 176
    const height = rect?.height || 176

    // 解析雷达图数据（兼容对象格式和数组格式）
    const rawRadar = userInfo.value?.radar_data
    let radarData: number[]
    if (Array.isArray(rawRadar)) {
      radarData = rawRadar as number[]
    } else if (rawRadar && typeof rawRadar === 'object') {
      radarData = [
        Number((rawRadar as any).baseline) || 0.5,
        Number((rawRadar as any).serve) || 0.5,
        Number((rawRadar as any).netplay) || 0.5,
        Number((rawRadar as any).tactics) || 0.5,
        Number((rawRadar as any).receive) || 0.5,
      ]
    } else {
      radarData = [0.5, 0.5, 0.5, 0.5, 0.5]
    }

    // 归一化到 0-1 范围
    const normalized = radarData.map(v => {
      const n = Number(v) || 0
      return Math.max(0, Math.min(1, n))
    })

    const ctx = uni.createCanvasContext('radarCanvas')
    radarChart = new uCharts({
      type: 'radar',
      context: ctx,
      width,
      height,
      categories: ['底线', '发球', '网前', '战术', '接发'],
      series: [{
        name: '能力值',
        data: normalized,
        color: '#D4F820',
      }],
      background: 'rgba(0,0,0,0)',
      legend: { show: false },
      dataLabel: false,
      padding: [10, 10, 10, 10],
      extra: {
        radar: {
          max: 1,
          gridCount: 5,
          opacity: 0.35,
          border: true,
          labelShow: false,
        }
      },
    })
  }).exec()
}

const refreshUserInfo = async () => {
  try {
    const res = await request<{
      success: boolean
      data?: {
        id: string
        nickname: string
        avatar_url: string | null
        current_score: number
        radar_data: any
        stats: {
          totalMatches: number
          winMatches: number
          loseMatches: number
          winRate: number
          recentForm: ('W' | 'L')[]
        }
      }
      error?: string
    }>({
      url: '/api/users/me',
      method: 'GET',
    })

    if (res.success && res.data) {
      userInfo.value = res.data
      uni.setStorageSync('user_info', res.data)
      matchCount.value = res.data.stats?.totalMatches ?? 0
      winRate.value = Math.round(res.data.stats?.winRate ?? 0)
      winCount.value = res.data.stats?.winMatches ?? 0
      loseCount.value = res.data.stats?.loseMatches ?? 0
      recentForm.value = res.data.stats?.recentForm || []
      drawRadar()
    }
  } catch (error) {
    console.error('Refresh user info failed:', error)
  }
}

const toggleAgree = () => {
  isAgreed.value = !isAgreed.value
}

const handleWechatLogin = async () => {
  if (!isAgreed.value) {
    uni.showToast({ title: '请先勾选同意协议', icon: 'none' })
    return
  }
  
  try {
    uni.showLoading({ title: '登录中...' })
    
    // 1. 获取微信登录凭证 code（Mock 模式跳过真实 wx.login，避免开发者工具无账号时失败）
    let code = 'mock-code'
    if (!USE_MOCK) {
      try {
        const loginRes = (await uni.login({ provider: 'weixin' })) as any
        code = loginRes?.code || 'mock-code'
      } catch (e) {
        console.warn('wx.login failed, fallback to mock code', e)
      }
    }
    
    // 2. 调用后端登录API
    const response = await request<{
      success: boolean
      data?: { token: string; user: any }
      error?: string
    }>({
      url: '/api/login',
      method: 'POST',
      data: { code }
    })
    
    if (!response.success || !response.data) {
      throw new Error(response.error || '登录失败')
    }
    
    // 3. 存储token和用户信息
    uni.setStorageSync('auth_token', response.data.token)
    uni.setStorageSync('user_info', response.data.user)
    userInfo.value = response.data.user
    
    uni.showToast({ title: '登录成功', icon: 'success' })
  } catch (error: any) {
    console.error('Login failed:', error)
    uni.showToast({ title: error.message || '登录失败', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}
</script>

<style>
page {
  background-color: #0A0E17;
}
.page-root {
  width: 100%;
  min-height: 100vh;
}
.login-view {
  width: 100%;
  height: 100vh;
}
.card-root {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}
.hide-scroll::-webkit-scrollbar { display: none; }
.hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
.match-summary-grid {
  display: flex;
  flex-direction: row;
  gap: 12px;
  width: 100%;
  box-sizing: border-box;
}
.summary-card {
  flex: 1;
  background-color: #151A26;
  padding: 16px;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
}
.text-shadow {
  text-shadow: 0 0 10px rgba(255,255,255,0.3);
}
</style>
