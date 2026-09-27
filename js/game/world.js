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

  Camera.prototype.follow = function (px, py, dt) {
    this.x = px - this.viewW * this.anchor;
    // 高く跳んだら画面を上に追いかける（頭の上に少し余白）
    var room = this.groundY / this.scale;
    var target = Math.min(0, py - 150 + room - 60);
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

  // ------------------------------------------------------------
  // 背景（空）：画面の座標で描く
  // ------------------------------------------------------------
  DD.drawSky = function (ctx, W, H, groundY) {
    var g = ctx.createLinearGradient(0, 0, 0, groundY);
    g.addColorStop(0, '#9fd9ea');
    g.addColorStop(0.65, '#d9f0ec');
    g.addColorStop(1, COL.skyLow);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // お日さま
    var r = Math.min(W, H) * 0.07;
    ctx.beginPath(); D.ellipse(ctx, W * 0.8, groundY * 0.28, r * 1.6, r * 1.6, 0);
    ctx.fillStyle = 'rgba(255, 236, 170, 0.45)'; ctx.fill();
    ctx.beginPath(); D.ellipse(ctx, W * 0.8, groundY * 0.28, r, r, 0);
    ctx.fillStyle = COL.sun; ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = '#f0a94a'; ctx.stroke();
  };

  // ------------------------------------------------------------
  // 地面：ゲーム内の座標で描く
  // ------------------------------------------------------------
  DD.drawGround = function (ctx, cam) {
    var b = cam.bounds();
    var left = b.left - 40, right = b.right + 40, bottom = b.bottom + 40;
    // 地層
    ctx.fillStyle = COL.sand;
    ctx.fillRect(left, 0, right - left, bottom);
    ctx.fillStyle = COL.sandDark;
    ctx.fillRect(left, 46, right - left, bottom);
    ctx.fillStyle = COL.sandDeep;
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
      if (h3 > 0.86) {
        var gx = k * TILE + h2 * 40;
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

  /** 足元の丸い影（高いほど小さく薄く） */
  DD.drawShadow = function (ctx, x, height, w) {
    var k = U.clamp(1 - (-height) / 400, 0.3, 1);
    ctx.beginPath(); D.ellipse(ctx, x, 3, w * k, 5 * k, 0);
    ctx.fillStyle = 'rgba(120, 72, 30, ' + (0.28 * k).toFixed(3) + ')';
    ctx.fill();
  };
})(window);
