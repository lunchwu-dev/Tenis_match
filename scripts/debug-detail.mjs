/**
 * 调试：直接打 GET /api/match/:id，看 params->query 是否生效。
 * 用法：node scripts/debug-detail.mjs <matchId>
 */
const BASE = process.env.E2E_BASE || 'https://jerrydecloud-d5g18hdmm34d7d90c.service.tcloudbase.com';
const id = process.argv[2] || 'cc61a034-fa4d-4a86-8aca-d58a050aec35';
const r = await fetch(`${BASE}/api/match/${id}`);
console.log('status', r.status);
console.log(await r.text());
