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
  // 時間帯の色（p = 1周のうちどこか、0〜1）
  // ------------------------------------------------------------
  var KEYS = [
    { p: 0.00, name: 'dawn',   top: '#8fa9dc', mid: '#e6b9c6', bottom: '#ffd6aa', far: '#c79a9a', mid2: '#dfae8d', near: '#c89a7a', tint: '#ff9a7a', tintA: 0.10, night: 0.15 },
    { p: 0.14, name: 'day',    top: '#9fd9ea', mid: '#d9f0ec', bottom: '#fde8c4', far: '#e3bd90', mid2: '#eec892', near: '#d8ae78', tint: '#ffffff', tintA: 0.00, night: 0.00 },
    { p: 0.46, name: 'day',    top: '#9fd9ea', mid: '#d9f0ec', bottom: '#fde8c4', far: '#e3bd90', mid2: '#eec892', near: '#d8ae78', tint: '#ffffff', tintA: 0.00, night: 0.00 },
    { p: 0.60, name: 'sunset', top: '#7d78c4', mid: '#f29a86', bottom: '#ffc96b', far: '#b8705e', mid2: '#d98a5c', near: '#b8704f', tint: '#ff8a4a', tintA: 0.16, night: 0.05 },
    { p: 0.72, name: 'night',  top: '#1d2552', mid: '#34397a', bottom: '#5a5a98', far: '#2c2f5e', mid2: '#3b3c72', near: '#34355f', tint: '#1d2552', tintA: 0.38, night: 1.00 },
    { p: 0.90, name: 'night',  top: '#1d2552', mid: '#34397a', bottom: '#5a5a98', far: '#2c2f5e', mid2: '#3b3c72', near: '#34355f', tint: '#1d2552', tintA: 0.38, night: 1.00 },
    { p: 1.00, name: 'dawn',   top: '#8fa9dc', mid: '#e6b9c6', bottom: '#ffd6aa', far: '#c79a9a', mid2: '#dfae8d', near: '#c89a7a', tint: '#ff9a7a', tintA: 0.10, night: 0.15 }
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

  /** 距離（m）から、今の空の色などを求める */
  DD.skyAt = function (meters) {
    var p = ((meters / CFG.DAY_CYCLE_M) + CFG.DAY_START) % 1;
    var i = 0;
    while (i < KEYS.length - 2 && KEYS[i + 1].p <= p) i++;
    var a = KEYS[i], b = KEYS[i + 1];
    var t = (p - a.p) / (b.p - a.p);
    t = t * t * (3 - 2 * t); // なめらかに
    return {
      p: p,
      top: mix(a.top, b.top, t), mid: mix(a.mid, b.mid, t), bottom: mix(a.bottom, b.bottom, t),
      far: mix(a.far, b.far, t), mid2: mix(a.mid2, b.mid2, t), near: mix(a.near, b.near, t),
      tint: mixA(a.tint, b.tint, t, U.lerp(a.tintA, b.tintA, t)),
      night: U.lerp(a.night, b.night, t)
    };
  };

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
  };

  /** 地面にかける時間帯の色（夜は暗く、夕方はオレンジに） */
  DD.drawGroundTint = function (ctx, cam, sky) {
    var gy = cam.groundY - cam.y * cam.scale;
    ctx.fillStyle = sky.tint;
    ctx.fillRect(0, gy - 2, cam.W, cam.H - gy + 2);
  };
})(window);
