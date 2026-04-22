<template>
  <view id="page-assessment" class="page bg-dark-slate text-white font-body relative assess-root">

    <!-- 顶部栏（避开 status bar） -->
    <view
      class="header px-6"
      :style="{ paddingTop: (statusBarHeight + 12) + 'px' }"
    >
      <view class="flex justify-between items-center mb-6">
        <view @tap="goBack" class="text-gray-400">
          <text class="text-2xl">‹</text>
        </view>
        <text class="text-tennis-neon font-display font-bold tracking-widest text-sm">能力定级</text>
        <text class="text-gray-500 font-body text-xs">{{ currentQuestionIndex + 1 }}/{{ totalQuestions }}</text>
      </view>

      <view class="w-full bg-gray-800 h-1.5 rounded-full mb-8 overflow-hidden">
        <view class="bg-tennis-neon h-full transition-all" :style="{ width: ((currentQuestionIndex + 1) / totalQuestions * 100) + '%' }"></view>
      </view>
    </view>

    <!-- 可滚动题目区：显式高度 = 100vh - header - footer - 安全区 -->
    <scroll-view
      scroll-y
      :show-scrollbar="false"
      class="hide-scroll px-6"
      :style="scrollStyle"
    >
      <text class="text-2xl font-bold mb-8 leading-snug break-words block" v-html="formattedQuestion"></text>

      <view class="flex flex-col gap-4">
        <view
          v-for="(option, index) in currentQuestion.options"
          :key="index"
          @tap="selectOption(index, option)"
          class="p-5 rounded-2xl bg-card-bg border transition"
          :class="selectedIndex === index ? 'border-2 border-tennis-neon relative overflow-hidden' : 'border border-gray-800'"
        >
          <view v-if="selectedIndex === index" class="absolute inset-0 bg-tennis-neon opacity-5"></view>
          <view class="flex justify-between items-start mb-1 relative z-10">
            <text class="font-bold text-white break-normal flex-1 pr-2">{{ option.label }}</text>
            <view :class="['text-xs font-bold px-2 py-0.5 rounded leading-none flex items-center', selectedIndex === index ? 'text-tennis-neon bg-tennis-neon/10' : 'text-gray-500 bg-gray-800']">
              +{{ option.score }} 分
            </view>
          </view>
          <text class="text-xs text-gray-400 relative z-10 break-words block mt-2">{{ option.desc || '' }}</text>
        </view>
      </view>

      <view style="height: 24px;"></view>
    </scroll-view>

    <!-- 底部操作区（固定） -->
    <view
      class="footer px-6 pt-3 bg-dark-slate border-t border-gray-900"
      :style="{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }"
    >
      <view
        @tap="nextQuestion"
        :class="['w-full font-bold py-4 rounded-xl text-lg flex items-center justify-center transition active:scale-95 relative', selectedIndex !== null ? 'bg-white text-dark-slate' : 'bg-gray-800 text-gray-500 pointer-events-none']"
      >
        <text>{{ isLastQuestion ? '完成评估' : '下一题' }}</text>
        <text class="absolute right-6">›</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { request } from '../../utils/request'
import qData from './questions'

const baseQuestions = qData.baseQuestions

const statusBarHeight = ref(20)
const evaluationPath = ref<'base' | 'newbie' | 'advanced'>('base')
const currentQuestions = ref<any[]>(baseQuestions)
const currentQuestionIndex = ref(0)
const answers = ref<Record<string, any>>({})
const selectedIndex = ref<number | null>(null)

const isLastQuestion = computed(() => currentQuestionIndex.value >= currentQuestions.value.length - 1)
const currentQuestion = computed(() => currentQuestions.value[currentQuestionIndex.value] || {})
const totalQuestions = computed(() => currentQuestions.value.length)

// header: statusBar + 12(上) + 48(title row + margin) + 30(progress + margin) ≈ statusBar + 90
// footer: 按钮 64 + 12(上) + 12(下) + safe-area
const scrollStyle = computed(() => ({
  height: `calc(100vh - ${statusBarHeight.value + 90}px - 88px - env(safe-area-inset-bottom))`,
  width: '100%',
}))

const formattedQuestion = computed(() => {
  const t = currentQuestion.value?.title || ''
  return t.replace(/【(.*?)】/g, '<span class="text-tennis-neon">$1</span>')
})

onMounted(() => {
  const sys = uni.getSystemInfoSync()
  statusBarHeight.value = sys.statusBarHeight || 20
})

const goBack = () => {
  uni.navigateBack()
}

const selectOption = (index: number, option: any) => {
  selectedIndex.value = index
  answers.value[currentQuestion.value.id] = { score: option.score }
}

const nextQuestion = async () => {
  if (selectedIndex.value === null) return

  if (evaluationPath.value === 'base') {
    if (currentQuestion.value.id === 'q3') {
      const q3Ans = answers.value['q3'].score
      if (q3Ans === 0) {
        evaluationPath.value = 'newbie'
        currentQuestions.value = qData.newbieQuestions
      } else {
        evaluationPath.value = 'advanced'
        currentQuestions.value = qData.advancedQuestions
      }
      currentQuestionIndex.value = 0
      selectedIndex.value = null
      return
    }
  }

  if (isLastQuestion.value) {
    uni.showLoading({ title: '正在生成评估报告...' })
    try {
      const res = await request<any>({
        url: '/api/evaluate',
        method: 'POST',
        data: { answers: answers.value }
      })
      uni.hideLoading()
      if (res && res.success) {
        uni.setStorageSync('user_info', JSON.stringify(res.data.user))
        uni.reLaunch({ url: '/pages/index/index' })
      }
    } catch(err) {
      uni.hideLoading()
      uni.showToast({ title: '提交失败，请重试', icon: 'error' })
    }
  } else {
    currentQuestionIndex.value++
    selectedIndex.value = null
  }
}
</script>

<style>
page {
  background-color: #0A0E17;
}
.assess-root {
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