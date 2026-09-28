/*
 * DUST DASH マップ移動画面（ゴールをめざすモードだけ。エンドレスでは出さない）
 * ステージが変わるとゲームを少し止めて、
 *   今のステージの丸 ・・・・・（点線）・・・・・▶ 次のステージの丸
 * を主人公の顔が点線の上を進んでいく。次の丸がぽんと開いて、ステージの名前と特色を見せる。
 * 下には全10ステージの小さな丸がならび、今どこにいるかが分かる。
 */
(function (global) {
  'use strict';
  var DD = global.DD = global.DD || {};
  var COL = DD.COL, D = DD.draw, U = DD.util;

  function T(key, params) { return DD.app.i18n.t(key, params); }

  DD.MAP_LEN = 3.2; // マップ移動画面の長さ（秒）

  // ------------------------------------------------------------
  // 丸の中に、そのステージの景色を小さく描く
  // ------------------------------------------------------------
  DD.drawStageIcon = function (ctx, idx, x, y, r, t, lw) {
    var st = DD.STAGES[Math.max(0, Math.min(DD.STAGES.length - 1, idx))];
    lw = lw === undefined ? 5 : lw;
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
    var gy = y + r * 0.42; // 地面の線
    // 空
    var g = ctx.createLinearGradient(0, y - r, 0, gy);
    g.addColorStop(0, st.top); g.addColorStop(0.6, st.mid); g.addColorStop(1, st.bottom);
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    // 星
    if (st.night > 0.3) {
      ctx.fillStyle = '#fff8dc';
      for (var i = 0; i < 12; i++) {
        ctx.globalAlpha = st.night * (0.5 + 0.5 * Math.sin(t * 3 + i));
        ctx.beginPath(); ctx.arc(x - r + U.hash(i * 3.3 + idx) * r * 2, y - r + U.hash(i * 5.1 + idx) * r * 1.1, r * 0.025 + 0.6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // お日さま・お月さま
    if (st.p < 0.68) {
      var sk = st.p / 0.66, el = Math.sin(Math.PI * sk);
      ctx.fillStyle = st.p < 0.12 || st.p > 0.55 ? '#ff9a5a' : '#ffd66b';
      ctx.beginPath(); ctx.arc(x + r * U.lerp(-0.1, 0.5, sk), U.lerp(gy - r * 0.05, y - r * 0.5, el), r * 0.16, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = '#fff4cf';
      ctx.beginPath(); ctx.arc(x + r * 0.35, y - r * 0.45, r * 0.14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = st.mid;
      ctx.beginPath(); ctx.arc(x + r * 0.41, y - r * 0.49, r * 0.12, 0, Math.PI * 2); ctx.fill();
    }
    // 遠景（ステージの形）
    ctx.fillStyle = st.far;
    var s = r / 60; // 半径60を基準にした大きさ
    function mesa(cx, w, h) {
      ctx.beginPath(); ctx.moveTo(cx - w / 2 - 8 * s, gy); ctx.lineTo(cx - w / 2, gy - h); ctx.lineTo(cx + w / 2, gy - h); ctx.lineTo(cx + w / 2 + 8 * s, gy); ctx.closePath(); ctx.fill();
    }
    function saguaro(cx, h, col) {
      var w = h * 0.16;
      ctx.fillStyle = col;
      ctx.beginPath();
      D.roundRect(ctx, cx - w / 2, gy - h, w, h + 2, w / 2);
      D.roundRect(ctx, cx - w * 1.9, gy - h * 0.72, w * 0.8, h * 0.36, w * 0.4);
      D.roundRect(ctx, cx - w * 1.9, gy - h * 0.44, w * 1.6, w * 0.7, w * 0.35);
      D.roundRect(ctx, cx + w * 1.1, gy - h * 0.86, w * 0.8, h * 0.4, w * 0.4);
      D.roundRect(ctx, cx + w * 0.3, gy - h * 0.54, w * 1.6, w * 0.7, w * 0.35);
      ctx.fill();
    }
    switch (st.style) {
      case 'canyon':
        ctx.beginPath(); ctx.moveTo(x - r, gy); ctx.lineTo(x - r, gy - 62 * s); ctx.lineTo(x - 18 * s, gy - 56 * s); ctx.lineTo(x - 14 * s, gy); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x + 8 * s, gy); ctx.lineTo(x + 12 * s, gy - 70 * s); ctx.lineTo(x + r, gy - 64 * s); ctx.lineTo(x + r, gy); ctx.closePath(); ctx.fill();
        break;
      case 'salt':
        ctx.beginPath(); ctx.moveTo(x - r, gy - 10 * s);
        for (i = 0; i <= 8; i++) ctx.lineTo(x - r + i * r / 4, gy - 10 * s - (i % 2 ? 30 : 12) * s * (0.7 + U.hash(i) * 0.6));
        ctx.lineTo(x + r, gy); ctx.lineTo(x - r, gy); ctx.closePath(); ctx.fill();
        ctx.fillStyle = st.mid2; ctx.fillRect(x - r, gy - 10 * s, r * 2, 12 * s);
        break;
      case 'cactus':
        mesa(x - 30 * s, 40 * s, 22 * s);
        saguaro(x - 22 * s, 50 * s, st.mid2);
        saguaro(x + 26 * s, 64 * s, st.near);
        break;
      case 'dunes':
        ctx.beginPath(); ctx.moveTo(x - r, gy);
        for (i = 0; i <= 12; i++) ctx.lineTo(x - r + i * r / 6, gy - (20 + 12 * Math.sin(i * 0.9)) * s);
        ctx.lineTo(x + r, gy); ctx.closePath(); ctx.fill();
        break;
      case 'spires':
        for (i = 0; i < 3; i++) {
          var px = x + (i - 1) * 30 * s, ph = (44 + i * 12 - (i === 2 ? 20 : 0)) * s, pw = 9 * s;
          ctx.beginPath(); ctx.moveTo(px - pw, gy); ctx.lineTo(px - pw * 0.5, gy - ph); ctx.lineTo(px + pw * 0.5, gy - ph); ctx.lineTo(px + pw, gy); ctx.closePath(); ctx.fill();
          ctx.beginPath(); D.ellipse(ctx, px, gy - ph - 3 * s, pw, 5 * s, 0); ctx.fill();
        }
        break;
      case 'oasis':
        ctx.beginPath(); ctx.moveTo(x - r, gy);
        for (i = 0; i <= 12; i++) ctx.lineTo(x - r + i * r / 6, gy - (14 + 8 * Math.sin(i * 0.8)) * s);
        ctx.lineTo(x + r, gy); ctx.closePath(); ctx.fill();
        break;
      default: // mesa・storm
        mesa(x - 18 * s, 50 * s, 34 * s);
        mesa(x + 32 * s, 34 * s, 22 * s);
    }
    // 地面
    ctx.fillStyle = st.sand; ctx.fillRect(x - r, gy, r * 2, r);
    ctx.fillStyle = st.sandDark; ctx.fillRect(x - r, gy + r * 0.3, r * 2, r);
    // ステージの特色の小物
    if (st.style === 'oasis') {
      ctx.fillStyle = '#5fb3d6'; ctx.beginPath(); D.ellipse(ctx, x + 10 * s, gy + 8 * s, 26 * s, 6 * s, 0); ctx.fill();
      DD.drawPalm(ctx, x - 22 * s, gy + 2, 52 * s, 1, null, Math.max(1.5, 2.5 * s), t);
    } else if (st.style === 'storm') {
      ctx.strokeStyle = 'rgba(255, 236, 200, 0.8)'; ctx.lineWidth = 2.5 * s; ctx.lineCap = 'round';
      for (i = 0; i < 4; i++) {
        var sy = y - 20 * s + i * 14 * s, sx = x - r + ((t * 60 * s + i * 37 * s) % (r * 2));
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 22 * s, sy - 2 * s); ctx.stroke();
      }
      // 回転草
      ctx.save(); ctx.translate(x + 18 * s, gy - 8 * s); ctx.rotate(-t * 3);
      ctx.strokeStyle = '#8a5a32'; ctx.lineWidth = 2 * s;
      for (i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(0, 0, 8 * s, i * 1.6, i * 1.6 + 2); ctx.stroke(); }
      ctx.restore();
    } else if (st.key === 'salt') {
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(x - r, gy, r * 2, 4 * s);
    } else if (st.key === 'night') {
      for (i = 0; i < 4; i++) {
        var fx = x - 30 * s + i * 20 * s, fy = y - 5 * s + Math.sin(t * 2 + i) * 6 * s;
        var gg = ctx.createRadialGradient(fx, fy, 0, fx, fy, 6 * s);
        gg.addColorStop(0, 'rgba(230,255,140,0.95)'); gg.addColorStop(1, 'rgba(230,255,140,0)');
        ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(fx, fy, 6 * s, 0, Math.PI * 2); ctx.fill();
      }
    } else if (st.key === 'predawn') {
      ctx.fillStyle = 'rgba(230, 225, 255, 0.35)';
      ctx.beginPath(); D.ellipse(ctx, x - 10 * s, gy - 4 * s, 50 * s, 8 * s, 0); ctx.fill();
    } else if (st.key === 'desert') {
      DD.KINDS.bug.draw(ctx, { x: x + 20 * s, y: gy - 2 * s, t: t, air: false });
    }
    // 時間帯の色
    if (st.tintA > 0) { ctx.globalAlpha = st.tintA; ctx.fillStyle = st.tint; ctx.fillRect(x - r, gy, r * 2, r); ctx.globalAlpha = 1; }
    ctx.restore();
    // ふち
    if (lw > 0) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.lineWidth = lw; ctx.strokeStyle = COL.line; ctx.stroke(); }
  };

  /** オオミチバシリの顔（小さなアイコン） */
  function runnerHead(ctx, x, y, k) {
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    D.shape(ctx, function (c) { c.moveTo(-4, -12); c.lineTo(-10, -22); c.lineTo(-1, -14); c.lineTo(2, -24); c.lineTo(5, -13); c.closePath(); }, COL.rrDark, 2.5);
    D.oval(ctx, 0, 0, 14, 13, 0, COL.rrBrown, 3.5);
    D.shape(ctx, function (c) { c.moveTo(10, -3); c.lineTo(26, 1); c.lineTo(10, 5); c.closePath(); }, COL.rrBeak, 3);
    D.oval(ctx, 5, -4, 4.5, 4.5, 0, COL.white, 2);
    ctx.fillStyle = COL.line; ctx.beginPath(); D.ellipse(ctx, 6, -4, 2.2, 2.6, 0); ctx.fill();
    ctx.fillStyle = COL.rrEyePatch; ctx.beginPath(); D.ellipse(ctx, 10, -7, 3, 2, 0.3); ctx.fill();
    ctx.restore();
  }

  /**
   * マップ移動画面を描く（UI座標）。m = { from, to, t }
   */
  DD.drawMapTransition = function (app, ctx, m) {
    var ui = app.ui, t = m.t, L = DD.MAP_LEN, n = DD.STAGES.length;
    var fadeIn = U.clamp(t / 0.25, 0, 1), fadeOut = U.clamp((L - t) / 0.3, 0, 1);
    var a = Math.min(fadeIn, fadeOut);
    ctx.save();
    ctx.globalAlpha = a;
    var bg = ctx.createLinearGradient(0, 0, 0, ui.h);
    bg.addColorStop(0, 'rgba(43, 26, 16, 0.9)'); bg.addColorStop(1, 'rgba(74, 45, 26, 0.9)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, ui.w, ui.h);

    var land = ui.w > ui.h * 1.15;
    var cx = ui.w / 2;
    var avail = ui.h - ui.safeTop - ui.safeBottom;
    var r = Math.min(ui.w * 0.14, 76, avail * 0.15);
    var dist = Math.min(ui.w * 0.27, land ? 200 : 125);
    var cy = ui.safeTop + avail * (land ? 0.4 : 0.42);
    var x0 = cx - dist, x1 = cx + dist;

    // 点線（ゆるい山なり）
    var travel = U.clamp((t - 0.35) / 1.15, 0, 1);
    var ease = travel * travel * (3 - 2 * travel);
    function arcPt(k) { return { x: U.lerp(x0 + r, x1 - r, k), y: cy - Math.sin(k * Math.PI) * r * 0.55 }; }
    var dots = 11;
    for (var i = 0; i <= dots; i++) {
      var k = i / dots, pt = arcPt(k);
      var passed = k <= ease;
      D.oval(ctx, pt.x, pt.y, passed ? 6 : 4.5, passed ? 6 : 4.5, 0, passed ? COL.good : 'rgba(255,246,226,0.55)', passed ? 2.5 : 0);
    }
    // 今までのステージの丸（クリア済み）
    DD.drawStageIcon(ctx, m.from, x0, cy, r * 0.82, t, 5);
    ctx.save();
    ctx.globalAlpha *= 0.9;
    D.oval(ctx, x0 + r * 0.55, cy + r * 0.55, 15, 15, 0, '#6cc06b', 3.5);
    ctx.strokeStyle = COL.white; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x0 + r * 0.55 - 7, cy + r * 0.55); ctx.lineTo(x0 + r * 0.55 - 2, cy + r * 0.55 + 5); ctx.lineTo(x0 + r * 0.55 + 7, cy + r * 0.55 - 5); ctx.stroke();
    ctx.restore();
    D.text(ctx, T('stage_' + DD.STAGES[m.from].key), x0, cy + r * 0.82 + 22, { size: 15, fill: COL.cream, lw: 0, maxW: dist * 1.2 });

    // 次のステージの丸：主人公が着いたら、ぽんと開く
    var open = U.clamp((t - 1.5) / 0.35, 0, 1);
    var pop = open > 0 ? U.easeOutBack(open) : 0;
    var r2 = r * (0.82 + 0.28 * pop);
    if (open <= 0) {
      D.oval(ctx, x1, cy, r * 0.82, r * 0.82, 0, 'rgba(255,246,226,0.18)', 4);
      D.text(ctx, '?', x1, cy + 2, { size: r * 0.8, fill: 'rgba(255,246,226,0.6)', lw: 0 });
    } else {
      // 光の輪
      ctx.save();
      ctx.globalAlpha *= (1 - open) * 0.8 + 0.2;
      ctx.strokeStyle = COL.good; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(x1, cy, r2 + 8 + (1 - open) * 30, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      DD.drawStageIcon(ctx, m.to, x1, cy, r2, t, 6);
    }
    // 主人公の顔：点線の上を進む
    var hp = arcPt(ease);
    if (t < 1.5) runnerHead(ctx, hp.x, hp.y - 16 - Math.abs(Math.sin(t * 14)) * 5, 1.3);
    else runnerHead(ctx, x1 - r2 * 0.6, cy - r2 * 0.75 - Math.abs(Math.sin(t * 6)) * 4, 1.3);

    // 名前と特色（開いてから）
    var last = m.to >= n - 1;
    var ty = cy - r2 - 30;
    ctx.save();
    var lk = open > 0 ? U.easeOutBack(U.clamp((t - 1.6) / 0.3, 0, 1)) : 0;
    if (lk > 0) {
      ctx.save(); ctx.translate(x1, ty); ctx.scale(lk, lk);
      D.text(ctx, last ? T('finalStage') : T('stage', { n: m.to + 1 }), 0, 0, { size: 30, fill: last ? COL.bad : COL.accent, maxW: dist * 1.6 });
      ctx.restore();
      var nameY = cy + r2 + 32;
      D.text(ctx, T('stage_' + DD.STAGES[m.to].key), land ? x1 : cx, land ? nameY : nameY, { size: 26, fill: COL.white, lw: 6, maxW: land ? dist * 1.7 : ui.w - 30 });
      D.text(ctx, T('stageDesc_' + DD.STAGES[m.to].key), cx, nameY + 38, { size: 18, fill: COL.good, lw: 5, maxW: ui.w - 30 });
    }
    ctx.restore();

    // 下：全ステージの小さな丸（今どこか）
    var rowY = Math.min(ui.h - ui.safeBottom - 40, cy + r * 1.1 + 110);
    var sp = Math.min(34, (ui.w - 60) / n), rr = Math.min(11, sp * 0.36);
    var rx0 = cx - sp * (n - 1) / 2;
    ctx.strokeStyle = 'rgba(255,246,226,0.4)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(rx0, rowY); ctx.lineTo(rx0 + sp * (n - 1), rowY); ctx.stroke();
    for (i = 0; i < n; i++) {
      var here = i === m.to;
      var px = rx0 + sp * i;
      if (here) DD.drawStageIcon(ctx, i, px, rowY, rr * 1.7, t, 3);
      else D.oval(ctx, px, rowY, rr, rr, 0, i < m.to ? COL.good : 'rgba(255,246,226,0.35)', 2.5);
    }
    // ゴールの旗
    var gx = rx0 + sp * (n - 1) + sp * 0.7;
    ctx.strokeStyle = COL.cream; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(gx, rowY + 10); ctx.lineTo(gx, rowY - 16); ctx.stroke();
    D.shape(ctx, function (c) { c.moveTo(gx, rowY - 16); c.lineTo(gx + 14, rowY - 11); c.lineTo(gx, rowY - 6); c.closePath(); }, COL.bad, 2);

    // タップで先へ
    if (t > 0.8) D.text(ctx, T('tapToSkip'), cx, Math.min(ui.h - ui.safeBottom - 14, rowY + 30), { size: 13, fill: 'rgba(255,246,226,0.7)', lw: 0 });
    ctx.restore();
  };
})(window);
