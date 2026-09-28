/*
 * Tanuki Box 共通土台：効果音・BGM の音づくりとミュート
 * 音声ファイルを使わず、ブラウザの中で音を作って鳴らす（WebAudio）。
 * ・スマホは「最初に画面をさわった瞬間」まで音を出せないので、そこで自動的に準備する
 * ・ミュートはセーブ（TB.createStore）に覚えて、次に開いたときも同じにする
 * ・「ちゃんとしたゲームの音」に近づけるための仕上げ：
 *     コンプレッサー（音量のでこぼこをならす）→ 全体がまとまって聞こえる
 *     リバーブ（部屋の響き）・ディレイ（やまびこ）→ 奥行き
 *     1つの音に少しずつ高さをずらした音を重ねる（ユニゾン）→ 厚み
 *     フィルターを時間で動かす → 「ポロン」「ビヨン」といった表情
 *
 *   var sound = TB.createSound(store);
 *   sound.synth({ f: 440, dur: 0.2, vol: 0.1, osc: [{ type: 'sawtooth', detune: -8 }, { type: 'sawtooth', detune: 8 }],
 *                 env: { a: 0.01, d: 0.1, s: 0.6, r: 0.2 }, filter: { f: 3000, f1: 800, q: 1 }, reverb: 0.3, echo: 0.2, pan: 0 });
 *   sound.tone({ type: 'square', f0: 400, f1: 800, dur: 0.12, vol: 0.2 });   // かんたんな音
 *   sound.noise({ dur: 0.2, vol: 0.2, f0: 800, f1: 200 });                   // ザッ・シュッ
 *   // bus: 'music' で BGM の音量つまみを通す。at で「何秒の時点で鳴らすか」を指定できる
 *   sound.toggle();  // ミュート切り替え
 */
