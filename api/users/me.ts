/**
 * GET  /api/users/me      - 获取当前用户资料
 * PUT  /api/users/me      - 更新当前用户资料
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getCurrentUser, updateCurrentUser } from './users.controller';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    return getCurrentUser(req, res);
  }
  if (req.method === 'PUT') {
    return updateCurrentUser(req, res);
  }
  return res.status(405).json({ error: 'Method Not Allowed' });
}
