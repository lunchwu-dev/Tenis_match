/**
 * 集中化配置管理
 * 所有环境变量在此验证，缺少必要配置时快速失败
 */

interface Config {
  port: number;
  supabase: {
    url: string;
    serviceRoleKey: string;
  };
  upstash: {
    redisUrl: string;
    redisToken: string;
  };
  wx: {
    appId: string;
    appSecret: string;
  };
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  supabase: {
    url: process.env.SUPABASE_URL || '',
    serviceRoleKey: requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
  },
  upstash: {
    redisUrl: process.env.UPSTASH_REDIS_REST_KV_REST_API_URL || '',
    redisToken: process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN || '',
  },
  wx: {
    appId: requiredEnv('WX_APP_ID'),
    appSecret: requiredEnv('WX_APP_SECRET'),
  },
};