(function (global) {
  'use strict';
  var TB = global.TB = global.TB || {};

  TB.createSound = function (store) {
    var AC = global.AudioContext || global.webkitAudioContext;
    var ctx = null, master = null, music = null, sfx = null, noiseBuf = null;
    var MASTER = 0.8, MUSIC = 0.72, SFX = 0.72; // 全体・BGM・効果音の音量（BGMと効果音の釣り合いはここで）
    var reverbIn = null, echoIn = null;
    var muted = !!(store && store.get('muted', false));

    /** 部屋の響き（リバーブ）の元になる音を作る：だんだん小さくなるザーという音 */
    function makeImpulse(sec, decay) {
      var rate = ctx.sampleRate, len = Math.floor(rate * sec);
      var buf = ctx.createBuffer(2, len, rate);
      for (var ch = 0; ch < 2; ch++) {
        var d = buf.getChannelData(ch);
        for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
      return buf;
    }

    function ensure() {
      if (!AC) return null;
      if (!ctx) {
        try {
          ctx = new AC();
          // 出口：コンプレッサーで全体をまとめる
          var comp = ctx.createDynamicsCompressor();
          comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 4;
          comp.attack.value = 0.004; comp.release.value = 0.2;
          comp.connect(ctx.destination);
          master = ctx.createGain();
          master.gain.value = muted ? 0 : MASTER;
          master.connect(comp);
          music = ctx.createGain();   // BGM の音量（フェードに使う）
          music.gain.value = MUSIC;
          music.connect(master);
          sfx = ctx.createGain();     // 効果音の音量
          sfx.gain.value = SFX;
          sfx.connect(master);
          // リバーブ（響き）
          var conv = ctx.createConvolver();
          conv.buffer = makeImpulse(1.8, 2.6);
          reverbIn = ctx.createGain(); reverbIn.gain.value = 1;
          var revOut = ctx.createGain(); revOut.gain.value = 0.5;
          reverbIn.connect(conv); conv.connect(revOut); revOut.connect(master);
          // ディレイ（やまびこ）：少しこもらせながらくり返す
          var dl = ctx.createDelay(1.0), fb = ctx.createGain(), lp = ctx.createBiquadFilter();
          dl.delayTime.value = 0.32; fb.gain.value = 0.32; lp.type = 'lowpass'; lp.frequency.value = 2200;
          echoIn = ctx.createGain(); echoIn.gain.value = 1;
          var echoOut = ctx.createGain(); echoOut.gain.value = 0.55;
          echoIn.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(echoOut); echoOut.connect(master);
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
    // 別のタブに切り替えている間は音を止める（BGM が鳴りっぱなしにならないように）
    document.addEventListener('visibilitychange', function () {
      if (!ctx) return;
      if (document.hidden) ctx.suspend(); else ctx.resume();
    });

    function startTime(o) { return o.at !== undefined ? Math.max(o.at, ctx.currentTime) : ctx.currentTime + (o.delay || 0); }
    function busOf(o) { return o.bus === 'music' ? music : sfx; }

    /** 音の出口：左右の位置 → バス。リバーブ・ディレイにも少し送る */
    function output(node, o, t0, tEnd) {
      var last = node;
      if (o.pan && ctx.createStereoPanner) {
        var p = ctx.createStereoPanner(); p.pan.value = o.pan;
        node.connect(p); last = p;
      }
      last.connect(busOf(o));
      if (o.reverb) { var rg = ctx.createGain(); rg.gain.value = o.reverb; last.connect(rg); rg.connect(reverbIn); }
      if (o.echo) { var eg = ctx.createGain(); eg.gain.value = o.echo; last.connect(eg); eg.connect(echoIn); }
    }

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
        if (master) master.gain.setTargetAtTime(muted ? 0 : MASTER, ctx.currentTime, 0.02);
      },
      toggle: function () { api.setMuted(!muted); return muted; },

      /** 今の時刻（秒）。まだ音が使えない（画面をさわる前など）ときは null */
      now: function () { return ctx && ctx.state === 'running' ? ctx.currentTime : null; },
      /** BGM のふつうの音量 */
      get musicLevel() { return MUSIC; },
      /** BGM の音量を sec 秒かけて v にする */
      musicVolume: function (v, sec) {
        if (!music) return;
        music.gain.cancelScheduledValues(ctx.currentTime);
        music.gain.setTargetAtTime(v, ctx.currentTime, Math.max(0.01, (sec || 0) / 3));
      },

      /**
       * しっかりした楽器の音。
       * f = 高さ(Hz)、f1 = 終わりの高さ（音程が動く音）、dur = 押している長さ、vol = 大きさ
       * osc = 重ねる音のリスト [{ type, detune(セント), gain, mul(何倍の高さ) }]
       * env = { a: 立ち上がり, d: 減っていく時間, s: 残る大きさ(0〜1), r: 離してから消えるまで }
       * filter = { type, f: はじめ, f1: 終わり, t: 変わる時間, q }、vib = { rate, depth(セント), delay }
       */
      synth: function (o) {
        if (muted || !ensure()) return;
        var t0 = startTime(o), dur = o.dur || 0.15, vol = o.vol || 0.1;
        var e = o.env || {}, a = e.a || 0.005, dcy = e.d || 0.1, sus = e.s === undefined ? 0.7 : e.s, rel = e.r || 0.08;
        var g = ctx.createGain();
        var input = g, fl = null;
        if (o.filter) {
          fl = ctx.createBiquadFilter();
          fl.type = o.filter.type || 'lowpass'; fl.Q.value = o.filter.q || 0.7;
          fl.frequency.setValueAtTime(o.filter.f, t0);
          if (o.filter.f1) fl.frequency.exponentialRampToValueAtTime(o.filter.f1, t0 + (o.filter.t || dur));
          fl.connect(g); input = fl;
        }
        // 大きさの形（ADSR）
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(vol, t0 + a);
        g.gain.setTargetAtTime(vol * Math.max(sus, 0.0001), t0 + a, dcy / 3);
        var tRel = t0 + Math.max(dur, a);
        g.gain.setTargetAtTime(0.0001, tRel, rel / 4);
        var tEnd = tRel + rel + 0.05;
        var oscs = o.osc || [{ type: o.type || 'sine' }];
        var lfo = null;
        if (o.vib) {
          lfo = ctx.createOscillator(); var lg = ctx.createGain();
          lfo.frequency.value = o.vib.rate || 5.5;
          lg.gain.setValueAtTime(0, t0);
          lg.gain.linearRampToValueAtTime(o.vib.depth || 10, t0 + (o.vib.delay || 0.15) + 0.1);
          lfo.connect(lg);
          lfo.start(t0); lfo.stop(tEnd);
          lfo.gainNode = lg;
        }
        for (var i = 0; i < oscs.length; i++) {
          var sp = oscs[i];
          var osc = ctx.createOscillator(), og = ctx.createGain();
          osc.type = sp.type || 'sine';
          var f = o.f * (sp.mul || 1);
          osc.frequency.setValueAtTime(f, t0);
          if (o.f1) osc.frequency.exponentialRampToValueAtTime(o.f1 * (sp.mul || 1), t0 + (o.glide || dur));
          osc.detune.value = sp.detune || 0;
          if (lfo) lfo.gainNode.connect(osc.detune);
          og.gain.value = (sp.gain === undefined ? 1 : sp.gain) / oscs.length;
          osc.connect(og); og.connect(input);
          osc.start(t0); osc.stop(tEnd);
        }
        output(g, o, t0, tEnd);
      },

      /** かんたんな音程のある音。f0 から f1 へ音の高さが変わる */
      tone: function (o) {
        if (muted || !ensure()) return;
        var t0 = startTime(o), dur = o.dur || 0.15;
        var osc = ctx.createOscillator(), g = ctx.createGain();
        osc.type = o.type || 'sine';
        osc.frequency.setValueAtTime(o.f0 || 440, t0);
        if (o.f1) osc.frequency.exponentialRampToValueAtTime(o.f1, t0 + dur);
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
        output(g, o, t0, t0 + dur);
        osc.start(t0); osc.stop(t0 + dur + 0.05);
      },

      /** ザッ・シュッなどの雑音。フィルターの高さが f0 から f1 へ変わる */
      noise: function (o) {
        if (muted || !ensure()) return;
        var t0 = startTime(o), dur = o.dur || 0.2;
        var src = ctx.createBufferSource(), bf = ctx.createBiquadFilter(), g = ctx.createGain();
        src.buffer = noiseBuf;
        src.playbackRate.value = o.rate || 1;
        bf.type = o.type || 'bandpass'; bf.Q.value = o.q || 1;
        bf.frequency.setValueAtTime(o.f0 || 1000, t0);
        if (o.f1) bf.frequency.exponentialRampToValueAtTime(o.f1, t0 + dur);
        src.connect(bf); bf.connect(g);
        env(g, t0, o.attack || 0.005, dur, o.vol || 0.2);
        output(g, o, t0, t0 + dur);
        src.start(t0, Math.random() * 0.5); src.stop(t0 + dur + 0.05);
      }
    };
    return api;
  };
})(window);
