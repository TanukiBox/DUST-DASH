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
    go: function (name, arg) {
      app.sceneName = name;
      app.scene = DD.Scenes[name];
      app.scene.enter(app, arg);
    }
  };
  document.documentElement.lang = app.i18n.lang;

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
    global.requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange', function () { last = 0; });

  app.go('title');
  global.requestAnimationFrame(frame);
})(window);
