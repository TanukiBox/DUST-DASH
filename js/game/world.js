/*
 * DUST DASH 画面の見え方（カメラ）と背景と地面
 */
(function (global) {
  'use strict';
  var DD = global.DD = global.DD || {};
  var CFG = DD.CFG, COL = DD.COL, D = DD.draw, U = DD.util;

  // ------------------------------------------------------------
  // カメラ：スマホ縦でもPC横でも、同じくらいの遊びやすさになるように拡大率を決める
  // ------------------------------------------------------------
  function Camera() {
    this.x = 0;           // 画面左端のゲーム内 x
    this.y = 0;           // 地面の線に来るゲーム内 y（高く跳ぶと上へずれる）
    this.zoom = 1;
    this.anchor = CFG.PLAYER_SCREEN_X;
  }

  /** W, H は画面の大きさ（CSSピクセル） */
  Camera.prototype.fit = function (W, H, speedN) {
    var base = Math.min(W / CFG.VIEW_MIN_W, H / CFG.VIEW_MIN_H);
    var targetZoom = 1 + CFG.ZOOM_OUT_AT_TOP * speedN;
    this.zoom += (targetZoom - this.zoom) * 0.04;
    this.scale = base / this.zoom;
    this.W = W; this.H = H;
    this.viewW = W / this.scale;
    this.viewH = H / this.scale;
    // 縦長ほど地面を上に、横長ほど下に置く
    var t = U.clamp((W / H - 0.6) / (1.4 - 0.6), 0, 1);
    this.groundY = H * U.lerp(0.66, 0.8, t);
  };

  Camera.prototype.follow = function (px, py, dt, floorY) {
    this.x = px - this.viewW * this.anchor;
    // 高い足場にいるときは画面も上へ。高く跳んだら追いかける（頭の上に少し余白）
    var room = this.groundY / this.scale;
    var target = Math.min((floorY || 0) * 0.8, py - 150 + room - 60);
    this.y += (target - this.y) * Math.min(1, dt * 7);
  };

  Camera.prototype.apply = function (ctx, dpr, sx, sy) {
    var s = this.scale * dpr;
    ctx.setTransform(s, 0, 0, s, dpr * (-this.x * this.scale + (sx || 0)), dpr * (this.groundY - this.y * this.scale + (sy || 0)));
  };

  Camera.prototype.toScreen = function (wx, wy) {
    return { x: (wx - this.x) * this.scale, y: this.groundY + (wy - this.y) * this.scale };
  };

  /** 画面に写っているゲーム内の範囲 */
  Camera.prototype.bounds = function () {
    return {
      left: this.x, right: this.x + this.viewW,
      top: this.y - this.groundY / this.scale,
      bottom: this.y + (this.H - this.groundY) / this.scale
    };
  };

  DD.Camera = Camera;

  // 空と遠景は background.js

  // ------------------------------------------------------------
  // 地面：ゲーム内の座標で描く
  // ------------------------------------------------------------
  DD.drawGround = function (ctx, cam, holes) {
    var b = cam.bounds();
    var left = b.left - 40, right = b.right + 40, bottom = b.bottom + 40;
    // 地層（ステージの色）
    var th = DD.theme ? DD.theme() : null;
    ctx.fillStyle = th ? th.sand : COL.sand;
    ctx.fillRect(left, 0, right - left, bottom);
    ctx.fillStyle = th ? th.sandDark : COL.sandDark;
    ctx.fillRect(left, 46, right - left, bottom);
    ctx.fillStyle = th ? th.sandDeep : COL.sandDeep;
    ctx.fillRect(left, 150, right - left, bottom);
    // 地層のさかい目（ゆるい波）
    ctx.strokeStyle = 'rgba(74, 45, 26, 0.25)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (var x = Math.floor(left / 40) * 40; x <= right; x += 40) {
      var yy = 46 + Math.sin(x * 0.02) * 4;
      if (x === Math.floor(left / 40) * 40) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
    }
    ctx.stroke();

    // 小石・ひび（毎回同じ場所に出るよう番号から決める）
    var TILE = 70;
    for (var k = Math.floor(left / TILE); k * TILE < right; k++) {
      var h1 = U.hash(k), h2 = U.hash(k + 0.37), h3 = U.hash(k + 0.71);
      var px = k * TILE + h1 * TILE;
      if (h2 < 0.55) {
        var py = 14 + h3 * 26, r = 3 + h2 * 6;
        D.oval(ctx, px, py, r * 1.3, r, 0, h3 > 0.5 ? '#d9a867' : '#eac088', 2.5);
      } else if (h2 < 0.75) {
        ctx.strokeStyle = 'rgba(74, 45, 26, 0.35)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(px, 70 + h3 * 40); ctx.lineTo(px + 10, 76 + h3 * 40); ctx.lineTo(px + 18, 72 + h3 * 40);
        ctx.stroke();
      }
      // 地面の上の草
      var gx = k * TILE + h2 * 40;
      if (h3 > 0.86 && !inHole(holes, gx)) {
        D.shape(ctx, function (c) {
          c.moveTo(gx - 9, 1);
          c.quadraticCurveTo(gx - 10, -10, gx - 13, -16);
          c.quadraticCurveTo(gx - 4, -10, gx - 1, -4);
          c.quadraticCurveTo(gx, -16, gx + 2, -21);
          c.quadraticCurveTo(gx + 5, -10, gx + 3, -4);
          c.quadraticCurveTo(gx + 8, -12, gx + 14, -14);
          c.quadraticCurveTo(gx + 10, -6, gx + 9, 1);
          c.closePath();
        }, '#a6c75a', 3);
      }
    }
    // 地面のふち（太い輪郭線）
    ctx.fillStyle = '#fbe1a8';
    ctx.fillRect(left, 0, right - left, 7);
    ctx.strokeStyle = COL.line;
    ctx.lineWidth = D.LW;
    ctx.beginPath(); ctx.moveTo(left, 0); ctx.lineTo(right, 0); ctx.stroke();
  };

  function inHole(holes, x) {
    if (!holes) return false;
    for (var i = 0; i < holes.length; i++) if (x > holes[i].x0 - 20 && x < holes[i].x1 + 20) return true;
    return false;
  }

  /** 足元の丸い影（地面から高いほど小さく薄く）。floorY = 影が落ちる地面の高さ */
  DD.drawShadow = function (ctx, x, y, floorY, w) {
    var k = U.clamp(1 - (floorY - y) / 400, 0.3, 1);
    ctx.beginPath(); D.ellipse(ctx, x, floorY + 3, w * k, 5 * k, 0);
    ctx.fillStyle = 'rgba(120, 72, 30, ' + (0.28 * k).toFixed(3) + ')';
    ctx.fill();
  };

  /** 高い足場（台地）。上の面から下の地面まで、しま模様の岩で描く */
  DD.drawPlatform = function (ctx, f, bnd) {
    var th = DD.theme ? DD.theme() : null;
    var x0 = Math.max(f.x0, bnd.left - 40), x1 = Math.min(f.x1, bnd.right + 40);
    var top = f.y, bottom = bnd.bottom + 40;
    var body = th ? th.rock : '#e0a868', band = th ? th.rockBand : '#c98c4a', cap = th ? th.cap : '#fbe1a8';
    ctx.fillStyle = body;
    ctx.fillRect(x0, top, x1 - x0, bottom - top);
    // しま模様
    ctx.fillStyle = band;
    for (var yy = top + 34; yy < 0; yy += 38) ctx.fillRect(x0, yy, x1 - x0, 9);
    // 上の面
    ctx.fillStyle = cap;
    ctx.fillRect(x0, top, x1 - x0, 9);
    ctx.strokeStyle = COL.line; ctx.lineWidth = D.LW; ctx.lineJoin = 'round';
    ctx.beginPath();
    if (f.x0 >= bnd.left - 40) { ctx.moveTo(f.x0, 0); ctx.lineTo(f.x0, top); } else ctx.moveTo(x0, top);
    ctx.lineTo(x1, top);
    if (f.x1 <= bnd.right + 40) ctx.lineTo(f.x1, 0);
    ctx.stroke();
  };
})(window);
