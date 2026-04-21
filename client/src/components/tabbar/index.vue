<template>
  <view class="tabbar-wrapper" :style="{ paddingBottom: 'env(safe-area-inset-bottom)' }">
    <view class="tabbar-inner">
      <view
        v-for="tab in tabs"
        :key="tab.pagePath"
        class="tabbar-item"
        :class="currentPath === tab.pagePath ? 'active' : ''"
        @tap="switchTab(tab.pagePath)"
      >
        <view class="icon-wrap relative">
          <text class="tab-icon">{{ tab.icon }}</text>
          <!-- Red notification dot -->
          <view
            v-if="tab.pagePath === '/pages/history/index' && hasNotification"
            class="dot"
          ></view>
        </view>
        <text class="tabbar-label">{{ tab.text }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const hasNotification = ref(true)

const tabs = [
  { pagePath: '/pages/index/index', text: '名片', icon: '⊞' },
  { pagePath: '/pages/history/index', text: '战绩', icon: '⚔' },
  { pagePath: '/pages/leaderboard/index', text: '排行', icon: '#' },
]

const currentPath = ref('/pages/index/index')

onMounted(() => {
  const pages = getCurrentPages()
  if (pages.length > 0) {
    const currentPage = pages[pages.length - 1]
    currentPath.value = '/' + (currentPage as any).route || ''
  }
})

const switchTab = (pagePath: string) => {
  if (currentPath.value === pagePath) return
  uni.reLaunch({ url: pagePath })
}
</script>

<style scoped>
.tabbar-wrapper {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #151A26;
  border-top: 1px solid #1f2937;
}

.tabbar-inner {
  display: flex;
  justify-content: space-around;
  align-items: flex-start;
  height: 80px;
  padding-top: 12px;
}

.tabbar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  color: #6b7280; /* gray-500 */
  transition: color 0.2s;
}

.tabbar-item.active {
  color: #D4F820; /* tennis-neon */
}

.icon-wrap {
  width: 28px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.tab-icon {
  font-size: 24px;
  line-height: 1;
  font-weight: 300;
}

.tabbar-label {
  font-size: 10px;
  font-weight: 500;
  margin-top: 4px;
  line-height: 1;
}

.tabbar-item.active .tabbar-label {
  font-weight: 700;
  font-size: 11px;
}

.dot {
  position: absolute;
  top: -1px;
  right: -2px;
  width: 8px;
  height: 8px;
  background-color: #ef4444;
  border-radius: 50%;
  border: 1.5px solid #151A26;
}
</style>
