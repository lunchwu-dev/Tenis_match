/**
 * Supabase 数据库客户端
 */
import { createClient } from '@supabase/supabase-js';
import { config } from './config';

export const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey
);
