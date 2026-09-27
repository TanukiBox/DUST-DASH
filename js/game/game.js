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
    this.spawned = 0;
    this.nextSpawnX = null;
    this.over = false;
    this.stopTimer = 0;
    this.onOver = null;
    this.hint = { stompShown: false };
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

    p.update(dt, this.speed);
    this.fx.runDust(dt, p.x, p.y, this.speedN(), p.onGround && this.speed > 0);

    // 主人公の出来事を演出に変える
    for (var e = 0; e < p.events.length; e++) {
      var ev = p.events[e];
      if (ev === 'land') this.fx.puff(p.x, 0, 5);
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
    // 落ちてきていて、前の瞬間の足が獲物の真ん中より上にあった → 踏んだ
    if (it.prey && !it.noEat && overlapX && p.vy > 0 && b.bottom >= iTop - 4 && p.prevY <= iTop + it.h * 0.5 + 6 && b.bottom <= iBot + 24) {
      this.eat(it);
      return;
    }
    if (it.type === 'snake' && p.invuln <= 0) {
      // 横からの当たりは少し小さめの判定で（理不尽に感じないように）
      var sx0 = it.x - it.w * 0.34, sx1 = it.x + it.w * 0.34, sTop = iTop + 10;
      if (b.x1 > sx0 && b.x0 < sx1 && b.bottom > sTop && b.top < iBot) {
        this.hurt(it, CFG.PREY.snake.hitLoss);
      }
    }
  };

  Game.prototype.eat = function (it) {
    var p = this.player;
    var spec = CFG.PREY[it.type];
    it.dead = true;
    this.speed += spec.gain;
    this.maxSpeed = Math.max(this.maxSpeed, this.speed);
    this.eaten++;
    var cy = it.y - it.h / 2;
    if (it.type === 'snake') {
      this.snakes++;
      p.bounce(CFG.SNAKE_BOUNCE_V);
      this.fx.burst(it.x, cy, COL.snake, 14, true);
      this.fx.shake(7, 0.25);
      this.fx.flash = 0.6;
      this.fx.pop(it.x, iTopOf(it) - 30, '+' + spec.gain + ' km/h', COL.good, 40);
      this.events.push('eatBig');
    } else {
      p.bounce(CFG.STOMP_BOUNCE_V);
      this.fx.burst(it.x, cy, it.type === 'bug' ? COL.bug : COL.lizard, 8, false);
      this.fx.pop(it.x, iTopOf(it) - 24, '+' + spec.gain, COL.good, it.type === 'bug' ? 28 : 34);
      this.events.push('eat');
    }
  };

  Game.prototype.hurt = function (it, loss) {
    var p = this.player;
    p.hit();
    it.strike = 0.4;
    it.noEat = true; // 当たったヘビはそのまま踏んでも食べられない
    this.speed = Math.max(0, this.speed - loss);
    this.fx.shake(9, 0.3);
    this.fx.pop(p.x + 10, p.y - 90, '-' + loss, COL.bad, 36);
    this.events.push('hurt');
  };

  function iTopOf(it) { return it.y - it.h; }

  // ------------------------------------------------------------
  // 出現：画面の右の外に、次々と獲物を置いていく
  // ------------------------------------------------------------
  var PATTERNS = [
    { name: 'bugGround', w: 18 },
    { name: 'bugAir', w: 20 },
    { name: 'bugArc', w: 12, minCount: 3 },
    { name: 'lizard', w: 22 },
    { name: 'snake', w: 14, minCount: 3 },
    { name: 'lizardBug', w: 9, minCount: 4 }
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
    var v = Math.max(this.speed, 35) * CFG.UNITS_PER_KMH;
    var add = function (self, type, xx, yy) { self.items.push(DD.createItem(type, xx, yy)); };
    switch (name) {
      case 'bugGround': add(this, 'bug', x, 0); return 0;
      case 'bugAir': add(this, 'bug', x, -U.rand(70, 160)); return 0;
      case 'bugArc':
        // 踏んで跳ねるとちょうど次に届く間隔で3匹
        var gap = v * 0.55, hgt = -U.rand(80, 120);
        for (var i = 0; i < 3; i++) add(this, 'bug', x + gap * i, hgt);
        return gap * 2;
      case 'lizard': add(this, 'lizard', x, 0); return 0;
      case 'snake': add(this, 'snake', x, 0); return 0;
      case 'lizardBug':
        add(this, 'lizard', x, 0);
        add(this, 'bug', x + v * 0.62, -U.rand(90, 130));
        return v * 0.62;
    }
    return 0;
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
