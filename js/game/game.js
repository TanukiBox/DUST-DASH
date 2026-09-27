/*
 * DUST DASH 1回分のプレイ（走る・食べる・減速・出現）
 */
(function (global) {
  'use strict';
  var DD = global.DD = global.DD || {};
  var CFG = DD.CFG, COL = DD.COL, D = DD.draw, U = DD.util;

  var STEP = 1 / 120; // 当たり判定を細かく刻む（速くてもすり抜けない）

  function Game(opts) {
    opts = opts || {};
    this.demo = !!opts.demo; // タイトル画面の飾り走り
    this.player = new DD.Player();
    this.cam = new DD.Camera();
    if (this.demo) this.cam.anchor = 0.5;
    this.fx = new DD.Effects();
    this.items = [];
    this.speed = this.demo ? 40 : CFG.START_SPEED;
    this.maxSpeed = this.speed;
    this.time = 0;
    this.snakes = 0;
    this.eaten = 0;
    this.combo = 0;        // 着地せずに続けて踏んだ数
    this.maxCombo = 0;
    this.hitStop = 0;      // 踏んだ瞬間に一瞬止める（手ごたえ）
    this.spawned = 0;
    this.nextSpawnX = null;
    this.over = false;
    this.stopTimer = 0;
    this.onOver = null;
    this.events = [];   // 効果音などに使う出来事
  }

  Game.prototype.speedN = function () {
    return U.clamp((this.speed - CFG.SPEED_FX_FROM) / (CFG.SPEED_FX_FULL - CFG.SPEED_FX_FROM), 0, 1);
  };

  Game.prototype.press = function () {
    if (this.over) return;
    this.player.press();
  };

  /** 画面サイズが決まってから毎フレーム呼ぶ */
  Game.prototype.update = function (dt, W, H) {
    this.cam.fit(W, H, this.demo ? 0 : this.speedN());
    if (this.hitStop > 0) {
      this.hitStop -= dt;
      this.fx.update(dt * 0.25);
      return;
    }
    var left = dt;
    while (left > 1e-6) {
      var h = Math.min(STEP, left);
      this.step(h);
      left -= h;
    }
    this.cam.follow(this.player.x, this.player.y, dt);
    this.fx.update(dt);
    if (!this.demo) this.spawn();
    this.cull();
  };

  Game.prototype.step = function (dt) {
    var p = this.player;
    this.time += dt;

    // 自然減速
    if (!this.demo && !this.over) {
      this.speed -= (CFG.DECAY_BASE + CFG.DECAY_RATE * this.speed) * dt;
      if (this.speed <= 0) {
        this.speed = 0;
        this.over = true;
        this.stopTimer = 0;
        this.events.push('stop');
      }
    }
    if (this.over) {
      this.stopTimer += dt;
      if (this.stopTimer > 1.0 && this.onOver) {
        var cb = this.onOver; this.onOver = null;
        cb(this.result());
      }
    }

    if (!this.demo && !this.over) this.assist(dt);
    p.update(dt, this.speed);
    this.fx.runDust(dt, p.x, p.y, this.speedN(), p.onGround && this.speed > 0);

    // 主人公の出来事を演出に変える
    for (var e = 0; e < p.events.length; e++) {
      var ev = p.events[e];
      if (ev === 'land') {
        this.fx.puff(p.x, 0, 5);
        if (this.combo >= 2) this.events.push('comboEnd');
        this.combo = 0;
      }
      if (ev === 'double') this.fx.puff(p.x - 6, p.y, 4);
      this.events.push(ev);
    }
    p.events.length = 0;

    for (var i = 0; i < this.items.length; i++) {
      var it = this.items[i];
      if (it.dead) continue;
      DD.KINDS[it.type].update(it, dt);
      if (!this.over) this.collide(it);
    }
  };

  // ------------------------------------------------------------
  // 当たり判定：上から踏めば食べる。ヘビだけは横から当たると痛い
  // ------------------------------------------------------------
  Game.prototype.collide = function (it) {
    var p = this.player;
    var b = p.box();
    var ix0 = it.x - it.w / 2, ix1 = it.x + it.w / 2;
    var iTop = it.y - it.h, iBot = it.y;
    var m = CFG.STOMP_MARGIN_X;
    var overlapX = b.x1 + m > ix0 && b.x0 - m < ix1;
    var overlapY = b.bottom >= iTop - 6 && b.top <= iBot;

    if (it.prey && !it.noEat && overlapX && overlapY && !p.onGround) {
      if (it.type !== 'snake') {
        // 虫・トカゲ：空中で触れれば食べられる（踏みやすさ優先）
        this.eat(it);
        return;
      }
      // ヘビ：落ちてきていて、足がヘビの上の方にあれば踏める
      if (p.vy > 0 && p.prevY <= iTop + it.h * 0.75) {
        this.eat(it);
        return;
      }
    }
    if (it.type === 'snake' && p.invuln <= 0) {
      // 横からの当たりは少し小さめの判定で（理不尽に感じないように）
      var sx0 = it.x - it.w * 0.34, sx1 = it.x + it.w * 0.34, sTop = iTop + 10;
      if (b.x1 > sx0 && b.x0 < sx1 && b.bottom > sTop && b.top < iBot) {
        this.hurt(it, CFG.PREY.snake.hitLoss);
      }
    }
  };

  /**
   * 踏みつけアシスト：落ちている途中で、だいたい届きそうな獲物があれば
   * 落ち方を少しだけ調整して、ちょうど真上に降りるようにする。
   */
  Game.prototype.assist = function (dt) {
    var p = this.player;
    if (p.onGround || p.vy < -150 || !CFG.ASSIST) return;
    var g = CFG.GRAVITY_DOWN, v = this.speed * CFG.UNITS_PER_KMH;
    var best = null, bestScore = 1e9, bestT = 0, bestDrop = 0;
    for (var i = 0; i < this.items.length; i++) {
      var it = this.items[i];
      if (it.dead || !it.prey || it.noEat) continue;
      var top = it.y - it.h;
      var drop = top - p.y;                 // 足から獲物の上までの高さ
      if (drop < 4) continue;
      var relV = v - (it.vx || 0);
      if (relV < 50) continue;
      var tx = (it.x - p.x) / relV;          // 横に届くまでの時間
      if (tx < 0.03 || tx > 1) continue;
      var vy = Math.max(p.vy, 0);
      var ty = (-vy + Math.sqrt(vy * vy + 2 * g * drop)) / g; // そのまま落ちたら届く時間
      var r = tx / ty;
      if (r < CFG.ASSIST_MIN || r > CFG.ASSIST_MAX) continue;
      var score = Math.abs(Math.log(r));
      if (score < bestScore) { bestScore = score; best = it; bestT = tx; bestDrop = drop; }
    }
    if (!best) return;
    var want = (bestDrop - 0.5 * g * bestT * bestT) / bestT;
    want = U.clamp(want, -320, 1800);
    p.vy += (want - p.vy) * Math.min(1, dt * CFG.ASSIST_STRENGTH);
  };

  Game.prototype.eat = function (it) {
    var p = this.player;
    var spec = CFG.PREY[it.type];
    it.dead = true;
    this.combo++;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    // コンボが続くほど加速が大きくなる
    var mult = Math.min(1 + CFG.COMBO_STEP * (this.combo - 1), CFG.COMBO_MAX_MULT);
    var gain = Math.round(spec.gain * mult);
    this.speed += gain;
    this.maxSpeed = Math.max(this.maxSpeed, this.speed);
    this.eaten++;
    this.fx.ghost(it);
    var cy = it.y - it.h / 2;
    var big = it.type === 'snake';
    var hot = Math.min(1, (this.combo - 1) / 6); // コンボが続くほど派手に
    if (big) {
      this.snakes++;
      p.bounce(CFG.SNAKE_BOUNCE_V);
      this.fx.burst(it.x, cy, COL.snake, 16, true);
      this.fx.shake(8, 0.25);
      this.fx.flash = 0.6;
      this.hitStop = CFG.HITSTOP_BIG;
      this.fx.pop(it.x, iTopOf(it) - 30, '+' + gain + ' km/h', COL.good, 42, this.speed * CFG.UNITS_PER_KMH);
      this.events.push('eatBig');
    } else {
      p.bounce(CFG.STOMP_BOUNCE_V);
      this.fx.burst(it.x, cy, it.type === 'bug' ? COL.bug : COL.lizard, 8 + Math.round(hot * 6), hot > 0.5);
      this.fx.shake(2 + hot * 4, 0.12);
      this.hitStop = CFG.HITSTOP;
      this.fx.pop(it.x, iTopOf(it) - 24, '+' + gain, COL.good, (it.type === 'bug' ? 28 : 34) + hot * 8, this.speed * CFG.UNITS_PER_KMH);
      this.events.push('eat');
    }
    this.fx.ring(it.x, cy, big ? 70 : 40 + hot * 30);
    if (this.combo >= 2) {
      var label = DD.app ? DD.app.i18n.t('combo', { n: this.combo }) : this.combo + ' COMBO';
      this.fx.pop(p.x + 20, p.y - 110, label, this.combo >= 5 ? COL.accent : COL.white, 30 + hot * 14, this.speed * CFG.UNITS_PER_KMH);
      this.events.push('combo');
    }
  };

  Game.prototype.hurt = function (it, loss) {
    var p = this.player;
    p.hit();
    it.strike = 0.4;
    it.noEat = true; // 当たったヘビはそのまま踏んでも食べられない
    this.combo = 0;
    this.speed = Math.max(0, this.speed - loss);
    this.fx.shake(9, 0.3);
    this.fx.pop(p.x + 10, p.y - 90, '-' + loss, COL.bad, 36, this.speed * CFG.UNITS_PER_KMH);
    this.events.push('hurt');
  };

  function iTopOf(it) { return it.y - it.h; }

  // ------------------------------------------------------------
  // 出現：画面の右の外に、次々と獲物を置いていく
  // ------------------------------------------------------------
  var PATTERNS = [
    { name: 'bugGround', w: 18 },
    { name: 'bugAir', w: 20 },
    { name: 'chain', w: 26, minCount: 1 },
    { name: 'lizard', w: 22 },
    { name: 'snake', w: 14, minCount: 3 }
  ];

  Game.prototype.pickPattern = function () {
    var list = [], total = 0;
    for (var i = 0; i < PATTERNS.length; i++) {
      var pt = PATTERNS[i];
      if (pt.minCount && this.spawned < pt.minCount) continue;
      if (pt.name === this.lastPattern && pt.name === 'snake') continue; // ヘビ2連続はなし
      list.push(pt); total += pt.w;
    }
    var r = Math.random() * total;
    for (i = 0; i < list.length; i++) { r -= list[i].w; if (r <= 0) return list[i].name; }
    return list[0].name;
  };

  Game.prototype.place = function (name, x) {
    var add = function (self, type, xx, yy) { self.items.push(DD.createItem(type, xx, yy)); };
    switch (name) {
      case 'bugGround': add(this, 'bug', x, 0); return 0;
      case 'bugAir': add(this, 'bug', x, -U.rand(70, 160)); return 0;
      case 'lizard': add(this, 'lizard', x, 0); return 0;
      case 'snake': add(this, 'snake', x, 0); return 0;
      case 'chain':
        return this.placeChain(x);
    }
    return 0;
  };

  /**
   * コンボ用の並び：踏んで跳ねると、次の獲物にちょうど届く間隔で3〜5匹。
   * 跳ねてから次の獲物の高さまで落ちる時間 × そのときの速さ、で間隔を決める。
   */
  Game.prototype.placeChain = function (x) {
    var n = 3 + ((Math.random() * 3) | 0);
    var list = [];
    for (var k = 0; k < n; k++) {
      var r = Math.random();
      if (k === n - 1 && k >= 3 && r < 0.35 && this.spawned > 3) list.push(['snake', 0]);
      else if (r < 0.5) list.push(['bug', -U.rand(60, 130)]);
      else if (r < 0.72) list.push(['bug', 0]);
      else list.push(['lizard', 0]);
    }
    var up = CFG.STOMP_BOUNCE_V / CFG.GRAVITY_UP;
    var rise = CFG.STOMP_BOUNCE_V * CFG.STOMP_BOUNCE_V / (2 * CFG.GRAVITY_UP);
    var cx = x, vk = Math.max(this.speed, 35);
    for (k = 0; k < n; k++) {
      var it = DD.createItem(list[k][0], cx, list[k][1]);
      it.vx = 0; // 並びのトカゲは立ち止まっている（間隔がずれないように）
      this.items.push(it);
      if (k === n - 1) break;
      var nextSpec = CFG.PREY[list[k + 1][0]];
      var hNow = it.h - it.y;                       // 今の獲物の上の高さ
      var hNext = nextSpec.h - list[k + 1][1];      // 次の獲物の上の高さ
      var fall = Math.max(0, hNow + rise - hNext);
      var t = up + Math.sqrt(2 * fall / CFG.GRAVITY_DOWN);
      vk += Math.round(CFG.PREY[list[k][0]].gain * Math.min(1 + CFG.COMBO_STEP * k, CFG.COMBO_MAX_MULT));
      cx += vk * CFG.UNITS_PER_KMH * t;
    }
    return cx - x;
  };

  Game.prototype.spawn = function () {
    var edge = this.cam.x + this.cam.viewW + 120;
    var v = Math.max(this.speed, 35) * CFG.UNITS_PER_KMH;
    if (this.nextSpawnX === null) this.nextSpawnX = Math.max(edge, this.player.x + v * CFG.FIRST_SPAWN_DELAY);
    while (this.nextSpawnX < edge) {
      var name = this.pickPattern();
      var len = this.place(name, this.nextSpawnX);
      this.lastPattern = name;
      this.spawned++;
      this.nextSpawnX += len + v * U.rand(CFG.SPAWN_GAP_MIN, CFG.SPAWN_GAP_MAX);
    }
  };

  Game.prototype.cull = function () {
    var left = this.cam.x - 200;
    for (var i = this.items.length - 1; i >= 0; i--) {
      if (this.items[i].dead || this.items[i].x < left) this.items.splice(i, 1);
    }
  };

  Game.prototype.result = function () {
    return {
      maxSpeed: Math.round(this.maxSpeed),
      distance: Math.round(this.player.x / (CFG.UNITS_PER_KMH * 3.6)), // メートル
      snakes: this.snakes,
      maxCombo: this.maxCombo,
      time: this.time
    };
  };

  /** 今の距離（メートル） */
  Game.prototype.meters = function () {
    return Math.floor(this.player.x / (CFG.UNITS_PER_KMH * 3.6));
  };

  // ------------------------------------------------------------
  // 描画
  // ------------------------------------------------------------
  Game.prototype.render = function (ctx, dpr) {
    var cam = this.cam, W = cam.W, H = cam.H;
    var sh = this.fx.shakeOffset();

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    DD.drawSky(ctx, W, H, cam.groundY - cam.y * cam.scale);

    cam.apply(ctx, dpr, sh.x, sh.y);
    DD.drawGround(ctx, cam);

    // 影
    var p = this.player;
    DD.drawShadow(ctx, p.x + 2, p.y, 26);
    for (var i = 0; i < this.items.length; i++) {
      var it = this.items[i];
      if (it.type === 'bug' && it.air) DD.drawShadow(ctx, it.x, it.y, 12);
    }

    this.fx.drawDust(ctx);
    for (i = 0; i < this.items.length; i++) {
      it = this.items[i];
      if (!it.dead) DD.KINDS[it.type].draw(ctx, it);
    }
    p.draw(ctx, this.speedN());
    this.fx.drawFront(ctx);

    // 画面の座標に戻して集中線・フラッシュ
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!this.demo) {
      var ps = cam.toScreen(p.x + 40, p.y - 40);
      this.fx.drawSpeedLines(ctx, W, H, ps.x, ps.y, this.speedN());
    }
    if (this.fx.flash > 0) {
      ctx.fillStyle = 'rgba(255, 250, 220, ' + (this.fx.flash * 0.5).toFixed(3) + ')';
      ctx.fillRect(0, 0, W, H);
    }
  };

  DD.Game = Game;
})(window);
