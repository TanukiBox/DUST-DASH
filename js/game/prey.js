/*
 * DUST DASH 獲物：虫（バッタ）・トカゲ・ガラガラヘビ
 * どれも座標は「足元の中央」が基準。y は上がマイナス。
 * 新しい種類を増やすときは DD.KINDS に { create, update, draw } を足す。
 */
(function (global) {
  'use strict';
  var DD = global.DD = global.DD || {};
  var CFG = DD.CFG, COL = DD.COL, D = DD.draw, U = DD.util;

  DD.KINDS = DD.KINDS || {};

  function base(type, x, y) {
    var spec = CFG.PREY[type] || {};
    return {
      type: type, prey: true, x: x, y: y, baseY: y,
      w: spec.w || 30, h: spec.h || 20,
      t: Math.random() * 10, dead: false
    };
  }

  // ------------------------------------------------------------
  // 虫（バッタ）：地面にいるか、低い空中をパタパタ
  // ------------------------------------------------------------
  DD.KINDS.bug = {
    create: function (x, y) {
      var b = base('bug', x, y);
      b.air = y < 0;
      b.hop = 0;
      return b;
    },
    update: function (b, dt) {
      b.t += dt;
      if (b.air) {
        b.y = b.baseY + Math.sin(b.t * 4) * 6;
      } else {
        // ときどき小さく跳ねる
        b.hop = (b.t % 1.6);
        b.y = b.hop < 0.35 ? -Math.sin(b.hop / 0.35 * Math.PI) * 14 : 0;
      }
    },
    draw: function (ctx, b) {
      var lw = D.LW * 0.8;
      ctx.save();
      ctx.translate(b.x, b.y);
      // 羽（空中の時だけパタパタ）
      if (b.air) {
        var f = Math.sin(b.t * 40) * 0.5 + 0.5;
        ctx.save();
        ctx.globalAlpha = 0.75;
        D.oval(ctx, 4, -22 - f * 4, 11, 5 + f * 3, -0.3 - f * 0.4, '#f4fbe8', lw * 0.7);
        ctx.restore();
      }
      // 後ろ足（大きく曲がったバッタの足）
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      function hind() { ctx.beginPath(); ctx.moveTo(4, -12); ctx.lineTo(13, -23); ctx.lineTo(17, -2); }
      hind(); ctx.lineWidth = 8; ctx.strokeStyle = COL.line; ctx.stroke();
      hind(); ctx.lineWidth = 4; ctx.strokeStyle = COL.bugDark; ctx.stroke();
      // 前足
      ctx.lineWidth = 3; ctx.strokeStyle = COL.line;
      ctx.beginPath();
      ctx.moveTo(-5, -6); ctx.lineTo(-8, 0);
      ctx.moveTo(1, -6); ctx.lineTo(0, 0);
      ctx.stroke();
      // 胴体
      D.oval(ctx, 3, -11, 14, 8, -0.1, COL.bug, lw);
      ctx.strokeStyle = COL.bugDark; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(8, -16); ctx.lineTo(8, -6);
      ctx.moveTo(13, -15); ctx.lineTo(13, -8);
      ctx.stroke();
      // 触角
      ctx.strokeStyle = COL.line; ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-14, -20); ctx.quadraticCurveTo(-18, -32, -26, -33);
      ctx.moveTo(-11, -21); ctx.quadraticCurveTo(-12, -33, -18, -37);
      ctx.stroke();
      // 頭と目
      D.oval(ctx, -11, -14, 9, 8.5, 0, COL.bug, lw);
      D.eye(ctx, -13, -16, 4.6, -0.6, 0, false);
      ctx.restore();
    }
  };

  // ------------------------------------------------------------
  // トカゲ：地面をちょこちょこ右へ走る
  // ------------------------------------------------------------
  DD.KINDS.lizard = {
    create: function (x, y) { return base('lizard', x, 0); },
    update: function (l, dt) {
      l.t += dt;
      l.x += CFG.PREY.lizard.vx * dt;
    },
    draw: function (ctx, l) {
      var lw = D.LW * 0.85;
      var run = l.t * 22;
      ctx.save();
      ctx.translate(l.x, l.y);
      // しっぽ（くねくね）
      var wag = Math.sin(run * 0.5) * 3;
      D.shape(ctx, function (c) {
        c.moveTo(-10, -12);
        c.quadraticCurveTo(-26, -10 + wag, -40, -4 - wag * 0.5);
        c.quadraticCurveTo(-26, -3 + wag, -10, -4);
        c.closePath();
      }, COL.lizard, lw);
      // 足（ちょこちょこ）
      ctx.lineCap = 'round';
      var legs = [[-8, 0], [12, Math.PI]];
      for (var i = 0; i < legs.length; i++) {
        var a = run + legs[i][1];
        var lx = legs[i][0];
        ctx.beginPath();
        ctx.moveTo(lx, -7); ctx.lineTo(lx + Math.sin(a) * 6, -1 + Math.min(0, Math.cos(a) * 3));
        ctx.moveTo(lx + 3, -7); ctx.lineTo(lx + 3 - Math.sin(a) * 6, -1 + Math.min(0, -Math.cos(a) * 3));
        ctx.lineWidth = 7; ctx.strokeStyle = COL.line; ctx.stroke();
        ctx.lineWidth = 3.5; ctx.strokeStyle = COL.lizardDark; ctx.stroke();
      }
      // 胴体
      D.oval(ctx, 2, -9, 17, 7.5, 0, COL.lizard, lw);
      // 背中の模様
      ctx.fillStyle = COL.lizardDark;
      for (i = 0; i < 3; i++) {
        ctx.beginPath(); D.ellipse(ctx, -8 + i * 8, -12, 2.6, 1.8, 0); ctx.fill();
      }
      // 頭
      D.oval(ctx, 21, -12, 10, 7, 0.1, COL.lizard, lw);
      D.eye(ctx, 22, -15, 4.2, 0.6, 0, false);
      // にっこり口
      ctx.strokeStyle = COL.line; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(26, -10, 3, 0.2, Math.PI * 0.7); ctx.stroke();
      ctx.restore();
    }
  };

  // ------------------------------------------------------------
  // ガラガラヘビ：とぐろを巻いて待ちかまえる（怖すぎない顔）
  // ------------------------------------------------------------
  DD.KINDS.snake = {
    create: function (x, y) {
      var s = base('snake', x, 0);
      s.strike = 0;
      return s;
    },
    update: function (s, dt) {
      s.t += dt;
      if (s.strike > 0) s.strike -= dt;
    },
    draw: function (ctx, s) {
      var lw = D.LW;
      var sway = Math.sin(s.t * 3) * 2.5;
      var lunge = s.strike > 0 ? Math.sin((s.strike / 0.4) * Math.PI) * 14 : 0;
      ctx.save();
      ctx.translate(s.x, s.y);

      // しっぽの先のガラガラ（ふるえる）
      var shake = Math.sin(s.t * 60) * 1.5;
      ctx.save();
      ctx.translate(28 + shake, -12);
      ctx.rotate(0.25);
      for (var i = 0; i < 4; i++) {
        D.oval(ctx, 0, -i * 6.5, 5.5 - i * 0.6, 3.8, 0, COL.snakeRattle, lw * 0.6);
      }
      ctx.restore();

      // とぐろ（下から上へ3段）
      var coils = [[0, -10, 31, 10], [3, -19, 23, 8.5], [0, -27, 15, 7]];
      for (i = 0; i < coils.length; i++) {
        var c = coils[i];
        D.oval(ctx, c[0], c[1], c[2], c[3], 0, COL.snake, lw);
        // ひし形の模様
        ctx.save();
        ctx.beginPath(); D.ellipse(ctx, c[0], c[1], c[2], c[3], 0); ctx.clip();
        ctx.fillStyle = COL.snakeDark;
        for (var k = -2; k <= 2; k++) {
          var dx = c[0] + k * c[2] * 0.45, dy = c[1] - 1;
          ctx.beginPath();
          ctx.moveTo(dx, dy - 4); ctx.lineTo(dx + 4.5, dy); ctx.lineTo(dx, dy + 4); ctx.lineTo(dx - 4.5, dy);
          ctx.closePath(); ctx.fill();
        }
        ctx.restore();
      }

      // 首（S字にもたげる）
      var hx = -20 + sway - lunge, hy = -44;
      function neck() {
        ctx.beginPath();
        ctx.moveTo(-4, -28);
        ctx.bezierCurveTo(-18, -26, -6 + sway * 0.5, -40, hx + 6, hy + 2);
      }
      ctx.lineCap = 'round';
      neck(); ctx.lineWidth = 13 + lw * 2; ctx.strokeStyle = COL.line; ctx.stroke();
      neck(); ctx.lineWidth = 13; ctx.strokeStyle = COL.snake; ctx.stroke();

      // ちょろっと出る舌
      if (Math.sin(s.t * 2.2) > 0.6 || s.strike > 0) {
        ctx.strokeStyle = '#e8505b'; ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(hx - 10, hy + 3); ctx.lineTo(hx - 17, hy + 3);
        ctx.lineTo(hx - 21, hy); ctx.moveTo(hx - 17, hy + 3); ctx.lineTo(hx - 21, hy + 6);
        ctx.stroke();
      }
      // 頭
      D.oval(ctx, hx, hy, 12.5, 9.5, -0.1, COL.snake, lw);
      ctx.fillStyle = COL.snakeDark;
      ctx.beginPath(); D.ellipse(ctx, hx + 4, hy - 5, 4, 2.2, 0.2); ctx.fill();
      D.eye(ctx, hx - 3, hy - 3, 4.8, -0.6, 0, false);
      D.blush(ctx, hx - 1, hy + 4, 3.2);
      ctx.restore();
    }
  };

  DD.createItem = function (type, x, y) {
    return DD.KINDS[type].create(x, y || 0);
  };
})(window);
