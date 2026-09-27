/*
 * Tanuki Box 共通土台：効果音とミュート
 * 音声ファイルを使わず、ブラウザの中で音を作って鳴らす（WebAudio）。
 * ・スマホは「最初に画面をさわった瞬間」まで音を出せないので、そこで自動的に準備する
 * ・ミュートはセーブ（TB.createStore）に覚えて、次に開いたときも同じにする
 *
 *   var sound = TB.createSound(store);
 *   sound.tone({ type: 'square', f0: 400, f1: 800, dur: 0.12, vol: 0.2 });
 *   sound.noise({ dur: 0.2, vol: 0.2, f0: 800, f1: 200 });
 *   sound.toggle();  // ミュート切り替え
 */
(function (global) {
  'use strict';
  var TB = global.TB = global.TB || {};

  TB.createSound = function (store) {
    var AC = global.AudioContext || global.webkitAudioContext;
    var ctx = null, master = null, noiseBuf = null;
    var muted = !!(store && store.get('muted', false));

    function ensure() {
      if (!AC) return null;
      if (!ctx) {
        try {
          ctx = new AC();
          master = ctx.createGain();
          master.gain.value = muted ? 0 : 1;
          master.connect(ctx.destination);
          noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
          var d = noiseBuf.getChannelData(0);
          for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        } catch (e) { ctx = null; return null; }
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }

    // 最初の操作で音の準備をする
    function unlock() { ensure(); }
    ['pointerdown', 'touchend', 'keydown'].forEach(function (ev) {
      global.addEventListener(ev, unlock, { passive: true });
    });

    function env(g, t0, attack, dur, vol) {
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(Math.max(vol, 0.0002), t0 + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    }

    var api = {
      get muted() { return muted; },
      setMuted: function (m) {
        muted = !!m;
        if (store) store.set('muted', muted);
        if (master) master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.02);
      },
      toggle: function () { api.setMuted(!muted); return muted; },

      /** 音程のある音。f0 から f1 へ音の高さが変わる */
      tone: function (o) {
        if (muted || !ensure()) return;
        var t0 = ctx.currentTime + (o.delay || 0), dur = o.dur || 0.15;
        var osc = ctx.createOscillator(), g = ctx.createGain();
        osc.type = o.type || 'sine';
        osc.frequency.setValueAtTime(o.f0 || 440, t0);
        if (o.f1) osc.frequency.exponentialRampToValueAtTime(o.f1, t0 + dur);
        var out = g;
        if (o.vibrato) {
          var lfo = ctx.createOscillator(), lg = ctx.createGain();
          lfo.frequency.value = o.vibrato.rate; lg.gain.value = o.vibrato.depth;
          lfo.connect(lg); lg.connect(osc.frequency);
          lfo.start(t0); lfo.stop(t0 + dur + 0.05);
        }
        if (o.filter) {
          var bf = ctx.createBiquadFilter();
          bf.type = o.filter.type || 'bandpass'; bf.frequency.value = o.filter.f; bf.Q.value = o.filter.q || 1;
          osc.connect(bf); bf.connect(g);
        } else {
          osc.connect(g);
        }
        env(g, t0, o.attack || 0.005, dur, o.vol || 0.2);
        out.connect(master);
        osc.start(t0); osc.stop(t0 + dur + 0.05);
      },

      /** ザッ・シュッなどの雑音。フィルターの高さが f0 から f1 へ変わる */
      noise: function (o) {
        if (muted || !ensure()) return;
        var t0 = ctx.currentTime + (o.delay || 0), dur = o.dur || 0.2;
        var src = ctx.createBufferSource(), bf = ctx.createBiquadFilter(), g = ctx.createGain();
        src.buffer = noiseBuf;
        bf.type = o.type || 'bandpass'; bf.Q.value = o.q || 1;
        bf.frequency.setValueAtTime(o.f0 || 1000, t0);
        if (o.f1) bf.frequency.exponentialRampToValueAtTime(o.f1, t0 + dur);
        src.connect(bf); bf.connect(g); g.connect(master);
        env(g, t0, o.attack || 0.005, dur, o.vol || 0.2);
        src.start(t0); src.stop(t0 + dur + 0.05);
      }
    };
    return api;
  };
})(window);
