// 全局布局常量 —— 必须与 components/tabbar/index.vue 的实际渲染高度保持一致。
// 各页 scroll-view 通过此常量计算可滚动区域高度；若改动 TabBar 高度，
// 必须同步修改该组件，否则会出现内容被 TabBar 遮挡或底部留白过多。
//
// 渲染高度 = .tabbar-wrapper 1px 上边框 + .tabbar-inner 高度(50px，含 8px 顶部内边距)
//          ≈ 51px；此处取 52px 作为 scroll 偏移（留 1px 余量，无可见副作用）。
export const TABBAR_HEIGHT = 52
