/*
 * DUST DASH 障害物：サボテン・岩・穴
 * サボテンと岩は DD.KINDS に入れて獲物と同じように扱う（obstacle: true）。
 * 穴は地面そのものに開くので、別の形（{ x0, x1 }）で持つ。
 */
(function (global) {
  'use strict';
  var DD = global.DD = global.DD || {};
  var CFG = DD.CFG, COL = DD.COL, D = DD.draw, U = DD.util;

  DD.KINDS = DD.KINDS || {};

  var CACTUS = '#86c46a', CACTUS_DARK = '#5a9a4c';
  var ROCK = '#cbb59b', ROCK_DARK = '#a38a6f', ROCK_LIGHT = '#e6d6c0';

  /** 同じ色の形をまとめて1つの輪郭で描く */
  function blob(ctx, paths, fill, lw) {
    var i;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = COL.line;
    ctx.lineWidth = lw * 2;
    for (i = 0; i < paths.length; i++) { ctx.beginPath(); paths[i](ctx); ctx.stroke(); }
    ctx.fillStyle = fill;
    for (i = 0; i < paths.length; i++) { ctx.beginPath(); paths[i](ctx); ctx.fill(); }
  }

  function flower(ctx, x, y, r) {
    for (var i = 0; i < 5; i++) {
      var a = i * Math.PI * 2 / 5 - Math.PI / 2;
      D.oval(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.8, r * 0.8, 0, '#ff9fb4', 2);
    }
    D.oval(ctx, x, y, r * 0.6, r * 0.6, 0, COL.good, 2);
  }

  // ------------------------------------------------------------
  // サボテン：背の高い柱サボテンと、丸いタル型の2種類
  // ------------------------------------------------------------
  DD.KINDS.cactus = {
    create: function (x) {
      var tall = Math.random() < 0.6;
      var spec = CFG.OBSTACLE[tall ? 'cactusTall' : 'cactusRound'];
      return { type: 'cactus', obstacle: true, tall: tall, x: x, y: 0, w: spec.w, h: spec.h, t: 0, dead: false };
    },
    update: function (c, dt) { c.t += dt; },
    draw: function (ctx, c) {
      var lw = D.LW;
      ctx.save();
      ctx.translate(c.x, c.y);
      if (c.tall) {
        blob(ctx, [
          function (k) { D.roundRect(k, -13, -72, 26, 74, 13); },
          function (k) { D.roundRect(k, -30, -54, 12, 28, 6); },
          function (k) { D.roundRect(k, -28, -34, 20, 11, 5.5); },
          function (k) { D.roundRect(k, 18, -64, 12, 26, 6); },
          function (k) { D.roundRect(k, 8, -44, 20, 11, 5.5); }
        ], CACTUS, lw);
        // たてのすじ
        ctx.strokeStyle = CACTUS_DARK; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-5, -62); ctx.lineTo(-5, -6);
        ctx.moveTo(5, -62); ctx.lineTo(5, -6);
        ctx.moveTo(-24, -50); ctx.lineTo(-24, -32);
        ctx.moveTo(24, -60); ctx.lineTo(24, -44);
        ctx.stroke();
        // トゲ
        ctx.strokeStyle = COL.cream; ctx.lineWidth = 1.8;
        var sp = [[-13, -50], [13, -30], [-13, -18], [13, -58], [-30, -44], [30, -54]];
        ctx.beginPath();
        for (var i = 0; i < sp.length; i++) {
          var sx = sp[i][0], sy = sp[i][1], dir = sx < 0 ? -1 : 1;
          ctx.moveTo(sx, sy); ctx.lineTo(sx + dir * 5, sy - 2);
        }
        ctx.stroke();
        flower(ctx, 0, -73, 4.5);
      } else {
        D.oval(ctx, 0, -21, 22, 21, 0, CACTUS, lw);
        ctx.strokeStyle = CACTUS_DARK; ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(0, -40); ctx.lineTo(0, -3);
        ctx.moveTo(-10, -37); ctx.quadraticCurveTo(-15, -21, -10, -5);
        ctx.moveTo(10, -37); ctx.quadraticCurveTo(15, -21, 10, -5);
        ctx.stroke();
        ctx.strokeStyle = COL.cream; ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(-22, -24); ctx.lineTo(-27, -26);
        ctx.moveTo(22, -18); ctx.lineTo(27, -20);
        ctx.moveTo(-18, -36); ctx.lineTo(-22, -40);
        ctx.stroke();
        flower(ctx, 0, -43, 4);
      }
      ctx.restore();
    }
  };

  // ------------------------------------------------------------
  // 岩：ごつごつではなく、まるっとした石
  // ------------------------------------------------------------
  DD.KINDS.rock = {
    create: function (x) {
      var big = Math.random() < 0.5;
      var spec = CFG.OBSTACLE[big ? 'rockBig' : 'rockSmall'];
      return { type: 'rock', obstacle: true, big: big, x: x, y: 0, w: spec.w, h: spec.h, t: 0, dead: false };
    },
    update: function (r, dt) { r.t += dt; },
    draw: function (ctx, r) {
      var lw = D.LW, w = r.w / 2, h = r.h;
      ctx.save();
      ctx.translate(r.x, r.y);
      var path = function (c) {
        c.moveTo(-w, 0);
        c.quadraticCurveTo(-w - 2, -h * 0.7, -w * 0.45, -h * 0.95);
        c.quadraticCurveTo(-w * 0.1, -h * 1.08, w * 0.25, -h * 0.98);
        c.quadraticCurveTo(w + 2, -h * 0.85, w, 0);
        c.closePath();
      };
      D.shape(ctx, path, ROCK, lw);
      // かげとつや
      ctx.save();
      ctx.beginPath(); path(ctx); ctx.clip();
      ctx.fillStyle = ROCK_DARK;
      ctx.beginPath(); D.ellipse(ctx, w * 0.3, -h * 0.05, w * 0.95, h * 0.35, -0.1); ctx.fill();
      ctx.fillStyle = ROCK_LIGHT;
      ctx.beginPath(); D.ellipse(ctx, -w * 0.35, -h * 0.72, w * 0.28, h * 0.13, -0.3); ctx.fill();
      ctx.restore();
      D.shape(ctx, path, null, lw);
      // ひび
      ctx.strokeStyle = COL.line; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(w * 0.15, -h * 0.95); ctx.lineTo(w * 0.05, -h * 0.72); ctx.lineTo(w * 0.22, -h * 0.58);
      ctx.stroke();
      ctx.restore();
    }
  };

  // ------------------------------------------------------------
  // 大サボテン：1段ジャンプでは越えられない高さ（2段ジャンプでよける）
  // ------------------------------------------------------------
  DD.KINDS.giantCactus = {
    create: function (x) {
      var spec = CFG.OBSTACLE.giantCactus;
      return { type: 'giantCactus', obstacle: true, noScale: true, x: x, y: 0, w: spec.w, h: spec.h, t: 0, dead: false };
    },
    update: function (c, dt) { c.t += dt; },
    draw: function (ctx, c) {
      var lw = D.LW, H = c.h;
      ctx.save();
      ctx.translate(c.x, c.y);
      blob(ctx, [
        function (k) { D.roundRect(k, -17, -H, 34, H + 2, 17); },
        function (k) { D.roundRect(k, -46, -H * 0.74, 15, H * 0.3, 7.5); },
        function (k) { D.roundRect(k, -44, -H * 0.5, 32, 14, 7); },
        function (k) { D.roundRect(k, 31, -H * 0.86, 15, H * 0.28, 7.5); },
        function (k) { D.roundRect(k, 12, -H * 0.64, 32, 14, 7); },
        function (k) { D.roundRect(k, -40, -H * 0.38, 13, H * 0.16, 6.5); },
        function (k) { D.roundRect(k, -38, -H * 0.26, 24, 12, 6); }
      ], CACTUS, lw);
      ctx.strokeStyle = CACTUS_DARK; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-6, -H + 14); ctx.lineTo(-6, -8);
      ctx.moveTo(6, -H + 14); ctx.lineTo(6, -8);
      ctx.moveTo(-38.5, -H * 0.72); ctx.lineTo(-38.5, -H * 0.5);
      ctx.moveTo(38.5, -H * 0.84); ctx.lineTo(38.5, -H * 0.62);
      ctx.stroke();
      ctx.strokeStyle = COL.cream; ctx.lineWidth = 1.8;
      ctx.beginPath();
      for (var i = 0; i < 7; i++) {
        var sy = -H + 30 + i * (H - 40) / 7, dir = i % 2 ? 1 : -1;
        ctx.moveTo(dir * 17, sy); ctx.lineTo(dir * 23, sy - 2);
      }
      ctx.stroke();
      flower(ctx, -5, -H - 1, 5);
      flower(ctx, 38, -H * 0.86 - 1, 4);
      ctx.restore();
    }
  };

  // ------------------------------------------------------------
  // ハゲワシ：頭の上すれすれを低く飛んでくる（ジャンプすると当たる）
  // ------------------------------------------------------------
  DD.KINDS.vulture = {
    create: function (x, y) {
      var spec = CFG.OBSTACLE.vulture;
      return {
        type: 'vulture', obstacle: true, flying: true,
        x: x, y: -spec.lift, baseY: -spec.lift, w: spec.w, h: spec.h,
        vx: -spec.vx, t: Math.random() * 6, dead: false
      };
    },
    update: function (v, dt) {
      v.t += dt;
      v.x += v.vx * dt;
      v.y = v.baseY + Math.sin(v.t * 3) * 3;
    },
    draw: function (ctx, v) {
      var lw = D.LW;
      var flap = Math.sin(v.t * 6);
      ctx.save();
      ctx.translate(v.x, v.y);
      // 奥の翼（上に広げた大きな翼）
      D.shape(ctx, function (c) {
        c.moveTo(6, -30);
        c.quadraticCurveTo(10, -58 - flap * 6, 22, -76 - flap * 6);
        c.lineTo(30, -70 - flap * 6); c.lineTo(36, -72 - flap * 5); c.lineTo(40, -62 - flap * 4);
        c.quadraticCurveTo(34, -44, 22, -30);
        c.closePath();
      }, '#3f3128', lw);
      // しっぽ
      D.shape(ctx, function (c) {
        c.moveTo(20, -26); c.lineTo(40, -30); c.lineTo(42, -18); c.lineTo(20, -18); c.closePath();
      }, '#5f4a3a', lw);
      // 胴体
      D.oval(ctx, 2, -22, 25, 13, 0.05, '#6d5645', lw);
      // 首の白いえりまき
      D.oval(ctx, -18, -27, 9, 10, 0.3, COL.cream, lw * 0.8);
      // 頭（ピンクのはげ頭）
      D.oval(ctx, -29, -31, 10, 9, 0, '#f4a9a0', lw);
      // くちばし（先が曲がる）
      D.shape(ctx, function (c) {
        c.moveTo(-37, -35); c.quadraticCurveTo(-49, -35, -49, -27);
        c.quadraticCurveTo(-45, -30, -37, -27); c.closePath();
      }, '#f3e3c3', lw * 0.8);
      D.eye(ctx, -31, -33, 4.2, -0.6, 0, false);
      // 眠そうなまぶた
      ctx.strokeStyle = COL.line; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-36, -37); ctx.lineTo(-26, -37.5); ctx.stroke();
      // 手前の翼（羽ばたく）：先が指のように分かれる
      var fy = flap * 8;
      D.shape(ctx, function (c) {
        c.moveTo(-12, -28);
        c.quadraticCurveTo(-16, -56 - fy, -6, -80 - fy);
        c.lineTo(2, -76 - fy); c.lineTo(6, -84 - fy); c.lineTo(13, -78 - fy);
        c.lineTo(18, -84 - fy * 0.9); c.lineTo(23, -76 - fy * 0.9);
        c.lineTo(29, -78 - fy * 0.8); c.lineTo(30, -68 - fy * 0.8);
        c.quadraticCurveTo(26, -44, 12, -24);
        c.closePath();
      }, '#5a4637', lw);
      // 翼の内側の明るい帯
      ctx.fillStyle = 'rgba(243, 227, 195, 0.5)';
      ctx.beginPath();
      ctx.moveTo(-6, -40); ctx.quadraticCurveTo(-4, -60 - fy, 4, -70 - fy);
      ctx.lineTo(24, -66 - fy * 0.8); ctx.quadraticCurveTo(18, -48, 8, -34);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  };

  // ------------------------------------------------------------
  // 岩のひさし：上からせり出した岩。ジャンプすると頭をぶつける（下を走り抜ける）
  // x = 中心、w = 長さ、y = 岩のいちばん下（ここより上に頭が出ると当たる）
  // ------------------------------------------------------------
  DD.KINDS.overhang = {
    create: function (x, y, w) {
      return { type: 'overhang', obstacle: true, ceiling: true, noScale: true, x: x, y: y, w: w, h: 900, t: 0, dead: false };
    },
    update: function (o, dt) { o.t += dt; },
    draw: function (ctx, o) {
      var th = DD.theme ? DD.theme() : null;
      var rock = th ? th.rock : '#d0764a', band = th ? th.rockBand : '#a9553a';
      var x0 = o.x - o.w / 2, x1 = o.x + o.w / 2, top = o.y - o.h, bot = o.y;
      ctx.save();
      // 岩の本体（下のふちは少しでこぼこ）
      D.shape(ctx, function (c) {
        c.moveTo(x0, top);
        c.lineTo(x1, top);
        c.lineTo(x1, bot - 22);
        c.quadraticCurveTo(x1 - 6, bot - 4, x1 - 26, bot - 8);
        c.lineTo(x0 + 26, bot - 8);
        c.quadraticCurveTo(x0 + 6, bot - 4, x0, bot - 22);
        c.closePath();
      }, rock, D.LW);
      ctx.fillStyle = band;
      for (var yy = bot - 60; yy > top; yy -= 46) ctx.fillRect(x0 + 3, yy, o.w - 6, 10);
      // 下向きのトゲ（つらら岩）
      var n = Math.max(2, Math.floor(o.w / 46));
      for (var i = 0; i < n; i++) {
        var sx = x0 + 24 + i * (o.w - 48) / Math.max(1, n - 1);
        D.shape(ctx, function (c) { c.moveTo(sx - 12, bot - 10); c.lineTo(sx, bot + 8); c.lineTo(sx + 12, bot - 10); c.closePath(); }, '#efe2c8', 3);
      }
      ctx.restore();
    }
  };

  // ------------------------------------------------------------
  // つむじ風：ふれると空高く飛ばされる（空のコインを集めるボーナス）
  // ------------------------------------------------------------
  DD.KINDS.whirl = {
    create: function (x, y) {
      return { type: 'whirl', whirl: true, x: x, y: y || 0, w: 60, h: 130, t: 0, dead: false, used: false };
    },
    update: function (o, dt) { o.t += dt; },
    draw: function (ctx, o) {
      var t = o.t, H = 140, i, k, q;
      var A = o.used ? 0.35 : 1;
      // うずの帯（下から上へ流れる）の高さ
      var bands = [];
      for (i = 0; i < 6; i++) bands.push(((i / 6) + t * 0.6) % 1);
      // 高さの割合 k（0=足元、1=てっぺん）での、うずの半径・中心のずれ・高さ
      var rad = function (kk) {
        var r = 6 + 36 * Math.pow(kk, 1.3);
        for (var b = 0; b < bands.length; b++) { var e = (kk - bands[b]) / 0.05; r += 3.5 * kk * Math.exp(-e * e); } // 帯のところが少しふくらむ
        return r;
      };
      var cen = function (kk) { return Math.sin(t * 3.2 - kk * 3.4) * (2 + 12 * kk); };
      var yOf = function (kk) { return -6 - kk * (H - 6); };
      ctx.save();
      ctx.translate(o.x, o.y);
      ctx.globalAlpha = A;

      // 足元の砂けむり（うしろ側）
      var puffs = function (front) {
        for (var p = 0; p < 6; p++) {
          var pa = t * 4.5 + p * Math.PI / 3, z = Math.sin(pa);
          if ((z >= 0) !== front) continue;
          var pr = (p % 2 ? 7 : 10) + z * 2;
          D.oval(ctx, Math.cos(pa) * 26, -7 - z * 3, pr, pr * 0.8, 0, front ? '#f6e4be' : '#e3c28c', front ? 2.5 : 0);
        }
      };
      ctx.fillStyle = 'rgba(200, 150, 90, 0.35)';
      ctx.beginPath(); D.ellipse(ctx, 0, -2, 42, 7, 0); ctx.fill();
      puffs(false);

      // うしろ側を回る小石と葉っぱ（奥なので小さく暗く）
      var debris = [];
      for (i = 0; i < 6; i++) debris.push({ k: 0.2 + (i % 3) * 0.3, a: t * (5 - (i % 3) * 0.5) + i * 1.9, leaf: i % 2 === 0 });
      var drawDebris = function (front) {
        for (var d = 0; d < debris.length; d++) {
          var db = debris[d], z = Math.sin(db.a);
          if ((z >= 0) !== front) continue;
          var r = rad(db.k) + 10, dx = cen(db.k) + Math.cos(db.a) * r, dy = yOf(db.k) + z * r * 0.22;
          var sc = 0.75 + z * 0.25;
          ctx.save();
          ctx.translate(dx, dy); ctx.rotate(db.a * 1.7); ctx.scale(sc, sc);
          if (db.leaf) D.shape(ctx, function (c) { c.moveTo(-7, 0); c.quadraticCurveTo(0, -7, 7, 0); c.quadraticCurveTo(0, 7, -7, 0); c.closePath(); }, front ? '#9cc45a' : '#7fa24a', front ? 2 : 0);
          else D.oval(ctx, 0, 0, 4.5, 3.5, 0, front ? '#b98b5e' : '#94704c', front ? 2 : 0);
          ctx.restore();
        }
      };
      drawDebris(false);

      // うずの本体（下が細く上が広いろうと形。ふちは帯のところで波打つ）
      var N = 40, left = [], right = [];
      for (i = 0; i <= N; i++) {
        k = i / N;
        var c = cen(k), r0 = rad(k), yy = yOf(k);
        left.push([c - r0, yy]); right.push([c + r0, yy]);
      }
      var body = function (cx) {
        cx.moveTo(left[0][0], left[0][1]);
        for (var n = 1; n <= N; n++) cx.lineTo(left[n][0], left[n][1]);
        // てっぺんはもこもこの雲
        var tc = cen(1), tr = rad(1), ty = yOf(1);
        cx.quadraticCurveTo(tc - tr - 8, ty - 16, tc - tr * 0.45, ty - 14);
        cx.quadraticCurveTo(tc - tr * 0.2, ty - 30, tc + tr * 0.2, ty - 16);
        cx.quadraticCurveTo(tc + tr * 0.55, ty - 26, tc + tr * 0.7, ty - 10);
        cx.quadraticCurveTo(tc + tr + 10, ty - 10, right[N][0], right[N][1]);
        for (n = N; n >= 0; n--) cx.lineTo(right[n][0], right[n][1]);
        cx.closePath();
      };
      // 半分すけた砂色（空がうっすら見える）
      var gr = ctx.createLinearGradient(-45, 0, 45, 0);
      gr.addColorStop(0, 'rgba(226, 190, 130, 0.8)');
      gr.addColorStop(0.42, 'rgba(255, 246, 226, 0.78)');
      gr.addColorStop(1, 'rgba(214, 170, 110, 0.8)');
      D.shape(ctx, body, gr, 0);

      // 回るすじ：前を横切る短い弧。帯ごとに長さと色を変えて、ぐるぐる回って見せる
      ctx.save();
      ctx.beginPath(); body(ctx); ctx.clip();
      ctx.lineCap = 'round';
      for (i = 0; i < 14; i++) {
        k = ((i / 14) + t * 0.6) % 1;
        var fade = Math.min(1, k * 6, (1 - k) * 6);
        var bc = cen(k), br = rad(k), by = yOf(k);
        var spin = t * 7 + i * 2.4, len = 0.9 + (i % 3) * 0.45;
        var st = ((spin % Math.PI) + Math.PI) % Math.PI - 0.4; // 前側（0〜π）を右から左へ流れる
        ctx.globalAlpha = A * fade;
        ctx.strokeStyle = i % 2 ? 'rgba(255, 255, 255, 0.9)' : '#c98c4a';
        ctx.lineWidth = i % 2 ? 2.2 : 2.8;
        ctx.beginPath(); ctx.ellipse(bc, by, br * 0.94, br * 0.3, -0.1, st, st + len); ctx.stroke();
      }
      ctx.restore();

      // 輪郭（太めのこげ茶）
      ctx.globalAlpha = A;
      D.shape(ctx, body, null, 3.5);
      // てっぺんの口（うずの奥）
      var tc2 = cen(1), tr2 = rad(1), ty2 = yOf(1);
      ctx.globalAlpha = A * 0.55;
      ctx.strokeStyle = '#c98c4a'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.ellipse(tc2, ty2 - 4, tr2 * 0.7, 6, 0, Math.PI + 0.3, Math.PI * 2 - 0.3); ctx.stroke();

      // ふちから飛び出す風の線（くるんと巻く）
      ctx.lineWidth = 3;
      for (i = 0; i < 3; i++) {
        var wk = (t * 0.9 + i / 3) % 1, kk = 0.25 + i * 0.28, side = i % 2 ? -1 : 1;
        var wx = cen(kk) + side * (rad(kk) + 2), wy = yOf(kk);
        ctx.globalAlpha = A * Math.sin(wk * Math.PI);
        ctx.strokeStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(wx, wy + 2);
        ctx.quadraticCurveTo(wx + side * (14 + wk * 8), wy - 2, wx + side * (18 + wk * 10), wy - 10);
        ctx.quadraticCurveTo(wx + side * (20 + wk * 10), wy - 17, wx + side * (13 + wk * 10), wy - 15);
        ctx.stroke();
      }
      ctx.globalAlpha = A;
      // 前側を回る小石と葉っぱ、足元の砂けむり（前側）
      drawDebris(true);
      puffs(true);
      ctx.restore();
    }
  };

  // ------------------------------------------------------------
  // 回転草（タンブルウィード）：砂あらしで、こちらへ転がってくる。ジャンプでよける
  // ------------------------------------------------------------
  DD.KINDS.tumble = {
    create: function (x, y) {
      return { type: 'tumble', obstacle: true, moving: true, x: x, y: y || 0, baseY: y || 0, w: 50, h: 48, vx: -CFG.TUMBLE_VX, t: Math.random() * 3, rot: 0, dead: false };
    },
    update: function (o, dt) {
      o.t += dt;
      o.x += o.vx * dt;
      o.rot += o.vx * dt / 24;
      o.y = o.baseY - Math.abs(Math.sin(o.t * 4.2)) * 18; // ぽんぽん弾みながら
    },
    draw: function (ctx, o) {
      var r = o.h / 2;
      ctx.save();
      ctx.translate(o.x, o.y - r);
      ctx.rotate(o.rot);
      D.oval(ctx, 0, 0, r, r, 0, 'rgba(201, 148, 88, 0.55)', 3.5);
      // からまった枝
      ctx.strokeStyle = '#8a5a32'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      for (var i = 0; i < 7; i++) {
        var a = i * 0.9;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * r * 0.35, Math.sin(a) * r * 0.35, r * 0.62, a, a + 2.2);
        ctx.stroke();
      }
      ctx.strokeStyle = '#c9985e'; ctx.lineWidth = 2;
      for (i = 0; i < 5; i++) {
        var b = i * 1.3 + 0.4;
        ctx.beginPath(); ctx.arc(Math.cos(b) * r * 0.2, Math.sin(b) * r * 0.2, r * 0.8, b, b + 1.4); ctx.stroke();
      }
      ctx.restore();
    }
  };

  // ------------------------------------------------------------
  // 穴：地面を描いた後に上から描く
  // ------------------------------------------------------------
  DD.drawHole = function (ctx, hole, bottom) {
    var x0 = hole.x0, x1 = hole.x1, depth = Math.max(bottom, 200);
    ctx.save();
    ctx.translate(0, hole.y || 0); // 高い足場の穴は、その高さから下へ
    depth -= hole.y || 0;
    var g = ctx.createLinearGradient(0, 0, 0, 150);
    g.addColorStop(0, '#9a6337');
    g.addColorStop(1, '#3f2616');
    ctx.fillStyle = g;
    ctx.fillRect(x0, -2, x1 - x0, depth + 2);
    // 奥の壁（右側）にうす明るい面
    ctx.fillStyle = 'rgba(255, 220, 170, 0.18)';
    ctx.beginPath();
    ctx.moveTo(x1, 0); ctx.lineTo(x1 - 16, 18); ctx.lineTo(x1 - 16, depth); ctx.lineTo(x1, depth);
    ctx.closePath(); ctx.fill();
    // たれさがる根っこ
    ctx.strokeStyle = 'rgba(74, 45, 26, 0.6)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x0 + 10, 4); ctx.quadraticCurveTo(x0 + 16, 22, x0 + 9, 34);
    ctx.moveTo(x1 - 22, 4); ctx.quadraticCurveTo(x1 - 28, 16, x1 - 24, 26);
    ctx.stroke();
    // ふちの輪郭
    ctx.strokeStyle = COL.line; ctx.lineWidth = D.LW; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x0 - 6, 0); ctx.quadraticCurveTo(x0, 0, x0, 8); ctx.lineTo(x0, depth);
    ctx.moveTo(x1 + 6, 0); ctx.quadraticCurveTo(x1, 0, x1, 8); ctx.lineTo(x1, depth);
    ctx.stroke();
    ctx.restore();
  };
})(window);
