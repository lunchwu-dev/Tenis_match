// 后端构建脚本：将单入口 Express 服务（server.ts）打包为 CloudBase HTTP 云函数可直接运行的 CJS 包。
// 产物输出到 functions/tennis-api/index.js（与 cloudbaserc.json 中声明的函数目录一致）。
// esbuild 依赖来自 api/node_modules（打包时一并打入 @cloudbase/node-sdk 等全部依赖，使部署包自包含）。
import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 入口 1：HTTP Web 服务（server.ts）-> functions/tennis-api/index.js
const apiEntry = path.join(__dirname, 'server.ts');
const apiOutfile = path.join(__dirname, '..', 'functions', 'tennis-api', 'index.js');

// 入口 2：Timer 事件函数（settlement-entry.ts）-> functions/tennis-settlement/index.js
const settlementEntry = path.join(__dirname, 'settlement-entry.ts');
const settlementOutfile = path.join(__dirname, '..', 'functions', 'tennis-settlement', 'index.js');

const baseOptions = {
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  logLevel: 'info',
  sourcemap: false,
};

await build({
  ...baseOptions,
  entryPoints: [apiEntry],
  outfile: apiOutfile,
  // 全部依赖打入单文件，部署到 CloudBase 后无需 npm install（functions/tennis-api/package.json 的 dependencies 为空）
});

await build({
  ...baseOptions,
  entryPoints: [settlementEntry],
  outfile: settlementOutfile,
  // 同样的自包含打包，定时器事件函数独立运行，复用 db/redis/elo 单例
});

console.log(`✅ 已构建 CloudBase 云函数包:`);
console.log(`   - ${path.relative(process.cwd(), apiOutfile)} (HTTP 服务)`);
console.log(`   - ${path.relative(process.cwd(), settlementOutfile)} (Timer 事件函数)`);
