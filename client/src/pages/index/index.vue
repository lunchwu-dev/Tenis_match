<template>
  <view class="page-root bg-dark-slate text-white relative" :style="{'padding-top': statusBarHeight + 'px'}">

    <!-- 未登录态 -->
    <view v-if="!userInfo" class="w-full h-screen relative flex flex-col">
      <view class="absolute inset-0 bg-gradient-to-br from-card-bg to-dark-slate opacity-80"></view>
      <view class="relative z-10 flex flex-col items-center justify-center flex-1 p-8 text-center">
        <!-- Logo -->
        <view class="w-32 h-32 rounded-full border-4 border-tennis-neon flex items-center justify-center mb-8 shadow-neon-glow">
          <text class="text-7xl">🎾</text>
        </view>
        <text class="font-display text-5xl font-bold text-white tracking-tight mb-2 text-shadow">网球名片</text>
        <text class="text-gray-400 text-sm mb-12">严肃业余网球爱好者的数字身份</text>
        <view class="mt-auto w-full">
          <button
            open-type="getPhoneNumber"
            @getphonenumber="handleWechatLogin"
            class="w-full bg-tennis-neon text-dark-slate font-bold py-4 rounded-xl text-lg flex items-center justify-center gap-2 transition hover:bg-white m-0"
          >
            <text>微信一键登录</text>
          </button>
          <view class="flex items-center gap-2 justify-center mt-4 text-xs text-gray-500" @click="toggleAgree">
            <view class="w-4 h-4 rounded-sm border border-tennis-neon flex items-center justify-center" :class="isAgreed ? 'bg-tennis-neon' : ''">
              <text v-if="isAgreed" class="text-dark-slate text-xs font-bold">✓</text>
            </view>
            <text>已阅读并同意 <text class="text-tennis-neon">用户协议</text> 与 <text class="text-tennis-neon">隐私政策</text></text>
          </view>
        </view>
      </view>
    </view>

    <!-- 已登录态：我的名片 -->
    <view v-else class="flex flex-col" style="height:100vh; overflow:hidden;">

      <!-- 可滚动内容区 -->
      <scroll-view scroll-y class="flex-1" :show-scrollbar="false">

        <!-- 名片头部 -->
        <view class="bg-gradient-to-b from-card-bg to-dark-slate p-6 rounded-b-3xl relative">
          <!-- 分享按钮 -->
          <view class="absolute top-12 right-6 w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center">
            <text class="text-gray-400 text-base">↗</text>
          </view>

          <!-- 用户信息行 -->
          <view class="flex items-center gap-4 mb-6">
            <image
              :src="userInfo.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=d4f820'"
              class="w-16 h-16 rounded-full border-2 border-tennis-neon"
              mode="aspectFill"
            ></image>
            <view>
              <view class="flex items-center gap-1">
                <text class="text-xl font-bold text-white">{{ userInfo.nickname || '张哥' }}</text>
                <text class="text-accent-blue text-sm">✔</text>
              </view>
              <text class="inline-block px-2 py-0.5 bg-gray-800 text-gray-300 text-[10px] rounded uppercase tracking-wider mt-1">IT 搬砖人</text>
            </view>
          </view>

          <!-- 积分区域 -->
          <view class="flex justify-between items-end mb-6">
            <view>
              <text class="text-gray-400 text-xs mb-1 block">当前综合积分</text>
              <view class="flex items-baseline">
                <text class="font-display font-bold text-6xl text-white leading-none">{{ Math.floor(userInfo.current_score || 55) }}</text>
                <text class="font-display font-bold text-2xl text-gray-500 leading-none">.{{ ((userInfo.current_score || 55.4) % 1 * 10).toFixed(0) }}</text>
              </view>
            </view>
            <view class="text-right">
              <view class="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-tennis-neon to-[#c2e519] text-dark-slate font-bold text-sm rounded-lg">
                <text>🏅</text>
                <text>{{ rankTitle }}</text>
              </view>
              <text class="text-gray-400 text-[10px] mt-1.5 tracking-wide block">≈ NTRP 3.5 / UTR 5.0</text>
            </view>
          </view>

          <!-- 雷达图 -->
          <view class="w-full flex justify-center py-4 relative">
            <view class="w-48 h-48 radar-bg relative flex items-center justify-center">
              <canvas canvas-id="radarCanvas" id="radarCanvas" class="absolute inset-0 w-48 h-48 z-20"></canvas>
              <!-- 雷达图标签：text-[10px] 设计稿尺寸 -->
              <text class="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 top-[calc(50%-2px)] text-[10px] text-gray-400 whitespace-nowrap">底线</text>
              <text class="absolute right-0 top-[30%] -translate-y-1/2 text-[10px] text-gray-400">发球</text>
              <text class="absolute bottom-1 right-[10%] text-[10px] text-gray-400">网前</text>
              <text class="absolute bottom-1 left-[10%] text-[10px] text-gray-400">战术</text>
              <text class="absolute left-0 top-[30%] -translate-y-1/2 text-[10px] text-gray-400">接发</text>
            </view>
          </view>
        </view>

        <!-- 战绩摘要 -->
        <view class="px-6 py-6">
          <text class="font-bold text-[10px] text-gray-400 uppercase tracking-widest mb-4 block">战绩摘要</text>
          <view class="grid grid-cols-3 gap-3">
            <view class="bg-card-bg p-4 rounded-2xl flex flex-col items-center">
              <text class="text-gray-500 text-[10px] mb-1">总场次</text>
              <text class="text-xl font-bold font-display text-white">{{ matchCount }}</text>
            </view>
            <view class="bg-card-bg p-4 rounded-2xl flex flex-col items-center">
              <text class="text-gray-500 text-[10px] mb-1">胜率</text>
              <text class="text-xl font-bold font-display text-tennis-neon">{{ winRate }}%</text>
            </view>
            <view class="bg-card-bg p-4 rounded-2xl flex flex-col items-center">
              <text class="text-gray-500 text-[10px] mb-1">当前连胜</text>
              <text class="text-xl font-bold font-display text-white">3</text>
            </view>
          </view>
        </view>

        <!-- 底部占位：确保内容不被FAB和TabBar遮挡 -->
        <view style="height: 140px;"></view>
      </scroll-view>

      <!-- 悬浮发起比赛按钮 - 固定在TabBar上方 -->
      <view class="absolute bottom-[calc(80px+env(safe-area-inset-bottom))] w-full px-6 z-20 pointer-events-none" style="padding-bottom: env(safe-area-inset-bottom);">
        <view class="pointer-events-auto">
          <button
            @click="startMatch"
            class="w-full bg-tennis-neon text-dark-slate font-bold py-4 rounded-2xl text-lg shadow-neon-glow-sm transition active:scale-95 flex justify-center items-center gap-2 m-0"
          >
            <text>+</text>
            <text>发起比赛录入</text>
          </button>
        </view>
      </view>

      <!-- 自定义 TabBar -->
      <tabbar />
    </view>

  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import tabbar from '@/components/tabbar/index.vue'

