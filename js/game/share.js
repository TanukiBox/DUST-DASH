/*
 * DUST DASH 結果のシェア（段階2：M）
 * ・結果画面の「シェア」ボタンで、記録の画像（1200×630）と文章を作る
 * ・スマホ：ブラウザの共有シート（画像つき）を開く → X アプリなどを選んで投稿
 * ・共有シートが使えないとき（PC など）：X の投稿画面を開く（文章とハッシュタグ入り）
 * ・ゲームを公開した URL は config.js の SHARE_URL に書く（空なら、公開中のページの URL を使う）
 */
(function (global) {
  'use strict';
  var DD = global.DD = global.DD || {};
  var CFG = DD.CFG, COL = DD.COL, D = DD.draw, U = DD.util;

  function T(key, params) { return DD.app.i18n.t(key, params); }

  /** 結果から「どこまで行ったか」 */
  function reached(res) {
    var n = DD.STAGES.length;
    var idx = Math.floor(res.distance / CFG.STAGE_M);
    var st = res.endless ? DD.stageAt(idx, true) : DD.STAGES[Math.min(n - 1, idx)];
    return { idx: res.endless ? idx : Math.min(n - 1, idx), stage: st };
  }

  /** シェアする文章 */
  DD.shareText = function (res) {
    var r = reached(res);
    var p = { speed: res.maxSpeed, dist: res.distance, n: r.idx + 1, stage: T('stage_' + r.stage.key) };
    var key = res.cleared ? 'shareClear' : res.endless ? 'shareEndless' : 'shareRun';
    return T(key, p) + '\n' + T('shareTags');
  };

  /** 公開しているゲームの URL（分からなければ空） */
  DD.shareUrl = function () {
    if (CFG.SHARE_URL) return CFG.SHARE_URL;
    var loc = global.location;
    if (!loc || !/^https?:$/.test(loc.protocol)) return '';
    if (/claude|anthropic|localhost|127\.0\.0\.1/.test(loc.hostname)) return ''; // 試遊用のページは共有しない
    return loc.origin + loc.pathname;
  };

  /** シェア用の画像（1200×630）を描く */
  DD.makeShareCard = function (res) {
    var W = 1200, H = 630;
    var c = document.createElement('canvas'); c.width = W; c.height = H;
    var ctx = c.getContext('2d');
    var r = reached(res), st = r.stage, t = 1.2;
    // 空と地面（行ったステージの景色）
    var g = ctx.createLinearGradient(0, 0, 0, H * 0.72);
    g.addColorStop(0, st.top); g.addColorStop(0.6, st.mid); g.addColorStop(1, st.bottom);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = st.far;
    ctx.beginPath(); ctx.moveTo(0, H * 0.72);
    for (var x = 0; x <= W; x += 20) ctx.lineTo(x, H * 0.72 - 60 - 40 * Math.sin(x * 0.006) - 25 * Math.sin(x * 0.017 + 1));
    ctx.lineTo(W, H * 0.72); ctx.closePath(); ctx.fill();
    ctx.fillStyle = st.sand; ctx.fillRect(0, H * 0.72, W, H);
    ctx.fillStyle = st.sandDark; ctx.fillRect(0, H * 0.84, W, H);
    ctx.strokeStyle = COL.line; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(0, H * 0.72); ctx.lineTo(W, H * 0.72); ctx.stroke();
    if (st.night > 0.3) {
      ctx.fillStyle = '#fff8dc';
      for (var i = 0; i < 60; i++) { ctx.globalAlpha = 0.5 + U.hash(i) * 0.5; ctx.beginPath(); ctx.arc(U.hash(i * 3.1) * W, U.hash(i * 7.7) * H * 0.55, 1.5 + U.hash(i * 1.3) * 2, 0, Math.PI * 2); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
    // 主人公（大きく、走っている）と、うしろのタカ（ゴールしたら池とヤシ）
    ctx.save();
    ctx.translate(250, H * 0.72); ctx.scale(2.6, 2.6);
    DD.drawRoadrunner(ctx, 0, 0, { phase: 1.1, time: t, speedN: 0.9, air: false, vy: 0, stretch: 0, eat: 0, blink: 0 });
    ctx.restore();
    if (res.cleared) {
      DD.drawPalm(ctx, 470, H * 0.72, 260, -1, null, 5, 0);
    } else {
      DD.drawHawk(ctx, 110, 150, { t: 0.4, dive: 0, angle: 0.15, scale: 1.4 });
    }
    // 右側の記録の札
    var px = 560, py = 40, pw = 600, ph = 520;
    D.shape(ctx, function (k) { D.roundRect(k, px, py + 8, pw, ph, 36); }, COL.sandDeep, 6);
    D.shape(ctx, function (k) { D.roundRect(k, px, py, pw, ph, 36); }, 'rgba(255,246,226,0.96)', 6);
    D.text(ctx, 'DUST DASH', px + pw / 2, py + 62, { size: 64, font: DD.FONT_TITLE, weight: '400', fill: COL.good, lw: 14 });
    var head = res.cleared ? T('escaped') : res.fell ? T('fellHole') : res.crashed ? T('crashed') : res.endless ? 'ENDLESS' : T('caught');
    D.text(ctx, head, px + pw / 2, py + 132, { size: 36, fill: res.cleared ? '#3f8a45' : COL.bad, lw: 0, maxW: pw - 60 });
    D.text(ctx, T('topSpeed'), px + pw / 2, py + 190, { size: 28, fill: COL.sandDeep, lw: 0 });
    var num = String(res.maxSpeed), nw = D.measure(ctx, num, 130), uw = D.measure(ctx, 'km/h', 40);
    var sx = px + pw / 2 - (nw + 12 + uw) / 2;
    D.text(ctx, num, sx, py + 270, { size: 130, fill: COL.accent, align: 'left', lw: 20 });
    D.text(ctx, 'km/h', sx + nw + 12, py + 300, { size: 40, fill: COL.ink, align: 'left', lw: 0 });
    // 距離とステージ
    DD.drawStageIcon(ctx, r.idx % DD.STAGES.length, px + 110, py + 420, 62, t, 5);
    var stLabel = res.cleared ? 'GOAL!' : res.endless ? '∞ ' + T('stage', { n: r.idx + 1 }) : T('stage', { n: r.idx + 1 }) + ' / ' + DD.STAGES.length;
    D.text(ctx, stLabel, px + 200, py + 384, { size: 30, fill: COL.accent, lw: 0, align: 'left', maxW: pw - 230 });
    D.text(ctx, T('stage_' + st.key), px + 200, py + 424, { size: 30, fill: COL.ink, lw: 0, align: 'left', maxW: pw - 230 });
    D.text(ctx, res.distance + ' m', px + 200, py + 470, { size: 40, fill: COL.ink, lw: 0, align: 'left' });
    // 作者
    D.text(ctx, 'Tanuki Box', W - 30, H - 30, { size: 24, fill: COL.cream, lw: 6, align: 'right' });
    return c;
  };

  /** 画像を File にする（共有シートに渡す。同期で作って、タップの直後に共有を始められるように） */
  function canvasToFile(c) {
    var url = c.toDataURL('image/png');
    var bin = global.atob(url.split(',')[1]), arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new File([arr], 'dust-dash.png', { type: 'image/png' });
  }

  /** X の投稿画面の URL */
  DD.shareIntentUrl = function (text, url) {
    var q = 'text=' + encodeURIComponent(text);
    if (url) q += '&url=' + encodeURIComponent(url);
    return 'https://x.com/intent/post?' + q;
  };

  /** シェアする。まず画像つきの共有シート、だめなら X の投稿画面 */
  DD.shareResult = function (res) {
    var text = DD.shareText(res), url = DD.shareUrl();
    var nav = global.navigator;
    try {
      if (nav && nav.share && nav.canShare) {
        var file = canvasToFile(DD.makeShareCard(res));
        var data = { files: [file], text: url ? text + '\n' + url : text };
        if (nav.canShare(data)) {
          nav.share(data).catch(function (e) {
            if (e && e.name === 'AbortError') return; // 自分で閉じた
            openIntent(text, url);
          });
          return 'sheet';
        }
      }
    } catch (e) { /* 使えないときは下へ */ }
    openIntent(text, url);
    return 'intent';
  };

  function openIntent(text, url) {
    var href = DD.shareIntentUrl(text, url);
    var w = null;
    try { w = global.open(href, '_blank'); if (w) w.opener = null; } catch (e) { w = null; }
    if (!w) {
      // 新しいタブが開けないとき（埋めこみ表示など）：リンクを押したことにする
      var a = document.createElement('a');
      a.href = href; a.target = '_blank'; a.rel = 'noopener';
      document.body.appendChild(a); a.click(); a.remove();
    }
  }
})(window);
