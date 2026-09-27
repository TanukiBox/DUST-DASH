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
    create: function (x, y) {
      return { type: 'coin', coin: true, x: x, y: y, w: 26, h: 26, t: Math.random() * 6, dead: false };
    },
    update: function (c, dt) { c.t += dt; },
    draw: function (ctx, c) {
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
