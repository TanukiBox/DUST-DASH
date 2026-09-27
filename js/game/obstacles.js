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
  // 穴：地面を描いた後に上から描く
  // ------------------------------------------------------------
  DD.drawHole = function (ctx, hole, bottom) {
    var x0 = hole.x0, x1 = hole.x1, depth = Math.max(bottom, 200);
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
  };
})(window);
