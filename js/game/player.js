/*
 * DUST DASH 主人公：オオミチバシリ（実在の鳥がモデル）
 * 茶色のまだら模様・ボサッとした冠羽・長いしっぽ。
 * 座標は「足元」が基準。y は上がマイナス。
 */
(function (global) {
  'use strict';
  var DD = global.DD = global.DD || {};
  var CFG = DD.CFG, COL = DD.COL, D = DD.draw, U = DD.util;

  var ART_SCALE = 0.9;   // 絵の大きさ
  var HIT = { x0: -20, x1: 22, h: 58 }; // 当たり判定（足元から）

  function Player() { this.reset(); }

  Player.prototype.reset = function () {
    this.x = 0;
    this.y = 0;
    this.prevY = 0;
    this.vy = 0;
    this.onGround = true;
    this.jumps = 0;        // 今の空中で使ったジャンプ回数（最大2）
    this.coyote = 0;
    this.buffer = 0;
    this.phase = 0;        // 走りのアニメ
    this.time = 0;
    this.invuln = 0;       // 当たった後の無敵
    this.hurt = 0;         // 痛がる顔
    this.eat = 0;          // くちばしを開けている時間
    this.stretch = 0;      // ＋で縦に伸びる、－でつぶれる
    this.wingFlap = 0;
    this.blink = 0;
    this.events = [];      // 'jump' | 'double' | 'land'（演出・効果音用）
  };

  Player.prototype.box = function () {
    return { x0: this.x + HIT.x0, x1: this.x + HIT.x1, top: this.y - HIT.h, bottom: this.y };
  };

  /** タップされた */
  Player.prototype.press = function () {
    if (!this.tryJump()) this.buffer = CFG.JUMP_BUFFER;
  };

  Player.prototype.tryJump = function () {
    if (this.onGround || this.coyote > 0) {
      this.launch(CFG.JUMP_V);
      this.jumps = 1;
      this.events.push('jump');
      return true;
    }
    if (this.jumps === 0) this.jumps = 1; // 地面から落ちた場合も空中ジャンプは1回だけ
    if (this.jumps < 2) {
      this.launch(CFG.DOUBLE_JUMP_V);
      this.jumps = 2;
      this.wingFlap = 1;
      this.events.push('double');
      return true;
    }
    return false; // 3回目は出ない
  };

  Player.prototype.launch = function (v) {
    this.vy = -v;
    this.onGround = false;
    this.coyote = 0;
    this.buffer = 0;
    this.stretch = 1;
  };

  /** 獲物を踏んで跳ね返る。踏んだ後は空中ジャンプが1回できる */
  Player.prototype.bounce = function (v) {
    this.launch(v);
    this.jumps = 1;
    this.eat = 0.28;
  };

  /** 横から当たって痛い */
  Player.prototype.hit = function () {
    this.invuln = CFG.HURT_INVULN;
    this.hurt = 0.45;
    if (this.onGround) { this.vy = -420; this.onGround = false; this.jumps = 1; }
    else if (this.vy < 0) this.vy *= 0.3;
  };

  Player.prototype.update = function (dt, speed) {
    this.time += dt;
    this.prevY = this.y;
    this.x += speed * CFG.UNITS_PER_KMH * dt;

    if (!this.onGround) {
      this.vy += (this.vy < 0 ? CFG.GRAVITY_UP : CFG.GRAVITY_DOWN) * dt;
      this.y += this.vy * dt;
      if (this.y >= 0 && this.vy > 0) {
        this.y = 0;
        this.vy = 0;
        this.onGround = true;
        this.jumps = 0;
        this.stretch = -1;
        this.events.push('land');
        if (this.buffer > 0) this.tryJump();
      }
    }
    if (this.coyote > 0) this.coyote -= dt;
    if (this.buffer > 0) this.buffer -= dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.hurt > 0) this.hurt -= dt;
    if (this.eat > 0) this.eat -= dt;
    if (this.wingFlap > 0) this.wingFlap -= dt * 3;
    this.stretch *= Math.pow(0.0005, dt); // じわっと元の形に戻る
    this.blink -= dt;
    if (this.blink < -3.2) this.blink = 0.12;

    // 走りのアニメ：速いほど足が速く回る
    if (speed > 0) this.phase += dt * (9 + speed * 0.16);
  };

  // ------------------------------------------------------------
  // 描画
  // ------------------------------------------------------------

  /** 同じ色の形をまとめて1つの輪郭で描く（首と胴体がつながって見える） */
  function blob(ctx, paths, fill, lw) {
    var i;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = COL.line;
    ctx.lineWidth = lw * 2;
    for (i = 0; i < paths.length; i++) { ctx.beginPath(); paths[i](ctx); ctx.stroke(); }
    ctx.fillStyle = fill;
    for (i = 0; i < paths.length; i++) { ctx.beginPath(); paths[i](ctx); ctx.fill(); }
  }

  function leg(ctx, hipX, hipY, fx, fy, color, toeLift) {
    // 鳥の足：途中の関節（かかと）は後ろに曲がる
    var jx = (hipX + fx) / 2 - 8, jy = (hipY + fy) / 2 + 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    function path() {
      ctx.beginPath();
      ctx.moveTo(hipX, hipY);
      ctx.lineTo(jx, jy);
      ctx.lineTo(fx, fy);
      // 指：前に2本、後ろに1本
      ctx.moveTo(fx, fy); ctx.lineTo(fx + 9, fy + toeLift);
      ctx.moveTo(fx, fy); ctx.lineTo(fx + 7, fy - 3 + toeLift);
      ctx.moveTo(fx, fy); ctx.lineTo(fx - 7, fy + 1);
    }
    path(); ctx.lineWidth = 7.5; ctx.strokeStyle = COL.line; ctx.stroke();
    path(); ctx.lineWidth = 3.5; ctx.strokeStyle = color; ctx.stroke();
  }

  /**
   * オオミチバシリを描く。
   * pose = { speedN: 0〜1, air: bool, vy, phase, time, tucked }
   */
  DD.drawRoadrunner = function (ctx, x, y, pose) {
    var p = pose.phase || 0;
    var sn = pose.speedN || 0;
    var air = !!pose.air;
    var lw = D.LW;
    var st = pose.stretch || 0;
    var sx = 1 - st * 0.12, sy = 1 + st * 0.14;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(ART_SCALE * sx, ART_SCALE * sy);

    var bob = air ? 0 : -Math.abs(Math.sin(p)) * 3.5;
    var lean = air ? (pose.vy < 0 ? -0.12 : 0.1) : 0.04 + sn * 0.16;
    var hipX = 0, hipY = -28 + bob;

    // ---- 奥の足 ----
    var f1, f2;
    if (air) {
      f1 = { x: -4, y: -14 };
      f2 = { x: 6, y: -12 };
    } else {
      f1 = { x: -Math.sin(p + Math.PI) * 22, y: Math.min(0, Math.cos(p + Math.PI) * 15) };
      f2 = { x: -Math.sin(p) * 22, y: Math.min(0, Math.cos(p) * 15) };
    }
    leg(ctx, hipX - 2, hipY, f1.x, f1.y, '#877762', air ? 2 : 0);

    ctx.save();
    ctx.translate(0, hipY);
    ctx.rotate(lean);
    ctx.translate(0, -hipY);

    // ---- しっぽ（長い・先が白い）。遅いときは立てて、速いほど水平に ----
    var tailA = air ? (pose.vy < 0 ? 0.12 : 0.6) : 0.5 - sn * 0.42;
    tailA += Math.sin(p * 2) * (air ? 0.03 : 0.07);
    ctx.save();
    ctx.translate(-20, -45 + bob);
    ctx.rotate(tailA);
    D.shape(ctx, function (c) {
      c.moveTo(4, -6);
      c.quadraticCurveTo(-24, -9, -50, -13);
      c.quadraticCurveTo(-66, -14, -67, -5);
      c.quadraticCurveTo(-66, 3, -50, 3);
      c.quadraticCurveTo(-24, 4, 4, 7);
      c.closePath();
    }, COL.rrDark, lw);
    // 羽の筋と白い先端
    ctx.strokeStyle = 'rgba(236, 211, 162, 0.5)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-8, -3); ctx.quadraticCurveTo(-30, -5, -52, -6);
    ctx.stroke();
    ctx.fillStyle = COL.cream;
    ctx.beginPath(); D.ellipse(ctx, -60, -10, 5.5, 2.6, -0.05); ctx.fill();
    ctx.beginPath(); D.ellipse(ctx, -61, -1, 5.5, 2.4, 0.05); ctx.fill();
    ctx.restore();

    // ---- 胴体・首・頭（1つながりの輪郭）----
    var hx = 23, hy = -62 + bob;
    var bodyPath = function (c) { D.ellipse(c, -2, -41 + bob, 28, 17, -0.2); };
    var neckPath = function (c) { D.ellipse(c, 13, -52 + bob, 10, 14, 0.55); };
    var headPath = function (c) { D.ellipse(c, hx, hy, 15, 14, 0); };

    // 冠羽（ボサッと）：頭より先に描いて根元を隠す
    var cf = Math.sin(pose.time * 14) * (1.5 + sn * 2);
    var crestUp = air ? 1.15 : 1 + sn * 0.1;
    D.shape(ctx, function (c) {
      var tips = [
        [-2.9, 13, -8],
        [-2.55, 17, -3],
        [-2.2, 15, 2],
        [-1.9, 12, 5],
        [-1.6, 9, 3]
      ];
      c.moveTo(hx - 13, hy - 2);
      for (var i = 0; i < tips.length; i++) {
        var a = tips[i][0] - sn * 0.25, r = 13 + tips[i][1] * crestUp;
        var jit = (i % 2 ? cf : -cf) * 0.04;
        c.lineTo(hx + Math.cos(a + jit) * r + tips[i][2] * 0.2, hy + Math.sin(a + jit) * r);
        var a2 = a + 0.2;
        c.lineTo(hx + Math.cos(a2) * 11, hy + Math.sin(a2) * 11);
      }
      c.lineTo(hx + 4, hy - 12);
      c.closePath();
    }, COL.rrDark, lw);

    blob(ctx, [bodyPath, neckPath, headPath], COL.rrBrown, lw);

    // おなか（明るい色）とのど
    ctx.save();
    ctx.beginPath(); bodyPath(ctx); ctx.clip();
    ctx.fillStyle = COL.rrBelly;
    ctx.beginPath(); D.ellipse(ctx, 6, -30 + bob, 24, 10, -0.2); ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.beginPath(); headPath(ctx); neckPath(ctx); ctx.clip();
    ctx.fillStyle = COL.rrLight;
    ctx.beginPath(); D.ellipse(ctx, 27, -50 + bob, 11, 9, 0.3); ctx.fill();
    ctx.restore();

    // まだら模様（こげ茶の筋と明るい斑点）
    ctx.save();
    ctx.beginPath(); bodyPath(ctx); neckPath(ctx); headPath(ctx); ctx.clip();
    var spots = [
      [-18, -49, 5, 2.2, -0.3], [-8, -53, 5, 2.2, -0.25], [4, -50, 4.5, 2, -0.3],
      [-22, -40, 4.5, 2, -0.2], [-12, -42, 4, 1.8, -0.2], [12, -58, 3.5, 1.8, 0.6],
      [17, -70, 3.5, 1.6, 0.2], [8, -46, 3.5, 1.6, -0.3]
    ];
    ctx.fillStyle = COL.rrDark;
    for (var i = 0; i < spots.length; i++) {
      var s = spots[i];
      ctx.beginPath(); D.ellipse(ctx, s[0], s[1] + bob, s[2], s[3], s[4]); ctx.fill();
    }
    ctx.fillStyle = COL.rrLight;
    var dots = [[-14, -46], [-3, -47], [-20, -45], [9, -54], [-6, -38]];
    for (i = 0; i < dots.length; i++) {
      ctx.beginPath(); D.ellipse(ctx, dots[i][0], dots[i][1] + bob, 2.2, 1.6, 0); ctx.fill();
    }
    ctx.restore();

    // ---- 翼 ----
    var flap = air ? (pose.wingFlap > 0 ? -0.9 * pose.wingFlap : (pose.vy < 0 ? -0.35 : 0.15)) : Math.sin(p) * 0.08;
    ctx.save();
    ctx.translate(2, -46 + bob);
    ctx.rotate(-0.12 + flap);
    D.oval(ctx, -9, 0, 17, 9.5, 0, '#8a5a2e', lw);
    ctx.fillStyle = COL.rrLight;
    for (i = 0; i < 3; i++) {
      ctx.beginPath(); D.ellipse(ctx, -16 + i * 7, 2 - i * 0.6, 2.4, 1.7, 0); ctx.fill();
    }
    ctx.restore();

    // ---- 顔 ----
    // 目の後ろのオレンジの模様（実在の鳥の特徴）
    ctx.strokeStyle = COL.rrEyePatch;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hx - 3, hy - 1);
    ctx.quadraticCurveTo(hx - 8, hy + 1, hx - 11, hy - 1);
    ctx.stroke();

    // くちばし（長い）
    var open = pose.eat > 0 ? Math.min(1, pose.eat * 8) : 0;
    var bx = hx + 11, by = hy - 1;
    D.shape(ctx, function (c) {
      c.moveTo(bx - 2, by + 2);
      c.lineTo(bx + 2 + 22, by + 7 + open * 7);
      c.quadraticCurveTo(bx + 10, by + 10 + open * 5, bx - 2, by + 8);
      c.closePath();
    }, COL.rrBeak, lw * 0.8);
    D.shape(ctx, function (c) {
      c.moveTo(bx - 3, by - 5);
      c.quadraticCurveTo(bx + 14, by - 3, bx + 28, by + 5 - open * 2);
      c.quadraticCurveTo(bx + 12, by + 5, bx - 3, by + 4);
      c.closePath();
    }, COL.rrBeak, lw * 0.8);

    // 大きな目
    if (pose.hurt > 0) {
      // ＞＜の目
      ctx.strokeStyle = COL.line; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hx + 1, hy - 8); ctx.lineTo(hx + 7, hy - 4); ctx.lineTo(hx + 1, hy);
      ctx.stroke();
    } else {
      D.eye(ctx, hx + 4, hy - 4, 6.5, 0.6, air && pose.vy > 0 ? 0.5 : -0.1, pose.blink > 0);
    }
    D.blush(ctx, hx + 3, hy + 6, 4.5);

    ctx.restore(); // lean

    // ---- 手前の足 ----
    leg(ctx, hipX + 3, hipY, f2.x, f2.y, COL.rrLeg, air ? 2 : 0);

    ctx.restore();
  };

  Player.prototype.draw = function (ctx, speedN) {
    // 無敵中は点滅
    if (this.invuln > 0 && Math.floor(this.invuln * 14) % 2 === 0) return;
    DD.drawRoadrunner(ctx, this.x, this.y, {
      phase: this.phase,
      time: this.time,
      speedN: speedN,
      air: !this.onGround,
      vy: this.vy,
      stretch: this.stretch,
      eat: this.eat,
      hurt: this.hurt,
      blink: this.blink,
      wingFlap: this.wingFlap
    });
  };

  DD.Player = Player;
})(window);
