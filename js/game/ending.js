/*
 * DUST DASH ゴールとエンディング
 * ・4000 m（5ステージ目の終わり）にオアシスのゴール門
 * ・ゴールを走りぬけると、エンディングムービー：
 *   1. 朝日の中、オアシスの池へ走りこむ。後ろからタカ
 *   2. 池のほとりで止まる。タカが急降下！
 *   3. ひょいとよけると、タカは池にドボン
 *   4. びしょぬれのタカは、あきらめて朝日の方へ飛んでいく
 *   5. 池の水を飲んで、よろこびのジャンプ →「にげきった！」
 */
(function (global) {
  'use strict';
  var DD = global.DD = global.DD || {};
  var CFG = DD.CFG, COL = DD.COL, D = DD.draw, U = DD.util;

  function T(key) { return DD.app.i18n.t(key); }

  // ------------------------------------------------------------
  // ヤシの木。fill を渡すとその色のシルエット（遠景用）
  // x, y = 根元、h = 高さ、dir = かたむく向き（1 右 / -1 左）
  // ------------------------------------------------------------
  DD.drawPalm = function (ctx, x, y, h, dir, fill, lw, t) {
    var sway = Math.sin((t || 0) * 1.3) * 0.04;
    var tx = x + dir * h * 0.22, ty = y - h;
    var line = fill ? 0 : (lw || 4);
    var trunk = fill || '#b98b5e', leaf = fill || '#6fbf4f', leafDark = fill || '#4d9a3a';
    ctx.save();
    // 幹：根元が太く先が細い、少し曲がった形
    var n = 7, pts = [];
    for (var i = 0; i <= n; i++) {
      var k = i / n;
      pts.push([U.lerp(x, tx, k) + Math.sin(k * Math.PI) * dir * h * 0.06, U.lerp(y, ty, k)]);
    }
    var wb = h * 0.07, wt = h * 0.04;
    D.shape(ctx, function (c) {
      c.moveTo(pts[0][0] - wb, pts[0][1]);
      for (var q = 1; q <= n; q++) c.lineTo(pts[q][0] - U.lerp(wb, wt, q / n), pts[q][1]);
      for (q = n; q >= 0; q--) c.lineTo(pts[q][0] + U.lerp(wb, wt, q / n), pts[q][1]);
      c.closePath();
    }, trunk, line);
    if (!fill) {
      // 幹のふし
      ctx.strokeStyle = 'rgba(74, 45, 26, 0.45)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      for (i = 1; i < n; i++) {
        var w = U.lerp(wb, wt, i / n);
        ctx.beginPath(); ctx.moveTo(pts[i][0] - w * 0.8, pts[i][1] + 2); ctx.quadraticCurveTo(pts[i][0], pts[i][1] + 6, pts[i][0] + w * 0.8, pts[i][1] + 2); ctx.stroke();
      }
    }
    // 葉：先が垂れた長い葉を放射状に
    var L = h * 0.55;
    var angs = [-2.9, -2.35, -1.85, -1.3, -0.8, -0.25];
    for (i = 0; i < angs.length; i++) {
      var a = angs[i] + sway * (i % 2 ? 1 : -1);
      var ex = tx + Math.cos(a) * L, ey = ty + Math.sin(a) * L * 0.55 + L * 0.35;
      var mx = tx + Math.cos(a) * L * 0.5, my = ty + Math.sin(a) * L * 0.5 - L * 0.12;
      var nx = -Math.sin(a) * h * 0.07, ny = Math.cos(a) * h * 0.07;
      D.shape(ctx, (function (ex, ey, mx, my, nx, ny) {
        return function (c) {
          c.moveTo(tx, ty);
          c.quadraticCurveTo(mx + nx, my + ny, ex, ey);
          c.quadraticCurveTo(mx - nx * 0.4, my - ny * 0.4 + h * 0.05, tx, ty);
          c.closePath();
        };
      })(ex, ey, mx, my, nx, ny), i % 2 ? leaf : leafDark, line ? line * 0.8 : 0);
    }
    if (!fill) {
      // ヤシの実
      D.oval(ctx, tx - 6, ty + 8, 7, 7, 0, '#8a5a32', 3);
      D.oval(ctx, tx + 7, ty + 9, 7, 7, 0, '#9c6a3a', 3);
    }
    ctx.restore();
  };

  /** オアシスの池（x = まん中、y = 水面の高さ、w = 幅）。t でさざ波 */
  DD.drawPond = function (ctx, x, y, w, t) {
    var h = w * 0.16;
    D.oval(ctx, x, y + 3, w / 2 + 8, h + 6, 0, '#9ccc6a', 4);    // まわりの草
    var g = ctx.createLinearGradient(0, y - h, 0, y + h);
    g.addColorStop(0, '#7fd3e8'); g.addColorStop(1, '#3f9fc4');
    D.oval(ctx, x, y + 2, w / 2, h, 0, g, 4);
    // きらきらのさざ波
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (var i = 0; i < 4; i++) {
      var px = x + (U.hash(i + 3) - 0.5) * w * 0.7 + Math.sin(t * 1.5 + i) * 8;
      var py = y + (U.hash(i + 9) - 0.5) * h * 0.9;
      var len = 10 + U.hash(i + 5) * 16;
      ctx.beginPath(); ctx.moveTo(px - len / 2, py); ctx.lineTo(px + len / 2, py); ctx.stroke();
    }
    // 手前のアシ
    for (i = 0; i < 5; i++) {
      var rx = x - w * 0.42 + i * w * 0.05, rh = 34 + U.hash(i + 21) * 22;
      ctx.strokeStyle = '#5f9a3a'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(rx, y + h * 0.6); ctx.quadraticCurveTo(rx + 4, y + h * 0.6 - rh * 0.5, rx + 2 + Math.sin(t * 2 + i) * 3, y + h * 0.6 - rh); ctx.stroke();
      if (i % 2 === 0) D.oval(ctx, rx + 2 + Math.sin(t * 2 + i) * 3, y + h * 0.6 - rh, 4, 9, 0, '#8a5a32', 2.5);
    }
  };

  // ------------------------------------------------------------
  // ゴール門（ゲームの中）：旗のついた門、両わきにヤシ、奥に池
  // ------------------------------------------------------------
  DD.KINDS = DD.KINDS || {};
  DD.KINDS.goal = {
    create: function (x) {
      return { type: 'goal', deco: true, noScale: true, cullPad: 900, x: x, y: 0, w: 260, h: 300, t: 0, dead: false };
    },
    update: function (o, dt) { o.t += dt; },
    draw: function (ctx, o) {
      var x = o.x, t = o.t;
      ctx.save();
      // 奥：池とヤシ
      DD.drawPond(ctx, x + 420, -2, 300, t);
      DD.drawPalm(ctx, x + 300, 0, 230, 1, null, 4, t);
      DD.drawPalm(ctx, x + 560, 0, 260, -1, null, 4, t + 1);
      DD.drawPalm(ctx, x - 190, 0, 250, -1, null, 4, t + 2);
      // 地面のチェックの線
      for (var i = 0; i < 4; i++) {
        for (var j = 0; j < 2; j++) {
          ctx.fillStyle = (i + j) % 2 ? '#ffffff' : '#4a2d1a';
          ctx.fillRect(x - 10 + j * 10, 2 + i * 10, 10, 10);
        }
      }
      // 門の柱
      var px0 = x - 120, px1 = x + 120, top = -250;
      D.shape(ctx, function (c) { D.roundRect(c, px0 - 9, top, 18, -top + 4, 8); }, '#c98c4a', 4);
      D.shape(ctx, function (c) { D.roundRect(c, px1 - 9, top, 18, -top + 4, 8); }, '#c98c4a', 4);
      D.oval(ctx, px0, top, 13, 13, 0, COL.good, 4);
      D.oval(ctx, px1, top, 13, 13, 0, COL.good, 4);
      // 三角の旗のひも
      ctx.strokeStyle = COL.line; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(px0, top + 14); ctx.quadraticCurveTo(x, top + 60, px1, top + 14); ctx.stroke();
      var flags = ['#ff6b5b', '#ffcf3f', '#6cc06b', '#5b9cf0', '#ff8a3d', '#b35cff', '#ff6b5b'];
      for (i = 0; i < flags.length; i++) {
        var k = (i + 0.5) / flags.length;
        var fx = U.lerp(px0, px1, k), fy = top + 14 + 4 * (60 - 14) * k * (1 - k) * 0.98;
        var sw = Math.sin(t * 5 + i) * 2;
        D.shape(ctx, (function (fx, fy, sw) { return function (c) { c.moveTo(fx - 12, fy); c.lineTo(fx + 12, fy); c.lineTo(fx + sw, fy + 24); c.closePath(); }; })(fx, fy, sw), flags[i], 2.5);
      }
      // 看板「GOAL」
      var bw = 190, bh = 58, by = top - 34;
      ctx.save();
      ctx.translate(x, by);
      ctx.rotate(Math.sin(t * 2) * 0.02);
      D.shape(ctx, function (c) { D.roundRect(c, -bw / 2, -bh / 2 + 5, bw, bh, 18); }, '#c85e23', 4);
      D.shape(ctx, function (c) { D.roundRect(c, -bw / 2, -bh / 2, bw, bh, 18); }, COL.accent, 4);
      D.text(ctx, 'GOAL', 0, 2, { size: 40, fill: COL.white, lw: 8, font: DD.FONT_TITLE, weight: '400' });
      ctx.restore();
      ctx.restore();
    }
  };

  // ------------------------------------------------------------
  // エンディングムービー
  // ------------------------------------------------------------
  var LEN = 15;
  var POND_X = 360, POND_W = 420, STOP_X = 60; // 池のまん中、主人公が止まる所

  var Ending = {
    enter: function (app, arg) {
      this.arg = arg || {};
      this.t = 0;
      this.cam = new DD.Camera();
      this.cam.anchor = 0.5;
      this.fx = new DD.Effects();
      this.cues = {};
      this.drops = [];
      var self = this;
      this.skipBtn = { x: 0, y: 0, w: 0, h: 0, onPress: function () { self.finish(app); } };
      app.setButtons([this.skipBtn]);
      if (app.bgm) app.bgm.stop(0.6);
    },
    finish: function (app) {
      if (this.done) return;
      this.done = true;
      app.store.set('endingSeen', true);
      if (this.arg.result) app.go('result', { game: this.arg.game, result: this.arg.result });
      else app.go(this.arg.next || 'title');
    },
    cue: function (app, name, at, sfx) {
      if (this.t >= at && !this.cues[name]) { this.cues[name] = true; if (sfx) app.sfx.play(sfx); return true; }
      return false;
    },
    /** 主人公の位置と姿勢 */
    runner: function (t) {
      var pose = { phase: 0, time: t, speedN: 0, air: false, vy: 0, stretch: 0, eat: 0, blink: 0 };
      var x, y = 0, peck = 0;
      if (t < 2.6) {
        // 走ってきて、池の手前で止まる
        var k = t / 2.6;
        x = U.lerp(-900, STOP_X, 1 - (1 - k) * (1 - k));
        pose.phase = t * 22; pose.speedN = 0.7 * (1 - k);
      } else if (t < 4.3) {
        x = STOP_X;
        pose.stretch = t > 3.2 ? 0.6 : 0; // 上を見てびっくり
        pose.blink = t > 2.9 && t < 3.0 ? 1 : 0;
      } else if (t < 5.2) {
        // ひょいと後ろへよける
        var jt = t - 4.3, v0 = 900;
        y = Math.min(0, -v0 * jt + 0.5 * 2400 * jt * jt);
        x = STOP_X - U.lerp(0, 170, Math.min(1, jt / 0.75));
        pose.air = true; pose.vy = -v0 + 2400 * jt;
      } else if (t < 9.0) {
        x = STOP_X - 170;
        pose.blink = (t % 2.1) < 0.1 ? 1 : 0;
      } else if (t < 9.9) {
        // 池まで歩いて水を飲む
        var wk = U.clamp((t - 9.0) / 0.5, 0, 1);
        x = U.lerp(STOP_X - 170, STOP_X + 10, wk);
        pose.phase = wk < 1 ? t * 12 : 0;
        if (t > 9.5) peck = Math.sin(U.clamp((t - 9.5) / 0.4, 0, 1) * Math.PI) * 0.5;
      } else {
        // よろこびのジャンプ（2回）
        x = STOP_X + 10;
        var jt2 = (t - 9.9) % 1.1, v1 = 820;
        if (t - 9.9 < 2.2) {
          y = Math.min(0, -v1 * jt2 + 0.5 * 2600 * jt2 * jt2);
          pose.air = y < 0; pose.vy = -v1 + 2600 * jt2;
          if (pose.air && t - 9.9 > 1.1) pose.flip = 1;
        }
      }
      return { x: x, y: y, pose: pose, peck: peck };
    },
    /** タカの位置 */
    hawk: function (t) {
      if (t < 3.6) {
        // 後ろ上から追ってくる
        var k = U.clamp(t / 3.6, 0, 1);
        return { x: U.lerp(-1300, -420, k) + Math.sin(t * 3) * 20, y: -420 + Math.sin(t * 4) * 16, dive: 0, angle: 0.15, talons: false };
      }
      if (t < 4.6) {
        // 急降下
        var e = (t - 3.6) / 1.0; e = e * e;
        return { x: U.lerp(-420, POND_X - 60, e), y: U.lerp(-420, 10, e), dive: 1, angle: 0.8, talons: e > 0.6 };
      }
      if (t < 6.4) {
        // 池の中でじたばた
        var st = t - 4.6;
        return { x: POND_X - 60 + Math.sin(st * 9) * 6, y: 26 - Math.abs(Math.sin(st * 6)) * 10, dive: 0, angle: Math.sin(st * 7) * 0.2, talons: false, wet: true, inWater: true };
      }
      // びしょぬれで朝日の方へ飛んでいく（だんだん小さく）
      var ft = t - 6.4, fk = U.clamp(ft / 3.0, 0, 1);
      return { x: POND_X - 60 + ft * 240, y: 10 - ft * 120 - ft * ft * 12, dive: 0, angle: -0.3, talons: false, wet: ft < 2.4, scale: U.lerp(1.3, 0.5, fk) };
    },
    update: function (app, dt) {
      this.t += dt;
      var t = this.t;
      this.cam.fit(app.W, app.H, 0);
      this.fx.update(dt);
      var r = this.runner(t);
      if (t < 2.4) this.fx.runDust(dt, r.x, 0, 0.5 * (1 - t / 2.6), true);
      this.cue(app, 'stop', 2.6, 'land');
      this.cue(app, 'cry', 3.1, 'hawkCry');
      this.cue(app, 'dive', 3.6, 'hawkDive');
      this.cue(app, 'jump', 4.3, 'jump');
      if (this.cue(app, 'splash', 4.6, 'splash')) {
        this.fx.shake(10, 0.4);
        // 水しぶき
        for (var i = 0; i < 26; i++) {
          var a = -Math.PI * (0.1 + Math.random() * 0.8);
          var v = 300 + Math.random() * 600;
          this.drops.push({ x: POND_X - 60 + (Math.random() - 0.5) * 60, y: 0, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 5 + Math.random() * 7, life: 1.4 });
        }
        this.fx.ring(POND_X - 60, 0, 120);
      }
      this.cue(app, 'shake', 6.2, 'whirl');
      this.cue(app, 'drink', 9.6, 'eat');
      this.cue(app, 'hop1', 9.9, 'double');
      this.cue(app, 'hop2', 11.0, 'double');
      if (this.cue(app, 'music', 6.6)) { if (app.bgm) app.bgm.play('ending'); }
      if (this.cue(app, 'title', 11.2, 'perfect')) {
        for (i = 0; i < 40; i++) this.fx.burst(r.x + (Math.random() - 0.5) * 500, -300 - Math.random() * 200, ['#ff6b5b', '#ffcf3f', '#6cc06b', '#5b9cf0', '#b35cff'][i % 5], 1, true);
      }
      // タカのしずく
      var hk = this.hawk(t);
      if (hk.wet && t > 6.4 && Math.random() < dt * 14) {
        this.drops.push({ x: hk.x + (Math.random() - 0.5) * 50, y: hk.y + 20, vx: 0, vy: 60, r: 4 + Math.random() * 3, life: 1 });
      }
      for (i = this.drops.length - 1; i >= 0; i--) {
        var d = this.drops[i];
        d.vy += 1600 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.life -= dt;
        if (d.life <= 0 || d.y > 30) this.drops.splice(i, 1);
      }
      if (t > LEN) this.finish(app);
    },
    render: function (app, ctx) {
      if (!this.cam.W) this.cam.fit(app.W, app.H, 0);
      var t = this.t, cam = this.cam, dpr = app.dpr, W = cam.W, H = cam.H, ui = app.ui, i;
      // カメラ：走ってくる主人公を追って、池のほとりで止まる
      var r = this.runner(t);
      var focus = Math.max(r.x, STOP_X - 170) + 120;
      if (t > 6.4 && t < 9) focus = U.lerp(STOP_X + 120 - 50, POND_X + 150, U.clamp((t - 6.4) / 1.5, 0, 1) * (1 - U.clamp((t - 8.6) / 0.5, 0, 1)));
      cam.x = focus - cam.viewW * 0.5;
      cam.y = 0;
      var sh = this.fx.shakeOffset();

      // 空は夜明け（最後のステージ）。朝日がだんだん昇る
      var sky = DD.skyAt(CFG.GOAL_M - 1);
      var rise = U.clamp(t / LEN, 0, 1);
      sky = Object.assign({}, sky, { p: U.lerp(0.06, 0.2, rise), night: U.lerp(0.15, 0, rise) });
      DD.currentSky = sky;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      DD.drawSky(ctx, W, H, cam.groundY, sky, t);
      DD.drawBackdrop(ctx, cam, sky);
      cam.apply(ctx, dpr, sh.x, sh.y);
      DD.drawGround(ctx, cam, []);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      DD.drawGroundTint(ctx, cam, sky);
      cam.apply(ctx, dpr, sh.x, sh.y);

      // オアシス
      DD.drawPalm(ctx, POND_X + 250, 0, 280, -1, null, 4, t);
      DD.drawPalm(ctx, POND_X - 280, 0, 250, 1, null, 4, t + 1);
      DD.drawPond(ctx, POND_X, -2, POND_W, t);
      this.fx.drawDust(ctx);

      // タカ（池の中にいるときは水面から下を隠す）
      var hk = this.hawk(t);
      ctx.save();
      if (hk.inWater) { ctx.beginPath(); ctx.rect(cam.x - 100, -2000, cam.viewW + 200, 2000 + 8); ctx.clip(); }
      DD.drawHawk(ctx, hk.x, hk.y, { t: t, dive: hk.dive, talons: hk.talons, angle: hk.angle, scale: hk.scale || 1.3 });
      ctx.restore();
      if (hk.inWater) {
        // 水の輪
        ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 3;
        for (i = 0; i < 2; i++) {
          var rk = ((t * 1.4 + i * 0.5) % 1);
          ctx.globalAlpha = 1 - rk;
          ctx.beginPath(); D.ellipse(ctx, hk.x, 8, 50 + rk * 90, 8 + rk * 12, 0); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      // 汗（あきらめ）
      if (t > 6.4 && t < 9.2) {
        var sx = hk.x + 34 * (hk.scale || 1.3), sy = hk.y - 50 * (hk.scale || 1.3);
        D.shape(ctx, function (c) { c.moveTo(sx, sy - 12); c.quadraticCurveTo(sx + 9, sy + 2, sx, sy + 6); c.quadraticCurveTo(sx - 9, sy + 2, sx, sy - 12); c.closePath(); }, '#9fd8ff', 2.5);
      }

      // 主人公
      ctx.save();
      ctx.translate(r.x, r.y);
      ctx.rotate(r.peck);
      if (r.pose.flip) { var fk = (t - 11.0) / 0.9; ctx.translate(0, -40); ctx.rotate(-U.clamp(fk, 0, 1) * Math.PI * 2); ctx.translate(0, 40); }
      DD.drawRoadrunner(ctx, 0, 0, r.pose);
      ctx.restore();
      // びっくりマーク
      if (t > 3.1 && t < 4.3) {
        var ek = U.easeOutBack(U.clamp((t - 3.1) / 0.25, 0, 1));
        ctx.save(); ctx.translate(r.x + 30, -125); ctx.scale(ek, ek);
        D.text(ctx, '!', 0, 0, { size: 56, fill: COL.bad, lw: 10 });
        ctx.restore();
      }
      // 水しぶき
      for (i = 0; i < this.drops.length; i++) {
        var d = this.drops[i];
        ctx.globalAlpha = U.clamp(d.life * 2, 0, 1);
        D.oval(ctx, d.x, d.y, d.r * 0.8, d.r, 0, '#8fdcf2', 2.5);
      }
      ctx.globalAlpha = 1;
      this.fx.drawFront(ctx);

      // ---- 映画のような上下の帯と字幕 ----
      ctx.setTransform(dpr * ui.u, 0, 0, dpr * ui.u, 0, 0);
      var bar = Math.min(ui.h * 0.12, 90);
      ctx.fillStyle = '#2b1a10';
      ctx.fillRect(0, 0, ui.w, ui.safeTop + bar * 0.7);
      ctx.fillRect(0, ui.h - ui.safeBottom - bar, ui.w, bar + ui.safeBottom);
      var cap = null;
      if (t > 0.3 && t < 2.9) cap = T('endCap1');
      else if (t > 4.8 && t < 6.6) cap = T('endCap2');
      else if (t > 6.8 && t < 9.2) cap = T('endCap3');
      if (cap) D.text(ctx, cap, ui.w / 2, ui.h - ui.safeBottom - bar / 2, { size: 24, fill: COL.cream, lw: 0, maxW: ui.w - 40 });
      // 「にげきった！」
      if (t > 11.2) {
        var tk = U.easeOutBack(U.clamp((t - 11.2) / 0.35, 0, 1));
        ctx.save();
        ctx.translate(ui.w / 2, Math.max(ui.safeTop + 100, ui.h * 0.28));
        ctx.scale(tk, tk);
        ctx.rotate(-0.05);
        D.text(ctx, T('escaped'), 0, 0, { size: 60, fill: COL.good, maxW: ui.w - 30 });
        D.text(ctx, 'THE END', 0, 54, { size: 26, fill: COL.white, lw: 6, maxW: ui.w - 30 });
        ctx.restore();
      }
      // はじまりと終わりのフェード
      var fade = t < 0.5 ? 1 - t / 0.5 : t > LEN - 0.6 ? (t - (LEN - 0.6)) / 0.6 : 0;
      if (fade > 0) {
        ctx.fillStyle = 'rgba(255, 250, 235, ' + U.clamp(fade, 0, 1).toFixed(3) + ')';
        ctx.fillRect(0, 0, ui.w, ui.h);
      }
      // スキップ
      var b = { x: ui.safeLeft + 14, y: ui.safeTop + 10, w: 120, h: 40 };
      D.shape(ctx, function (c) { D.roundRect(c, b.x, b.y, b.w, b.h, 20); }, 'rgba(255,246,226,0.9)', 3);
      D.text(ctx, T('skip') + ' ▶', b.x + b.w / 2, b.y + b.h / 2 + 1, { size: 18, fill: COL.ink, lw: 0 });
      var u2 = ui.u;
      this.skipBtn.x = b.x * u2; this.skipBtn.y = b.y * u2; this.skipBtn.w = b.w * u2; this.skipBtn.h = b.h * u2;
    },
    press: function (app) {
      // 初めて見るときは、最後まで見てもらう（2回目からはタップでスキップ）
      if (this.t > 0.8 && app.store.get('endingSeen', false)) this.finish(app);
    }
  };

  DD.Scenes = DD.Scenes || {};
  DD.Scenes.ending = Ending;
})(window);
