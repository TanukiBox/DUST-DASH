/*
 * DUST DASH ストーリームービー（初めて遊ぶ前に1回だけ流れる。タップでスキップ）
 *   1. 夜明けの砂漠。オオミチバシリが虫をついばむ
 *   2. 地面を大きな影が横切る。「……ん？」
 *   3. タカが急降下！ 間一髪で跳んでかわす
 *   4. 走り出す。後ろからタカが追ってくる
 *   5. 「食べて、走って、逃げきれ！」→ そのままゲームへ
 */
(function (global) {
  'use strict';
  var DD = global.DD = global.DD || {};
  var CFG = DD.CFG, COL = DD.COL, D = DD.draw, U = DD.util;

  function T(key) { return DD.app.i18n.t(key); }

  var LEN = 12.5;             // ムービー全体の長さ（秒）
  var RR_X = 0;               // 主人公がいる場所（ゲーム内の座標）

  var Story = {
    enter: function (app, arg) {
      this.next = (arg && arg.next) || 'play';
      this.t = 0;
      this.cam = new DD.Camera();
      this.cam.anchor = 0.5;
      this.fx = new DD.Effects();
      this.cues = {};
      this.runX = 0;          // 走り出してからの移動量
      var self = this;
      this.skipBtn = { x: 0, y: 0, w: 0, h: 0, onPress: function () { self.finish(app); } };
      app.setButtons([this.skipBtn]);
    },
    finish: function (app) {
      if (this.done) return;
      this.done = true;
      app.store.set('storySeen', true);
      app.go(this.next);
    },
    /** 一度だけ鳴らす */
    cue: function (app, name, at, sfx) {
      if (this.t >= at && !this.cues[name]) { this.cues[name] = true; if (sfx) app.sfx.play(sfx); return true; }
      return false;
    },
    update: function (app, dt) {
      this.t += dt;
      var t = this.t;
      this.cam.fit(app.W, app.H, 0);
      this.fx.update(dt);
      this.cue(app, 'peck', 1.6, 'eat');
      this.cue(app, 'cry', 3.0, 'hawkCry');
      this.cue(app, 'dive', 4.6, 'hawkDive');
      this.cue(app, 'jump', 5.05, 'jump');
      if (this.cue(app, 'miss', 5.25, 'hawkCatch')) {
        this.fx.puff(RR_X - 30, 0, 9);
        this.fx.shake(10, 0.35);
        for (var i = 0; i < 6; i++) this.fx.burst(RR_X - 20, -40, '#a8743f', 1, false); // 羽が舞う
      }
      this.cue(app, 'land', 5.95, 'land');
      this.cue(app, 'title', 9.6, 'fever');
      // 走り出したらカメラも一緒に進む
      if (t > 6.2) {
        var k = U.clamp((t - 6.2) / 1.2, 0, 1);
        var v = U.lerp(0, 620, k * k);
        this.runX += v * dt;
        this.fx.runDust(dt, RR_X + this.runX, 0, 0.6, true);
      }
      if (t > LEN) this.finish(app);
    },
    render: function (app, ctx) {
      if (!this.cam.W) this.cam.fit(app.W, app.H, 0);
      var t = this.t, cam = this.cam, dpr = app.dpr, W = cam.W, H = cam.H;
      var ui = app.ui;
      // カメラ：はじめは主人公を中央に。走り出すと追いかける
      cam.x = RR_X + this.runX - cam.viewW * 0.5 + (t > 6.2 ? cam.viewW * 0.15 * U.clamp((t - 6.2) / 1.5, 0, 1) : 0);
      cam.y = 0;
      var sh = this.fx.shakeOffset();

      // 空と遠景（夜明け）
      var sky = DD.skyAt(0);
      DD.currentSky = sky;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      DD.drawSky(ctx, W, H, cam.groundY, sky, t);
      DD.drawBackdrop(ctx, cam, sky);
      cam.apply(ctx, dpr, sh.x, sh.y);
      DD.drawGround(ctx, cam, []);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      DD.drawGroundTint(ctx, cam, sky);
      cam.apply(ctx, dpr, sh.x, sh.y);

      // ---- ショット2：地面を横切る影 ----
      if (t > 2.8 && t < 4.6) {
        var sk = (t - 2.8) / 1.8;
        var sx = U.lerp(cam.x - 200, cam.x + cam.viewW + 200, sk);
        ctx.save();
        ctx.globalAlpha = 0.28;
        ctx.fillStyle = '#3a2112';
        ctx.beginPath(); D.ellipse(ctx, sx, 6, 160, 16, 0); ctx.fill();
        ctx.restore();
      }

      // ---- 虫（ショット1でついばまれる）----
      if (t < 1.6) {
        DD.KINDS.bug.draw(ctx, { x: RR_X + 62, y: -Math.abs(Math.sin(t * 5)) * 10, t: t, air: false });
      }

      this.fx.drawDust(ctx);

      // ---- 主人公 ----
      var rx = RR_X + this.runX, ry = 0, pose = { phase: 0, time: t, speedN: 0, air: false, vy: 0, stretch: 0, eat: 0, blink: 0 };
      var peck = 0;
      if (t < 2.8) {
        // ついばむ（頭を下げる）
        var pk = t - 1.3;
        if (pk > 0 && pk < 0.5) { peck = Math.sin(pk / 0.5 * Math.PI) * 0.45; pose.eat = pk < 0.35 ? 0.2 : 0; }
        pose.blink = (t % 2.3) < 0.12 ? 1 : 0;
      } else if (t < 5.05) {
        pose.stretch = t < 3.2 ? 0.6 : 0.2; // びっくりして伸びる
      } else if (t < 5.95) {
        // 跳んでかわす
        var jt = t - 5.05, v0 = 1050;
        ry = Math.min(0, -v0 * jt + 0.5 * 2600 * jt * jt);
        rx += U.lerp(0, 150, jt / 0.9);
        pose.air = true; pose.vy = -v0 + 2600 * jt; pose.hurt = jt < 0.4 ? 1 : 0;
      } else {
        rx += 150;
        pose.phase = (t - 5.95) * 22; pose.speedN = U.clamp((t - 6.2) / 1.5, 0, 0.8);
      }
      ctx.save();
      ctx.translate(rx, ry);
      ctx.rotate(peck);
      DD.drawRoadrunner(ctx, 0, 0, pose);
      ctx.restore();

      // びっくりマーク
      if (t > 3.0 && t < 4.8) {
        var ek = U.easeOutBack(U.clamp((t - 3.0) / 0.25, 0, 1));
        ctx.save();
        ctx.translate(rx + 30, -125);
        ctx.scale(ek, ek);
        D.text(ctx, '!', 0, 0, { size: 56, fill: COL.bad, lw: 10 });
        ctx.restore();
      }

      // ---- タカ ----
      if (t > 4.6 && t < 6.4) {
        // 急降下して、空ぶりして、また上がる
        var ht = t - 4.6, hx, hy, dive = 1, ang = 0.8;
        if (ht < 0.65) {
          var e = (ht / 0.65); e = e * e;
          hx = U.lerp(RR_X - 520, RR_X - 30, e); hy = U.lerp(-700, -70, e);
        } else {
          var u = (ht - 0.65) / 1.15;
          hx = RR_X - 30 + u * 260; hy = -70 - u * u * 650; dive = 0; ang = -0.4;
        }
        DD.drawHawk(ctx, hx, hy, { t: t, dive: dive, talons: ht > 0.4, angle: ang, scale: 1.35 });
      }
      if (t > 7.2) {
        // 後ろから追ってくる
        var ct = t - 7.2;
        var chx = cam.x + cam.viewW * U.lerp(-0.05, 0.2, U.clamp(ct / 1.5, 0, 1)) + Math.sin(ct * 3) * 20;
        var chy = cam.y - cam.groundY / cam.scale * 0.42 + Math.sin(ct * 4) * 14;
        DD.drawHawk(ctx, chx, chy, { t: t, dive: 0, angle: 0.15, scale: 1.2 });
      }
      this.fx.drawFront(ctx);

      // ---- 集中線（走り出してから）----
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (t > 6.6) {
        var ps = cam.toScreen(rx + 40, -40);
        this.fx.drawSpeedLines(ctx, W, H, ps.x, ps.y, U.clamp((t - 6.6) / 1.2, 0, 0.7));
      }

      // ---- 映画のような上下の帯と字幕 ----
      ctx.setTransform(dpr * ui.u, 0, 0, dpr * ui.u, 0, 0);
      var bar = Math.min(ui.h * 0.12, 90);
      ctx.fillStyle = '#2b1a10';
      ctx.fillRect(0, 0, ui.w, ui.safeTop + bar * 0.7);
      ctx.fillRect(0, ui.h - ui.safeBottom - bar, ui.w, bar + ui.safeBottom);

      var cap = null;
      if (t > 0.4 && t < 2.8) cap = T('storyCap1');
      else if (t > 3.2 && t < 4.6) cap = T('storyCap2');
      else if (t > 6.6 && t < 9.4) cap = T('storyCap3');
      if (cap) {
        D.text(ctx, cap, ui.w / 2, ui.h - ui.safeBottom - bar / 2, { size: 24, fill: COL.cream, lw: 0, maxW: ui.w - 40 });
      }
      // 締めのひとこと
      if (t > 9.6) {
        var tk = U.easeOutBack(U.clamp((t - 9.6) / 0.35, 0, 1));
        ctx.save();
        ctx.translate(ui.w / 2, ui.h * 0.3);
        ctx.scale(tk, tk);
        ctx.rotate(-0.05);
        var lines = T('storyTitle').split('\n');
        for (var i = 0; i < lines.length; i++) {
          D.text(ctx, lines[i], 0, (i - (lines.length - 1) / 2) * 56, { size: 48, fill: COL.good, maxW: ui.w - 30 });
        }
        ctx.restore();
      }
      // はじまりと終わりのフェード
      var fade = t < 0.5 ? 1 - t / 0.5 : t > LEN - 0.5 ? (t - (LEN - 0.5)) / 0.5 : 0;
      if (fade > 0) {
        ctx.fillStyle = 'rgba(255, 250, 235, ' + U.clamp(fade, 0, 1).toFixed(3) + ')';
        ctx.fillRect(0, 0, ui.w, ui.h);
      }

      // スキップ（左上。右上はミュートボタン）
      var sw = 120, shh = 40;
      var b = { x: ui.safeLeft + 14, y: ui.safeTop + 10, w: sw, h: shh };
      D.shape(ctx, function (c) { D.roundRect(c, b.x, b.y, b.w, b.h, 20); }, 'rgba(255,246,226,0.9)', 3);
      D.text(ctx, T('skip') + ' ▶', b.x + b.w / 2, b.y + b.h / 2 + 1, { size: 18, fill: COL.ink, lw: 0 });
      var u2 = ui.u;
      this.skipBtn.x = b.x * u2; this.skipBtn.y = b.y * u2; this.skipBtn.w = b.w * u2; this.skipBtn.h = b.h * u2;
    },
    press: function (app, p) {
      // どこをタップしてもスキップできる（少し見てから）
      if (this.t > 0.8) this.finish(app);
    }
  };

  DD.Scenes = DD.Scenes || {};
  DD.Scenes.story = Story;
})(window);
