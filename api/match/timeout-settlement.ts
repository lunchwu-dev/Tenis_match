/**
 * 比赛超时自动结算 API
 * POST /api/match/timeout-settlement  （亦支持 GET，便于手动触发）
 *
 * 原由 Vercel Cron / QStash 调用；迁移到腾讯云后，自动触发改由
 * CloudBase Timer 事件函数（functions/tennis-settlement，每 12 小时）承担。
 * 本 HTTP 接口保留用于手动触发 / 运维调试，仍受 CRON_SECRET 保护。
 *
 * 核心结算逻辑见 api/shared/settlement.service.ts 的 runTimeoutSettlement()。
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { config } from '../shared/config';
import { runTimeoutSettlement } from '../shared/settlement.service';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Cron 端点鉴权：生产环境验证 CRON_SECRET
  if (config.cronSecret) {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${config.cronSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    const { processed, results, message } = await runTimeoutSettlement();

    return res.status(200).json({
      success: true,
      data: {
        processed,
        results,
        message,
      },
    });
  } catch (error: any) {
    console.error('Timeout settlement error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}
