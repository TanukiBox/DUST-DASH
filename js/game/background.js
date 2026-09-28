/*
 * DUST DASH 背景：空・遠景・時間帯
 * ・遠くの台地（ゆっくり）→ 砂丘（すこし速く）→ 手前の草木（もっと速く）→ 地面、の順に違う速さで流れる
 * ・距離に応じて「夜明け → 昼 → 夕焼け → 星空」をくり返す（見た目だけ。遊びには影響しない）
 */
(function (global) {
  'use strict';
  var DD = global.DD = global.DD || {};
  var CFG = DD.CFG, COL = DD.COL, D = DD.draw, U = DD.util;

  // ------------------------------------------------------------
  // ステージごとの景色（500 m ごとに切り替わり、4つでひと回り）
  // p = お日さま・お月さまの位置（0.2 朝、0.36 昼、0.6 夕方、0.84 夜）
  // ------------------------------------------------------------
  DD.STAGES = [
    { key: 'desert', p: 0.22, style: 'mesa',
      top: '#9fd9ea', mid: '#d9f0ec', bottom: '#fde8c4', far: '#e3bd90', mid2: '#eec892', near: '#d8ae78', tint: '#ffffff', tintA: 0.00, night: 0.00,
      sand: '#f3cf8e', sandDark: '#e3ae63', sandDeep: '#c98c4a', rock: '#e6b070', rockBand: '#cf9152', cap: '#fbe1a8' },
    { key: 'canyon', p: 0.36, style: 'canyon',
      top: '#86c4e6', mid: '#f5dcc3', bottom: '#ffcf9e', far: '#c4674b', mid2: '#d98452', near: '#a8533a', tint: '#ff7040', tintA: 0.05, night: 0.00,
      sand: '#eaa472', sandDark: '#d17f4c', sandDeep: '#ad5c37', rock: '#d0764a', rockBand: '#a9553a', cap: '#f4b98a' },
    { key: 'sunset', p: 0.60, style: 'mesa',
      top: '#7d78c4', mid: '#f29a86', bottom: '#ffc96b', far: '#b8705e', mid2: '#d98a5c', near: '#b8704f', tint: '#ff8a4a', tintA: 0.16, night: 0.05,
      sand: '#f3cf8e', sandDark: '#e3ae63', sandDeep: '#c98c4a', rock: '#d98a5c', rockBand: '#b8704f', cap: '#f8c98a' },
    { key: 'night', p: 0.84, style: 'dunes',
      top: '#1d2552', mid: '#34397a', bottom: '#5a5a98', far: '#2c2f5e', mid2: '#3b3c72', near: '#34355f', tint: '#1d2552', tintA: 0.38, night: 1.00,
      sand: '#f3cf8e', sandDark: '#e3ae63', sandDeep: '#c98c4a', rock: '#b98a60', rockBand: '#8f6a4a', cap: '#e9cfa0' },
    // 最後のステージ：夜が明けて、朝日の向こうにオアシス（ゴール）
    { key: 'oasis', p: 0.08, style: 'oasis',
      top: '#6f7fc9', mid: '#f7b3b8', bottom: '#ffd59a', far: '#c58f9a', mid2: '#e3a88e', near: '#8f9a5a', tint: '#ff9a7a', tintA: 0.10, night: 0.15,
      sand: '#f3cf8e', sandDark: '#e3ae63', sandDeep: '#c98c4a', rock: '#dca07a', rockBand: '#b97d5e', cap: '#f8d3a8' }
  ];

  function hex(c) { return [parseInt(c.substr(1, 2), 16), parseInt(c.substr(3, 2), 16), parseInt(c.substr(5, 2), 16)]; }
  function mix(a, b, t) {
    var x = hex(a), y = hex(b);
    return 'rgb(' + Math.round(U.lerp(x[0], y[0], t)) + ',' + Math.round(U.lerp(x[1], y[1], t)) + ',' + Math.round(U.lerp(x[2], y[2], t)) + ')';
  }
  function mixA(a, b, t, alpha) {
    var x = hex(a), y = hex(b);
    return 'rgba(' + Math.round(U.lerp(x[0], y[0], t)) + ',' + Math.round(U.lerp(x[1], y[1], t)) + ',' + Math.round(U.lerp(x[2], y[2], t)) + ',' + alpha.toFixed(3) + ')';
  }

  /** 距離（m）から、今のステージと景色の色を求める。ステージの終わり近くで次の景色へなめらかに変わる */
  DD.skyAt = function (meters) {
    var n = DD.STAGES.length;
    var idx = Math.min(n - 1, Math.floor(Math.max(0, meters) / CFG.STAGE_M)); // 最後のステージより先はない（ゴール）
    var local = meters - idx * CFG.STAGE_M;
    var a = DD.STAGES[idx], b = DD.STAGES[Math.min(n - 1, idx + 1)];
    var t = a === b ? 0 : U.clamp((local - (CFG.STAGE_M - CFG.STAGE_BLEND_M)) / CFG.STAGE_BLEND_M, 0, 1);
    t = t * t * (3 - 2 * t);
    var pb = b.p < a.p ? b.p + 1 : b.p;
    var keys = ['top', 'mid', 'bottom', 'far', 'mid2', 'near', 'sand', 'sandDark', 'sandDeep', 'rock', 'rockBand', 'cap'];
    var out = {
      stage: idx, local: local, a: a, b: b, t: t,
      p: U.lerp(a.p, pb, t) % 1,
      tint: mixA(a.tint, b.tint, t, U.lerp(a.tintA, b.tintA, t)),
      night: U.lerp(a.night, b.night, t)
    };
    for (var i = 0; i < keys.length; i++) out[keys[i]] = mix(a[keys[i]], b[keys[i]], t);
    return out;
  };

  /** 今の景色（地面や足場の色に使う） */
  DD.theme = function () { return DD.currentSky; };

  // ------------------------------------------------------------
  // 空（画面の座標）
  // ------------------------------------------------------------
  DD.drawSky = function (ctx, W, H, groundY, sky, time) {
    var g = ctx.createLinearGradient(0, 0, 0, groundY);
    g.addColorStop(0, sky.top);
    g.addColorStop(0.62, sky.mid);
    g.addColorStop(1, sky.bottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // 星（夜だけ）
    if (sky.night > 0.02) {
      for (var i = 0; i < 70; i++) {
        var sx = U.hash(i * 3.1) * W, sy = U.hash(i * 7.7 + 1) * groundY * 0.85;
        var tw = 0.6 + 0.4 * Math.sin(time * (1.5 + U.hash(i) * 3) + i);
        var r = 1 + U.hash(i * 1.3) * 1.8;
        ctx.globalAlpha = sky.night * tw;
        ctx.fillStyle = '#fff8dc';
        if (i % 9 === 0) D.star(ctx, sx, sy, r * 2.4, 0, '#fff4c2', 0);
        else { ctx.beginPath(); D.ellipse(ctx, sx, sy, r, r, 0); ctx.fill(); }
      }
      ctx.globalAlpha = 1;
    }

    // お日さま（夜明けに昇り、夕焼けで沈む）と、お月さま（夜）
    var R = Math.min(W, H) * 0.07;
    var sunK = U.clamp(sky.p / 0.66, 0, 1);
    if (sky.p < 0.68) {
      var elev = Math.sin(Math.PI * sunK);
      var sy2 = U.lerp(groundY * 0.95, groundY * 0.25, elev);
      var sx2 = U.lerp(W * 0.62, W * 0.9, sunK);
      var low = 1 - elev;
      ctx.beginPath(); D.ellipse(ctx, sx2, sy2, R * 1.7, R * 1.7, 0);
      ctx.fillStyle = low > 0.5 ? 'rgba(255, 170, 110, 0.4)' : 'rgba(255, 236, 170, 0.45)'; ctx.fill();
      ctx.beginPath(); D.ellipse(ctx, sx2, sy2, R, R, 0);
      ctx.fillStyle = mix('#ffd66b', '#ff8f5a', U.clamp(low * 1.3 - 0.2, 0, 1)); ctx.fill();
      ctx.lineWidth = 4; ctx.strokeStyle = mix('#f0a94a', '#d9603a', U.clamp(low, 0, 1)); ctx.stroke();
    } else {
      var mk = (sky.p - 0.68) / 0.32;
      var me = Math.sin(Math.PI * mk);
      var mx = U.lerp(W * 0.6, W * 0.88, mk), my = U.lerp(groundY * 0.9, groundY * 0.22, me);
      ctx.beginPath(); D.ellipse(ctx, mx, my, R * 1.6, R * 1.6, 0);
      ctx.fillStyle = 'rgba(255, 248, 210, 0.15)'; ctx.fill();
      ctx.beginPath(); D.ellipse(ctx, mx, my, R * 0.85, R * 0.85, 0);
      ctx.fillStyle = '#fff4cf'; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = '#e8d58f'; ctx.stroke();
      // 三日月の影
      ctx.beginPath(); D.ellipse(ctx, mx + R * 0.35, my - R * 0.15, R * 0.75, R * 0.75, 0);
      ctx.fillStyle = sky.mid; ctx.fill();
    }
  };

  // ------------------------------------------------------------
  // 遠景（画面の座標）。factor が小さいほどゆっくり流れる
  // ------------------------------------------------------------
  DD.drawBackdrop = function (ctx, cam, sky) {
    // ステージが変わるときは、前の景色と次の景色を重ねて入れかえる
    if (sky.t <= 0.001 || sky.a.style === sky.b.style) { drawStyle(ctx, cam, sky, sky.t < 0.5 ? sky.a.style : sky.b.style); return; }
    ctx.save(); ctx.globalAlpha = 1 - sky.t; drawStyle(ctx, cam, sky, sky.a.style); ctx.restore();
    ctx.save(); ctx.globalAlpha = sky.t; drawStyle(ctx, cam, sky, sky.b.style); ctx.restore();
  };

  function drawStyle(ctx, cam, sky, style) {
    var s = cam.scale, W = cam.W;
    var gy = cam.groundY - cam.y * s;
    if (style === 'canyon') { drawCanyon(ctx, cam, sky, s, W, gy); return; }
    if (style === 'dunes') { drawDunes(ctx, cam, sky, s, W, gy); return; }
    if (style === 'oasis') { drawDunes(ctx, cam, sky, s, W, gy); drawPalmsBack(ctx, cam, sky, s, W, gy); return; }
    drawMesa(ctx, cam, sky);
  }

  function drawMesa(ctx, cam, sky) {
    var s = cam.scale, W = cam.W;
    var gy = cam.groundY - cam.y * s; // 地面の線の高さ（画面）

    // 遠くの台地（メサ）
    var f1 = CFG.PARALLAX_FAR, T1 = 520;
    var off1 = cam.x * f1;
    ctx.fillStyle = sky.far;
    for (var k = Math.floor(off1 / T1) - 1; k * T1 < off1 + W / s + T1; k++) {
      var h1 = U.hash(k + 100), h2 = U.hash(k + 200);
      if (h1 < 0.25) continue;
      var x0 = (k * T1 + h2 * 120 - off1) * s;
      var w = (180 + h1 * 260) * s, h = (70 + h2 * 150) * s;
      var slope = 30 * s;
      ctx.beginPath();
      ctx.moveTo(x0, gy + 2);
      ctx.lineTo(x0 + slope, gy - h + 10 * s);
      ctx.quadraticCurveTo(x0 + slope + 4 * s, gy - h, x0 + slope + 16 * s, gy - h);
      ctx.lineTo(x0 + w - slope - 16 * s, gy - h);
      ctx.quadraticCurveTo(x0 + w - slope - 4 * s, gy - h, x0 + w - slope, gy - h + 10 * s);
      ctx.lineTo(x0 + w, gy + 2);
      ctx.closePath();
      ctx.fill();
      // 台地のしま模様
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x0 + slope + 6 * s, gy - h + 14 * s, w - slope * 2 - 12 * s, 6 * s);
      ctx.fillRect(x0 + slope * 1.3, gy - h * 0.55, w - slope * 2.6, 5 * s);
      ctx.restore();
      ctx.fillStyle = sky.far;
    }

    // 砂丘
    var f2 = CFG.PARALLAX_MID;
    var off2 = cam.x * f2;
    ctx.fillStyle = sky.mid2;
    ctx.beginPath();
    ctx.moveTo(0, gy + 2);
    for (var px = 0; px <= W + 12; px += 12) {
      var lx = px / s + off2;
      var hh = 34 + 22 * Math.sin(lx * 0.0045) + 14 * Math.sin(lx * 0.012 + 1.7);
      ctx.lineTo(px, gy - hh * s);
    }
    ctx.lineTo(W + 12, gy + 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // 手前の草木（シルエット）
    var f3 = CFG.PARALLAX_NEAR, T3 = 260;
    var off3 = cam.x * f3;
    ctx.fillStyle = sky.near;
    for (k = Math.floor(off3 / T3) - 1; k * T3 < off3 + W / s + T3; k++) {
      var r1 = U.hash(k + 300), r2 = U.hash(k + 400);
      if (r1 < 0.45) continue;
      var bx = (k * T3 + r2 * 140 - off3) * s;
      if (r1 > 0.8) {
        // 小さな柱サボテン
        var ch = (38 + r2 * 30) * s, cw = 10 * s;
        ctx.beginPath();
        D.roundRect(ctx, bx - cw / 2, gy - ch, cw, ch + 4, cw / 2);
        D.roundRect(ctx, bx - cw * 1.6, gy - ch * 0.7, cw * 0.7, ch * 0.35, cw * 0.35);
        D.roundRect(ctx, bx - cw * 1.6, gy - ch * 0.42, cw * 1.4, cw * 0.6, cw * 0.3);
        D.roundRect(ctx, bx + cw * 0.9, gy - ch * 0.8, cw * 0.7, ch * 0.3, cw * 0.35);
        D.roundRect(ctx, bx + cw * 0.3, gy - ch * 0.55, cw * 1.3, cw * 0.6, cw * 0.3);
        ctx.fill();
      } else {
        // こんもりした茂み
        var bw = (26 + r2 * 26) * s;
        ctx.beginPath();
        D.ellipse(ctx, bx, gy - bw * 0.25, bw * 0.55, bw * 0.4, 0);
        D.ellipse(ctx, bx + bw * 0.35, gy - bw * 0.15, bw * 0.4, bw * 0.3, 0);
        D.ellipse(ctx, bx - bw * 0.35, gy - bw * 0.12, bw * 0.35, bw * 0.26, 0);
        ctx.fill();
      }
    }
    }

  /** 赤い峡谷：高い崖が並ぶ */
  function drawCanyon(ctx, cam, sky, s, W, gy) {
    var f1 = CFG.PARALLAX_FAR, T1 = 300, off1 = cam.x * f1, k;
    ctx.fillStyle = sky.far;
    for (k = Math.floor(off1 / T1) - 1; k * T1 < off1 + W / s + T1; k++) {
      var h1 = U.hash(k + 510), h2 = U.hash(k + 620);
      var x0 = (k * T1 - off1) * s, w = (T1 * (0.7 + h1 * 0.5)) * s, h = (190 + h2 * 170) * s;
      ctx.beginPath();
      ctx.moveTo(x0, gy + 2);
      ctx.lineTo(x0 + 14 * s, gy - h + 18 * s);
      ctx.quadraticCurveTo(x0 + 18 * s, gy - h, x0 + 40 * s, gy - h);
      ctx.lineTo(x0 + w - 40 * s, gy - h + 6 * s);
      ctx.quadraticCurveTo(x0 + w - 16 * s, gy - h + 6 * s, x0 + w - 12 * s, gy - h + 26 * s);
      ctx.lineTo(x0 + w, gy + 2);
      ctx.closePath(); ctx.fill();
      ctx.save(); ctx.globalAlpha *= 0.16; ctx.fillStyle = '#ffffff';
      for (var q = 1; q < 4; q++) ctx.fillRect(x0 + 16 * s, gy - h * (q / 4.2), w - 32 * s, 5 * s);
      ctx.restore(); ctx.fillStyle = sky.far;
      // ときどき岩のアーチ
      if (h1 > 0.82) {
        ctx.save(); ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath(); D.ellipse(ctx, x0 + w * 0.5, gy, w * 0.22, h * 0.45, 0); ctx.fill();
        ctx.restore(); ctx.fillStyle = sky.far;
      }
    }
    // ごつごつした岩の丘
    var off2 = cam.x * CFG.PARALLAX_MID;
    ctx.fillStyle = sky.mid2;
    ctx.beginPath(); ctx.moveTo(0, gy + 2);
    for (var px = 0; px <= W + 16; px += 16) {
      var lx = px / s + off2;
      var hh = 40 + 30 * Math.abs(Math.sin(lx * 0.006)) + 16 * Math.abs(Math.sin(lx * 0.017 + 1));
      ctx.lineTo(px, gy - hh * s);
    }
    ctx.lineTo(W + 16, gy + 2); ctx.closePath(); ctx.fill();
    // 手前の岩
    var off3 = cam.x * CFG.PARALLAX_NEAR, T3 = 240;
    ctx.fillStyle = sky.near;
    for (k = Math.floor(off3 / T3) - 1; k * T3 < off3 + W / s + T3; k++) {
      var r1 = U.hash(k + 730), r2 = U.hash(k + 840);
      if (r1 < 0.5) continue;
      var bx = (k * T3 + r2 * 120 - off3) * s, bw = (30 + r2 * 40) * s;
      ctx.beginPath(); D.ellipse(ctx, bx, gy, bw, bw * 0.55, 0); ctx.fill();
    }
  }

  /** 星空の砂丘：なだらかな大きな砂丘 */
  function drawDunes(ctx, cam, sky, s, W, gy) {
    var layers = [[CFG.PARALLAX_FAR, sky.far, 90, 0.0022, 0], [CFG.PARALLAX_MID, sky.mid2, 55, 0.004, 2], [CFG.PARALLAX_NEAR, sky.near, 26, 0.009, 4]];
    for (var L = 0; L < layers.length; L++) {
      var f = layers[L], off = cam.x * f[0];
      ctx.fillStyle = f[1];
      ctx.beginPath(); ctx.moveTo(0, gy + 2);
      for (var px = 0; px <= W + 12; px += 12) {
        var lx = px / s + off;
        var hh = f[2] * (0.6 + 0.4 * Math.sin(lx * f[3] + f[4])) + f[2] * 0.3 * Math.sin(lx * f[3] * 2.7 + 1);
        ctx.lineTo(px, gy - hh * s);
      }
      ctx.lineTo(W + 12, gy + 2); ctx.closePath(); ctx.fill();
    }
  }

  /** 夜明けのオアシス：砂丘の手前にヤシの木のシルエット */
  function drawPalmsBack(ctx, cam, sky, s, W, gy) {
    var off = cam.x * CFG.PARALLAX_NEAR, T = 330;
    for (var k = Math.floor(off / T) - 1; k * T < off + W / s + T; k++) {
      var r1 = U.hash(k + 910), r2 = U.hash(k + 920);
      if (r1 < 0.35) continue;
      var bx = (k * T + r2 * 160 - off) * s;
      DD.drawPalm(ctx, bx, gy + 2, (70 + r1 * 50) * s, r2 > 0.5 ? 1 : -1, sky.near, 0, cam.x * 0.001 + k);
    }
  }

  /** 地面にかける時間帯の色（夜は暗く、夕方はオレンジに） */
  DD.drawGroundTint = function (ctx, cam, sky) {
    var gy = cam.groundY - cam.y * cam.scale;
    ctx.fillStyle = sky.tint;
    ctx.fillRect(0, gy - 2, cam.W, cam.H - gy + 2);
  };
})(window);
