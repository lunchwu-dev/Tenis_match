// One-off migration: rename supabase -> db across handler/service/repository files.
const fs = require('fs');
const path = require('path');

const API = path.resolve(__dirname, 'api');
const targets = [
  'assessment/submit.ts',
  'login.ts',
  'leaderboard.ts',
  'match/join.ts',
  'match/confirm.ts',
  'users/users.service.ts',
  'match/start.ts',
  'match/list.ts',
  'match/reject.ts',
  'match/timeout-settlement.ts',
  'match/[id].ts',
  'match/create.ts',
  'match/submit-score.ts',
  'users/users.repository.ts',
];

let changed = 0;
for (const rel of targets) {
  const file = path.join(API, rel);
  if (!fs.existsSync(file)) {
    console.log('SKIP (missing):', rel);
    continue;
  }
  const src = fs.readFileSync(file, 'utf8');
  // Replace standalone `supabase` token (import name + client calls) with `db`.
  const out = src.replace(/\bsupabase\b/g, 'db');
  if (out !== src) {
    fs.writeFileSync(file, out);
    changed++;
    console.log('RENAMED:', rel);
  } else {
    console.log('no-change:', rel);
  }
}
console.log(`\nDone. Renamed ${changed} file(s).`);
