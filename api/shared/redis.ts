/**
 * Upstash Redis 客户端
 */
import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url: config.upstash.redisUrl,
  token: config.upstash.redisToken,
});
