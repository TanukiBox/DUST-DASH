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
    this.holes = [];       // 地面の穴 { x0, x1 }
    this.visScale = 1;     // 引きの画のとき、獲物・障害物を大きく描く倍率
    var self = this;
    this.groundAt = function (x) { return !self.holeAt(x); };
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
    this.catchT = 0;       // タカが急降下を始めてからの時間
    this.shadow = 0;       // タカの影の大きさ（なめらかに変える）
    this.cried = false;
    this.nextMilestone = CFG.MILESTONE;
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
    this.visScale = 1 + (this.cam.zoom - 1) * CFG.PREY_ZOOM_COMP;
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
    // つかまれた後はカメラを止めて、空へ連れ去られるのを見送る
    if (!(this.over && this.catchT >= CFG.HAWK_DIVE_TIME)) this.cam.follow(this.player.x, this.player.y, dt);
    this.fx.update(dt);
    if (!this.demo && !this.over && this.meters() >= this.nextMilestone) {
      this.milestone = this.nextMilestone;
      this.nextMilestone += CFG.MILESTONE;
      this.events.push('milestone');
    }
    if (!this.demo) this.spawn();
    this.cull();
  };

  Game.prototype.step = function (dt) {
    var p = this.player;
    this.time += dt;

    // 自然減速
    if (!this.demo && !this.over) {
      // 先に進むほど減速が強くなる
      var decay = (CFG.DECAY_BASE + CFG.DECAY_RATE * this.speed) * (1 + CFG.DIFF_DECAY * this.difficulty());
      this.speed -= decay * dt;
      if (this.speed <= 0) {
        // 速度0：タカが急降下してくる
        this.speed = 0;
        this.over = true;
        this.catchT = 0;
        this.combo = 0;
        this.hawkFrom = { x: p.x - 560, y: Math.min(p.y, 0) - 760 };
        this.events.push('hawkDive');
      }
    }
    if (this.over) {
      var wasDiving = this.catchT < CFG.HAWK_DIVE_TIME;
      this.catchT += dt;
      if (wasDiving && this.catchT >= CFG.HAWK_DIVE_TIME) {
        var hp = this.hawkPos();
        this.hawkCatchAt = { x: hp.x, y: hp.y };
        this.fx.burst(p.x, p.y - 40, COL.good, 10, true);
        this.fx.puff(p.x, 0, 7);
        this.fx.shake(10, 0.3);
        this.events.push('hawkCatch');
      }
      if (this.catchT > CFG.HAWK_DIVE_TIME + CFG.HAWK_CARRY_TIME && this.onOver) {
        var cb = this.onOver; this.onOver = null;
        cb(this.result());
      }
    }

    // タカの影：遅くなるほど大きく迫る。ある程度近づいたら鳴き声
    var danger = this.danger();
    this.shadow += (danger - this.shadow) * Math.min(1, dt * 3);
    if (!this.cried && danger > CFG.HAWK_CRY_AT && !this.over && !this.demo) { this.cried = true; this.events.push('hawkCry'); }
    if (this.cried && danger < CFG.HAWK_CRY_AT - 0.2) this.cried = false;

    if (!this.demo && !this.over) this.assist(dt);
    if (this.over && this.catchT >= CFG.HAWK_DIVE_TIME) {
      // つかまれて空へ
      var hk = this.hawkPos();
      p.x = hk.x + 4; p.y = hk.y + 108;
      p.onGround = false; p.vy = 0; p.hurt = 1; p.time += dt;
    } else {
      p.update(dt, this.speed, this.groundAt);
    }
    // 穴に深く落ちた／穴の壁にぶつかった
    if (!this.over && !p.onGround && p.y > 24 && p.vy >= 0) {
      var hole = this.holeAt(p.x);
      if (!hole || p.y > 40) this.fall(hole || this.holeNear(p.x));
    }
    this.fx.runDust(dt, p.x, p.y, this.speedN(), p.onGround && this.speed > 0);

    // 主人公の出来事を演出に変える
    for (var e = 0; e < p.events.length; e++) {
      var ev = p.events[e];
      if (ev === 'land') {
        this.fx.puff(p.x, 0, 5);
        this.fx.dust(p.x, 0, 3, this.speedN());
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
      if (it.bump > 0) it.bump -= dt;
      if (!this.over) this.collide(it);
    }
  };

  // ------------------------------------------------------------
  // 当たり判定：上から踏めば食べる。ヘビだけは横から当たると痛い
  // ------------------------------------------------------------
  Game.prototype.collide = function (it) {
    var p = this.player;
    var b = p.box();
    var vs = this.scaleOf(it);
    var w = it.w * vs, h = it.h * vs;
    var ix0 = it.x - w / 2, ix1 = it.x + w / 2;
    var iTop = it.y - h, iBot = it.y;
    var m = CFG.STOMP_MARGIN_X;

    if (it.obstacle) {
      // サボテン・岩：どこから当たっても痛い（判定は見た目より少し小さめ）
      if (p.invuln <= 0 && b.x1 > it.x - w * 0.36 && b.x0 < it.x + w * 0.36 && b.bottom > iTop + 6 && b.top < iBot) {
        this.hurt(it, CFG.OBSTACLE_LOSS);
      }
      return;
    }
    var overlapX = b.x1 + m > ix0 && b.x0 - m < ix1;
    var overlapY = b.bottom >= iTop - 6 && b.top <= iBot;

    if (it.prey && !it.noEat && overlapX && overlapY && !p.onGround) {
      if (it.type !== 'snake') {
        // 虫・トカゲ：空中で触れれば食べられる（踏みやすさ優先）
        this.eat(it);
        return;
      }
      // ヘビ：落ちてきていて、足がヘビの上の方にあれば踏める
      if (p.vy > 0 && p.prevY <= iTop + h * 0.75) {
        this.eat(it);
        return;
      }
    }
    if (it.type === 'snake' && p.invuln <= 0) {
      // 横からの当たりは少し小さめの判定で（理不尽に感じないように）
      var sx0 = it.x - w * 0.34, sx1 = it.x + w * 0.34, sTop = iTop + 10;
      if (b.x1 > sx0 && b.x0 < sx1 && b.bottom > sTop && b.top < iBot) {
        this.hurt(it, CFG.PREY.snake.hitLoss);
      }
    }
  };

  /** 引きの画のときの描く倍率（背の高いものは高さが変わると困るので控えめ） */
  Game.prototype.scaleOf = function (it) {
    if (it.noScale) return 1;
    if (it.obstacle) return Math.min(this.visScale, 1.15);
    return this.visScale;
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
      var top = it.y - it.h * this.visScale;
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
    var cy = it.y - it.h * this.visScale / 2;
    var big = it.type === 'snake';
    var hot = Math.min(1, (this.combo - 1) / 6); // コンボが続くほど派手に
    if (big) {
      this.snakes++;
      p.bounce(CFG.SNAKE_BOUNCE_V);
      this.fx.burst(it.x, cy, COL.snake, 16, true);
      this.fx.shake(8, 0.25);
      this.fx.flash = 0.6;
      this.hitStop = CFG.HITSTOP_BIG;
      this.fx.pop(it.x, cy - 50, '+' + gain + ' km/h', COL.good, 42, this.speed * CFG.UNITS_PER_KMH);
      this.events.push('eatBig');
    } else {
      p.bounce(CFG.STOMP_BOUNCE_V);
      this.fx.burst(it.x, cy, it.type === 'bug' ? COL.bug : COL.lizard, 8 + Math.round(hot * 6), hot > 0.5);
      this.fx.shake(2 + hot * 4, 0.12);
      this.hitStop = CFG.HITSTOP;
      this.fx.pop(it.x, cy - 40, '+' + gain, COL.good, (it.type === 'bug' ? 28 : 34) + hot * 8, this.speed * CFG.UNITS_PER_KMH);
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
    if (it.type === 'snake') {
      it.strike = 0.4;
      it.noEat = true; // 当たったヘビはそのまま踏んでも食べられない
    }
    it.bump = 0.3;
    this.combo = 0;
    this.speed = Math.max(0, this.speed - loss);
    this.fx.shake(9, 0.3);
    this.fx.pop(p.x + 10, p.y - 90, '-' + loss, COL.bad, 36, this.speed * CFG.UNITS_PER_KMH);
    this.events.push('hurt');
  };


  // ------------------------------------------------------------
  // 穴
  // ------------------------------------------------------------
  Game.prototype.holeAt = function (x) {
    for (var i = 0; i < this.holes.length; i++) {
      var h = this.holes[i];
      if (x > h.x0 + 8 && x < h.x1 - 8) return h;
    }
    return null;
  };

  Game.prototype.holeNear = function (x) {
    for (var i = 0; i < this.holes.length; i++) {
      var h = this.holes[i];
      if (x > h.x0 - 60 && x < h.x1 + 60) return h;
    }
    return null;
  };

  /** 穴に落ちた：大きく減速して、穴の向こうへ飛び出して地面に戻る */
  Game.prototype.fall = function (hole) {
    var p = this.player;
    this.speed = Math.max(0, this.speed - CFG.HOLE_LOSS);
    this.combo = 0;
    p.y = Math.min(p.y, 70);
    p.launch(CFG.HOLE_RECOVER_V);
    p.jumps = 2; // 飛び出し中は空中ジャンプなし
    p.invuln = CFG.HURT_INVULN;
    p.hurt = 0.6;
    // 着地までに穴の向こう側へ届くように横にも進ませる
    var gu = CFG.GRAVITY_UP, gd = CFG.GRAVITY_DOWN, v0 = CFG.HOLE_RECOVER_V;
    var air = v0 / gu + Math.sqrt(2 * (v0 * v0 / (2 * gu) - p.y) / gd);
    var target = (hole ? hole.x1 : p.x) + 40;
    p.extraVX = Math.max(0, (target - p.x) / air - this.speed * CFG.UNITS_PER_KMH);
    this.fx.shake(10, 0.35);
    this.fx.puff(p.x, 0, 7);
    this.fx.pop(p.x + 10, -120, '-' + CFG.HOLE_LOSS, COL.bad, 40, this.speed * CFG.UNITS_PER_KMH + p.extraVX);
    this.events.push('fall');
  };

  // ------------------------------------------------------------
  // 出現：画面の右の外に、次々と獲物を置いていく
  // ------------------------------------------------------------
  var PATTERNS = [
    { name: 'bugGround', w: 18 },
    { name: 'bugAir', w: 20 },
    { name: 'chain', w: 26, minCount: 1 },
    { name: 'lizard', w: 22 },
    { name: 'snake', w: 14 },
    { name: 'cactus', w: 12, obstacle: true },
    { name: 'rock', w: 10, obstacle: true },
    { name: 'hole', w: 10, obstacle: true },
    { name: 'holeBug', w: 7, obstacle: true },
    { name: 'cactusBug', w: 7, obstacle: true },
    // 2段ジャンプでよけるもの
    { name: 'giantCactus', w: 10, obstacle: true },
    { name: 'wideHole', w: 6, obstacle: true },
    // ジャンプすると当たるもの
    { name: 'vulture', w: 9, obstacle: true },
    { name: 'vulture2', w: 4, obstacle: true },
    // 障害物が続けて来る（遠くまで行くと出てくる）
    { name: 'rockRock', w: 6, obstacle: true },
    { name: 'holeRock', w: 5, obstacle: true }
  ];

  Game.prototype.pickPattern = function () {
    var list = [], total = 0;
    var d = this.difficulty(), m = this.meters();
    this.allowTwo = Math.random() < CFG.DIFF_TWO_IN_ROW * d;
    for (var i = 0; i < PATTERNS.length; i++) {
      var pt = PATTERNS[i];
      if (pt.minCount && this.spawned < pt.minCount) continue;
      if (CFG.UNLOCK[pt.name] && m < CFG.UNLOCK[pt.name]) continue; // まだ出ない距離
      if (pt.name === this.lastPattern && pt.name === 'snake') continue; // ヘビ2連続はなし
      // 障害物の2連続：はじめは出ない。遠くへ行くほど出るようになる
      if (pt.obstacle && this.lastObstacle && this.allowTwo === false) continue;
      var w = pt.w * (pt.obstacle ? 1 + CFG.DIFF_OBSTACLE * d : 1); // 先に進むほど障害物が増える
      list.push({ name: pt.name, w: w }); total += w;
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
      case 'cactus': add(this, 'cactus', x); return 0;
      case 'rock': add(this, 'rock', x); return 0;
      case 'hole': return this.placeHole(x);
      case 'holeBug':
        // 穴の上に虫：踏めば穴を飛び越えられる
        var hw = this.placeHole(x);
        add(this, 'bug', x + hw * 0.5, -U.rand(100, 130));
        return hw;
      case 'giantCactus': add(this, 'giantCactus', x); return 0;
      case 'wideHole':
        var ww = U.clamp(Math.max(this.speed, 35) * CFG.UNITS_PER_KMH * CFG.WIDE_HOLE_WIDTH, 300, 1400);
        this.holes.push({ x0: x, x1: x + ww, wide: true });
        // ときどき真ん中に虫：踏めば2段ジャンプなしでも渡れる
        if (Math.random() < 0.4) add(this, 'bug', x + ww * 0.45, -U.rand(110, 140));
        return ww;
      case 'vulture':
      case 'vulture2':
        // 前の並びで跳ねている最中に来ないよう、少し間をあける
        var pre = Math.max(this.speed, 35) * CFG.UNITS_PER_KMH * 0.5;
        add(this, 'vulture', x + pre);
        if (name === 'vulture2') {
          // 2羽が上下に重なって飛ぶ：2段ジャンプでもほぼ越えられない
          var top = DD.createItem('vulture', x + pre + 40);
          top.baseY = top.y = -(CFG.OBSTACLE.vulture.lift + CFG.OBSTACLE.vulture.h + 6);
          this.items.push(top);
        }
        return pre;
      case 'rockRock':
        // 岩が2つ：跳んで、着地して、すぐまた跳ぶ
        var gap2 = Math.max(this.speed, 35) * CFG.UNITS_PER_KMH * 0.95;
        add(this, 'rock', x); add(this, 'rock', x + gap2);
        return gap2;
      case 'holeRock':
        var hw2 = this.placeHole(x);
        var gap3 = hw2 + Math.max(this.speed, 35) * CFG.UNITS_PER_KMH * 0.75;
        add(this, 'cactus', x + gap3);
        return gap3;
      case 'cactusBug':
        // サボテンを飛び越えた先に虫
        add(this, 'cactus', x);
        var d = Math.max(this.speed, 35) * CFG.UNITS_PER_KMH * 0.42;
        add(this, 'bug', x + d, -U.rand(80, 110));
        return d;
    }
    return 0;
  };

  Game.prototype.placeHole = function (x) {
    var w = U.clamp(Math.max(this.speed, 35) * CFG.UNITS_PER_KMH * CFG.HOLE_WIDTH, 120, 520);
    this.holes.push({ x0: x, x1: x + w });
    return w;
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
    var v = Math.max(this.speed, 35) * CFG.UNITS_PER_KMH;
    // 画面に入る少し前に置いておく（右はしの「もうすぐ来る」印のため）
    var edge = this.cam.x + this.cam.viewW + Math.max(120, v * CFG.MARKER_TIME);
    if (this.nextSpawnX === null) this.nextSpawnX = Math.max(edge, this.player.x + v * CFG.FIRST_SPAWN_DELAY);
    while (this.nextSpawnX < edge) {
      var name = this.pickPattern();
      var len = this.place(name, this.nextSpawnX);
      this.lastPattern = name;
      this.lastObstacle = /cactus|rock|hole|Hole|Cactus|vulture/.test(name);
      if (this.lastObstacle) this.seenObstacle = true;
      this.spawned++;
      this.nextSpawnX += len + v * U.rand(CFG.SPAWN_GAP_MIN, CFG.SPAWN_GAP_MAX) * (1 - CFG.DIFF_GAP * this.difficulty());
    }
  };

  Game.prototype.cull = function () {
    var left = this.cam.x - 200;
    for (var i = this.items.length - 1; i >= 0; i--) {
      if (this.items[i].dead || this.items[i].x < left) this.items.splice(i, 1);
    }
    for (i = this.holes.length - 1; i >= 0; i--) {
      if (this.holes[i].x1 < left) this.holes.splice(i, 1);
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

  /** タカの近さ（0〜1）。遅いほど1に近い */
  Game.prototype.danger = function () {
    if (this.demo) return 0;
    if (this.over) return 1;
    return U.clamp(1 - this.speed / CFG.HAWK_SAFE_SPEED, 0, 1);
  };

  /** 急降下〜連れ去りのタカの位置（ゲーム内の座標、体の中心） */
  Game.prototype.hawkPos = function () {
    var p = this.player, T = CFG.HAWK_DIVE_TIME;
    if (this.catchT < T) {
      var k = this.catchT / T, e = k * k;
      var tx = p.x - 6, ty = p.y - 120;
      return {
        x: U.lerp(this.hawkFrom.x, tx, e), y: U.lerp(this.hawkFrom.y, ty, e),
        dive: k < 0.75 ? 1 : 1 - (k - 0.75) / 0.25, talons: k > 0.6,
        angle: k < 0.75 ? 0.75 : 0.75 * (1 - (k - 0.75) / 0.25)
      };
    }
    var u = (this.catchT - T) / CFG.HAWK_CARRY_TIME;
    var c = this.hawkCatchAt || { x: p.x, y: p.y - 120 };
    return { x: c.x + u * 380, y: c.y - u * 160 - u * u * 820, dive: 0, talons: true, angle: -0.3 };
  };

  /** 難しさ（0〜1）。距離が伸びるほど1に近づく */
  Game.prototype.difficulty = function () {
    if (this.demo) return 0;
    return 1 - Math.exp(-this.meters() / CFG.DIFF_DISTANCE);
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
    DD.drawGround(ctx, cam, this.holes);
    var bnd = cam.bounds();
    for (var i = 0; i < this.holes.length; i++) {
      var hl = this.holes[i];
      if (hl.x1 > bnd.left && hl.x0 < bnd.right) DD.drawHole(ctx, hl, bnd.bottom);
    }

    // 影
    var p = this.player, vs = this.visScale;
    if (!this.holeAt(p.x)) DD.drawShadow(ctx, p.x + 2, p.y, 26);
    for (i = 0; i < this.items.length; i++) {
      var it = this.items[i];
      if (it.type === 'bug' && it.air) DD.drawShadow(ctx, it.x, it.y, 12 * vs);
    }

    this.fx.drawDust(ctx);
    // 速いときは獲物のまわりをふわっと光らせて見つけやすく
    var glow = U.clamp((this.speed - CFG.GLOW_FROM) / (CFG.GLOW_FULL - CFG.GLOW_FROM), 0, 1);
    for (i = 0; i < this.items.length; i++) {
      it = this.items[i];
      if (it.dead) continue;
      if (glow > 0 && it.prey && !it.noEat) {
        var gy = it.y - it.h * vs / 2, gr = Math.max(it.w, it.h) * vs * 0.95;
        var grad = ctx.createRadialGradient(it.x, gy, gr * 0.2, it.x, gy, gr);
        grad.addColorStop(0, 'rgba(255, 255, 240, ' + (0.85 * glow).toFixed(3) + ')');
        grad.addColorStop(1, 'rgba(255, 255, 240, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath(); D.ellipse(ctx, it.x, gy, gr, gr, 0); ctx.fill();
      }
      ctx.save();
      ctx.translate(it.x, it.y);
      var bump = it.bump > 0 ? 1 + Math.sin(it.bump * 30) * 0.06 : 1;
      var sc = this.scaleOf(it);
      ctx.scale(sc * bump, sc / bump);
      ctx.translate(-it.x, -it.y);
      DD.KINDS[it.type].draw(ctx, it);
      ctx.restore();
    }
    p.draw(ctx, this.speedN());
    if (this.over) {
      var hk = this.hawkPos();
      DD.drawHawk(ctx, hk.x, hk.y, { t: this.time, dive: hk.dive, talons: hk.talons, angle: hk.angle, scale: 1.3 });
    }
    this.fx.drawFront(ctx);

    // 画面の座標に戻して集中線・フラッシュ
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!this.demo) {
      var ps = cam.toScreen(p.x + 40, p.y - 40);
      var g0 = cam.toScreen(p.x, 0);
      var lane = { x: g0.x - 30 * cam.scale, y0: g0.y - 230 * cam.scale, y1: g0.y + 16 * cam.scale };
      this.fx.drawSpeedLines(ctx, W, H, ps.x, ps.y, this.speedN(), lane);
      var shadowK = this.over ? Math.max(0, 1 - this.catchT * 3) : 1; // 本物が来たら影は消える
      DD.drawHawkShadow(ctx, W, H, g0.y, g0.x, this.shadow * shadowK, this.time);
      this.drawMarkers(ctx, dpr);
    }
    if (this.fx.flash > 0) {
      ctx.fillStyle = 'rgba(255, 250, 220, ' + (this.fx.flash * 0.5).toFixed(3) + ')';
      ctx.fillRect(0, 0, W, H);
    }
  };

  /**
   * 画面の右はしに「もうすぐ来る」印。速いときだけ出す。
   * 獲物は白、障害物は赤の吹き出しに、中身の小さな絵を入れる。
   */
  Game.prototype.drawMarkers = function (ctx, dpr) {
    if (this.speed < CFG.MARKER_FROM) return;
    var cam = this.cam, W = cam.W, v = this.speed * CFG.UNITS_PER_KMH;
    var right = cam.x + cam.viewW;
    var ui = DD.app ? DD.app.ui : { u: 1, safeRight: 0 };
    var R = 19 * ui.u, bx = W - R - 10 * ui.u - ui.safeRight * ui.u;
    var list = [];
    for (var i = 0; i < this.items.length; i++) {
      var it = this.items[i];
      if (it.dead) continue;
      var sc2 = this.scaleOf(it);
      list.push({ x: it.x - it.w * sc2 / 2, it: it, y: it.y - it.h * sc2 / 2 });
    }
    for (i = 0; i < this.holes.length; i++) list.push({ x: this.holes[i].x0, hole: true, y: 10 });
    // いちばん近いものだけを出す（重なって読めなくならないように）
    var next = null, nextT = 1e9;
    for (i = 0; i < list.length; i++) {
      var c = list[i];
      if (c.x <= right) continue;
      var rv = v - ((c.it && c.it.vx) || 0);
      if (rv <= 0) continue;
      var tt = (c.x - right) / rv;
      if (tt < nextT) { nextT = tt; next = c; }
    }
    if (!next || nextT > CFG.MARKER_TIME) return;
    list = [next];
    for (i = 0; i < list.length; i++) {
      var m = list[i];
      var t = nextT;
      var a = U.clamp(1 - t / CFG.MARKER_TIME, 0, 1);
      var sy = U.clamp(cam.toScreen(0, m.y).y, R + 10, cam.H - R - 10);
      var bad = m.hole || (m.it && m.it.obstacle);
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.translate(bx, sy);
      var s = U.easeOutBack(U.clamp(a * 4, 0, 1)) * (1 + Math.sin(this.time * 18) * 0.05);
      ctx.scale(s, s);
      // 吹き出し（右向きのとがり）
      D.shape(ctx, function (c) {
        c.arc(0, 0, R, 0.55, Math.PI * 2 - 0.55);
        c.lineTo(R + 9 * ui.u, 0);
        c.closePath();
      }, bad ? '#ffd2c8' : COL.cream, 3 * ui.u);
      if (m.hole) {
        D.text(ctx, '!', 0, 1, { size: R * 1.3, fill: COL.bad, lw: R * 0.25 });
      } else {
        var it2 = m.it, k = (R * 1.45) / Math.max(it2.w, it2.h + 10);
        ctx.scale(k, k);
        var copy = { x: 0, y: it2.h / 2 };
        for (var key in it2) if (key !== 'x' && key !== 'y') copy[key] = it2[key];
        DD.KINDS[it2.type].draw(ctx, copy);
      }
      ctx.restore();
    }
  };

  DD.Game = Game;
})(window);
