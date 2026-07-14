// 视口高度工具 —— 微信小程序中 100vh 不等于真实可见视口高度，
// 在刘海屏 / 手势导航设备上 100vh 会大于实际可用高度，导致底部固定控件被裁切（"超出屏幕"）。
// 因此统一使用系统报告的 windowHeight（px，已精确扣除系统 UI 占用）作为布局基准。
import { ref, computed } from 'vue'

let cached = 0

/**
 * 同步获取当前页面可见视口高度（px）。
 * 优先使用 uni.getWindowInfo().windowHeight（uni-app 3.4+）；
 * 旧版回退到 getSystemInfoSync().windowHeight；
 * 均取不到时回退 0，由调用方降级为 100vh。
 */
export function getViewportHeight(): number {
  if (cached > 0) return cached
  try {
    const uniAny: any = uni
    const info: any = typeof uniAny.getWindowInfo === 'function'
      ? uniAny.getWindowInfo()
      : uni.getSystemInfoSync()
    cached = info.windowHeight || info.screenHeight || 0
  } catch (e) {
    cached = 0
  }
  return cached
}

/**
 * 在页面中调用，返回：
 * - rootStyle：可直接绑定到根 <view> 的 :style，使根容器高度精确等于可见视口；
 * - heightPx：可直接嵌入 calc() 的 'NNNpx' 或降级 '100vh' 字符串。
 */
export function useViewport() {
  const height = ref<number>(getViewportHeight())

  // 根容器行内样式：有效 px 时设置精确高度；无效时返回空对象（由 CSS 的 100vh 兜底）。
  const rootStyle = computed(() =>
    height.value > 0 ? { height: height.value + 'px' } : {}
  )

  // 用于 calc() 基准：无效时回退 100vh，避免计算出 0px。
  const heightPx = computed(() => (height.value > 0 ? height.value + 'px' : '100vh'))

  return { height, rootStyle, heightPx }
}
