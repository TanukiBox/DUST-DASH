/*
 * DUST DASH ランキングのサーバー（Cloudflare Workers + D1）
 *
 * ・このファイルを Cloudflare の Worker にまるごと貼りつけて使う（手順は server/README.md）
 * ・D1 データベースを「DB」という名前でつなぐ。表は最初のアクセスのときに自動で作られる
 * ・集めるのは「端末ごとのランダムな番号・えらんだ名前（番号2つ）・記録」だけ。IP アドレスなどは保存しない
 *
 * 3つのランキング（board）：
 *   dist    … ゴールをめざすモードの距離（ゴールした人は上。ゴールした人どうしは速くゴールした方が上）
 *   endless … エンドレスモードの距離
 *   speed   … 最高時速（どちらのモードでも）
 */

const ALLOWED_ORIGINS = [/^https:\/\/tanukibox\.github\.io$/, /^http:\/\/localhost(:\d+)?$/, /^http:\/\/127\.0\.0\.1(:\d+)?$/];
const NAME_A = 24;          // 名前の前半（ことば）の数。ゲームの lang.js の RANK_ADJ と同じ数
const NAME_B = 24;          // 名前の後半（生きもの）の数。RANK_NOUN と同じ数
const GOAL_M = 7000;        // ゴールの距離（config.js の GOAL_M）
const TOP_MAX = 50;         // 一度に返す順位の数
const MIN_INTERVAL = 4000;  // 同じ端末から続けて送れる間かく（ミリ秒）
const MAX_SPEED = 400;      // 最高時速の上限（うまい自動プレイで 230 km/h くらい）
const MAX_AVG = 175;        // 平均の速さの上限 km/h（うまい自動プレイで 125 km/h くらい）
const BOARDS = ['dist', 'endless', 'speed'];

