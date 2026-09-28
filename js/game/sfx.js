/*
 * DUST DASH 効果音のレシピ
 * ゲームの出来事（'jump' など）の名前で鳴らす。音はすべてその場で作る（tb-sound.js の synth）。
 * かん高い四角い波（ピコピコ音）はなるべく使わず、ベルのような音・やわらかい音に響きを足して
 * 「ちゃんとしたゲーム」の手ざわりに近づけている。
 */
(function (global) {
  'use strict';
  var DD = global.DD = global.DD || {};

  // よく使う音色
  var BELL = [{ type: 'sine' }, { type: 'sine', mul: 2, gain: 0.35 }, { type: 'triangle', mul: 3, gain: 0.12 }];
  var SOFT = [{ type: 'triangle' }, { type: 'sine', mul: 2, gain: 0.3 }];
  var BRASS = [{ type: 'sawtooth', detune: -9 }, { type: 'sawtooth', detune: 9 }, { type: 'square', mul: 0.5, gain: 0.4 }];
  var PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31];
  function note(base, semi) { return base * Math.pow(2, semi / 12); }

  DD.createSfx = function (sound) {
    var S = sound;
    var coinStreak = 0, lastCoinT = -1;
    function now() { return (global.performance ? global.performance.now() : Date.now()) / 1000; }

    function bell(f, o) {
      o = o || {};
      S.synth({ f: f, dur: o.dur || 0.05, vol: o.vol || 0.06, osc: BELL, env: { a: 0.002, d: o.d || 0.25, s: 0, r: o.r || 0.25 },
        delay: o.delay, reverb: o.reverb === undefined ? 0.3 : o.reverb, echo: o.echo || 0, pan: o.pan || 0 });
    }
    function fanfare(notes, step, o) {
      o = o || {};
      notes.forEach(function (f, i) {
        var last = i === notes.length - 1;
        S.synth({ f: f, dur: last ? 0.5 : step * 0.9, vol: o.vol || 0.07, osc: BRASS, delay: i * step,
          env: { a: 0.02, d: 0.2, s: 0.7, r: last ? 0.4 : 0.1 }, filter: { f: 3200, f1: 1400, t: 0.3, q: 1 }, reverb: 0.3, pan: (i % 2 ? 0.2 : -0.2) });
      });
    }

    var recipes = {
      // ジャンプ：ふわっと上がる音と、小さな風の音
      jump: function () {
        S.synth({ f: 360, f1: 720, glide: 0.1, dur: 0.08, vol: 0.09, osc: SOFT, env: { a: 0.004, d: 0.08, s: 0.3, r: 0.08 }, filter: { f: 4000 }, reverb: 0.1 });
        S.noise({ type: 'highpass', f0: 2500, f1: 5000, dur: 0.12, vol: 0.025, q: 0.5 });
      },
      // 2段ジャンプ：もう一段高く＋きらっ
      double: function () {
        S.synth({ f: 620, f1: 1240, glide: 0.1, dur: 0.08, vol: 0.08, osc: SOFT, env: { a: 0.004, d: 0.08, s: 0.3, r: 0.08 }, reverb: 0.15 });
        bell(2093, { vol: 0.035, delay: 0.05, d: 0.18, pan: 0.3 });
        S.noise({ type: 'highpass', f0: 3000, f1: 6000, dur: 0.16, vol: 0.03, q: 0.5 });
      },
      // 着地：やわらかい「とっ」
      land: function () {
        S.synth({ f: 190, f1: 90, glide: 0.07, dur: 0.05, vol: 0.18, osc: [{ type: 'sine' }, { type: 'triangle', mul: 2, gain: 0.3 }], env: { a: 0.002, d: 0.06, s: 0, r: 0.05 } });
        S.noise({ type: 'lowpass', f0: 1400, f1: 400, dur: 0.07, vol: 0.07 });
      },
      // 食べる：「ぽん」＋ベル。コンボが続くほど音階が上がる
      eat: function (combo) {
        var k = PENTA[Math.min(Math.max(0, (combo || 1) - 1), PENTA.length - 1)];
        S.synth({ f: 320, f1: 960, glide: 0.05, dur: 0.04, vol: 0.1, osc: [{ type: 'sine' }], env: { a: 0.002, d: 0.06, s: 0, r: 0.05 } });
        bell(note(784, k), { vol: 0.065, delay: 0.03, d: 0.3, reverb: 0.3 });
        bell(note(784, k + 12), { vol: 0.03, delay: 0.06, d: 0.2, reverb: 0.3, pan: 0.2 });
      },
      // ヘビを食べた：低い「ドン」と、上がっていくベル
      eatBig: function () {
        S.synth({ f: 110, f1: 55, glide: 0.25, dur: 0.1, vol: 0.2, osc: [{ type: 'sine' }, { type: 'triangle', mul: 2, gain: 0.3 }], env: { a: 0.003, d: 0.25, s: 0, r: 0.2 } });
        [0, 4, 7, 12, 16].forEach(function (s, i) { bell(note(659, s), { vol: 0.06, delay: 0.05 + i * 0.05, d: 0.35, reverb: 0.35, pan: (i - 2) * 0.15 }); });
      },
      // ぶつかった：にぶい「ドッ」
      hurt: function () {
        S.synth({ f: 150, f1: 55, glide: 0.2, dur: 0.12, vol: 0.2, osc: [{ type: 'sine' }, { type: 'sawtooth', mul: 1.5, gain: 0.2 }], env: { a: 0.002, d: 0.2, s: 0, r: 0.1 }, filter: { f: 900, f1: 200 } });
        S.noise({ f0: 1200, f1: 250, dur: 0.18, vol: 0.12, q: 0.8 });
      },
      // 穴に落ちた：長く下がっていく口笛
      fall: function () {
        S.synth({ f: 1100, f1: 160, glide: 0.9, dur: 0.9, vol: 0.09, osc: [{ type: 'sine' }, { type: 'triangle', gain: 0.3 }], env: { a: 0.01, d: 0.5, s: 0.8, r: 0.2 }, vib: { rate: 7, depth: 25, delay: 0.1 }, reverb: 0.35 });
      },
      // タカの鳴き声「ピーーィ」：高い音が少しふるえながら下がる（遠くで鳴くように響かせる）
      hawkCry: function () {
        S.tone({ type: 'sawtooth', f0: 2300, f1: 1500, dur: 0.75, vol: 0.06, attack: 0.04,
          vibrato: { rate: 28, depth: 70 }, filter: { type: 'bandpass', f: 2200, q: 1.5 }, reverb: 0.45, echo: 0.25 });
        S.noise({ f0: 3000, f1: 1800, dur: 0.6, vol: 0.025, q: 3, attack: 0.04, reverb: 0.3 });
      },
      hawkDive: function () {
        recipes.hawkCry();
        S.noise({ f0: 300, f1: 2400, dur: 0.6, vol: 0.1, q: 1.2, attack: 0.2, reverb: 0.2 });
      },
      hawkCatch: function () {
        S.noise({ f0: 700, f1: 150, dur: 0.25, vol: 0.18 });
        S.synth({ f: 200, f1: 60, glide: 0.25, dur: 0.15, vol: 0.18, osc: [{ type: 'sine' }], env: { a: 0.002, d: 0.2, s: 0, r: 0.1 } });
      },
      milestone: function () { fanfare([523, 659, 784, 1047], 0.08); },
      // ステージが変わった：金管のファンファーレ
      stage: function () { fanfare([523, 659, 784, 1047, 1319], 0.08, { vol: 0.06 }); bell(2093, { delay: 0.45, vol: 0.05, reverb: 0.5 }); },
      // つむじ風：ヒューッと巻き上がる
      whirl: function () {
        S.noise({ f0: 300, f1: 2800, dur: 0.9, vol: 0.12, q: 2, reverb: 0.3 });
        S.synth({ f: 300, f1: 1200, glide: 0.7, dur: 0.6, vol: 0.06, osc: SOFT, env: { a: 0.05, d: 0.3, s: 0.6, r: 0.2 }, vib: { rate: 9, depth: 40 }, reverb: 0.3 });
      },
      bigCoin: function () { recipes.gem('sapphire'); },
      perfect: function () {
        [0, 4, 7, 12, 16, 19].forEach(function (s, i) { bell(note(1047, s), { vol: 0.05, delay: i * 0.06, d: 0.4, reverb: 0.4, echo: 0.15, pan: (i - 2.5) * 0.12 }); });
      },
      exhausted: function () {
        S.synth({ f: 520, f1: 190, glide: 0.6, dur: 0.6, vol: 0.1, osc: SOFT, env: { a: 0.01, d: 0.4, s: 0.6, r: 0.2 }, vib: { rate: 5, depth: 30 }, reverb: 0.3 });
      },
      // コイン：小さなベルの「チリン」。1枚ごとに鳴り、続けて取ると音階を上っていく。
      // nth = 同じコマで何枚目か（重なったら少しずつずらす）
      coin: function (nth) {
        var t = now();
        if (t - lastCoinT > 0.45) coinStreak = 0;    // 間があいたら、はじめの高さから
        lastCoinT = t;
        var s = PENTA[coinStreak % 10];
        coinStreak++;
        bell(note(1319, s), { vol: 0.1, d: 0.12, r: 0.12, reverb: 0.18, pan: 0.15, delay: Math.max(0, (nth || 1) - 1) * 0.035 });
      },
      // 宝石：キラララン。高価な石ほど音が高く、長い
      gem: function (kind) {
        var base = kind === 'ruby' ? 1175 : kind === 'emerald' ? 1047 : 880;
        var steps = kind === 'ruby' ? [0, 4, 7, 12, 16, 19] : [0, 4, 7, 12, 16];
        steps.forEach(function (s, i) { bell(note(base, s), { vol: 0.055, delay: i * 0.045, d: 0.35, reverb: 0.45, echo: 0.2, pan: (i - 2) * 0.15 }); });
      },
      fever: function () {
        fanfare([523, 659, 784, 1047, 1319], 0.06, { vol: 0.07 });
        S.noise({ f0: 400, f1: 4000, dur: 0.6, vol: 0.07, reverb: 0.3 });
      },
      feverEnd: function () { S.synth({ f: 900, f1: 400, glide: 0.3, dur: 0.25, vol: 0.08, osc: SOFT, env: { a: 0.01, d: 0.2, s: 0.5, r: 0.15 }, reverb: 0.2 }); },
      // フィーバー中に障害物をふっとばした
      smash: function () {
        S.noise({ f0: 1400, f1: 200, dur: 0.2, vol: 0.15, q: 0.7 });
        S.synth({ f: 160, f1: 70, glide: 0.15, dur: 0.08, vol: 0.14, osc: [{ type: 'sine' }], env: { a: 0.002, d: 0.12, s: 0, r: 0.08 } });
        bell(1568, { vol: 0.03, d: 0.15 });
      },
      buy: function () {
        [0, 4, 7, 12].forEach(function (s, i) { bell(note(784, s), { vol: 0.07, delay: i * 0.06, d: 0.3, reverb: 0.35 }); });
      },
      // ボタン：やわらかい「ポッ」
      ui: function () {
        S.synth({ f: 700, f1: 1000, glide: 0.04, dur: 0.03, vol: 0.08, osc: SOFT, env: { a: 0.002, d: 0.05, s: 0, r: 0.05 }, reverb: 0.1 });
      },
      // ゴール：大きなファンファーレ
      goal: function () {
        fanfare([523, 659, 784, 1047], 0.1, { vol: 0.08 });
        [1047, 1319, 1568].forEach(function (f, i) {
          S.synth({ f: f, dur: 0.8, vol: 0.05, osc: BRASS, delay: 0.42, env: { a: 0.03, d: 0.3, s: 0.8, r: 0.6 }, filter: { f: 3000, f1: 1500, t: 1 }, reverb: 0.45, pan: (i - 1) * 0.3 });
        });
        S.noise({ f0: 600, f1: 4000, dur: 0.8, vol: 0.05, delay: 0.4, reverb: 0.3 });
      },
      // 落石：ズシン
      rockfall: function () {
        S.synth({ f: 90, f1: 40, glide: 0.3, dur: 0.15, vol: 0.2, osc: [{ type: 'sine' }, { type: 'triangle', mul: 2, gain: 0.3 }], env: { a: 0.002, d: 0.3, s: 0, r: 0.2 } });
        S.noise({ type: 'lowpass', f0: 1200, f1: 200, dur: 0.35, vol: 0.14, reverb: 0.3 });
      },
      // 池にドボン
      splash: function () {
        S.noise({ f0: 1800, f1: 300, dur: 0.5, vol: 0.2, q: 0.7, reverb: 0.3 });
        S.synth({ f: 500, f1: 120, glide: 0.3, dur: 0.2, vol: 0.12, osc: [{ type: 'sine' }], env: { a: 0.003, d: 0.2, s: 0, r: 0.1 } });
        S.noise({ f0: 3000, f1: 1500, dur: 0.4, vol: 0.05, q: 2, delay: 0.15, reverb: 0.3 });
      }
    };
    return {
      play: function (name, arg) { if (recipes[name]) recipes[name](arg); }
    };
  };
})(window);
