/*
 * DUST DASH 絵柄の共通ルール
 * 「丸みのあるデフォルメ・太めの輪郭線・明るくやさしい砂漠の色」を
 * キャラクターから文字・ボタンまでそろえるための色と描き方。
 */
(function (global) {
  'use strict';
  var DD = global.DD = global.DD || {};

  // ---- 色 ----
  DD.COL = {
    line: '#4a2d1a',        // 輪郭線（真っ黒ではなくこげ茶）
    ink: '#4a2d1a',
    cream: '#fff6e2',
    sand: '#f3cf8e',
    sandDark: '#e3ae63',
    sandDeep: '#c98c4a',
    sky: '#bfe6ee',
    skyLow: '#fde8c4',
    sun: '#ffd66b',
    // 主人公
    rrBrown: '#a8743f',
    rrDark: '#5e3a1f',
    rrLight: '#ecd3a2',
    rrBelly: '#fbeccb',
    rrLeg: '#9b8b76',
    rrBeak: '#4c4540',
    rrEyePatch: '#f08a4b',
    // 獲物
    bug: '#8cc84b',
    bugDark: '#5e9a2c',
    lizard: '#eda25a',
    lizardDark: '#c9733a',
    snake: '#dcbc7e',
    snakeDark: '#9c6a3a',
    snakeRattle: '#f1e2b8',
    // UI
    accent: '#ff8a3d',
    good: '#ffcf3f',
    bad: '#ff6b5b',
    white: '#ffffff'
  };

  DD.FONT_UI = '"M PLUS Rounded 1c", "Hiragino Maru Gothic ProN", "Arial Rounded MT Bold", "Yu Gothic", sans-serif';
  DD.FONT_TITLE = '"Mochiy Pop One", ' + DD.FONT_UI;

  var TAU = Math.PI * 2;

  DD.draw = {
    LW: 4, // キャラクターの輪郭線の太さ（ゲーム内の長さ）

    ellipse: function (ctx, x, y, rx, ry, rot) {
      ctx.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot || 0, 0, TAU);
    },

    roundRect: function (ctx, x, y, w, h, r) {
      r = Math.min(r, w / 2, h / 2);
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    },

    /** 塗って輪郭線を引く。path は ctx にパスを描く関数 */
    shape: function (ctx, path, fill, lw) {
      ctx.beginPath();
      path(ctx);
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (lw !== 0) {
        ctx.lineWidth = lw || DD.draw.LW;
        ctx.strokeStyle = DD.COL.line;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.stroke();
      }
    },

    oval: function (ctx, x, y, rx, ry, rot, fill, lw) {
      DD.draw.shape(ctx, function (c) { DD.draw.ellipse(c, x, y, rx, ry, rot); }, fill, lw);
    },

    /** 大きめのかわいい目（白目＋黒目＋ハイライト） */
    eye: function (ctx, x, y, r, lookX, lookY, blink) {
      var D = DD.draw;
      if (blink) {
        ctx.beginPath();
        ctx.moveTo(x - r, y);
        ctx.quadraticCurveTo(x, y + r * 0.6, x + r, y);
        ctx.lineWidth = D.LW * 0.8;
        ctx.strokeStyle = DD.COL.line;
        ctx.lineCap = 'round';
        ctx.stroke();
        return;
      }
      D.oval(ctx, x, y, r, r * 1.1, 0, DD.COL.white, D.LW * 0.75);
      var px = x + (lookX || 0) * r * 0.3, py = y + (lookY || 0) * r * 0.3;
      ctx.beginPath(); D.ellipse(ctx, px, py, r * 0.62, r * 0.72, 0);
      ctx.fillStyle = DD.COL.line; ctx.fill();
      ctx.beginPath(); D.ellipse(ctx, px + r * 0.22, py - r * 0.28, r * 0.24, r * 0.24, 0);
      ctx.fillStyle = DD.COL.white; ctx.fill();
    },

    /** ほっぺ */
    blush: function (ctx, x, y, r) {
      ctx.beginPath(); DD.draw.ellipse(ctx, x, y, r, r * 0.6, 0);
      ctx.fillStyle = 'rgba(255, 130, 110, 0.45)'; ctx.fill();
    },

    /** 輪郭付きの文字。o = { size, fill, line, lw, align, baseline, font, weight } */
    text: function (ctx, str, x, y, o) {
      o = o || {};
      var size = o.size || 24;
      if (o.maxW) {
        // 横幅に収まらないときは文字を小さくする
        var w = DD.draw.measure(ctx, str, size, o.font, o.weight);
        if (w > o.maxW) size *= o.maxW / w;
      }
      ctx.font = (o.weight || '800') + ' ' + size + 'px ' + (o.font || DD.FONT_UI);
      ctx.textAlign = o.align || 'center';
      ctx.textBaseline = o.baseline || 'middle';
      ctx.lineJoin = 'round';
      if (o.lw !== 0) {
        ctx.lineWidth = o.lw ? o.lw * size / (o.size || 24) : Math.max(3, size * 0.22);
        ctx.strokeStyle = o.line || DD.COL.line;
        ctx.strokeText(str, x, y);
      }
      ctx.fillStyle = o.fill || DD.COL.white;
      ctx.fillText(str, x, y);
    },

    measure: function (ctx, str, size, font, weight) {
      ctx.font = (weight || '800') + ' ' + size + 'px ' + (font || DD.FONT_UI);
      return ctx.measureText(str).width;
    },

    /** ぷっくりしたボタン。b = { x, y, w, h }、pressed で少し沈む */
    button: function (ctx, b, label, o) {
      o = o || {};
      var D = DD.draw, lw = 4;
      var depth = 6, sink = o.pressed ? depth - 2 : 0;
      // 下の影（厚み）
      D.shape(ctx, function (c) { D.roundRect(c, b.x, b.y + depth, b.w, b.h, b.h * 0.4); }, o.shade || '#c85e23', lw);
      D.shape(ctx, function (c) { D.roundRect(c, b.x, b.y + sink, b.w, b.h, b.h * 0.4); }, o.fill || DD.COL.accent, lw);
      // つや
      ctx.beginPath();
      D.roundRect(ctx, b.x + b.h * 0.3, b.y + sink + b.h * 0.14, b.w - b.h * 0.6, b.h * 0.2, b.h * 0.1);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fill();
      D.text(ctx, label, b.x + b.w / 2, b.y + sink + b.h * 0.53, { size: o.size || b.h * 0.42, fill: DD.COL.white });
    },

    /** 星形（食べたときのキラキラなど） */
    star: function (ctx, x, y, r, rot, fill, lw) {
      DD.draw.shape(ctx, function (c) {
        for (var i = 0; i < 10; i++) {
          var a = rot + i * Math.PI / 5 - Math.PI / 2;
          var rr = i % 2 ? r * 0.5 : r;
          if (i === 0) c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
          else c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
        }
        c.closePath();
      }, fill, lw);
    }
  };

  // ---- 小さな道具 ----
  DD.util = {
    clamp: function (v, a, b) { return v < a ? a : v > b ? b : v; },
    lerp: function (a, b, t) { return a + (b - a) * t; },
    rand: function (a, b) { return a + Math.random() * (b - a); },
    pick: function (arr) { return arr[(Math.random() * arr.length) | 0]; },
    /** 決まった番号から毎回同じ乱数（地面の小石などに使う） */
    hash: function (n) {
      var x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
      return x - Math.floor(x);
    },
    easeOutBack: function (t) {
      var c1 = 1.70158, c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }
  };
})(window);