let ready = false;
async function setup(db) {
  if (ready) return;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS scores (
      device TEXT NOT NULL, board TEXT NOT NULL, value INTEGER NOT NULL, sub INTEGER NOT NULL DEFAULT 0,
      n1 INTEGER NOT NULL, n2 INTEGER NOT NULL, updated INTEGER NOT NULL, PRIMARY KEY (device, board))`),
    db.prepare('CREATE INDEX IF NOT EXISTS scores_rank ON scores (board, value DESC, sub ASC, updated ASC)'),
    db.prepare(`CREATE TABLE IF NOT EXISTS devices (
      device TEXT PRIMARY KEY, last INTEGER NOT NULL, banned INTEGER NOT NULL DEFAULT 0)`)
  ]);
  ready = true;
}

function cors(request) {
  const origin = request.headers.get('Origin') || '';
  const ok = ALLOWED_ORIGINS.some((re) => re.test(origin));
  return ok ? {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  } : { 'Vary': 'Origin' };
}

function json(request, status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, cors(request))
  });
}

const isDevice = (s) => typeof s === 'string' && /^[0-9a-f]{32}$/.test(s);
const isInt = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
const isNum = (v, lo, hi) => typeof v === 'number' && isFinite(v) && v >= lo && v <= hi;

/**
 * 1回のプレイの記録が「ありえる」かを確かめて、ランキングに入れる値にする。
 * だめなら null。ブラウザのゲームなので完全には防げないが、明らかにおかしい記録ははじく。
 */
function scoresFrom(b) {
  if (!isNum(b.time, 1, 6 * 3600) || !isInt(b.speed, 1, MAX_SPEED) || !isInt(b.dist, 0, 1e7)) return null;
  // 走った距離は「最高時速で走り続けた距離」をこえられない（m = km/h ÷ 3.6 × 秒）。平均の速さにも上限
  const vmax = Math.min(b.speed, MAX_AVG);
  if (b.dist > (vmax / 3.6) * b.time * 1.05 + 40) return null;
  const out = { speed: [b.speed, 0] };
  if (b.endless) {
    out.endless = [b.dist, 0];
  } else {
    if (b.cleared) {
      if (!isNum(b.clearTime, 1, b.time) || b.dist < GOAL_M - 10) return null;
      if (GOAL_M > (vmax / 3.6) * b.clearTime * 1.05 + 40) return null;
      out.dist = [GOAL_M, Math.round(b.clearTime * 1000)];
    } else {
      if (b.dist >= GOAL_M) return null;
      out.dist = [b.dist, 0];
    }
  }
  return out;
}

const better = (a, b) => a[0] > b[0] || (a[0] === b[0] && a[1] < b[1]);

async function rankOf(db, board, value, sub) {
  const r = await db.prepare('SELECT COUNT(*) AS n FROM scores WHERE board = ? AND (value > ? OR (value = ? AND sub < ?))')
    .bind(board, value, value, sub).first();
  return (r ? r.n : 0) + 1;
}

async function top(db, request, url) {
  const board = url.searchParams.get('board');
  if (!BOARDS.includes(board)) return json(request, 400, { error: 'board' });
  const device = url.searchParams.get('device');
  const limit = Math.min(TOP_MAX, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10) || 20));
  const rows = await db.prepare('SELECT device, value, sub, n1, n2 FROM scores WHERE board = ? ORDER BY value DESC, sub ASC, updated ASC LIMIT ?')
    .bind(board, limit).all();
  const total = await db.prepare('SELECT COUNT(*) AS n FROM scores WHERE board = ?').bind(board).first();
  // 同じ記録は同じ順位
  let rank = 0, prev = null;
  const list = (rows.results || []).map((r, i) => {
    if (!prev || prev.value !== r.value || prev.sub !== r.sub) rank = i + 1;
    prev = r;
    return { rank, value: r.value, sub: r.sub, n1: r.n1, n2: r.n2, me: isDevice(device) && r.device === device };
  });
  let me = null;
  if (isDevice(device)) {
    const mine = await db.prepare('SELECT value, sub FROM scores WHERE device = ? AND board = ?').bind(device, board).first();
    if (mine) me = { rank: await rankOf(db, board, mine.value, mine.sub), value: mine.value, sub: mine.sub };
  }
  return json(request, 200, { board, list, me, total: total ? total.n : 0 });
}

async function readBody(request) {
  const text = await request.text();
  if (text.length > 2000) return null;
  try { return JSON.parse(text); } catch (e) { return null; }
}

async function submit(db, request) {
  const b = await readBody(request);
  if (!b || !isDevice(b.device) || !isInt(b.n1, 0, NAME_A - 1) || !isInt(b.n2, 0, NAME_B - 1)) return json(request, 400, { error: 'bad' });
  const now = Date.now();
  const dev = await db.prepare('SELECT last, banned FROM devices WHERE device = ?').bind(b.device).first();
  if (dev && dev.banned) return json(request, 200, { ok: true, ranks: {} }); // 消された端末：受け取ったふりだけする
  if (dev && now - dev.last < MIN_INTERVAL) return json(request, 429, { error: 'wait' });
  await db.prepare('INSERT INTO devices (device, last) VALUES (?, ?) ON CONFLICT(device) DO UPDATE SET last = excluded.last')
    .bind(b.device, now).run();
  const sc = scoresFrom(b);
  if (!sc) return json(request, 422, { error: 'score' });

  const ranks = {};
  for (const board of Object.keys(sc)) {
    const v = sc[board];
    const old = await db.prepare('SELECT value, sub FROM scores WHERE device = ? AND board = ?').bind(b.device, board).first();
    const improved = !old || better(v, [old.value, old.sub]);
    if (improved) {
      await db.prepare(`INSERT INTO scores (device, board, value, sub, n1, n2, updated) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(device, board) DO UPDATE SET value = excluded.value, sub = excluded.sub, n1 = excluded.n1, n2 = excluded.n2, updated = excluded.updated`)
        .bind(b.device, board, v[0], v[1], b.n1, b.n2, now).run();
    }
    const cur = improved ? v : [old.value, old.sub];
    ranks[board] = { rank: await rankOf(db, board, cur[0], cur[1]), value: cur[0], sub: cur[1], improved };
  }
  // 名前を変えていたら、ほかの記録の名前もそろえる
  await db.prepare('UPDATE scores SET n1 = ?, n2 = ? WHERE device = ?').bind(b.n1, b.n2, b.device).run();
  return json(request, 200, { ok: true, ranks });
}

async function rename(db, request) {
  const b = await readBody(request);
  if (!b || !isDevice(b.device) || !isInt(b.n1, 0, NAME_A - 1) || !isInt(b.n2, 0, NAME_B - 1)) return json(request, 400, { error: 'bad' });
  await db.prepare('UPDATE scores SET n1 = ?, n2 = ? WHERE device = ?').bind(b.n1, b.n2, b.device).run();
  return json(request, 200, { ok: true });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(request) });
    if (!env.DB) return json(request, 500, { error: 'no database' });
    try {
      await setup(env.DB);
      if (request.method === 'GET' && url.pathname === '/top') return await top(env.DB, request, url);
      if (request.method === 'POST' && url.pathname === '/submit') return await submit(env.DB, request);
      if (request.method === 'POST' && url.pathname === '/name') return await rename(env.DB, request);
      if (request.method === 'GET' && url.pathname === '/') return json(request, 200, { ok: true, game: 'DUST DASH ranking' });
      return json(request, 404, { error: 'not found' });
    } catch (e) {
      return json(request, 500, { error: 'server' });
    }
  }
};
