/*
 * Tanuki Box 共通土台：セーブ（ブラウザ内保存）
 * ゲームごとに名前空間を分けて localStorage に JSON で保存する。
 * プライベートモードなどで保存できない環境でも、例外を出さずに動き続ける。
 *
 *   var store = TB.createStore('dust-dash');
 *   store.get('muted', false);
 *   store.set('muted', true);
 */
(function (global) {
  'use strict';
  var TB = global.TB = global.TB || {};

  TB.createStore = function (namespace) {
    var prefix = 'tb.' + namespace + '.';
    var memory = {}; // 保存できない環境用の予備

    function read(key) {
      try {
        var raw = global.localStorage.getItem(prefix + key);
        return raw === null ? undefined : JSON.parse(raw);
      } catch (e) {
        return memory[key];
      }
    }

    return {
      get: function (key, fallback) {
        var v = read(key);
        return v === undefined ? fallback : v;
      },
      set: function (key, value) {
        memory[key] = value;
        try {
          global.localStorage.setItem(prefix + key, JSON.stringify(value));
        } catch (e) { /* 保存できなくてもゲームは続ける */ }
      },
      remove: function (key) {
        delete memory[key];
        try { global.localStorage.removeItem(prefix + key); } catch (e) { /* noop */ }
      }
    };
  };
})(window);
