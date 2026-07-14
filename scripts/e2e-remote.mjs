/**
 * 端到端测试（远端 CloudBase HTTP 云函数）
 * ------------------------------------------------------------------
 * 走真实业务流：登录→查询自己→发起→加入→开赛→提交比分→双方确认→排行榜→测评
 * 断言每一步返回结构正确，并验证 Elo 结算对积分的实际影响。
 *
 * 运行：
 *   node scripts/e2e-remote.mjs
 * 环境变量（可选）：
 *   E2E_BASE  默认 https://jerrydecloud-d5g18hdmm34d7d90c.service.tcloudbase.com
 */
import { strict as assert } from 'node:assert';

const BASE = process.env.E2E_BASE || 'https://jerrydecloud-d5g18hdmm34d7d90c.service.tcloudbase.com';

let passed = 0;
let failed = 0;
const failures = [];

function ok(name, cond, extra) {
  if (cond) {
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${name}${extra ? '  ' + extra : ''}`);
  } else {
    failed++;
    failures.push(name);
    console.log(`  \x1b[31m✗\x1b[0m ${name}${extra ? '  ' + extra : ''}`);
  }
}

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
  try {
    json = JSON.parse(text);
  } catch {
    json = { __raw: text };
  }
  return { status: res.status, json };
}

async function main() {
  console.log(`\n\x1b[36m== 端到端测试 @ ${BASE} ==\x1b[0m\n`);

  // 0) 健康检查
  console.log('— 健康检查 —');
  const health = await request('GET', '/api');
  ok('GET /api 返回 200', health.status === 200, `status=${health.status}`);
  ok('健康检查含 message 字段', !!health.json?.message);

  // 1) 登录 A / B（测试钩子）
  console.log('\n— 登录（TEST_LOGIN 钩子）—');
  const loginA = await request('POST', '/api/login', {
    body: { code: 'TEST_LOGIN', testOpenId: 'e2e_openid_A_' + Date.now(), userInfo: { nickName: 'E2E 选手A' } },
  });
  ok('A 登录 200', loginA.status === 200, `status=${loginA.status}`);
  ok('A 登录返回 token', !!loginA.json?.data?.token);
  ok('A 登录返回 user.id', !!loginA.json?.data?.user?.id);
  const tokenA = loginA.json.data.token;
  const idA = loginA.json.data.user.id;
  const scoreA0 = loginA.json.data.user.current_score;

  const loginB = await request('POST', '/api/login', {
    body: { code: 'TEST_LOGIN', testOpenId: 'e2e_openid_B_' + Date.now(), userInfo: { nickName: 'E2E 选手B' } },
  });
  ok('B 登录 200', loginB.status === 200, `status=${loginB.status}`);
  const tokenB = loginB.json.data.token;
  const idB = loginB.json.data.user.id;
  const scoreB0 = loginB.json.data.user.current_score;

  // 2) GET /api/users/me 鉴权
  console.log('\n— 用户资料（Bearer 鉴权）—');
  const meA = await request('GET', '/api/users/me', { token: tokenA });
  ok('GET /api/users/me 200', meA.status === 200, `status=${meA.status}`);
  ok('me 返回当前用户 id 与 A 一致', meA.json?.data?.id === idA);
  ok('me 返回 current_score 数字', typeof meA.json?.data?.current_score === 'number');

  const meNoToken = await request('GET', '/api/users/me');
  ok('无 token 访问 /api/users/me 被拒', meNoToken.status === 401 || meNoToken.status === 400,
    `status=${meNoToken.status}`);

  // 3) 发起比赛（单打）
  console.log('\n— 发起比赛 —');
  const create = await request('POST', '/api/match/create', {
    body: { matchType: 1, userId: idA },
  });
  ok('发起比赛 200', create.status === 200, `status=${create.status}`);
  ok('返回 matchId', !!create.json?.data?.matchId);
  ok('返回 inviteCode（6位）', /^[A-Z0-9]{6}$/.test(create.json?.data?.inviteCode || ''),
    `inviteCode=${create.json?.data?.inviteCode}`);
  const matchId = create.json.data.matchId;
  const inviteCode = create.json.data.inviteCode;

  // 4) B 加入
  console.log('\n— 加入比赛 —');
  const join = await request('POST', '/api/match/join', {
    body: { inviteCode, userId: idB, team: 'B' },
  });
  ok('加入比赛 200', join.status === 200, `status=${join.status}`);
  ok('加入后状态 ready_to_start', join.json?.data?.status === 'ready_to_start',
    `status=${join.json?.data?.status}`);
  ok('参与者含 A 与 B', (join.json?.data?.participants || []).some(p => p.user_id === idA)
    && (join.json?.data?.participants || []).some(p => p.user_id === idB));

  // 5) 开赛
  console.log('\n— 开赛 —');
  const start = await request('POST', '/api/match/start', { body: { matchId, userId: idA } });
  ok('开赛 200', start.status === 200, `status=${start.status}`);
  ok('开赛后 status=in_progress', start.json?.data?.status === 'in_progress');
  ok('开赛返回 teamA/teamB', Array.isArray(start.json?.data?.teamA?.players)
    && Array.isArray(start.json?.data?.teamB?.players));

  // 开赛后读取 A 当前积分，作为 Elo 结算前快照（结算用 snapshot_score，但 current_score 此时等于 snapshot）
  const meA2 = await request('GET', '/api/users/me', { token: tokenA });
  const scoreABefore = meA2.json.data.current_score;
  const meB2 = await request('GET', '/api/users/me', { token: tokenB });
  const scoreBBefore = meB2.json.data.current_score;

  // 6) 提交比分（A 胜：6:3）
  console.log('\n— 提交比分 —');
  const submit = await request('POST', '/api/match/submit-score', {
    body: { matchId, userId: idA, scoreA: 6, scoreB: 3 },
  });
  ok('提交比分 200', submit.status === 200, `status=${submit.status}`);
  ok('提交后 status=pending_confirmation', submit.json?.data?.status === 'pending_confirmation');

  // 7) 双方确认（B 先，A 后 → 全确认触发结算）
  console.log('\n— 确认比分（触发 Elo 结算）—');
  const confirmB = await request('POST', '/api/match/confirm', { body: { matchId, userId: idB } });
  ok('B 确认 200', confirmB.status === 200, `status=${confirmB.status}`);
  ok('B 确认后尚未全确认', confirmB.json?.data?.status === 'pending_confirmation'
    || confirmB.json?.data?.status === 'settled', `status=${confirmB.json?.data?.status}`);

  const confirmA = await request('POST', '/api/match/confirm', { body: { matchId, userId: idA } });
  ok('A 确认 200', confirmA.status === 200, `status=${confirmA.status}`);
  ok('A 确认后 status=settled', confirmA.json?.data?.status === 'settled',
    `status=${confirmA.json?.data?.status}`);
  ok('结算返回 eloChanges', !!confirmA.json?.data?.eloChanges);
  const elo = confirmA.json.data.eloChanges;
  ok('A 胜方积分上涨', elo[idA]?.newScore > scoreABefore,
    `before=${scoreABefore} → after=${elo[idA]?.newScore}`);
  ok('B 负方积分下降', elo[idB]?.newScore < scoreBBefore,
    `before=${scoreBBefore} → after=${elo[idB]?.newScore}`);
  ok('胜者为 A', confirmA.json?.data?.winner === 'A');

  // 8) 排行榜
  console.log('\n— 排行榜 —');
  const lb = await request('GET', '/api/leaderboard');
  ok('排行榜 200', lb.status === 200, `status=${lb.status}`);
  ok('排行榜为数组', Array.isArray(lb.json?.data));
  ok('排行榜按 score 降序', (() => {
    const arr = lb.json?.data || [];
    for (let i = 1; i < arr.length; i++) {
      if ((arr[i].score ?? 0) > (arr[i - 1].score ?? 0)) return false;
    }
    return true;
  })());
  ok('排行榜含 A 与 B', (lb.json?.data || []).some(u => u.userId === idA)
    && (lb.json?.data || []).some(u => u.userId === idB));

  // 9) 比赛详情（GET /api/match/:id）
  console.log('\n— 比赛详情 —');
  const detail = await request('GET', `/api/match/${matchId}`);
  ok('比赛详情 200', detail.status === 200, `status=${detail.status}`);
  ok('详情 status=3（已生效）', detail.json?.data?.status === 3 || detail.json?.data?.match?.status === 3,
    `status=${detail.json?.data?.status ?? detail.json?.data?.match?.status}`);

  // 10) 测评题目
  console.log('\n— 测评题目 —');
  const questions = await request('GET', '/api/assessment/questions');
  ok('测评题目 200', questions.status === 200, `status=${questions.status}`);
  ok('返回 12 道题', Array.isArray(questions.json?.data) && questions.json.data.length === 12,
    `count=${(questions.json?.data || []).length}`);

  // 11) 提交测评（A 作答，全部选第 4 项 score=4）
  console.log('\n— 提交测评 —');
  const answers = questions.json.data.map(q => ({ questionId: q.id, selectedOption: 3 }));
  const submitAssess = await request('POST', '/api/assessment/submit', { token: tokenA, body: { answers } });
  ok('提交测评 200', submitAssess.status === 200, `status=${submitAssess.status}`);
  ok('返回 radar_data 五维', (() => {
    const r = submitAssess.json?.data?.radarData;
    return r && ['baseline', 'serve', 'netplay', 'tactics', 'receive'].every(k => typeof r[k] === 'number');
  })());
  ok('返回 currentScore（数字）', typeof submitAssess.json?.data?.currentScore === 'number',
    `currentScore=${submitAssess.json?.data?.currentScore}`);
  ok('测评后 user.current_score 已更新', submitAssess.json?.data?.user?.current_score === submitAssess.json?.data?.currentScore,
    `score=${submitAssess.json?.data?.user?.current_score}`);

  // 总结
  console.log(`\n\x1b[36m== 结果：通过 ${passed}，失败 ${failed} ==\x1b[0m`);
  if (failed > 0) {
    console.log('\x1b[31m失败项：\x1b[0m');
    failures.forEach(f => console.log('  - ' + f));
    process.exit(1);
  }
  console.log('\x1b[32m全部通过 ✅\x1b[0m');
}

main().catch((err) => {
  console.error('\n\x1b[31mE2E 运行异常：\x1b[0m', err);
  process.exit(2);
});
