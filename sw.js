/*
 * DUST DASH オフライン用の係（Service Worker）
 * ・ホーム画面から開いたとき、電波がなくても遊べるように、ゲームのファイルをしまっておく
 * ・版は index.html の「sw.js?v=○」の数字。数字を上げると、新しい係に入れかわって古いしまい場所を消す
 * ・ページ（index.html）は、電波があれば毎回新しいものを取りにいく（更新がすぐ届く）
 * ・ランキング（Cloudflare）には手を出さない
 */
const VERSION = new URL(self.location.href).searchParams.get('v') || '0';
const CACHE = 'dust-dash-' + VERSION;
const FONTS = 'dust-dash-fonts';

// index.html に書いてあるファイル（js・css・画像・manifest）を全部しまう
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const res = await fetch('./', { cache: 'reload' });
    const html = await res.clone().text();
    await cache.put('./', res);
    const urls = new Set(['./manifest.webmanifest', './assets/icon-192.png', './assets/icon-512.png']);
    for (const m of html.matchAll(/(?:src|href)="([^"#:]+)"/g)) urls.add('./' + m[1].replace(/^\.\//, ''));
    await Promise.all([...urls].map((u) => fetch(u, { cache: 'reload' }).then((r) => r.ok && cache.put(u, r)).catch(() => {})));
    await self.skipWaiting();
  })());
});

// 古い版のしまい場所を消す
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE && k !== FONTS && k.startsWith('dust-dash-')) await caches.delete(k);
    await self.clients.claim();
  })());
});

function timeout(ms) { return new Promise((_, no) => setTimeout(() => no(new Error('timeout')), ms)); }

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // 文字のフォント（Google Fonts）：一度読んだものはしまっておく
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith((async () => {
      const cache = await caches.open(FONTS);
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
      return res;
    })());
    return;
  }
  if (url.origin !== self.location.origin) return; // ランキングなど、ほかの場所はそのまま

  // ページ：まず新しいものを取りにいく（4秒で あきらめて、しまってあるものを出す）
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const res = await Promise.race([fetch(req), timeout(4000)]);
        if (res.ok) cache.put('./', res.clone());
        return res;
      } catch (e) {
        return (await cache.match('./')) || Response.error();
      }
    })());
    return;
  }

  // js・css・画像：しまってあればそれを使う（版の数字つきなので古くならない）。なければ取りにいってしまう
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req);
    if (hit) return hit;
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  })());
});
