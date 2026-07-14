<script setup lang="ts">
import { onLaunch, onShow, onHide } from "@dcloudio/uni-app";
onLaunch(() => {
  console.log("App Launch");
  // 加载设计稿指定字体（Oswald / DM Sans）。微信小程序不支持 CSS @font-face 外链，
  // 必须通过 loadFontFace 注入；失败（如域名未配置 / 网络异常）时静默回退系统字体。
  // #ifdef MP-WEIXIN
  const fontSources = [
    { family: "Oswald", url: "https://cdn.jsdelivr.net/npm/@fontsource/oswald/files/oswald-latin-400-normal.woff2" },
    { family: "DM Sans", url: "https://cdn.jsdelivr.net/npm/@fontsource/dm-sans/files/dm-sans-latin-400-normal.woff2" },
  ];
  fontSources.forEach(({ family, url }) => {
    uni.loadFontFace({
      family,
      source: `url("${url}")`,
      success: () => console.log(`[font] ${family} loaded`),
      fail: (err: any) => console.warn(`[font] ${family} load failed`, err),
    });
  });
  // #endif
});
onShow(() => {
  console.log("App Show");
});
onHide(() => {
  console.log("App Hide");
});
</script>
<style>
@import "tailwindcss/base";
@import "tailwindcss/components";
@import "tailwindcss/utilities";

page {
  background-color: #0A0E17;
}
</style>
