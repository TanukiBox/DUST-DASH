/*
 * DUST DASH BGM（音楽ファイルは使わず、ブラウザの中で演奏する）
 * ・曲は「16分音符ずつの升目」に音名を並べた楽譜で書く
 *     'A4'  … その升目でラ（4オクターブ目）を鳴らす
 *     '-'   … 前の音をのばす
 *     '.'   … 休み
 *     'A3+C4+E4' … 和音
 *   ドラムは k（バスドラム）・s（スネア）・h（ハイハット）の組み合わせ（'kh' なら同時）
 * ・砂漠らしく「Am → G → F → E」（スペイン風の下がっていく和音）が土台
 * ・ステージが進むと調と速さが上がる。フィーバー中はハイハットが細かくなり、メロディが1オクターブ上に
 *
 *   var bgm = DD.createBgm(sound);
 *   bgm.play('title');   // 'title' | 'play' | 'ending'（2つ目に true で、同じ曲でも頭から）
 *   bgm.setStage(2);     // プレイ中のステージ（0から）
 *   bgm.setFever(true);
 *   bgm.stop(1.0);       // 1秒でフェードアウト
 */
(function (global) {
  'use strict';
  var DD = global.DD = global.DD || {};

  var NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function freq(name) {
    var m = /^([A-G])(#|b)?(-?\d)$/.exec(name);
    if (!m) return null;
    var n = NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (parseInt(m[3], 10) + 1) * 12;
    return 440 * Math.pow(2, (n - 69) / 12);
  }

  /** 楽譜の文字列を「升目ごとの出来事」の配列にする */
  function parse(score) {
    var tok = score.replace(/\|/g, ' ').trim().split(/\s+/);
    var out = [];
    for (var i = 0; i < tok.length; i++) {
      var t = tok[i];
      if (t === '-' || t === '.') { out.push(null); continue; }
      var len = 1;
      while (tok[i + len] === '-') len++;
      if (/^[ksh]+$/.test(t)) { out.push({ drum: t, len: 1 }); continue; }
      out.push({ notes: t.split('+').map(freq), len: len });
    }
    return out;
  }

  // 同じ形をくり返す楽譜を作る補助
  function rep(s, n) { var a = []; for (var i = 0; i < n; i++) a.push(s); return a.join(' | '); }

  // ギャロップ（馬が走るような）ベース：根音と5度
  function gallop(r, f) { return [r, '.', r, r, f, '.', r, r, r, '.', r, r, f, '.', f, r].join(' '); }
  // 裏拍に和音をきざむ
  function stab(ch) { return ['.', '.', ch, '.', '.', '.', ch, '.', '.', '.', ch, '.', '.', '.', ch, '.'].join(' '); }

  var Am = 'A3+C4+E4', G = 'G3+B3+D4', F = 'F3+A3+C4', E = 'E3+G#3+B3', C = 'C4+E4+G4', Gh = 'G3+B3+D4';

  var TRACKS = {
    // ---- タイトル：ゆったり。アルペジオとやさしいメロディ ----
    title: {
      bpm: 96,
      parts: [
        { inst: 'bass', score: 'A2 - - - - - - - E2 - - - - - - - | G2 - - - - - - - D2 - - - - - - - | F2 - - - - - - - C3 - - - - - - - | E2 - - - - - - - B2 - - - G#2 - - - ' +
                               '| A2 - - - - - - - E2 - - - - - - - | G2 - - - - - - - D2 - - - - - - - | F2 - - - - - - - C3 - - - - - - - | E2 - - - - - - - E2 - - - - - - -' },
        { inst: 'arp', score: rep('A3 . C4 . E4 . A4 . E4 . C4 . E4 . C4 .', 1) + ' | G3 . B3 . D4 . G4 . D4 . B3 . D4 . B3 . | F3 . A3 . C4 . F4 . C4 . A3 . C4 . A3 . | E3 . G#3 . B3 . E4 . B3 . G#3 . B3 . G#3 .' +
                              ' | A3 . C4 . E4 . A4 . E4 . C4 . E4 . C4 . | G3 . B3 . D4 . G4 . D4 . B3 . D4 . B3 . | F3 . A3 . C4 . F4 . C4 . A3 . C4 . A3 . | E3 . G#3 . B3 . E4 . B3 . G#3 . B3 . G#3 .' },
        { inst: 'soft', score: 'E5 - - - - - - - A4 - C5 - E5 - - - | D5 - - - - - - - G4 - B4 - D5 - - - | C5 - - - - - A4 - C5 - - - F5 - E5 - | E5 - - - - - - - - - - - . . . . ' +
                               '| C5 - - - B4 - A4 - E5 - - - - - - - | D5 - - - C5 - B4 - G5 - - - - - - - | F5 - - - E5 - C5 - A4 - - - C5 - - - | B4 - - - - - - - G#4 - - - - - - -' },
        { inst: 'drum', score: rep('k . . . . . h . . . . . . . h .', 8) }
      ]
    },
    // ---- プレイ：速いギャロップ。A（8小節）＋B（8小節） ----
    play: {
      bpm: 140,
      parts: [
        { inst: 'bass', score: [gallop('A2', 'E3'), gallop('G2', 'D3'), gallop('F2', 'C3'), gallop('E2', 'B2'),
                                gallop('A2', 'E3'), gallop('G2', 'D3'), gallop('F2', 'C3'), gallop('E2', 'B2'),
                                gallop('F2', 'C3'), gallop('G2', 'D3'), gallop('A2', 'E3'), gallop('A2', 'E3'),
                                gallop('F2', 'C3'), gallop('G2', 'D3'), gallop('E2', 'B2'), gallop('E2', 'B2')].join(' | ') },
        { inst: 'chord', score: [stab(Am), stab(G), stab(F), stab(E), stab(Am), stab(G), stab(F), stab(E),
                                 stab(F), stab(G), stab(Am), stab(Am), stab(F), stab(G), stab(E), stab(E)].join(' | ') },
        { inst: 'lead', score:
          'A4 - C5 - E5 - D5 C5 D5 - C5 - A4 - - - | G4 - B4 - D5 - C5 B4 C5 - B4 - G4 - - - | F4 - A4 - C5 - D5 E5 F5 - E5 - C5 - - - | E5 - - - D5 - C5 - B4 - - - G#4 - - - | ' +
          'E5 - E5 - A5 - G5 E5 D5 - E5 - C5 - A4 - | D5 - D5 - G5 - F5 D5 B4 - D5 - G4 - B4 - | C5 - C5 - F5 - E5 C5 A4 - C5 - F5 - E5 - | E5 - F5 - E5 - D5 - B4 - - - G#4 - B4 - | ' +
          'A4 - - - C5 - A4 - F4 - - - A4 - C5 - | B4 - - - D5 - B4 - G4 - - - B4 - D5 - | C5 - - - E5 - C5 - A4 - - - C5 - E5 - | A5 - - - - - G5 - E5 - - - - - - - | ' +
          'A5 - - - G5 - F5 - E5 - F5 - A5 - - - | G5 - - - F5 - E5 - D5 - E5 - G5 - - - | E5 - - - D5 - C5 - B4 - C5 - D5 - - - | E5 - - - - - - - G#4 - - - B4 - - -' },
        { inst: 'drum', score: rep('kh . h . sh . h k kh . h . sh . h h', 16) }
      ]
    },
    // ---- エンディング：明るい長調のファンファーレ ----
    ending: {
      bpm: 120,
      parts: [
        { inst: 'bass', score: 'C3 . . . G2 . . . C3 . . . G2 . . . | G2 . . . D3 . . . G2 . . . D3 . . . | A2 . . . E3 . . . A2 . . . E3 . . . | F2 . . . C3 . . . F2 . . . C3 . . . | ' +
                               'C3 . . . G2 . . . C3 . . . G2 . . . | G2 . . . D3 . . . G2 . . . D3 . . . | F2 . . . C3 . . . G2 . . . D3 . . . | C3 - - - - - - - C2 - - - - - - -' },
        { inst: 'chord', score: [stab(C), stab(Gh), stab(Am), stab(F), stab(C), stab(Gh), 'F3+A3+C4 . . . . . F3+A3+C4 . G3+B3+D4 . . . . . G3+B3+D4 .', 'C4+E4+G4 - - - - - - - . . . . . . . .'].join(' | ') },
        { inst: 'lead', score: 'C5 - E5 - G5 - - - E5 - G5 - C6 - - - | B5 - - - A5 - G5 - D5 - - - G5 - - - | A5 - G5 - E5 - - - C5 - E5 - A5 - - - | G5 - - - F5 - E5 - F5 - - - - - - - | ' +
                               'E5 - E5 - G5 - E5 - C6 - - - G5 - - - | D5 - D5 - G5 - D5 - B5 - - - G5 - - - | A5 - - - C6 - A5 - G5 - - - B5 - D6 - | C6 - - - - - - - - - - - . . . .' },
        { inst: 'drum', score: rep('kh . h . sh . h . kh . h . sh . h h', 7) + ' | kh . . . . . . . . . . . . . . .' }
      ]
    }
  };
  for (var name in TRACKS) {
    var tr = TRACKS[name], len = 0;
    for (var i = 0; i < tr.parts.length; i++) { tr.parts[i].ev = parse(tr.parts[i].score); len = Math.max(len, tr.parts[i].ev.length); }
    tr.len = len;
  }

  DD.BGM_TRACKS = TRACKS; // 確認用

  // プレイ中のステージごとの調（半音）と速さ
  var STAGE_SHIFT = [0, 2, 3, -2, 5];
  var STAGE_BPM = [140, 144, 148, 150, 158];

  DD.createBgm = function (sound) {
    var S = sound;
    var cur = null, step = 0, nextTime = null, shift = 0, bpm = 120, fever = false;
    var pendingStage = null, timer = null, gen = 0;

    function play1(inst, f, at, dur) {
      switch (inst) {
        case 'bass':
          S.tone({ type: 'triangle', f0: f, dur: dur * 0.9, vol: 0.2, at: at, bus: 'music' });
          break;
        case 'chord':
          S.tone({ type: 'square', f0: f, dur: Math.min(dur, 0.12), vol: 0.022, at: at, bus: 'music', filter: { type: 'lowpass', f: 1800, q: 0.5 } });
          break;
        case 'arp':
          S.tone({ type: 'triangle', f0: f, dur: 0.3, vol: 0.06, at: at, bus: 'music' });
          break;
        case 'soft':
          S.tone({ type: 'triangle', f0: f, dur: dur * 0.95, vol: 0.08, at: at, bus: 'music', attack: 0.03, vibrato: { rate: 5, depth: f * 0.006 } });
          break;
        default: // lead
          var ff = fever ? f * 2 : f;
          S.tone({ type: 'square', f0: ff, dur: dur * 0.92, vol: 0.045, at: at, bus: 'music', attack: 0.01,
            filter: { type: 'lowpass', f: 2600, q: 0.7 }, vibrato: dur > 0.3 ? { rate: 6, depth: ff * 0.008 } : null });
      }
    }
    function drum(d, at) {
      if (d.indexOf('k') >= 0) S.tone({ type: 'sine', f0: 150, f1: 45, dur: 0.14, vol: 0.28, at: at, bus: 'music' });
      if (d.indexOf('s') >= 0) {
        S.noise({ f0: 2000, f1: 900, dur: 0.12, vol: 0.09, q: 0.8, at: at, bus: 'music' });
        S.tone({ type: 'triangle', f0: 200, f1: 140, dur: 0.06, vol: 0.06, at: at, bus: 'music' });
      }
      if (d.indexOf('h') >= 0) S.noise({ type: 'highpass', f0: 7000, dur: 0.035, vol: 0.035, at: at, bus: 'music' });
    }

    function schedule(at) {
      var sd = 60 / bpm / 4, k = Math.pow(2, shift / 12);
      for (var i = 0; i < cur.parts.length; i++) {
        var p = cur.parts[i], e = p.ev[step % p.ev.length];
        if (!e) continue;
        if (e.drum) { drum(e.drum, at); continue; }
        for (var n = 0; n < e.notes.length; n++) if (e.notes[n]) play1(p.inst, e.notes[n] * k, at, e.len * sd);
      }
      // フィーバー中はハイハットを16分で
      if (fever && cur === TRACKS.play && step % 2 === 1) S.noise({ type: 'highpass', f0: 8000, dur: 0.03, vol: 0.03, at: at, bus: 'music' });
    }

    function tick() {
      if (!cur) return;
      var now = S.now();
      if (now === null) { nextTime = null; return; } // まだ音が使えない・タブが裏にある
      if (nextTime === null || nextTime < now - 0.2) nextTime = now + 0.06; // 止まっていたら、今から続ける
      while (nextTime < now + 0.25) {
        if (step % 16 === 0 && pendingStage !== null) { applyStage(pendingStage); pendingStage = null; }
        schedule(nextTime);
        nextTime += 60 / bpm / 4;
        step = (step + 1) % cur.len;
      }
    }

    function applyStage(i) {
      i = Math.max(0, Math.min(STAGE_SHIFT.length - 1, i));
      shift = STAGE_SHIFT[i]; bpm = STAGE_BPM[i];
    }

    var api = {
      /** 曲をはじめから流す（同じ曲がもう流れていたら、そのまま） */
      play: function (name, restart) {
        var tr = TRACKS[name];
        if (!tr || (cur === tr && !restart)) return;
        gen++;
        cur = tr; step = 0; nextTime = null; fever = false; pendingStage = null;
        shift = 0; bpm = tr.bpm;
        S.musicVolume(0.45, 0.05);
        if (!timer) timer = global.setInterval(tick, 30);
        tick();
      },
      /** フェードアウトして止める */
      stop: function (fade) {
        if (!cur) return;
        var my = ++gen;
        fade = fade || 0;
        S.musicVolume(0, fade);
        global.setTimeout(function () {
          if (my !== gen) return; // その間に別の曲が始まった
          cur = null;
          S.musicVolume(0.45, 0.05);
        }, fade * 1000 + 60);
      },
      /** プレイ中のステージ。次の小節の頭から調と速さが変わる */
      setStage: function (i) { if (cur === TRACKS.play) { if (step === 0 && nextTime === null) applyStage(i); else pendingStage = i; } },
      setFever: function (on) { fever = !!on; },
      get playing() { for (var k in TRACKS) if (TRACKS[k] === cur) return k; return null; }
    };
    return api;
  };
})(window);
