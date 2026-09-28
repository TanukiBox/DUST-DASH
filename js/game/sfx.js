/*
 * DUST DASH 効果音のレシピ
 * ゲームの出来事（'jump' など）の名前で鳴らす。音はすべてその場で作る。
 */
(function (global) {
  'use strict';
  var DD = global.DD = global.DD || {};

  DD.createSfx = function (sound) {
    var S = sound;
    var recipes = {
      jump: function () { S.tone({ type: 'square', f0: 330, f1: 700, dur: 0.12, vol: 0.09 }); },
      double: function () {
        S.tone({ type: 'square', f0: 520, f1: 1100, dur: 0.12, vol: 0.08 });
        S.tone({ type: 'sine', f0: 1500, f1: 2200, dur: 0.1, vol: 0.05, delay: 0.05 });
      },
      land: function () { S.noise({ f0: 500, f1: 200, dur: 0.07, vol: 0.06, q: 0.8 }); },
      // 食べる：コンボが続くほど音が高くなる
      eat: function (combo) {
        var k = Math.pow(2, Math.min(combo - 1, 12) / 12);
        S.tone({ type: 'sine', f0: 520 * k, f1: 1250 * k, dur: 0.09, vol: 0.2 });
        S.tone({ type: 'triangle', f0: 1040 * k, dur: 0.07, vol: 0.07, delay: 0.05 });
      },
      eatBig: function () {
        S.tone({ type: 'sine', f0: 160, f1: 620, dur: 0.28, vol: 0.24 });
        S.tone({ type: 'triangle', f0: 660, dur: 0.1, vol: 0.1, delay: 0.1 });
        S.tone({ type: 'triangle', f0: 880, dur: 0.1, vol: 0.1, delay: 0.17 });
        S.tone({ type: 'triangle', f0: 1320, dur: 0.16, vol: 0.1, delay: 0.24 });
      },
      hurt: function () {
        S.tone({ type: 'square', f0: 240, f1: 80, dur: 0.2, vol: 0.12 });
        S.noise({ f0: 900, f1: 200, dur: 0.15, vol: 0.14 });
      },
      fall: function () { S.tone({ type: 'sine', f0: 900, f1: 160, dur: 0.5, vol: 0.16 }); },
      // タカの鳴き声「ピーーィ」：高い音が少しふるえながら下がる
      hawkCry: function () {
        S.tone({ type: 'sawtooth', f0: 2300, f1: 1500, dur: 0.75, vol: 0.07, attack: 0.04,
          vibrato: { rate: 28, depth: 70 }, filter: { type: 'bandpass', f: 2200, q: 1.5 } });
        S.noise({ f0: 3000, f1: 1800, dur: 0.6, vol: 0.03, q: 3, attack: 0.04 });
      },
      hawkDive: function () {
        recipes.hawkCry();
        S.noise({ f0: 300, f1: 2400, dur: 0.6, vol: 0.12, q: 1.2, attack: 0.2 });
      },
      hawkCatch: function () {
        S.noise({ f0: 700, f1: 150, dur: 0.25, vol: 0.2 });
        S.tone({ type: 'sine', f0: 200, f1: 60, dur: 0.25, vol: 0.2 });
      },
      milestone: function () {
        [523, 659, 784, 1047].forEach(function (f, i) {
          S.tone({ type: 'triangle', f0: f, dur: 0.18, vol: 0.1, delay: i * 0.07 });
        });
      },
      stage: function () { recipes.milestone(); S.tone({ type: 'triangle', f0: 1568, dur: 0.3, vol: 0.08, delay: 0.3 }); },
      whirl: function () { S.noise({ f0: 300, f1: 2500, dur: 0.8, vol: 0.12, q: 2 }); S.tone({ type: 'sine', f0: 300, f1: 1200, dur: 0.6, vol: 0.1 }); },
      // 宝石：キラララン。高価な石ほど音が高く、長い
      gem: function (kind) {
        var k = kind === 'ruby' ? 1.26 : kind === 'emerald' ? 1.12 : 1;
        var n = kind === 'ruby' ? 5 : 4;
        [1047, 1319, 1568, 2093, 2637].slice(0, n).forEach(function (f, i) {
          S.tone({ type: 'triangle', f0: f * k, dur: 0.14, vol: 0.09, delay: i * 0.045 });
        });
        S.tone({ type: 'sine', f0: 3136 * k, dur: 0.3, vol: 0.04, delay: n * 0.045 });
      },
      perfect: function () { [784, 988, 1175, 1568].forEach(function (f, i) { S.tone({ type: 'triangle', f0: f, dur: 0.14, vol: 0.1, delay: i * 0.07 }); }); },
      exhausted: function () { S.tone({ type: 'triangle', f0: 500, f1: 180, dur: 0.6, vol: 0.14 }); },
      // コイン：拾うたびに2つの高さを交互に鳴らす（チャリン）
      coin: function (n) {
        var f = n % 2 ? 1568 : 1319;
        S.tone({ type: 'square', f0: f, dur: 0.06, vol: 0.05 });
        S.tone({ type: 'square', f0: f * 1.5, dur: 0.08, vol: 0.04, delay: 0.04 });
      },
      fever: function () {
        [523, 659, 784, 1047, 1319].forEach(function (f, i) {
          S.tone({ type: 'square', f0: f, dur: 0.12, vol: 0.07, delay: i * 0.05 });
        });
        S.noise({ f0: 400, f1: 3000, dur: 0.5, vol: 0.08 });
      },
      feverEnd: function () { S.tone({ type: 'triangle', f0: 900, f1: 400, dur: 0.3, vol: 0.1 }); },
      smash: function () {
        S.noise({ f0: 1200, f1: 200, dur: 0.18, vol: 0.18 });
        S.tone({ type: 'square', f0: 700, f1: 1400, dur: 0.1, vol: 0.06 });
      },
      buy: function () {
        [784, 988, 1319].forEach(function (f, i) { S.tone({ type: 'triangle', f0: f, dur: 0.12, vol: 0.12, delay: i * 0.06 }); });
      },
      ui: function () { S.tone({ type: 'sine', f0: 700, f1: 1000, dur: 0.06, vol: 0.12 }); }
    };
    return {
      play: function (name, arg) { if (recipes[name]) recipes[name](arg); }
    };
  };
})(window);
