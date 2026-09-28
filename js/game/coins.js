/*
 * DUST DASH コイン（段階2：J）
 * ・コインの並べ方は course.js（お手本の走りの道すじに、同じ間隔で並べる）
 * ・速いほど1枚の価値が上がる（×2、×3、×4）
 */
(function (global) {
  'use strict';
  var DD = global.DD = global.DD || {};
  var CFG = DD.CFG, COL = DD.COL, D = DD.draw, U = DD.util;

  DD.KINDS = DD.KINDS || {};

  DD.KINDS.coin = {
    // gem = 'sapphire' | 'emerald' | 'ruby' のときは宝石（コイン何枚分かは CFG.GEMS）
    create: function (x, y, gem) {
      gem = gem === true ? 'sapphire' : gem || null;
      return { type: 'coin', coin: true, big: !!gem, gem: gem, x: x, y: y, w: 26, h: 26, t: Math.random() * 6, dead: false };
    },
    update: function (c, dt) { c.t += dt; },
    draw: function (ctx, c) {
      if (c.gem) { DD.drawGem(ctx, c.gem, c.x, c.y + Math.sin(c.t * 3) * 4, 22, c.t, true); return; }
      var spin = Math.abs(Math.cos(c.t * 4));
      var rx = 11 * (0.25 + 0.75 * spin), ry = 11;
      ctx.save();
      ctx.translate(c.x, c.y);
      D.oval(ctx, 0, 0, rx + 1.5, ry + 1.5, 0, '#e8a326', 3);
      D.oval(ctx, 0, 0, rx * 0.72, ry * 0.72, 0, '#ffd84a', 0);
      if (spin > 0.5) {
        ctx.fillStyle = '#e8a326';
        ctx.fillRect(-1.5 * spin, -5, 3 * spin, 10);
      }
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath(); D.ellipse(ctx, -rx * 0.35, -ry * 0.45, rx * 0.22, ry * 0.18, -0.5); ctx.fill();
      ctx.restore();
    }
  };

  // ------------------------------------------------------------
  // 宝石：サファイア（楕円）・エメラルド（八角のステップカット）・ルビー（ブリリアント）
  // 面ごとに「左上から光が当たる」ように明るさを変えて、カットされた石らしく見せる
  // ------------------------------------------------------------
  var GEM_COL = {
    sapphire: { light: '#bfe0ff', mid: '#5b9cf0', base: '#2f6fd6', dark: '#1a3f93', glow: '120, 180, 255' },
    emerald:  { light: '#c6f7d6', mid: '#4fd08a', base: '#22a860', dark: '#0f6a3b', glow: '110, 230, 160' },
    ruby:     { light: '#ffb3bf', mid: '#f23a5a', base: '#c81838', dark: '#7a0824', glow: '255, 110, 130' }
  };
  DD.GEM_COL = GEM_COL;

  function hexRgb(h) { var n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  function mixCol(a, b, k) {
    var p = hexRgb(a), q = hexRgb(b);
    return 'rgb(' + Math.round(p[0] + (q[0] - p[0]) * k) + ',' + Math.round(p[1] + (q[1] - p[1]) * k) + ',' + Math.round(p[2] + (q[2] - p[2]) * k) + ')';
  }
  // 面の向き（外向きの角度）から色を決める。左上が明るく、右下が暗い
  function faceCol(col, nx, ny) {
    var d = nx * -0.6 + ny * -0.8; // 光の来る向き（左上）との近さ（-1〜1）
    if (d > 0) return mixCol(col.mid, col.light, Math.min(1, d * 0.9));
    return mixCol(col.mid, col.dark, Math.min(1, -d * 0.9));
  }
  function poly(c, pts) { c.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); }

  // 外周の点と内側（テーブル）の点をつないで、まわりの面を塗る
  function ringFaces(ctx, col, outer, inner, cx, cy) {
    var n = outer.length;
    for (var i = 0; i < n; i++) {
      var j = (i + 1) % n;
      var mx = (outer[i][0] + outer[j][0]) / 2 - cx, my = (outer[i][1] + outer[j][1]) / 2 - cy;
      var l = Math.sqrt(mx * mx + my * my) || 1;
      ctx.fillStyle = faceCol(col, mx / l, my / l);
      ctx.beginPath(); poly(ctx, [outer[i], outer[j], inner[j], inner[i]]); ctx.fill();
    }
  }
  function facetLines(ctx, a, b, lw) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = lw;
    ctx.beginPath();
    for (var i = 0; i < a.length; i++) { ctx.moveTo(a[i][0], a[i][1]); ctx.lineTo(b[i][0], b[i][1]); }
    ctx.stroke();
  }

  function gemOutline(kind, s) {
    var pts = [], i;
    if (kind === 'emerald') {
      var w = s * 0.74, h = s * 0.98, k = s * 0.3;
      pts = [[-w + k, -h], [w - k, -h], [w, -h + k], [w, h - k], [w - k, h], [-w + k, h], [-w, h - k], [-w, -h + k]];
    } else if (kind === 'sapphire') {
      for (i = 0; i < 12; i++) { var a = -Math.PI / 2 + i / 12 * Math.PI * 2; pts.push([Math.cos(a) * s * 0.84, Math.sin(a) * s]); }
    } else {
      // ルビー：上が平らで下がとがった、いちばん「宝石らしい」形
      pts = [[-s * 0.55, -s * 0.72], [s * 0.55, -s * 0.72], [s, -s * 0.2], [0, s * 0.95], [-s, -s * 0.2]];
    }
    return pts;
  }

  /**
   * 宝石を描く（ゲーム内でもUIでも使う）
   * s = 大きさ（半分の高さくらい）、t = 時間（きらめき用）、fancy = 光の輪とキラキラも描く
   */
  DD.drawGem = function (ctx, kind, x, y, s, t, fancy) {
    var col = GEM_COL[kind] || GEM_COL.sapphire;
    t = t || 0;
    ctx.save();
    ctx.translate(x, y);
    if (fancy) {
      // うしろの光
      var gl = ctx.createRadialGradient(0, 0, s * 0.3, 0, 0, s * 2.1);
      var ga = 0.45 + Math.sin(t * 5) * 0.12;
      gl.addColorStop(0, 'rgba(' + col.glow + ', ' + ga.toFixed(3) + ')');
      gl.addColorStop(1, 'rgba(' + col.glow + ', 0)');
      ctx.fillStyle = gl;
      ctx.beginPath(); ctx.arc(0, 0, s * 2.1, 0, Math.PI * 2); ctx.fill();
    }
    var out = gemOutline(kind, s), lw = Math.max(2, s * 0.15);
    // 下地
    D.shape(ctx, function (c) { poly(c, out); }, col.base, 0);
    if (kind === 'ruby') {
      // 上（クラウン）は3面、下（パビリオン）は4面
      var T = [[-s * 0.55, -s * 0.72], [-s * 0.18, -s * 0.72], [s * 0.18, -s * 0.72], [s * 0.55, -s * 0.72]];
      var G = [[-s, -s * 0.2], [-s * 0.4, -s * 0.2], [s * 0.4, -s * 0.2], [s, -s * 0.2]];
      var B = [0, s * 0.95];
      var fills = [[T[0], T[1], G[1], G[0]], [T[1], T[2], G[2], G[1]], [T[2], T[3], G[3], G[2]],
        [G[0], G[1], B], [G[1], [0, -s * 0.2], B], [[0, -s * 0.2], G[2], B], [G[2], G[3], B]];
      var cols = [col.light, mixCol(col.mid, col.light, 0.45), col.mid, col.mid, mixCol(col.mid, col.light, 0.25), col.base, col.dark];
      for (var i = 0; i < fills.length; i++) { ctx.fillStyle = cols[i]; ctx.beginPath(); poly(ctx, fills[i]); ctx.fill(); }
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)'; ctx.lineWidth = Math.max(1, s * 0.06);
      ctx.beginPath();
      ctx.moveTo(G[0][0], G[0][1]); ctx.lineTo(G[3][0], G[3][1]);
      ctx.moveTo(T[1][0], T[1][1]); ctx.lineTo(G[1][0], G[1][1]); ctx.lineTo(B[0], B[1]);
      ctx.moveTo(T[2][0], T[2][1]); ctx.lineTo(G[2][0], G[2][1]); ctx.lineTo(B[0], B[1]);
      ctx.moveTo(0, -s * 0.2); ctx.lineTo(B[0], B[1]);
      ctx.stroke();
    } else {
      // まわりの面を塗り、まん中の平らな面（テーブル）を明るく
      var inK = kind === 'emerald' ? 0.5 : 0.52;
      var inner = out.map(function (q) { return [q[0] * inK, q[1] * inK]; });
      ringFaces(ctx, col, out, inner, 0, 0);
      if (kind === 'emerald') {
        // ステップカット：もう1段の段々
        var mid = out.map(function (q) { return [q[0] * 0.76, q[1] * 0.76]; });
        ctx.globalAlpha = 0.5;
        ringFaces(ctx, col, mid, inner, 0, 0);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'; ctx.lineWidth = Math.max(1, s * 0.05);
        ctx.beginPath(); poly(ctx, mid); ctx.stroke();
      }
      var tg = ctx.createLinearGradient(-s * 0.4, -s * 0.5, s * 0.4, s * 0.5);
      tg.addColorStop(0, col.light); tg.addColorStop(0.55, col.mid); tg.addColorStop(1, col.base);
      ctx.fillStyle = tg;
      ctx.beginPath(); poly(ctx, inner); ctx.fill();
      facetLines(ctx, out, inner, Math.max(1, s * 0.06));
      ctx.beginPath(); poly(ctx, inner); ctx.stroke();
    }
    // ときどき光がすっと横切る
    var sweep = (t * 0.7) % 1.6;
    if (sweep < 1) {
      ctx.save();
      ctx.beginPath(); poly(ctx, out); ctx.clip();
      var sx = -s * 1.6 + sweep * s * 3.2;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.beginPath();
      ctx.moveTo(sx, -s * 1.2); ctx.lineTo(sx + s * 0.35, -s * 1.2); ctx.lineTo(sx - s * 0.25, s * 1.2); ctx.lineTo(sx - s * 0.6, s * 1.2);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    // 輪郭
    D.shape(ctx, function (c) { poly(c, out); }, null, lw);
    // つやの点
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath(); D.ellipse(ctx, -s * 0.34, -s * 0.44, s * 0.14, s * 0.09, -0.6); ctx.fill();
    if (fancy) {
      // まわりでまたたく小さな星
      for (var q = 0; q < 3; q++) {
        var ph = t * 2.2 + q * 2.1, tw = Math.max(0, Math.sin(ph));
        if (tw < 0.05) continue;
        var ang = q * 2.1 + Math.floor(ph / Math.PI) * 1.3;
        var r = s * (1.15 + 0.15 * q);
        sparkle(ctx, Math.cos(ang) * r, Math.sin(ang) * r * 0.9, s * 0.32 * tw);
      }
    }
    ctx.restore();
  };

  function sparkle(ctx, x, y, r) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.quadraticCurveTo(x, y, x, y + r);
    ctx.quadraticCurveTo(x, y, x - r, y);
    ctx.quadraticCurveTo(x, y, x, y - r);
    ctx.fill();
  }

  /** 宝石の種類をくじで選ぶ（サファイアが多め、ルビーはまれ） */
  DD.pickGem = function () {
    var r = Math.random();
    return r < 0.5 ? 'sapphire' : r < 0.85 ? 'emerald' : 'ruby';
  };

  /** 画面の座標でコインの小さなアイコンを描く（UI用） */
  DD.drawCoinIcon = function (ctx, x, y, r) {
    D.oval(ctx, x, y, r, r, 0, '#e8a326', Math.max(2, r * 0.25));
    D.oval(ctx, x, y, r * 0.66, r * 0.66, 0, '#ffd84a', 0);
    ctx.fillStyle = '#e8a326';
    ctx.fillRect(x - r * 0.12, y - r * 0.42, r * 0.24, r * 0.84);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath(); D.ellipse(ctx, x - r * 0.32, y - r * 0.4, r * 0.2, r * 0.15, -0.5); ctx.fill();
  };

  /** 今の速さでのコイン1枚の価値 */
  DD.coinValue = function (speed) {
    var v = 1;
    for (var i = 0; i < CFG.COIN_MULT.length; i++) if (speed >= CFG.COIN_MULT[i][0]) v = CFG.COIN_MULT[i][1];
    return v;
  };

})(window);
