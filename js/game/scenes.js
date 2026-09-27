/*
 * DUST DASH 画面の流れ：タイトル → プレイ → 結果 → もう一度
 * UI は「UI座標」で描く（画面の大きさに合わせて拡大縮小される座標）。
 */
(function (global) {
  'use strict';
  var DD = global.DD = global.DD || {};
  var COL = DD.COL, D = DD.draw, U = DD.util;

  function T(key, params) { return DD.app.i18n.t(key, params); }

  /** UI座標に切り替える */
  function uiSpace(ctx, app) {
    ctx.setTransform(app.dpr * app.ui.u, 0, 0, app.dpr * app.ui.u, 0, 0);
  }

  /** UI座標の四角を、タップ判定用の画面座標に直す */
  function toCss(app, r) {
    var u = app.ui.u;
    return { x: r.x * u, y: r.y * u, w: r.w * u, h: r.h * u };
  }

  // ------------------------------------------------------------
  // タイトル
  // ------------------------------------------------------------
  var Title = {
    enter: function (app) {
      this.demo = new DD.Game({ demo: true });
      this.t = 0;
      app.input.setButtons([]);
    },
    update: function (app, dt) {
      this.t += dt;
      this.demo.update(dt, app.W, app.H);
    },
    render: function (app, ctx) {
      this.demo.render(ctx, app.dpr);
      uiSpace(ctx, app);
      var ui = app.ui, cx = ui.w / 2;
      var groundUi = this.demo.cam.groundY / ui.u;

      // タイトル名（ぽよんと出てくる）
      var k = U.clamp(this.t / 0.6, 0, 1);
      var s = U.easeOutBack(k);
      var size = Math.min(ui.w * 0.17, 92);
      var ty = Math.max(ui.safeTop + size * 0.9, groundUi * 0.24);
      ctx.save();
      ctx.translate(cx, ty);
      ctx.scale(s, s);
      ctx.rotate(-0.04);
      var tw = ui.w - 40;
      D.text(ctx, 'DUST DASH', 0, size * 0.08, { size: size, font: DD.FONT_TITLE, weight: '400', fill: COL.sandDeep, lw: size * 0.26, maxW: tw });
      D.text(ctx, 'DUST DASH', 0, 0, { size: size, font: DD.FONT_TITLE, weight: '400', fill: COL.good, lw: size * 0.2, maxW: tw });
      ctx.restore();

      var subSize = Math.min(ui.w * 0.075, 34);
      D.text(ctx, T('subtitle'), cx, ty + size * 0.85, { size: subSize, fill: COL.cream, maxW: ui.w - 40 });

      // タップでスタート（ゆっくり脈打つ）
      var pulse = 1 + Math.sin(this.t * 5) * 0.06;
      var startY = U.lerp(ty + size * 0.85, groundUi - 110, 0.55);
      ctx.save();
      ctx.translate(cx, startY);
      ctx.scale(pulse, pulse);
      D.text(ctx, T('tapToStart'), 0, 0, { size: Math.min(ui.w * 0.08, 36), fill: COL.white, maxW: ui.w - 40 });
      ctx.restore();
      if (!app.input.isTouch) {
        D.text(ctx, T('keyHint'), cx, startY + 38, { size: 18, fill: COL.cream, lw: 4 });
      }

      D.text(ctx, T('credit'), cx, ui.h - ui.safeBottom - 22, { size: 18, fill: COL.cream, lw: 4 });
    },
    press: function (app) {
      if (this.t < 0.3) return;
      app.go('play');
    }
  };

  // ------------------------------------------------------------
  // プレイ
  // ------------------------------------------------------------
  var Play = {
    enter: function (app) {
      var self = this;
      this.game = new DD.Game();
      this.game.onOver = function (res) { app.go('result', { game: self.game, result: res }); };
      this.hint = { jumped: false, firstEatT: null };
      this.comboPop = 0;
      app.input.setButtons([]);
    },
    update: function (app, dt) {
      var g = this.game;
      g.update(dt, app.W, app.H);
      for (var i = 0; i < g.events.length; i++) {
        var e = g.events[i];
        if (e === 'jump') this.hint.jumped = true;
        if (e === 'combo') this.comboPop = 1;
      }
      g.events.length = 0;
      if (g.eaten > 0 && this.hint.firstEatT === null) this.hint.firstEatT = g.time;
      if (this.comboPop > 0) this.comboPop = Math.max(0, this.comboPop - dt * 5);
    },
    render: function (app, ctx) {
      var g = this.game;
      g.render(ctx, app.dpr);
      uiSpace(ctx, app);
      drawHud(app, ctx, g, this.comboPop);
      this.drawHints(app, ctx, g);
    },
    drawHints: function (app, ctx, g) {
      var ui = app.ui, h = this.hint, text = null;
      if (!h.jumped && g.time < 6) text = T('hintJump');
      else if (g.eaten === 0 && g.time < 12) text = T('hintStomp');
      else if (h.firstEatT !== null && g.maxCombo < 2 && g.time - h.firstEatT < 4) text = T('hintCombo');
      if (!text || g.over) return;
      var size = Math.min(ui.w * 0.06, 28);
      var y = Math.max(ui.safeTop + 130, g.cam.groundY / ui.u * 0.42);
      var pulse = 1 + Math.sin(g.time * 6) * 0.04;
      ctx.save();
      ctx.translate(ui.w / 2, y);
      ctx.scale(pulse, pulse);
      D.text(ctx, text, 0, 0, { size: size, fill: COL.white, maxW: ui.w - 32 });
      ctx.restore();
    },
    press: function (app) { this.game.press(); }
  };

  /** 画面上の速度・距離 */
  function drawHud(app, ctx, g, comboPop) {
    var ui = app.ui;
    var x = ui.safeLeft + 18, y = ui.safeTop + 16;
    var v = Math.round(g.speed);
    var color = COL.white;
    if (v >= 150) color = COL.accent;
    else if (v >= 100) color = COL.good;
    if (v < 20 && !g.over && Math.floor(g.time * 6) % 2 === 0) color = COL.bad;

    // 速いほど数字がふるえる
    var jit = g.speedN() * 1.5;
    var jx = U.rand(-jit, jit), jy = U.rand(-jit, jit);
    D.text(ctx, String(v), x + 118 + jx, y + 38 + jy, { size: 64, fill: color, align: 'right' });
    D.text(ctx, 'km/h', x + 124, y + 52, { size: 22, fill: COL.white, align: 'left', lw: 6 });

    // コンボ中は速度の下に大きく出す
    if (g.combo >= 2) {
      var cs = 1 + (comboPop || 0) * 0.35;
      var hot = Math.min(1, (g.combo - 1) / 6);
      ctx.save();
      ctx.translate(x + 4, y + 100);
      ctx.scale(cs, cs);
      ctx.rotate(-0.05);
      D.text(ctx, g.combo + ' ' + T('comboHud'), 0, 0, { size: 30 + hot * 8, fill: g.combo >= 5 ? COL.accent : COL.good, align: 'left' });
      ctx.restore();
    }

    var m = g.meters();
    D.text(ctx, m + ' m', ui.w - ui.safeRight - 18, y + 30, { size: 28, fill: COL.white, align: 'right', lw: 7 });
  }

  // ------------------------------------------------------------
  // 結果
  // ------------------------------------------------------------
  var Result = {
    enter: function (app, arg) {
      this.game = arg.game;
      this.res = arg.result;
      this.t = 0;
      this.pressed = false;
      var self = this;
      this.btn = { x: 0, y: 0, w: 0, h: 0, onPress: function () { self.retry(app); } };
      app.input.setButtons([this.btn]);
    },
    retry: function (app) {
      if (this.t < 0.45) return; // 押しっぱなしの誤タップ防止
      app.go('play');
    },
    update: function (app, dt) {
      this.t += dt;
      this.game.update(dt, app.W, app.H);
      this.game.events.length = 0;
    },
    render: function (app, ctx) {
      this.game.render(ctx, app.dpr);
      uiSpace(ctx, app);
      var ui = app.ui, res = this.res;

      ctx.fillStyle = 'rgba(74, 45, 26, ' + (U.clamp(this.t / 0.3, 0, 1) * 0.45).toFixed(3) + ')';
      ctx.fillRect(0, 0, ui.w, ui.h);

      var pw = Math.min(ui.w - 36, 380), ph = 312;
      var btnH = 72, gap = 26;
      var total = ph + gap + btnH;
      var px = (ui.w - pw) / 2;
      var py = U.clamp((ui.h - total) / 2, ui.safeTop + 40, ui.h);
      var k = U.clamp(this.t / 0.4, 0, 1);
      var s = U.easeOutBack(k);

      ctx.save();
      ctx.translate(ui.w / 2, py + ph / 2);
      ctx.scale(s, s);
      ctx.translate(-ui.w / 2, -(py + ph / 2));

      // カード
      D.shape(ctx, function (c) { D.roundRect(c, px, py + 6, pw, ph, 30); }, COL.sandDeep, 5);
      D.shape(ctx, function (c) { D.roundRect(c, px, py, pw, ph, 30); }, COL.cream, 5);

      // リボン見出し
      var rw = Math.min(pw * 0.78, 280), rh = 56;
      D.shape(ctx, function (c) { D.roundRect(c, ui.w / 2 - rw / 2, py - rh / 2, rw, rh, 20); }, COL.bad, 5);
      D.text(ctx, T('caught'), ui.w / 2, py + 2, { size: 30, fill: COL.white });

      // 最高時速（いちばん大きく）
      var cx = ui.w / 2;
      D.text(ctx, T('topSpeed'), cx, py + 50, { size: 22, fill: COL.sandDeep, lw: 0 });
      var count = Math.round(res.maxSpeed * U.clamp((this.t - 0.25) / 0.6, 0, 1));
      var big = Math.min(pw * 0.3, 108);
      var numW = D.measure(ctx, String(count), big);
      var unitW = D.measure(ctx, 'km/h', 30);
      var startX = cx - (numW + 10 + unitW) / 2;
      D.text(ctx, String(count), startX, py + 136, { size: big, fill: COL.accent, align: 'left', lw: big * 0.16 });
      D.text(ctx, 'km/h', startX + numW + 10, py + 160, { size: 30, fill: COL.ink, align: 'left', lw: 0 });

      // 距離・ヘビ・最大コンボ
      var rowY = py + 240, colW = pw / 3;
      var c1 = px + colW / 2, c2 = px + colW * 1.5, c3 = px + colW * 2.5;
      var lab = { size: 17, fill: COL.sandDeep, lw: 0, maxW: colW - 12 };
      var val = { size: 32, fill: COL.ink, lw: 0, maxW: colW - 14 };
      D.text(ctx, T('distance'), c1, rowY - 22, lab);
      D.text(ctx, res.distance + ' m', c1, rowY + 14, val);
      D.text(ctx, T('snakes'), c2, rowY - 22, lab);
      ctx.save();
      ctx.translate(c2 - 22, rowY + 30);
      ctx.scale(0.42, 0.42);
      DD.KINDS.snake.draw(ctx, { x: 0, y: 0, t: this.t, strike: 0 });
      ctx.restore();
      D.text(ctx, '×' + res.snakes, c2 + 20, rowY + 14, { size: 32, fill: COL.ink, lw: 0 });
      D.text(ctx, T('maxCombo'), c3, rowY - 22, lab);
      D.text(ctx, String(res.maxCombo), c3, rowY + 14, val);
      // 区切り線
      ctx.strokeStyle = 'rgba(74, 45, 26, 0.2)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(px + colW, rowY - 34); ctx.lineTo(px + colW, rowY + 38);
      ctx.moveTo(px + colW * 2, rowY - 34); ctx.lineTo(px + colW * 2, rowY + 38);
      ctx.stroke();
      ctx.restore();

      // もう一度ボタン
      var bw = Math.min(pw * 0.8, 280);
      var b = { x: (ui.w - bw) / 2, y: py + ph + gap, w: bw, h: btnH };
      var bk = U.clamp((this.t - 0.3) / 0.3, 0, 1);
      if (bk > 0) {
        ctx.save();
        ctx.globalAlpha = bk;
        D.button(ctx, b, T('retry'), { size: 32 });
        ctx.restore();
      }
      var css = toCss(app, b);
      this.btn.x = css.x; this.btn.y = css.y; this.btn.w = css.w; this.btn.h = css.h + 6;
    },
    press: function (app, p) {
      // キーボード（スペース・Enter）でももう一度
      if (p.x === null) this.retry(app);
    }
  };

  DD.Scenes = { title: Title, play: Play, result: Result };
})(window);
