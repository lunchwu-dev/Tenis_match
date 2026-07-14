/**
 * verify-read.mjs — 只读 / 评估端点连通性验证（不部署、不改源码）
 * 仅对 LIVE CloudBase Web 函数发起 HTTP 请求并报告观察结果。
 * 不调用 /api/match/submit-score 与 /api/match/confirm（由主 agent 负责）。
 */
const BASE = 'https://jerrydecloud-d5g18hdmm34d7d90c.service.tcloudbase.com';

function summarize(json) {
  if (json === undefined) return '<no body>';
  if (json && json.__raw) return JSON.stringify(json.__raw).slice(0, 120);
  try {
    const s = JSON.stringify(json);
    return s.length > 160 ? s.slice(0, 160) + '…' : s;
  } catch {
    return '<unserializable>';
  }
}

async function request(method, path, { token, body, retryOnceOnTransient = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = { __raw: text }; }
    return { status: res.status, json };
  } catch (err) {
    if (retryOnceOnTransient) {
      console.log(`    (transient error: ${err.message}; retrying in 5s)`);
      await new Promise(r => setTimeout(r, 5000));
      return request(method, path, { token, body, retryOnceOnTransient: false });
    }
    return { status: 0, json: { __raw: err.message } };
  }
}

function log(method, path, status, json) {
  console.log(`${method} ${path} -> HTTP ${status}`);
  console.log(`    body: ${summarize(json)}`);
}

async function main() {
  console.log(`\n=== verify-read @ ${BASE} ===\n`);

  // 0) 健康检查
  const health = await request('GET', '/api');
  log('GET', '/api', health.status, health.json);

  // 1) 登录 A
  const ts = Date.now();
  const loginA = await request('POST', '/api/login', {
    body: { code: 'TEST_LOGIN', testOpenId: 'verify_openid_A_' + ts, userInfo: { nickName: 'TestA' } },
  });
  log('POST', '/api/login (TestA)', loginA.status, loginA.json);
  const tokenA = loginA.json?.data?.token;
  const userIdA = loginA.json?.data?.user?.id;

  // 2) GET /api/users/me WITH token
  const meA = await request('GET', '/api/users/me', { token: tokenA });
  log('GET', '/api/users/me (Bearer)', meA.status, meA.json);

  // 3) GET /api/users/me WITHOUT token (expect 401)
  const meNo = await request('GET', '/api/users/me');
  log('GET', '/api/users/me (no token)', meNo.status, meNo.json);

  // 4) 登录 B
  const loginB = await request('POST', '/api/login', {
    body: { code: 'TEST_LOGIN', testOpenId: 'verify_openid_B_' + ts, userInfo: { nickName: 'TestB' } },
  });
  log('POST', '/api/login (TestB)', loginB.status, loginB.json);
  const userIdB = loginB.json?.data?.user?.id;

  // 5) 发起比赛
  const create = await request('POST', '/api/match/create', { body: { matchType: 1, userId: userIdA } });
  log('POST', '/api/match/create', create.status, create.json);
  const matchId = create.json?.data?.matchId;
  const inviteCode = create.json?.data?.inviteCode;

  // 6) 加入比赛
  const join = await request('POST', '/api/match/join', { body: { inviteCode, userId: userIdB, team: 'B' } });
  log('POST', '/api/match/join', join.status, join.json);

  // 7) 开赛
  const start = await request('POST', '/api/match/start', { body: { matchId, userId: userIdA } });
  log('POST', '/api/match/start', start.status, start.json);

  // 8) 比赛详情
  const detail = await request('GET', `/api/match/${matchId}`);
  log('GET', `/api/match/${matchId}`, detail.status, detail.json);

  // 9) 排行榜
  const lb = await request('GET', '/api/leaderboard');
  log('GET', '/api/leaderboard', lb.status, lb.json);

  // 10) 测评题目
  const questions = await request('GET', '/api/assessment/questions');
  log('GET', '/api/assessment/questions', questions.status, questions.json);

  // 11) 提交测评（按 e2e 形状：answers=[{questionId, selectedOption}]）
  let submitBody;
  if (Array.isArray(questions.json?.data)) {
    submitBody = { userId: userIdA, answers: questions.json.data.map(q => ({ questionId: q.id, selectedOption: 3 })) };
  } else {
    submitBody = { userId: userIdA, answers: [{ questionId: 1, score: 3 }] };
  }
  const submit = await request('POST', '/api/assessment/submit', { token: tokenA, body: submitBody });
  log('POST', '/api/assessment/submit', submit.status, submit.json);

  console.log('\n=== DONE (submit-score/confirm intentionally skipped) ===');
}

main().catch(err => {
  console.error('\nverify-read error:', err);
  process.exit(2);
});
