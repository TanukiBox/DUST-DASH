/*
 * Tanuki Box 共通土台：片手操作
 * スマホのタップ・PCのクリック・スペースキーを、すべて同じ「押した」に
 * まとめて1つの関数に届ける。画面のボタンは先に当たり判定をして、
 * 当たったボタンがあればそちらを優先する。
 *
 *   var input = TB.createInput(canvas);
 *   input.onPress = function (p) { ... };     // p.x, p.y（画面上の位置。キーの時は null）
 *   input.setButtons([{ x, y, w, h, onPress }]);
 */
(function (global) {
  'use strict';
  var TB = global.TB = global.TB || {};

  var PRESS_KEYS = { Space: 1, ArrowUp: 1, KeyW: 1, Enter: 1, NumpadEnter: 1 };

  TB.createInput = function (target) {
    var buttons = [];
    var api = {
      onPress: null,
      /** 押している間 true（長押し判定などに使える） */
      down: false,
      isTouch: false,
      setButtons: function (list) { buttons = list || []; },
      hitButton: function (x, y) {
        for (var i = buttons.length - 1; i >= 0; i--) {
          var b = buttons[i];
          if (b.hidden) continue;
          if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
        }
        return null;
      }
    };

    function fire(x, y, source) {
      if (x !== null) {
        var b = api.hitButton(x, y);
        if (b) { b.onPress && b.onPress(); return; }
      }
      if (api.onPress) api.onPress({ x: x, y: y, source: source });
    }

    target.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (e.pointerType === 'touch' || e.pointerType === 'pen') api.isTouch = true;
      e.preventDefault();
      api.down = true;
      var r = target.getBoundingClientRect();
      fire(e.clientX - r.left, e.clientY - r.top, e.pointerType || 'pointer');
    }, { passive: false });

    function release() { api.down = false; }
    global.addEventListener('pointerup', release);
    global.addEventListener('pointercancel', release);

    // iOS のダブルタップ拡大・長押しメニューを止める
    target.addEventListener('touchstart', function (e) { e.preventDefault(); }, { passive: false });
    target.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    global.addEventListener('keydown', function (e) {
      if (!PRESS_KEYS[e.code]) return;
      e.preventDefault(); // スペースでページがスクロールしないように
      if (e.repeat) return;
      api.down = true;
      fire(null, null, 'key');
    });
    global.addEventListener('keyup', function (e) {
      if (PRESS_KEYS[e.code]) api.down = false;
    });

    return api;
  };
})(window);
