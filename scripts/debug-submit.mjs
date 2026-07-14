/**
 * 调试脚本：仅跑到 submit-score，打印完整响应体（含插桩后的 detail）。
 * 用法：node scripts/debug-submit.mjs
 */
const BASE = process.env.E2E_BASE || 'https://jerrydecloud-d5g18hdmm34d7d90c.service.tcloudbase.com';

async function request(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { __raw: text }; }
  return { status: res.status, json };
}

const ts = Date.now();
const loginA = await request('POST', '/api/login', {
  body: { code: 'TEST_LOGIN', testOpenId: 'dbg_A_' + ts, userInfo: { nickName: 'DBG A' } },
});
const tokenA = loginA.json.data.token;
const idA = loginA.json.data.user.id;
console.log('loginA status', loginA.status, 'idA', idA);

const loginB = await request('POST', '/api/login', {
  body: { code: 'TEST_LOGIN', testOpenId: 'dbg_B_' + ts, userInfo: { nickName: 'DBG B' } },
});
const idB = loginB.json.data.user.id;

const create = await request('POST', '/api/match/create', { body: { matchType: 1, userId: idA } });
const matchId = create.json.data.matchId;
const inviteCode = create.json.data.inviteCode;
console.log('create status', create.status, 'matchId', matchId, 'inviteCode', inviteCode);

const join = await request('POST', '/api/match/join', { body: { inviteCode, userId: idB, team: 'B' } });
console.log('join status', join.status);

const start = await request('POST', '/api/match/start', { body: { matchId, userId: idA } });
console.log('start status', start.status);

const submit = await request('POST', '/api/match/submit-score', {
  body: { matchId, userId: idA, scoreA: 6, scoreB: 3 },
});
console.log('\n=== submit-score status:', submit.status, '===');
console.log(JSON.stringify(submit.json, null, 2));
