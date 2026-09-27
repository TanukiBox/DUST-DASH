/*
 * DUST DASH 起動・画面サイズ合わせ・毎フレームの進行
 */
(function (global) {
  'use strict';
  var DD = global.DD = global.DD || {};
  var U = DD.util;

  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var safeEl = document.getElementById('safe');

  var app = DD.app = {
    W: 0, H: 0, dpr: 1,
    ui: { u: 1, w: 0, h: 0, safeTop: 0, safeBottom: 0, safeLeft: 0, safeRight: 0 },
    store: TB.createStore('dust-dash'),
    i18n: TB.createI18n(DD.TEXT, 'en'),
    input: TB.createInput(canvas),
    scene: null,
    sceneName: '',
    /** 画面のボタンを登録（ミュートボタンはいつも一番手前） */
    setButtons: function (list) {
      app.input.setButtons((list || []).concat([muteBtn]));
    },
    go: function (name, arg) {
      app.sceneName = name;
      app.scene = DD.Scenes[name];
      app.scene.enter(app, arg);
    }
  };
  document.documentElement.lang = app.i18n.lang;
  app.progress = DD.createProgress(app.store); // コイン・強化・最高記録（段階2：L セーブ）
  app.sound = TB.createSound(app.store);
  app.sfx = DD.createSfx(app.sound);

  // ---- ミュートボタン（右上）----
  var muteBtn = { x: 0, y: 0, w: 0, h: 0, onPress: function () {
    app.sound.toggle();
    app.sfx.play('ui');
  } };
  app.muteBtn = muteBtn;
  /** ミュートボタンの位置（UI座標） */
  app.muteRect = function () {
    var ui = app.ui, size = 46;
    return { x: ui.w - ui.safeRight - 14 - size, y: ui.safeTop + 12, w: size, h: size };
  };
  function drawMute() {
    var ui = app.ui, r = app.muteRect(), D = DD.draw, COL = DD.COL;
    ctx.setTransform(app.dpr * ui.u, 0, 0, app.dpr * ui.u, 0, 0);
    var cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    D.oval(ctx, cx, cy + 3, r.w / 2, r.h / 2, 0, COL.sandDeep, 4);
    D.oval(ctx, cx, cy, r.w / 2, r.h / 2, 0, COL.cream, 4);
    // スピーカー
    D.shape(ctx, function (c) {
      c.moveTo(cx - 12, cy - 5); c.lineTo(cx - 6, cy - 5); c.lineTo(cx + 2, cy - 12);
      c.lineTo(cx + 2, cy + 12); c.lineTo(cx - 6, cy + 5); c.lineTo(cx - 12, cy + 5); c.closePath();
    }, COL.line, 0);
    ctx.lineCap = 'round'; ctx.lineWidth = 3.2;
    if (app.sound.muted) {
      ctx.strokeStyle = COL.bad;
      ctx.beginPath(); ctx.moveTo(cx + 6, cy - 6); ctx.lineTo(cx + 14, cy + 6); ctx.moveTo(cx + 14, cy - 6); ctx.lineTo(cx + 6, cy + 6); ctx.stroke();
    } else {
      ctx.strokeStyle = COL.line;
      ctx.beginPath(); ctx.arc(cx + 3, cy, 6, -0.9, 0.9); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx + 3, cy, 11.5, -0.9, 0.9); ctx.stroke();
    }
    // タップ判定（画面の座標）。少し大きめに
    muteBtn.x = (r.x - 6) * ui.u; muteBtn.y = (r.y - 6) * ui.u;
    muteBtn.w = (r.w + 12) * ui.u; muteBtn.h = (r.h + 12) * ui.u;
  }
  // PC は M キーでもミュート
  global.addEventListener('keydown', function (e) { if (e.code === 'KeyM' && !e.repeat) muteBtn.onPress(); });

  function resize() {
    var W = canvas.clientWidth || global.innerWidth;
    var H = canvas.clientHeight || global.innerHeight;
    var dpr = Math.min(global.devicePixelRatio || 1, 2);
    app.W = W; app.H = H; app.dpr = dpr;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);

    // UI の拡大率：スマホ縦(約400×720)を基準に
    var u = U.clamp(Math.min(W / 400, H / 720), 0.75, 2);
    var cs = global.getComputedStyle(safeEl);
    app.ui.u = u;
    app.ui.w = W / u;
    app.ui.h = H / u;
    app.ui.safeTop = (parseFloat(cs.paddingTop) || 0) / u;
    app.ui.safeBottom = (parseFloat(cs.paddingBottom) || 0) / u;
    app.ui.safeLeft = (parseFloat(cs.paddingLeft) || 0) / u;
    app.ui.safeRight = (parseFloat(cs.paddingRight) || 0) / u;
  }
  global.addEventListener('resize', resize);
  resize();

  app.input.onPress = function (p) {
    if (app.scene && app.scene.press) app.scene.press(app, p);
  };

  // 文字のフォントを先に読み込んでおく（読み込み前は代わりのフォントで表示）
  if (document.fonts && document.fonts.load) {
    var sample = 'DUST DASH 0123456789 km/h ' + Object.keys(DD.TEXT).map(function (k) {
      var d = DD.TEXT[k];
      return Object.keys(d).map(function (key) { return d[key]; }).join('');
    }).join('');
    document.fonts.load('800 24px "M PLUS Rounded 1c"', sample).catch(function () {});
    document.fonts.load('400 24px "Mochiy Pop One"', 'DUST DASH').catch(function () {});
  }

  var last = 0;
  function frame(now) {
    var dt = last ? (now - last) / 1000 : 1 / 60;
    last = now;
    dt = Math.min(dt, 1 / 20); // 重いときも一気に進みすぎない
    if (canvas.clientWidth !== app.W || canvas.clientHeight !== app.H) resize();
    app.scene.update(app, dt);
    app.scene.render(app, ctx);
    drawMute();
    global.requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange', function () { last = 0; });

  app.go('title');
  global.requestAnimationFrame(frame);
})(window);
