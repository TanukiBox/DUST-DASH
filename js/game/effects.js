/*
 * DUST DASH 演出：砂けむり・キラキラ・数字のポップ・集中線・画面ゆれ
 */
(function (global) {
  'use strict';
  var DD = global.DD = global.DD || {};
  var CFG = DD.CFG, COL = DD.COL, D = DD.draw, U = DD.util;

  function Effects() { this.reset(); }

  Effects.prototype.reset = function () {
    this.parts = [];
    this.pops = [];
    this.shakeT = 0;
    this.shakeAmp = 0;
    this.flash = 0;
    this.dustAcc = 0;
    this.lineSeed = 0;
    this.lineTimer = 0;
  };

  // ---- 砂けむり ----
  Effects.prototype.dust = function (x, y, n, power) {
    for (var i = 0; i < n; i++) {
      this.parts.push({
        kind: 'dust',
        x: x + U.rand(-8, 8), y: y - U.rand(0, 6),
        vx: U.rand(-60, 30) - power * 120, vy: -U.rand(20, 70) - power * 50,
        r: U.rand(5, 9) + power * U.rand(6, 14), grow: 18 + power * 30,
        life: 0, max: U.rand(0.35, 0.6) + power * 0.35
      });
    }
  };

  /** 走っている間、足元から砂けむりを出す。速いほど多く大きく */
  Effects.prototype.runDust = function (dt, x, y, speedN, running) {
    if (!running) return;
    var rate = 10 + speedN * 55; // 1秒あたりの数
    this.dustAcc += rate * dt;
    while (this.dustAcc >= 1) {
      this.dustAcc -= 1;
      this.dust(x - 10, y, 1, speedN);
    }
  };

  // ---- 食べたときのキラキラと星 ----
  Effects.prototype.burst = function (x, y, color, n, big) {
    for (var i = 0; i < n; i++) {
      var a = Math.PI * 2 * i / n + U.rand(-0.2, 0.2);
      var sp = U.rand(160, 320) * (big ? 1.6 : 1);
      this.parts.push({
        kind: i % 2 ? 'star' : 'crumb',
        color: i % 2 ? COL.good : color,
        x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120,
        r: (big ? 9 : 6) + U.rand(0, 3), rot: U.rand(0, 6), vr: U.rand(-8, 8),
        life: 0, max: U.rand(0.4, 0.65)
      });
    }
  };

  /** 着地やジャンプのぽふっとした煙 */
  Effects.prototype.puff = function (x, y, n) {
    for (var i = 0; i < n; i++) {
      var a = Math.PI * (i / (n - 1 || 1));
      this.parts.push({
        kind: 'dust', x: x, y: y,
        vx: -Math.cos(a) * 110, vy: -Math.sin(a) * 40 - 10,
        r: 7, grow: 20, life: 0, max: 0.35
      });
    }
  };

  // ---- 数字のポップ（+5 km/h など）----
  Effects.prototype.pop = function (x, y, text, color, size) {
    this.pops.push({ x: x, y: y, text: text, color: color || COL.good, size: size || 30, life: 0, max: 0.9 });
  };

  Effects.prototype.shake = function (amp, time) {
    this.shakeAmp = Math.max(this.shakeAmp, amp);
    this.shakeT = Math.max(this.shakeT, time);
  };

  Effects.prototype.update = function (dt) {
    for (var i = this.parts.length - 1; i >= 0; i--) {
      var p = this.parts[i];
      p.life += dt;
      if (p.life >= p.max) { this.parts.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === 'dust') {
        p.vx *= Math.pow(0.1, dt);
        p.vy *= Math.pow(0.2, dt);
        p.r += p.grow * dt;
      } else {
        p.vy += 900 * dt;
        p.rot += p.vr * dt;
      }
    }
    for (i = this.pops.length - 1; i >= 0; i--) {
      var q = this.pops[i];
      q.life += dt;
      if (q.life >= q.max) this.pops.splice(i, 1);
    }
    if (this.shakeT > 0) this.shakeT -= dt; else this.shakeAmp = 0;
    if (this.flash > 0) this.flash -= dt * 3;
    this.lineTimer -= dt;
    if (this.lineTimer <= 0) { this.lineTimer = 1 / 20; this.lineSeed++; } // 集中線は1秒に20回描き変える
  };

  Effects.prototype.shakeOffset = function () {
    if (this.shakeT <= 0) return { x: 0, y: 0 };
    return { x: U.rand(-1, 1) * this.shakeAmp, y: U.rand(-1, 1) * this.shakeAmp };
  };

  /** 砂けむり（地面の上・主人公の後ろに描く） */
  Effects.prototype.drawDust = function (ctx) {
    for (var i = 0; i < this.parts.length; i++) {
      var p = this.parts[i];
      if (p.kind !== 'dust') continue;
      var k = p.life / p.max;
      ctx.globalAlpha = (1 - k) * 0.9;
      ctx.beginPath(); D.ellipse(ctx, p.x, p.y, p.r, p.r * 0.85, 0);
      ctx.fillStyle = '#fbeed2'; ctx.fill();
      ctx.lineWidth = 2.5; ctx.strokeStyle = '#d7ad6f'; ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };

  /** キラキラと数字（いちばん手前に描く） */
  Effects.prototype.drawFront = function (ctx) {
    for (var i = 0; i < this.parts.length; i++) {
      var p = this.parts[i];
      if (p.kind === 'dust') continue;
      var k = p.life / p.max;
      ctx.globalAlpha = 1 - k * k;
      if (p.kind === 'star') D.star(ctx, p.x, p.y, p.r, p.rot, p.color, 2.5);
      else D.oval(ctx, p.x, p.y, p.r * 0.6, p.r * 0.6, 0, p.color, 2.5);
    }
    ctx.globalAlpha = 1;
    for (i = 0; i < this.pops.length; i++) {
      var q = this.pops[i];
      var t = q.life / q.max;
      var s = t < 0.15 ? U.easeOutBack(t / 0.15) : 1;
      ctx.globalAlpha = t > 0.7 ? (1 - t) / 0.3 : 1;
      ctx.save();
      ctx.translate(q.x, q.y - t * 50);
      ctx.scale(s, s);
      D.text(ctx, q.text, 0, 0, { size: q.size, fill: q.color });
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  };

  /**
   * 集中線（画面の座標で描く）。cx, cy に向かって周りから線が集まる。
   * power 0〜1。速いほど本数が増え、内側まで入ってくる。
   */
  Effects.prototype.drawSpeedLines = function (ctx, w, h, cx, cy, power) {
    if (power <= 0.01) return;
    var R = Math.sqrt(w * w + h * h);
    var n = Math.round(18 + power * 46);
    var inner = U.lerp(0.62, 0.36, power) * Math.max(w, h);
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, ' + (0.25 + power * 0.45).toFixed(3) + ')';
    for (var i = 0; i < n; i++) {
      var r1 = U.hash(this.lineSeed * 97 + i * 13.1);
      var r2 = U.hash(this.lineSeed * 31 + i * 7.7);
      var a = (i + r1 * 0.8) / n * Math.PI * 2;
      var width = (0.006 + r2 * 0.012) * (0.6 + power);
      var rin = inner * (0.85 + r2 * 0.4);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * rin, cy + Math.sin(a) * rin);
      ctx.lineTo(cx + Math.cos(a - width) * R, cy + Math.sin(a - width) * R);
      ctx.lineTo(cx + Math.cos(a + width) * R, cy + Math.sin(a + width) * R);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  };

  DD.Effects = Effects;
})(window);
