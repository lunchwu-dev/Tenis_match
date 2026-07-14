<template>
  <view
    class="fab"
    :style="{ bottom: fabBottom }"
    hover-class="fab-hover"
    @tap="onCreate"
  >
    <text class="fab-icon">＋</text>
    <text class="fab-text">发起比赛</text>
  </view>
</template>

<script setup lang="ts">
import { TABBAR_HEIGHT } from '@/utils/layout'

// 固定悬浮于右下角，位于 TabBar 之上，不随页面滚动。
const fabBottom = `calc(${TABBAR_HEIGHT}px + env(safe-area-inset-bottom) + 16px)`

const onCreate = () => {
  uni.navigateTo({ url: '/pages/match/create' })
}
</script>

<style scoped>
.fab {
  position: fixed;
  right: 16px;
  z-index: 999;
  display: flex;
  align-items: center;
  gap: 6px;
  background-color: #D4F820; /* tennis-neon */
  color: #0A0E17; /* dark-slate */
  padding: 12px 18px;
  border-radius: 9999px;
  box-shadow: 0 8px 22px -4px rgba(212, 248, 32, 0.5);
  font-weight: 700;
}
.fab-icon {
  font-size: 18px;
  line-height: 1;
  font-weight: 700;
}
.fab-text {
  font-size: 14px;
  line-height: 1;
  white-space: nowrap;
}
.fab-hover {
  transform: scale(0.95);
}
</style>
