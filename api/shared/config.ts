/**
 * 集中化配置管理
 * 所有环境变量在此验证，缺少必要配置时快速失败。
 *
 * 数据源已迁移至腾讯云 CloudBase PostgreSQL，认证走 CloudBase Node SDK：
 * - 云函数运行时：SDK 自动注入 TENCENTCLOUD_SECRETID / SECRETKEY，只需提供 CLOUDBASE_ENV_ID
 * - 本地 / CI：需自行设置 TENCENTCLOUD_SECRETID、TENCENTCLOUD_SECRETKEY、CLOUDBASE_ENV_ID
 */

interface Config {
  port: number;
  cloudbase: {
    envId: string;
  };
  wx: {
    appId: string;
    appSecret: string;
  };
  cronSecret?: string;
  /** 允许用测试账号绕过微信 code 换 openid（仅用于端到端测试，生产务必关闭） */
  allowTestLogin: boolean;
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const config: Config = {
  port: parseInt(process.env.PORT || '9000', 10),
  cloudbase: {
    envId: requiredEnv('CLOUDBASE_ENV_ID'),
  },
  wx: {
    appId: requiredEnv('WX_APP_ID'),
    appSecret: requiredEnv('WX_APP_SECRET'),
  },
  cronSecret: process.env.CRON_SECRET,
  allowTestLogin: process.env.ALLOW_TEST_LOGIN === 'true',
};
