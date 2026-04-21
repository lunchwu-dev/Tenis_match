const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
let str = fs.readFileSync('.env.local', 'utf-16le');
if (!str.includes('SUPABASE_URL')) str = fs.readFileSync('.env.local', 'utf8');

const envVars = {};
str.split(/\r?\n/).forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if(match) envVars[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
});

const url = envVars['SUPABASE_URL'];
const key = envVars['SUPABASE_SERVICE_ROLE_KEY'];

if (!url || !key) {
    console.error('Keys not found');
    process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
    const res = await supabase.from('users').update({
        radar_data: null,
        current_score: null,
        initial_rating: null,
        honor_title: null,
        matches_played: 0,
        wins: 0,
        current_streak: 0,
        current_rating: 0
    }).neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('Reset successful:', res.error || 'OK');
}

run();