const statusBarHeight = ref(20)
const userInfo = ref<any>(null)
const matchCount = ref(24)
const winRate = ref(62)
const rankTitle = ref('狠角色')
const isAgreed = ref(true)

onMounted(() => {
  const sysInfo = uni.getSystemInfoSync()
  statusBarHeight.value = sysInfo.statusBarHeight || 20
  drawRadar()
})

const drawRadar = () => {
  const query = uni.createSelectorQuery().in(getCurrentInstance())
  query.select('#radarCanvas').boundingClientRect((rect: any) => {
    if (!rect) return
    const ctx = uni.createCanvasContext('radarCanvas')
    const cx = rect.width / 2
    const cy = rect.height / 2
    const radius = Math.min(cx, cy) - 10
    const angles = [-90, -18, 54, 126, 198]

    for (let layer = 1; layer <= 5; layer++) {
      const r = radius * (layer / 5)
      ctx.beginPath()
      for (let i = 0; i < 5; i++) {
        const angle = (angles[i] * Math.PI) / 180
        const x = cx + r * Math.cos(angle)
        const y = cy + r * Math.sin(angle)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.strokeStyle = 'rgba(255,255,255,0.1)'
      ctx.lineWidth = 1
      ctx.stroke()
    }

    const mockData = [0.8, 0.6, 0.4, 0.7, 0.5]
    ctx.beginPath()
    for (let i = 0; i < 5; i++) {
      const angle = (angles[i] * Math.PI) / 180
      const r = radius * mockData[i]
      const x = cx + r * Math.cos(angle)
      const y = cy + r * Math.sin(angle)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.fillStyle = 'rgba(212, 248, 32, 0.2)'
    ctx.fill()
    ctx.strokeStyle = '#D4F820'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.draw()
  }).exec()
}

import { getCurrentInstance } from 'vue'

const toggleAgree = () => {
  isAgreed.value = !isAgreed.value
}

const handleWechatLogin = (e: any) => {
  if (!isAgreed.value) {
    uni.showToast({ title: '请先勾选同意协议', icon: 'none' })
    return
  }
  userInfo.value = {
    nickname: '张哥',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=d4f820',
    current_score: 55.4
  }
}

const startMatch = () => {
  uni.navigateTo({ url: '/pages/match/create' })
}
</script>

<style>
page {
  background-color: #0A0E17;
}
::-webkit-scrollbar {
  display: none;
}
.radar-bg {
  background: repeating-radial-gradient(circle at 50% 50%, transparent 0, transparent 20px, rgba(255,255,255,0.05) 20px, rgba(255,255,255,0.05) 21px);
  border-radius: 50%;
}
.text-shadow {
  text-shadow: 0 0 10px rgba(255,255,255,0.3);
}
</style>
