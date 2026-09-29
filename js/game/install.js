/*
 * DUST DASH ホーム画面に追加（アプリのように遊ぶ）
 * ・Android の Chrome など：ブラウザの「インストール」の画面をそのまま出す
 * ・iPhone / iPad：自動では出せないので、Safari での追加のしかたを絵つきで案内する
 * ・もうホーム画面から開いているときは、ボタンを出さない
 */
(function (global) {
  'use strict';
  var DD = global.DD = global.DD || {};
  var COL = DD.COL, D = DD.draw;

  function T(key, params) { return DD.app.i18n.t(key, params); }
  function SU() { return DD.sceneUtil; }

  var deferred = null, installed = false;
  global.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; });
  global.addEventListener('appinstalled', function () { installed = true; deferred = null; });

  var nav = global.navigator || {};
  var ua = nav.userAgent || '';
  var isIOS = /iPhone|iPad|iPod/.test(ua) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);

  DD.install = {
    /** ホーム画面から開いているか */
    get standalone() {
      return !!(nav.standalone || (global.matchMedia && (global.matchMedia('(display-mode: fullscreen)').matches || global.matchMedia('(display-mode: standalone)').matches)));
    },
    /** 「アプリにする」ボタンを出すか */
    get available() { return !installed && !DD.install.standalone && (!!deferred || isIOS); },
    /** ボタンを押したとき */
    start: function (app) {
      if (deferred) {
        var d = deferred;
        deferred = null;
        d.prompt();
        if (d.userChoice) d.userChoice.then(function (c) { if (c && c.outcome === 'accepted') installed = true; }).catch(function () {});
      } else if (isIOS) {
        app.go('installGuide');
      }
    }
  };

  /** Safari の共有ボタン（四角から上向きの矢印） */
  function shareIcon(ctx, x, y) {
    ctx.save();
    ctx.strokeStyle = '#2f7ef7'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x - 6, y - 4); ctx.lineTo(x - 11, y - 4); ctx.lineTo(x - 11, y + 14); ctx.lineTo(x + 11, y + 14); ctx.lineTo(x + 11, y - 4); ctx.lineTo(x + 6, y - 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y + 5); ctx.lineTo(x, y - 15); ctx.moveTo(x - 6, y - 9); ctx.lineTo(x, y - 15); ctx.lineTo(x + 6, y - 9); ctx.stroke();
    ctx.restore();
  }
  /** 「ホーム画面に追加」の印（四角にプラス） */
  function addIcon(ctx, x, y) {
    ctx.save();
    ctx.strokeStyle = COL.ink; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); D.roundRect(ctx, x - 12, y - 12, 24, 24, 6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x, y + 6); ctx.moveTo(x - 6, y); ctx.lineTo(x + 6, y); ctx.stroke();
    ctx.restore();
  }

  /** タイトル画面の「アプリにする」ボタンの絵（小さなスマホに下向きの矢印） */
  DD.drawInstallIcon = function (ctx, x, y) {
    D.shape(ctx, function (c) { D.roundRect(c, x - 7, y - 11, 14, 22, 3); }, COL.white, 2.5);
    ctx.save();
    ctx.strokeStyle = COL.accent; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x, y + 4); ctx.moveTo(x - 4, y); ctx.lineTo(x, y + 4); ctx.lineTo(x + 4, y); ctx.stroke();
    ctx.restore();
  };

  // ------------------------------------------------------------
  // iPhone / iPad 向けの案内
  // ------------------------------------------------------------
  var InstallGuide = {
    enter: function (app) {
      this.demo = app.demoGame = app.demoGame || new DD.Game({ demo: true });
      this.t = 0;
      this.closeBtn = { x: 0, y: 0, w: 0, h: 0, onPress: function () { app.sfx.play('ui'); app.go('title'); } };
      app.setButtons([this.closeBtn]);
    },
    update: function (app, dt) { this.t += dt; this.demo.update(dt, app.W, app.H); },
    render: function (app, ctx) {
      this.demo.render(ctx, app.dpr);
      SU().uiSpace(ctx, app);
      var ui = app.ui;
      ctx.fillStyle = 'rgba(74, 45, 26, 0.5)';
      ctx.fillRect(0, 0, ui.w, ui.h);
      var pw = Math.min(ui.w - 28, 420), ph = 392;
      var fit = Math.min(1, (ui.h - ui.safeTop - ui.safeBottom - 30) / (ph + 110));
      var px = (ui.w - pw) / 2, py = Math.max(ui.safeTop + 40, (ui.h - ph - 90) / 2);
      if (fit < 1) py = ui.safeTop + 40;
      var ccx = px + pw / 2, cx0 = ui.w / 2, cy0 = ui.safeTop + 15;
      ctx.save();
      ctx.translate(cx0, cy0); ctx.scale(fit, fit); ctx.translate(-cx0, -cy0);
      var map = function (r) { return { x: cx0 + (r.x - cx0) * fit, y: cy0 + (r.y - cy0) * fit, w: r.w * fit, h: r.h * fit }; };

      D.shape(ctx, function (c) { D.roundRect(c, px, py + 6, pw, ph, 28); }, COL.sandDeep, 5);
      D.shape(ctx, function (c) { D.roundRect(c, px, py, pw, ph, 28); }, COL.cream, 5);
      var rw = Math.min(pw * 0.75, 290), rh = 52;
      D.shape(ctx, function (c) { D.roundRect(c, ccx - rw / 2, py - rh / 2, rw, rh, 18); }, COL.accent, 5);
      D.text(ctx, T('installTitle'), ccx, py + 1, { size: 24, fill: COL.white, maxW: rw - 24 });

      // 1・2・3 の手順
      var steps = [['installStep1', shareIcon], ['installStep2', addIcon], ['installStep3', null]];
      steps.forEach(function (s, i) {
        var y = py + 64 + i * 66;
        D.oval(ctx, px + 36, y, 17, 17, 0, COL.accent, 3);
        D.text(ctx, String(i + 1), px + 36, y + 1, { size: 18, fill: COL.white, lw: 0 });
        D.shape(ctx, function (c) { D.roundRect(c, px + 62, y - 24, pw - 80, 48, 14); }, '#fff', 3);
        var tx = px + 76;
        if (s[1]) { s[1](ctx, px + 92, y); tx = px + 114; }
        D.text(ctx, T(s[0]), tx, y + 1, { size: 17, fill: COL.ink, lw: 0, align: 'left', maxW: px + pw - 28 - tx });
      });
      D.text(ctx, T('installNote1'), ccx, py + 282, { size: 14, fill: COL.sandDeep, lw: 0, maxW: pw - 30 });
      D.text(ctx, T('installNote2'), ccx, py + 306, { size: 14, fill: COL.sandDeep, lw: 0, maxW: pw - 30 });
      D.text(ctx, T('installNote3'), ccx, py + 348, { size: 15, fill: COL.accent, lw: 0, maxW: pw - 30 });

      var b = { x: ccx - 110, y: py + ph + 22, w: 220, h: 60 };
      D.button(ctx, b, T('close'), { size: 24 });
      ctx.restore();
      SU().place(app, this.closeBtn, map(b));
    },
    press: function (app, p) { if (p.x === null) { app.sfx.play('ui'); app.go('title'); } }
  };
  DD.Scenes.installGuide = InstallGuide;
})(window);
