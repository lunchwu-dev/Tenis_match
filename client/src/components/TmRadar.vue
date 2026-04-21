<template>
  <view class="relative flex items-center justify-center">
    <!-- uCharts 雷达图画布 -->
    <qiun-data-charts
      type="radar"
      :opts="chartOpts"
      :chartData="chartData"
      :canvas2d="false"
      canvas-id="radarCanvas"
      background="none"
      class="w-full h-full"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

interface RadarData {
  baseline: number; // 底线
  serve: number;    // 发球
  receive: number;  // 接发
  netplay: number;  // 网前
  tactics: number;  // 战术
}

interface Props {
  data?: RadarData | null;
}

const props = withDefaults(defineProps<Props>(), {
  data: null,
});

const chartOpts = ref({
  color: ['#D4F820'],
  padding: [10, 10, 10, 10],
  dataLabel: false,
  legend: { show: false },
  extra: {
    radar: {
      gridType: 'radar',
      gridColor: 'rgba(255,255,255,0.12)',
      gridCount: 3,
      opacity: 0.22,
      labelColor: '#9CA3AF',
      labelTextSize: 10,
      border: true,
      borderWidth: 2,
      axisLabel: {
        show: true,
        color: '#9CA3AF',
      },
    },
  },
});

// 将 { baseline, serve, receive, netplay, tactics } 映射到 uCharts 格式
const chartData = computed(() => {
  const d = props.data;
  const radarMap = d
    ? {
        baseline: d.baseline ?? 0,
        serve: d.serve ?? 0,
        receive: d.receive ?? 0,
        netplay: d.netplay ?? 0,
        tactics: d.tactics ?? 0,
      }
    : { baseline: 0, serve: 0, receive: 0, netplay: 0, tactics: 0 };

  return {
    categories: ['底线', '发球', '接发', '网前', '战术'],
    series: [
      {
        name: '能力雷达',
        data: [
          radarMap.baseline,
          radarMap.serve,
          radarMap.receive,
          radarMap.netplay,
          radarMap.tactics,
        ],
      },
    ],
  };
});
</script>

<style scoped>
qiun-data-charts {
  width: 100%;
  height: 100%;
}
</style>
