import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    message: 'Welcome to Tennis Match API',
    version: '1.0.0',
    time: new Date().toISOString()
  });
}
