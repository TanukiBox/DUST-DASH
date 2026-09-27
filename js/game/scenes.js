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

  /** ボタンのタップ判定を、描いた場所に合わせる */
  function place(app, btn, r) {
    var c = toCss(app, r);
    btn.x = c.x; btn.y = c.y; btn.w = c.w; btn.h = c.h + 6;
  }

  /** 持っているコイン（左上） */
  function drawWallet(app, ctx, x, y, n) {
    DD.drawCoinIcon(ctx, x + 14, y, 14);
    D.text(ctx, String(n), x + 34, y + 1, { size: 26, fill: COL.good, align: 'left', lw: 7 });
  }

  /** 強化のアイコン */
  function drawUpgradeIcon(ctx, id, x, y, r) {
    D.oval(ctx, x, y, r, r, 0, COL.cream, 4);
    ctx.save();
    ctx.translate(x, y);
    var k = r / 24;
    ctx.scale(k, k);
    if (id === 'stamina') {
      D.shape(ctx, function (c) { c.moveTo(4, -15); c.lineTo(-9, 3); c.lineTo(-1, 3); c.lineTo(-5, 15); c.lineTo(9, -4); c.lineTo(1, -4); c.closePath(); }, COL.good, 3);
    } else if (id === 'dash') {
      D.shape(ctx, function (c) { c.moveTo(-12, -10); c.lineTo(-2, 0); c.lineTo(-12, 10); c.lineTo(-6, 10); c.lineTo(4, 0); c.lineTo(-6, -10); c.closePath(); }, COL.accent, 3);
      D.shape(ctx, function (c) { c.moveTo(0, -10); c.lineTo(10, 0); c.lineTo(0, 10); c.lineTo(6, 10); c.lineTo(16, 0); c.lineTo(6, -10); c.closePath(); }, COL.accent, 3);
    } else if (id === 'ukemi') {
      D.shape(ctx, function (c) { c.moveTo(0, -15); c.quadraticCurveTo(10, -10, 13, -11); c.quadraticCurveTo(13, 8, 0, 16); c.quadraticCurveTo(-13, 8, -13, -11); c.quadraticCurveTo(-10, -10, 0, -15); c.closePath(); }, '#7fb8e8', 3);
    } else if (id === 'glutton') {
      ctx.scale(0.62, 0.62);
      DD.KINDS.bug.draw(ctx, { x: 4, y: 14, t: 0, air: false });
    } else {
      DD.drawCoinIcon(ctx, 0, 0, 13);
    }
    ctx.restore();
  }

  /** 強化の効き目を、今の値としてゲームに渡す形にする */
  function upgradesFor(app) {
    var pr = app.progress, out = {};
    for (var i = 0; i < DD.UPGRADES.length; i++) out[DD.UPGRADES[i].id] = pr.effect(DD.UPGRADES[i].id);
    return out;
  }

  /** 買える強化があるか（ボタンに印を出す） */
  function canBuyAny(app) {
    for (var i = 0; i < DD.UPGRADES.length; i++) if (app.progress.canBuy(DD.UPGRADES[i].id)) return true;
    return false;
  }

  // ------------------------------------------------------------
  // タイトル
  // ------------------------------------------------------------
  var Title = {
    enter: function (app) {
      this.demo = app.demoGame = app.demoGame || new DD.Game({ demo: true });
      this.t = 0;
      var self = this;
      this.shopBtn = { x: 0, y: 0, w: 0, h: 0, onPress: function () { app.sfx.play('ui'); app.go('shop', { from: 'title' }); } };
      app.setButtons([this.shopBtn]);
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
      if (app.input.finePointer && !app.input.isTouch) {
        D.text(ctx, T('keyHint'), cx, startY + 38, { size: 18, fill: COL.cream, lw: 4 });
      }

      // ベスト記録
      var best = app.progress.best;
      if (best.speed > 0) {
        D.text(ctx, T('best') + ' ' + best.speed + ' km/h', cx, ty + size * 0.85 + 38, { size: 20, fill: COL.white, lw: 6 });
      }

      // 持っているコイン（左上）
      drawWallet(app, ctx, ui.safeLeft + 14, ui.safeTop + 35, app.progress.coins);

      // 強化ボタン（下）
      var bw = Math.min(ui.w * 0.5, 220), bh = 58;
      var b = { x: cx - bw / 2, y: ui.h - ui.safeBottom - 60 - bh, w: bw, h: bh };
      D.button(ctx, b, T('shop'), { size: 26, fill: '#6cc06b', shade: '#3f8a45' });
      if (canBuyAny(app)) {
        var bounce = Math.abs(Math.sin(this.t * 4)) * 4;
        D.oval(ctx, b.x + b.w - 8, b.y + 4 - bounce, 13, 13, 0, COL.bad, 3);
        D.text(ctx, '!', b.x + b.w - 8, b.y + 5 - bounce, { size: 18, fill: COL.white, lw: 0 });
      }
      place(app, this.shopBtn, b);

      D.text(ctx, T('credit'), cx, ui.h - ui.safeBottom - 22, { size: 18, fill: COL.cream, lw: 4 });
    },
    press: function (app) {
      if (this.t < 0.3) return;
      app.sfx.play('ui');
      app.go('play');
    }
  };

  // ------------------------------------------------------------
  // プレイ
  // ------------------------------------------------------------
  var Play = {
    enter: function (app) {
      var self = this;
      this.game = new DD.Game({ up: upgradesFor(app) });
      this.game.onOver = function (res) { app.go('result', { game: self.game, result: res }); };
      this.hint = { jumped: false, firstEatT: null };
      this.comboPop = 0;
      this.banner = null;
      this.feverBanner = this.game.fever > 0 ? { text: T('startDash'), t: 0 } : null;
      app.setButtons([]);
    },
    update: function (app, dt) {
      var g = this.game;
      g.update(dt, app.W, app.H);
      var played = {};
      for (var i = 0; i < g.events.length; i++) {
        var e = g.events[i];
        if (e === 'jump') this.hint.jumped = true;
        if (e === 'combo') this.comboPop = 1;
        if (e === 'milestone') this.banner = { n: g.milestone, t: 0 };
        if (e === 'fever') this.feverBanner = { text: T('fever'), t: 0 };
        if (e === 'combo' || played[e]) continue; // 同じ音を1フレームに何度も鳴らさない
        played[e] = true;
        app.sfx.play(e, e === 'coin' ? g.coinSfx : g.combo);
      }
      g.events.length = 0;
      if (this.feverBanner) { this.feverBanner.t += dt; if (this.feverBanner.t > 1.4) this.feverBanner = null; }
      if (!app.seenHints) app.seenHints = {};
      if (!app.seenHints.fever && g.feverGauge > 45) { app.seenHints.fever = true; this.hint.special = { text: T('hintFever'), until: g.time + 2.5 }; }
      if (g.eaten > 0 && this.hint.firstEatT === null) this.hint.firstEatT = g.time;
      if (this.comboPop > 0) this.comboPop = Math.max(0, this.comboPop - dt * 5);
      if (this.banner) { this.banner.t += dt; if (this.banner.t > 2) this.banner = null; }
      this.watchNewObstacles(app, g);
    },
    render: function (app, ctx) {
      var g = this.game;
      g.render(ctx, app.dpr);
      uiSpace(ctx, app);
      drawHud(app, ctx, g, this.comboPop);
      this.drawHints(app, ctx, g);
      this.drawBanner(app, ctx);
      this.drawFeverBanner(app, ctx);
    },
    /** 「フィーバー！」：虹色でぽよんと出る */
    drawFeverBanner: function (app, ctx) {
      var b = this.feverBanner;
      if (!b) return;
      var ui = app.ui;
      var k = b.t < 0.25 ? U.easeOutBack(b.t / 0.25) : 1;
      var a = b.t > 1.1 ? 1 - (b.t - 1.1) / 0.3 : 1;
      ctx.save();
      ctx.globalAlpha = Math.max(0, a);
      ctx.translate(ui.w / 2, ui.safeTop + 230);
      ctx.scale(k * (1 + Math.sin(b.t * 20) * 0.03), k);
      ctx.rotate(-0.06);
      var hue = (b.t * 400) % 360;
      D.text(ctx, b.text, 0, 0, { size: 56, fill: 'hsl(' + hue.toFixed(0) + ', 95%, 62%)', maxW: ui.w - 30 });
      ctx.restore();
    },
    /** 「○m 突破！」：先に進んだことと、手ごわくなることを知らせる */
    drawBanner: function (app, ctx) {
      var b = this.banner;
      if (!b || this.game.over) return;
      var ui = app.ui;
      var k = b.t < 0.3 ? U.easeOutBack(b.t / 0.3) : 1;
      var a = b.t > 1.6 ? 1 - (b.t - 1.6) / 0.4 : 1;
      ctx.save();
      ctx.globalAlpha = Math.max(0, a);
      ctx.translate(ui.w / 2, ui.safeTop + 215);
      ctx.scale(k, k);
      ctx.rotate(-0.04);
      D.text(ctx, T('milestone', { n: b.n }), 0, 0, { size: 44, fill: COL.good, maxW: ui.w - 40 });
      D.text(ctx, T('harder'), 0, 40, { size: 20, fill: COL.cream, lw: 6, maxW: ui.w - 40 });
      ctx.restore();
    },
    /** 初めて見る種類の障害物が画面に入ったら、よけ方を1回だけ教える */
    watchNewObstacles: function (app, g) {
      var seen = app.seenHints = app.seenHints || {};
      var right = g.cam.x + g.cam.viewW * 0.92;
      var key = null;
      for (var i = 0; i < g.items.length && !key; i++) {
        var it = g.items[i];
        if (it.x > right || it.dead) continue;
        if (it.type === 'giantCactus' && !seen.tall) key = 'tall';
        if (it.type === 'vulture' && !seen.duck) key = 'duck';
      }
      for (i = 0; i < g.holes.length && !key; i++) {
        if (g.holes[i].wide && g.holes[i].x0 < right && !seen.tall) key = 'tall';
      }
      if (key) {
        seen[key] = true;
        this.hint.special = { text: T(key === 'tall' ? 'hintTall' : 'hintDuck'), until: g.time + 2.2 };
      }
    },
    drawHints: function (app, ctx, g) {
      var ui = app.ui, h = this.hint, text = null;
      if (this.banner || this.feverBanner) return; // 「○m 突破！」と重ならないように
      if (h.special && g.time < h.special.until) text = h.special.text;
      else if (!h.jumped && g.time < 6) text = T('hintJump');
      else if (g.eaten === 0 && g.time < 12) text = T('hintStomp');
      else if (h.firstEatT !== null && g.maxCombo < 2 && g.time - h.firstEatT < 4) text = T('hintCombo');
      if (!text || g.over) return;
      var size = Math.min(ui.w * 0.06, 28);
      var y = Math.max(ui.safeTop + 170, g.cam.groundY / ui.u * 0.42);
      var pulse = 1 + Math.sin(g.time * 6) * 0.04;
      ctx.save();
      ctx.translate(ui.w / 2, y);
      ctx.scale(pulse, pulse);
      D.text(ctx, text, 0, 0, { size: size, fill: COL.white, maxW: ui.w - 32 });
      ctx.restore();
    },
    press: function (app) { this.game.press(); }
  };

  /** 画面上のスタミナ・速度・距離 */
  function drawHud(app, ctx, g, comboPop) {
    var ui = app.ui, mr = app.muteRect();
    var x = ui.safeLeft + 16, y = ui.safeTop + 12;

    // ---- スタミナゲージ（ミュートボタンの左まで）----
    var bx = x + 30, bw = mr.x - 16 - bx, bh = 24, by = mr.y + (mr.h - bh) / 2;
    var k = U.clamp(g.stamina / DD.CFG.STAMINA_MAX, 0, 1);
    var low = k < DD.CFG.FATIGUE_AT / DD.CFG.STAMINA_MAX;
    var blink = low && !g.over && Math.floor(g.time * 5) % 2 === 0;
    var fill = k > 0.5 ? '#8fd14f' : k > 0.25 ? COL.good : COL.bad;
    D.shape(ctx, function (c) { D.roundRect(c, bx, by + 3, bw, bh, bh / 2); }, COL.sandDeep, 4);
    D.shape(ctx, function (c) { D.roundRect(c, bx, by, bw, bh, bh / 2); }, '#6b4a33', 4);
    if (k > 0.001) {
      var fw = Math.max(bh, bw * k);
      ctx.save();
      ctx.beginPath(); D.roundRect(ctx, bx + 3, by + 3, fw - 6, bh - 6, (bh - 6) / 2); ctx.clip();
      ctx.fillStyle = blink ? '#ffd0c8' : fill;
      ctx.fillRect(bx, by, fw, bh);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(bx, by + 4, fw, 5);
      ctx.restore();
    }
    // 回復したら白く、減ったら赤く光る
    if (g.staminaFlash !== 0) {
      ctx.save();
      ctx.globalAlpha = Math.abs(g.staminaFlash) * 0.7;
      ctx.beginPath(); D.roundRect(ctx, bx, by, bw, bh, bh / 2);
      ctx.fillStyle = g.staminaFlash > 0 ? '#ffffff' : COL.bad; ctx.fill();
      ctx.restore();
    }
    // いなずまのアイコン
    var ix = x + 14, iy = by + bh / 2, pulse = low ? 1 + Math.sin(g.time * 14) * 0.08 : 1;
    ctx.save();
    ctx.translate(ix, iy); ctx.scale(pulse, pulse);
    D.oval(ctx, 0, 0, 17, 17, 0, COL.cream, 4);
    D.shape(ctx, function (c) {
      c.moveTo(3, -11); c.lineTo(-7, 2); c.lineTo(-1, 2); c.lineTo(-4, 11); c.lineTo(7, -3); c.lineTo(1, -3); c.closePath();
    }, COL.good, 2.5);
    ctx.restore();

    // ---- フィーバーゲージ（スタミナの下の細いゲージ）----
    var fy = by + bh + 8, fh = 11;
    D.shape(ctx, function (c) { D.roundRect(c, bx, fy, bw, fh, fh / 2); }, '#6b4a33', 3);
    var fk = g.fever > 0 ? g.fever / (g.feverKind === 'dash' ? g.up.dash : DD.CFG.FEVER_TIME) : g.feverGauge / DD.CFG.FEVER_MAX;
    if (fk > 0.001) {
      ctx.save();
      ctx.beginPath(); D.roundRect(ctx, bx + 2, fy + 2, Math.max(fh, (bw - 4) * fk), fh - 4, (fh - 4) / 2); ctx.clip();
      if (g.fever > 0 || fk > 0.95) {
        var gr = ctx.createLinearGradient(bx, 0, bx + bw, 0);
        for (var hi = 0; hi <= 6; hi++) gr.addColorStop(hi / 6, 'hsl(' + ((hi * 60 + g.time * 300) % 360).toFixed(0) + ', 90%, 62%)');
        ctx.fillStyle = gr;
      } else {
        ctx.fillStyle = '#ff9ec4';
      }
      ctx.fillRect(bx, fy, bw, fh);
      ctx.restore();
    }

    // ---- 速さ ----
    var sy = fy + fh + 6;
    var v = Math.round(g.speed);
    var color = COL.white;
    if (v >= 150) color = COL.accent;
    else if (v >= 100) color = COL.good;
    var jit = g.speedN() * 1.5;
    var jx = U.rand(-jit, jit), jy = U.rand(-jit, jit);
    D.text(ctx, String(v), x + 118 + jx, sy + 34 + jy, { size: 60, fill: color, align: 'right' });
    D.text(ctx, 'km/h', x + 124, sy + 48, { size: 22, fill: COL.white, align: 'left', lw: 6 });

    // コンボ中は速度の下に大きく出す
    if (g.combo >= 2) {
      var cs = 1 + (comboPop || 0) * 0.35;
      var hot = Math.min(1, (g.combo - 1) / 6);
      ctx.save();
      ctx.translate(x + 4, sy + 92);
      ctx.scale(cs, cs);
      ctx.rotate(-0.05);
      D.text(ctx, g.combo + ' ' + T('comboHud'), 0, 0, { size: 30 + hot * 8, fill: g.combo >= 5 ? COL.accent : COL.good, align: 'left' });
      ctx.restore();
    }

    // ---- 距離とコイン（右）----
    var rx = ui.w - ui.safeRight - 18;
    D.text(ctx, g.meters() + ' m', rx, sy + 26, { size: 28, fill: COL.white, align: 'right', lw: 7 });
    var cn = String(Math.round(g.coinsPicked));
    var cw = D.measure(ctx, cn, 26);
    var cp = 1 + g.coinPop * 0.25;
    ctx.save();
    ctx.translate(rx - cw - 18, sy + 64); ctx.scale(cp, cp);
    DD.drawCoinIcon(ctx, 0, 0, 12);
    ctx.restore();
    D.text(ctx, cn, rx, sy + 65, { size: 26, fill: COL.good, align: 'right', lw: 7 });
    // 速いほどコインの価値が上がる
    var mul = DD.coinValue(g.speed) * (g.fever > 0 ? 2 : 1);
    if (mul > 1) D.text(ctx, '×' + mul, rx, sy + 94, { size: 22, fill: COL.accent, align: 'right', lw: 6 });
  }

  // ------------------------------------------------------------
  // 結果
  // ------------------------------------------------------------
  var Result = {
    enter: function (app, arg) {
      this.game = arg.game;
      this.res = arg.result;
      this.t = 0;
      // コインと記録を保存（L セーブ）
      this.rec = app.progress.finishRun(this.res);
      var self = this;
      this.btn = { x: 0, y: 0, w: 0, h: 0, onPress: function () { self.retry(app); } };
      this.shopBtn = { x: 0, y: 0, w: 0, h: 0, onPress: function () {
        if (self.t < 0.45) return;
        app.sfx.play('ui'); app.go('shop', { from: 'result' });
      } };
      app.setButtons([this.btn, this.shopBtn]);
    },
    retry: function (app) {
      if (this.t < 0.45) return; // 押しっぱなしの誤タップ防止
      app.sfx.play('ui');
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

      var pw = Math.min(ui.w - 36, 380), ph = 392;
      var btnH = 72, gap = 26;
      var total = ph + gap + btnH;
      var px = (ui.w - pw) / 2;
      var py = U.clamp((ui.h - total) / 2, ui.safeTop + 40, ui.h);
      // 画面が低いとき（スマホ横など）は全体を縮める
      var fit = Math.min(1, (ui.h - ui.safeTop - ui.safeBottom - 40) / (total + 40));
      ctx.save();
      ctx.translate(ui.w / 2, ui.safeTop + 20);
      ctx.scale(fit, fit);
      ctx.translate(-ui.w / 2, -(ui.safeTop + 20));
      if (fit < 1) py = ui.safeTop + 50;
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
      if (this.rec.speed && this.t > 0.9) {
        // 新記録のはんこ
        var ns = U.easeOutBack(U.clamp((this.t - 0.9) / 0.3, 0, 1));
        ctx.save();
        ctx.translate(px + pw - 62, py + 78); ctx.rotate(0.25); ctx.scale(ns, ns);
        D.shape(ctx, function (c) { D.roundRect(c, -52, -17, 104, 34, 12); }, COL.bad, 4);
        D.text(ctx, T('newRecord'), 0, 1, { size: 18, fill: COL.white, lw: 0, maxW: 94 });
        ctx.restore();
      }

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

      // もらったコイン（数え上げ）
      var coinY = py + 330;
      ctx.strokeStyle = 'rgba(74, 45, 26, 0.2)';
      ctx.beginPath(); ctx.moveTo(px + 24, coinY - 44); ctx.lineTo(px + pw - 24, coinY - 44); ctx.stroke();
      var ck = U.clamp((this.t - 0.8) / 0.8, 0, 1);
      var got = Math.round(res.coins * ck);
      DD.drawCoinIcon(ctx, px + 40, coinY - 6, 16);
      D.text(ctx, '+' + got, px + 64, coinY - 5, { size: 34, fill: '#e8a326', align: 'left', lw: 0 });
      var detail = T('picked') + ' ' + res.coinsPicked + '  ' + T('distBonus') + ' ' + res.coinsDist;
      if (this.game.up.luck > 1) detail += '  ' + T('luckBonus') + ' ×' + this.game.up.luck.toFixed(2);
      D.text(ctx, detail, px + pw - 22, coinY - 5, { size: 14, fill: COL.sandDeep, lw: 0, align: 'right', maxW: pw * 0.5 });
      D.text(ctx, T('coinsEarned') + ' ' + app.progress.coins, px + pw - 22, coinY + 17, { size: 14, fill: COL.sandDeep, lw: 0, align: 'right' });
      ctx.restore();

      // もう一度ボタン＋強化ボタン
      var gapB = 12, bw2 = Math.min(pw * 0.36, 140), bw = Math.min(pw - bw2 - gapB, 230);
      var bx0 = (ui.w - (bw + gapB + bw2)) / 2;
      var b = { x: bx0, y: py + ph + gap, w: bw, h: btnH };
      var b2 = { x: bx0 + bw + gapB, y: py + ph + gap, w: bw2, h: btnH };
      var bk = U.clamp((this.t - 0.3) / 0.3, 0, 1);
      if (bk > 0) {
        ctx.save();
        ctx.globalAlpha = bk;
        D.button(ctx, b, T('retry'), { size: 30 });
        D.button(ctx, b2, T('shop'), { size: 22, fill: '#6cc06b', shade: '#3f8a45' });
        if (canBuyAny(app)) {
          D.oval(ctx, b2.x + b2.w - 6, b2.y + 4, 12, 12, 0, COL.bad, 3);
          D.text(ctx, '!', b2.x + b2.w - 6, b2.y + 5, { size: 16, fill: COL.white, lw: 0 });
        }
        ctx.restore();
      }
      ctx.restore(); // fit
      // タップ判定（縮めた分も計算に入れる）
      var map = function (r) {
        var cx0 = ui.w / 2, cy0 = ui.safeTop + 20;
        return { x: cx0 + (r.x - cx0) * fit, y: cy0 + (r.y - cy0) * fit, w: r.w * fit, h: r.h * fit };
      };
      place(app, this.btn, map(b));
      place(app, this.shopBtn, map(b2));
    },
    press: function (app, p) {
      // キーボード（スペース・Enter）でももう一度
      if (p.x === null) this.retry(app);
    }
  };

  // ------------------------------------------------------------
  // 強化（お店）
  // ------------------------------------------------------------
  var Shop = {
    enter: function (app, arg) {
      this.from = (arg && arg.from) || 'title';
      this.demo = app.demoGame = app.demoGame || new DD.Game({ demo: true });
      this.t = 0;
      this.flash = {};
      var self = this;
      this.buyBtns = DD.UPGRADES.map(function (u) {
        return { x: 0, y: 0, w: 0, h: 0, onPress: function () {
          if (app.progress.buy(u.id)) { app.sfx.play('buy'); self.flash[u.id] = 1; }
          else app.sfx.play('hurt');
        } };
      });
      this.backBtn = { x: 0, y: 0, w: 0, h: 0, onPress: function () { app.sfx.play('ui'); app.go('title'); } };
      this.startBtn = { x: 0, y: 0, w: 0, h: 0, onPress: function () { app.sfx.play('ui'); app.go('play'); } };
      app.setButtons(this.buyBtns.concat([this.backBtn, this.startBtn]));
    },
    update: function (app, dt) {
      this.t += dt;
      this.demo.update(dt, app.W, app.H);
      for (var k in this.flash) this.flash[k] = Math.max(0, this.flash[k] - dt * 2.5);
    },
    render: function (app, ctx) {
      this.demo.render(ctx, app.dpr);
      uiSpace(ctx, app);
      var ui = app.ui, pr = app.progress;
      ctx.fillStyle = 'rgba(74, 45, 26, 0.45)';
      ctx.fillRect(0, 0, ui.w, ui.h);

      var pw = Math.min(ui.w - 28, 420), rowH = 92, head = 70, foot = 100;
      var ph = head + rowH * DD.UPGRADES.length + 16;
      var total = ph + foot;
      var avail = ui.h - ui.safeTop - ui.safeBottom - 30;
      var fit = Math.min(1, avail / total);
      var px = (ui.w - pw) / 2, py = ui.safeTop + 40;
      var cx0 = ui.w / 2, cy0 = ui.safeTop + 15;
      ctx.save();
      ctx.translate(cx0, cy0); ctx.scale(fit, fit); ctx.translate(-cx0, -cy0);

      D.shape(ctx, function (c) { D.roundRect(c, px, py + 6, pw, ph, 28); }, COL.sandDeep, 5);
      D.shape(ctx, function (c) { D.roundRect(c, px, py, pw, ph, 28); }, COL.cream, 5);
      var rw = Math.min(pw * 0.6, 230), rh = 52;
      D.shape(ctx, function (c) { D.roundRect(c, ui.w / 2 - rw / 2, py - rh / 2, rw, rh, 18); }, '#6cc06b', 5);
      D.text(ctx, T('shop'), ui.w / 2, py + 1, { size: 28, fill: COL.white });
      // 持っているコイン
      DD.drawCoinIcon(ctx, px + pw / 2 - 40, py + 48, 13);
      D.text(ctx, String(pr.coins), px + pw / 2 - 20, py + 49, { size: 26, fill: '#e8a326', align: 'left', lw: 0 });

      var map = function (r) { return { x: cx0 + (r.x - cx0) * fit, y: cy0 + (r.y - cy0) * fit, w: r.w * fit, h: r.h * fit }; };
      for (var i = 0; i < DD.UPGRADES.length; i++) {
        var u = DD.UPGRADES[i], lv = pr.level(u.id), cost = pr.cost(u.id);
        var ry = py + head + i * rowH;
        if (i > 0) {
          ctx.strokeStyle = 'rgba(74, 45, 26, 0.15)'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(px + 18, ry); ctx.lineTo(px + pw - 18, ry); ctx.stroke();
        }
        var fl = this.flash[u.id] || 0;
        if (fl > 0) {
          ctx.fillStyle = 'rgba(255, 216, 74, ' + (fl * 0.5).toFixed(3) + ')';
          ctx.fillRect(px + 6, ry + 2, pw - 12, rowH - 4);
        }
        drawUpgradeIcon(ctx, u.id, px + 40, ry + rowH / 2, 24 * (1 + fl * 0.2));
        var bw = 96, bh = 50, bxx = px + pw - bw - 16;
        var textW = bxx - (px + 74) - 8;
        D.text(ctx, T('up_' + u.id), px + 74, ry + 24, { size: 21, fill: COL.ink, lw: 0, align: 'left', maxW: textW });
        D.text(ctx, T('up_' + u.id + '_d'), px + 74, ry + 48, { size: 13, fill: COL.sandDeep, lw: 0, align: 'left', maxW: textW });
        // レベルの玉
        for (var l = 0; l < DD.UPGRADE_MAX; l++) {
          D.oval(ctx, px + 82 + l * 20, ry + 70, 7, 7, 0, l < lv ? COL.good : '#e6d3b0', 2.5);
        }
        var b = { x: bxx, y: ry + (rowH - bh) / 2 - 3, w: bw, h: bh };
        if (cost === null) {
          D.button(ctx, b, T('max'), { size: 22, fill: '#b9a58a', shade: '#8a7760' });
        } else {
          var ok = pr.coins >= cost;
          D.button(ctx, b, '', { fill: ok ? COL.accent : '#c9b89c', shade: ok ? '#c85e23' : '#9c8b70' });
          DD.drawCoinIcon(ctx, b.x + 20, b.y + b.h * 0.53, 10);
          D.text(ctx, String(cost), b.x + b.w / 2 + 12, b.y + b.h * 0.55, { size: 20, fill: COL.white, maxW: b.w - 40 });
        }
        place(app, this.buyBtns[i], map(b));
      }

      // もどる・スタート
      var fy = py + ph + 22, gapB = 12;
      var sbw = Math.min(pw * 0.58, 230), bbw = Math.min(pw - sbw - gapB, 150);
      var bx0 = (ui.w - (sbw + gapB + bbw)) / 2;
      var back = { x: bx0, y: fy, w: bbw, h: 64 };
      var start = { x: bx0 + bbw + gapB, y: fy, w: sbw, h: 64 };
      D.button(ctx, back, T('back'), { size: 22, fill: '#b9a58a', shade: '#8a7760' });
      D.button(ctx, start, T('start'), { size: 28 });
      ctx.restore();
      place(app, this.backBtn, map(back));
      place(app, this.startBtn, map(start));
    },
    press: function (app, p) {
      if (p.x === null) { app.sfx.play('ui'); app.go('play'); } // スペースでスタート
    }
  };

  DD.Scenes = { title: Title, play: Play, result: Result, shop: Shop };
})(window);
