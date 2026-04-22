/**
 * Upstash Redis 客户端
 */
import { Redis } from '@upstash/redis';
import { config } from './config';

export const redis = new Redis({
  url: config.upstash.redisUrl,
  token: config.upstash.redisToken,
});
