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
    this.course = new DD.Course(this); // コースづくり（お手本の走りから）
    this.items = [];
    this.holes = [];       // 地面の穴 { x0, x1, y }
    this.floors = [];      // 高い足場（台地） { x0, x1, y }。ここ以外の地面の高さは 0
    this.camFloor = 0;     // カメラが合わせる足場の高さ
    this.visScale = 1;     // 引きの画のとき、獲物・障害物を大きく描く倍率
    var self = this;
    // その場所の地面の高さ（穴なら null）。フィーバー中は穴の上も走れる
    this.groundAt = function (x) { return self.floorAt(x); };
    // 強化の効き目（タイトルの飾り走りでは使わない）
    this.up = opts.up || { stamina: 1, dash: 0, ukemi: 1, glutton: 1, luck: 1 };
    this.coinsPicked = 0;  // 拾ったコイン（速さの倍率込み）
    this.chainEaten = {};  // 並びごとに食べた数（全部食べるとパーフェクト）
    this.sinceReward = 0;  // ごほうび区間からの並びの数
    this.coinPop = 0;
    this.feverGauge = 0;   // 満タンでフィーバー
    this.fever = 0;        // フィーバーの残り時間
    this.feverKind = '';   // 'fever' か 'dash'（スタートダッシュ）
    if (!this.demo && this.up.dash > 0) { this.fever = this.up.dash; this.feverKind = 'dash'; }
    this.speed = this.demo ? 40 : CFG.BASE_SPEED_START;
    this.maxSpeed = this.speed;
    this.stamina = CFG.STAMINA_MAX; // スタミナ：時間とともに減り、食べると回復。0でバテる
    this.boost = 0;        // 食べて上乗せされた速さ（だんだん元に戻る）
    this.exhausted = false;
    this.staminaFlash = 0; // ゲージを光らせる（＋は回復、－は減った）
    this.time = 0;
    this.snakes = 0;
    this.gems = { sapphire: 0, emerald: 0, ruby: 0 }; // 拾った宝石の数
    this.eaten = 0;
    this.combo = 0;        // 着地せずに続けて踏んだ数
    this.maxCombo = 0;
    this.hitStop = 0;      // 踏んだ瞬間に一瞬止める（手ごたえ）
    this.spawned = 0;
    this.nextSpawnX = null;
    this.over = false;
    this.endless = opts.mode === 'endless'; // エンドレスモード（ゴールなし。クリアすると遊べる）
    this.goalX = this.endless ? Infinity : CFG.GOAL_M * CFG.UNITS_PER_KMH * 3.6; // ゴールの場所（ゲーム内の座標）
    this.cleared = false;  // ゴールした（逃げきった）
    this.clearT = 0;
    this.catchT = 0;       // タカが急降下を始めてからの時間
    this.shadow = 0;       // タカの影の大きさ（なめらかに変える）
    this.cried = false;
    this.nextMilestone = CFG.MILESTONE;
    this.onOver = null;
    this.events = [];   // 効果音などに使う出来事
    // 自分のベスト記録の場所に旗を立てる（越えたら「ベスト更新！」）
    this.bestM = this.demo ? 0 : (opts.bestM || 0);
    this.bestPassed = !(this.bestM > 0);
    this.hits = 0;         // 障害物などにぶつかった回数（結果画面のコツに使う）
    this.clearTime = 0;    // ゴールしたときの時間（ランキング用）
  }

  Game.prototype.speedN = function () {
    return U.clamp((this.speed - CFG.SPEED_FX_FROM) / (CFG.SPEED_FX_FULL - CFG.SPEED_FX_FROM), 0, 1);
  };

  Game.prototype.press = function () {
    if (this.over || this.cleared) return;
    this.player.press();
  };

  /** 画面サイズが決まってから毎フレーム呼ぶ */
  Game.prototype.update = function (dt, W, H) {
    // 穴に落ちたときは、カメラの引き具合をその時のままにする（急にズームしないように）
    this.cam.fit(W, H, this.demo ? 0 : this.fell ? this.fellN : this.speedN());
    this.visScale = 1 + (this.cam.zoom - 1) * CFG.PREY_ZOOM_COMP;
    // 踏んだ瞬間は一瞬スローに（完全に止めると、画面がカクっと引っかかって見えるため）
    if (this.hitStop > 0) {
      this.hitStop -= dt;
      dt *= 0.2;
    }
    var left = dt;
    while (left > 1e-6) {
      var h = Math.min(STEP, left);
      this.step(h);
      left -= h;
    }
    // つかまれた後はカメラを止めて、空へ連れ去られるのを見送る
    if (!(this.over && (this.fell || this.catchT >= CFG.HAWK_DIVE_TIME))) this.cam.follow(this.player.x, this.player.y, dt, this.camFloor);
    this.fx.update(dt);
    if (this.staminaFlash > 0) this.staminaFlash = Math.max(0, this.staminaFlash - dt * 3);
    if (this.coinPop > 0) this.coinPop = Math.max(0, this.coinPop - dt * 6);
    if (this.staminaFlash < 0) this.staminaFlash = Math.min(0, this.staminaFlash + dt * 3);
    // ステージが進んだ
    var st = Math.floor(this.meters() / CFG.STAGE_M);
    if (!this.endless) st = Math.min(DD.STAGES.length - 1, st);
    if (!this.demo && !this.over && st > (this.stage || 0)) {
      this.stage = st;
      this.events.push('stage');
    }
    if (!this.demo) this.spawn();
    this.cull();
  };

  Game.prototype.step = function (dt) {
    var p = this.player;
    this.time += dt;

    // ゴール！：タカをふりきった。少し走ってからエンディングへ
    if (!this.demo && !this.over && !this.cleared && p.x >= this.goalX) {
      this.cleared = true;
      this.clearTime = this.time;
      this.combo = 0;
      this.fever = 0;
      this.fx.flash = 1;
      for (var ci = 0; ci < 30; ci++) this.fx.burst(p.x + 200 + Math.random() * 300, p.y - 200 - Math.random() * 200, ['#ff6b5b', '#ffcf3f', '#6cc06b', '#5b9cf0', '#b35cff'][ci % 5], 1, true);
      this.events.push('goal');
    }
    // ベストの旗を越えた
    if (!this.bestPassed && !this.over && this.meters() >= this.bestM) {
      this.bestPassed = true;
      var bt = DD.app ? DD.app.i18n.t('bestBeat') : 'NEW BEST!';
      this.fx.pop(p.x + 40, p.y - 150, bt, COL.good, 40, this.speed * CFG.UNITS_PER_KMH * 0.8);
      this.events.push('best');
    }
    if (this.cleared) {
      this.clearT += dt;
      this.speed = Math.max(40, this.speed - 25 * dt);
      if (this.clearT > 2.2 && this.onOver) {
        var cbGoal = this.onOver; this.onOver = null;
        cbGoal(this.result());
      }
    }

    // スタミナと速さ（ウインドランナー式：スタミナは減り続け、減り方はだんだん速くなる）
    if (!this.demo && !this.over && !this.cleared) {
      var drain = (CFG.STAMINA_DRAIN + CFG.STAMINA_DRAIN_GROW * this.time) * this.up.stamina;
      if (this.fever <= 0) this.stamina = Math.max(0, this.stamina - drain * dt); // フィーバー中は減らない
      this.boost *= Math.exp(-dt / CFG.BOOST_TAU);
      if (this.stamina > 0) {
        // 土台の速さ（距離で上がる）＋食べた分。スタミナが少ないと足が遅くなる
        var fat = this.stamina < CFG.FATIGUE_AT ? U.lerp(CFG.FATIGUE_MIN, 1, this.stamina / CFG.FATIGUE_AT) : 1;
        var target = (this.baseSpeed() + this.boost + (this.fever > 0 ? CFG.FEVER_BOOST : 0)) * fat;
        this.speed += (target - this.speed) * Math.min(1, dt * CFG.SPEED_FOLLOW);
      } else {
        // バテた：止まるまで減速
        if (!this.exhausted) {
          this.exhausted = true;
          this.combo = 0;
          var tired = DD.app ? DD.app.i18n.t('exhausted') : 'EXHAUSTED';
          this.fx.pop(p.x + 60, p.y - 110, tired, COL.bad, 34, this.speed * CFG.UNITS_PER_KMH * 0.6);
          this.events.push('exhausted');
        }
        this.speed = Math.max(0, this.speed - CFG.EXHAUST_DECEL * dt);
      }
      this.maxSpeed = Math.max(this.maxSpeed, this.speed);
      if (this.speed <= 0.01 && this.exhausted) {
        // 速度0：タカが急降下してくる
        this.speed = 0;
        this.over = true;
        this.catchT = 0;
        this.combo = 0;
        this.hawkFrom = { x: p.x - 560, y: Math.min(p.y, 0) - 760 };
        this.events.push('hawkDive');
      }
    }
    // フィーバーの時間
    if (this.fever > 0 && !this.over) {
      this.fever -= dt;
      this.feverTrail = (this.feverTrail || 0) + dt;
      while (this.feverTrail > 0.02) { this.feverTrail -= 0.02; this.fx.rainbow(p.x - 20, p.y - 30, this.time); }
      if (this.fever <= 0) {
        this.fever = 0;
        p.invuln = 1.2; // 終わった直後に当たらないように
        this.events.push('feverEnd');
      }
    }
    if (this.crashed) {
      this.crashed.t += dt;
      if (this.crashed.t > 1.5 && this.onOver) {
        var cbCrash = this.onOver; this.onOver = null;
        cbCrash(this.result());
      }
    } else if (this.fell) {
      // 穴の底へ落ちていく → 少ししたら結果へ
      this.fallT += dt;
      if (this.fallT > 1.4 && this.onOver) {
        var cbFall = this.onOver; this.onOver = null;
        cbFall(this.result());
      }
    } else if (this.over) {
      var wasDiving = this.catchT < CFG.HAWK_DIVE_TIME;
      this.catchT += dt;
      if (wasDiving && this.catchT >= CFG.HAWK_DIVE_TIME) {
        var hp = this.hawkPos();
        this.hawkCatchAt = { x: hp.x, y: hp.y };
        this.fx.burst(p.x, p.y - 40, COL.good, 10, true);
        this.fx.puff(p.x, p.y, 7);
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
    if (this.over && !this.fell && !this.crashed && this.catchT >= CFG.HAWK_DIVE_TIME) {
      // つかまれて空へ
      var hk = this.hawkPos();
      p.x = hk.x + 4; p.y = hk.y + 108;
      p.onGround = false; p.vy = 0; p.hurt = 1; p.time += dt;
    } else {
      if (!this.over && !this.demo) this.checkWall();
      p.update(dt, this.speed, this.groundAt);
    }
    // 穴に深く落ちた
    if (!this.over && !p.onGround && p.vy >= 0) {
      var hole = this.holeAt(p.x);
      if (hole && p.y > (hole.y || 0) + 45) this.fall(hole);
    }
    if (p.onGround) this.camFloor = p.y;
    this.fx.runDust(dt, p.x, p.y, this.speedN(), p.onGround && this.speed > 0);

    // 主人公の出来事を演出に変える
    for (var e = 0; e < p.events.length; e++) {
      var ev = p.events[e];
      if (ev === 'land') {
        this.fx.puff(p.x, p.y, 5);
        this.fx.dust(p.x, p.y, 3, this.speedN());
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
      // 地面を走る生き物は、段差や穴の手前で止まる（足場に埋まらないように）
      if (it.vx > 0 && !it.flying && this.floorAt(it.x + it.w / 2 + 4, true) !== it.y) it.vx = 0;
      if (it.bump > 0) it.bump -= dt;
      if (it.type === 'fallRock') {
        // 落石：主人公が近づいたら落ちはじめる。落ちたら地面がゆれる
        if (it.state === 'wait' && it.x - p.x < Math.max(this.speed, 35) * CFG.UNITS_PER_KMH * CFG.FALL_ROCK_LEAD) it.state = 'fall';
        if (it.justLanded) {
          it.justLanded = false;
          this.fx.shake(7, 0.25); this.fx.puff(it.x, it.y, 8);
          this.events.push('rockfall');
        }
      }
      if (!this.over && !this.cleared && !it.deco) this.collide(it);
    }
  };

  // ------------------------------------------------------------
  // 当たり判定：上から踏めば食べる。ヘビだけは横から当たると痛い
  // ------------------------------------------------------------
  Game.prototype.collide = function (it) {
    var p = this.player;
    if (it.coin) {
      var dx = it.x - p.x, dy = it.y - (p.y - 30);
      // フィーバー中はコインが吸い寄せられる
      if (this.fever > 0 && dx * dx + dy * dy < CFG.FEVER_MAGNET * CFG.FEVER_MAGNET) {
        var dd = Math.sqrt(dx * dx + dy * dy) || 1;
        it.x -= dx / dd * 1400 * STEP; it.y -= dy / dd * 1400 * STEP;
      }
      var cr = CFG.COIN_RADIUS + (it.big ? 18 : 0);
      if (dx * dx + dy * dy < cr * cr) this.pickCoin(it);
      return;
    }
    var b = p.box();
    if (it.whirl) {
      // つむじ風：ふれると空高く飛ばされる
      if (!it.used && Math.abs(it.x - p.x) < 36 && p.y > it.y - it.h && b.top < it.y) {
        it.used = true;
        p.launch(CFG.WHIRL_V); p.jumps = 1; p.flip = 1;
        this.fx.puff(it.x, it.y, 8);
        this.fx.ring(it.x, it.y - 60, 80);
        var wl = DD.app ? DD.app.i18n.t('whirl') : 'WHIRLWIND!';
        this.fx.pop(p.x + 20, p.y - 120, wl, '#ffffff', 34, this.speed * CFG.UNITS_PER_KMH);
        this.events.push('whirl');
      }
      return;
    }
    if (it.ceiling) {
      // 岩のひさし：頭が岩より上に出たら当たる
      if (b.x1 > it.x - it.w / 2 + 8 && b.x0 < it.x + it.w / 2 - 8 && b.top < it.y - 4) {
        if (this.fever <= 0 && p.invuln <= 0) this.hurt(it, CFG.OBSTACLE_LOSS, CFG.OBSTACLE_STAMINA);
        if (p.vy < 150) p.vy = 150; // 下へはね返す
      }
      return;
    }
    var vs = this.scaleOf(it);
    var w = it.w * vs, h = it.h * vs;
    var ix0 = it.x - w / 2, ix1 = it.x + w / 2;
    var iTop = it.y - h, iBot = it.y;
    var m = CFG.STOMP_MARGIN_X;

    if (it.deadly && this.fever <= 0) {
      // サボテンの壁：ぶつかったらゲームオーバー（体の半分くらい重なったら）
      if (b.x1 > it.x - w / 2 + 10 && b.x0 < it.x + w / 2 && b.bottom > iTop + 10 && b.top < iBot) this.crash(it);
      return;
    }
    if (it.obstacle && this.fever > 0) {
      // フィーバー中：障害物はふっとばす
      if (b.x1 + m > ix0 && b.x0 - m < ix1 && b.bottom >= iTop && b.top <= iBot) this.smash(it);
      return;
    }
    if (it.obstacle) {
      // サボテン・岩：どこから当たっても痛い（判定は見た目より少し小さめ）
      if (p.invuln <= 0 && b.x1 > it.x - w * 0.36 && b.x0 < it.x + w * 0.36 && b.bottom > iTop + 6 && b.top < iBot) {
        this.hurt(it, CFG.OBSTACLE_LOSS, CFG.OBSTACLE_STAMINA);
      }
      return;
    }
    var overlapX = b.x1 + m > ix0 && b.x0 - m < ix1;
    var overlapY = b.bottom >= iTop - 6 && b.top <= iBot;

    if (this.fever > 0 && overlapX && overlapY) {
      // フィーバー中：障害物はふっとばし、獲物はふれるだけで食べる
      if (it.obstacle) { this.smash(it); return; }
      if (it.prey && !it.noEat) { this.eat(it); return; }
    }

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
        this.hurt(it, CFG.PREY.snake.hitLoss, CFG.PREY.snake.hitStamina);
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
    this.boost += gain;
    this.stamina = Math.min(CFG.STAMINA_MAX, this.stamina + spec.stamina * Math.min(mult, CFG.COMBO_STAMINA_MAX) * this.up.glutton);
    this.addFever(CFG.FEVER_GAIN[it.type] * this.up.glutton * (1 + 0.1 * (this.combo - 1)));
    this.staminaFlash = 1;
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
    // コンボのボーナス（コイン）と、並びを全部食べたときの「パーフェクト」
    if (this.combo >= 3) {
      var bonus = this.combo * CFG.COMBO_BONUS;
      this.coinsPicked += bonus;
      this.coinPop = 1;
      this.fx.pop(p.x - 30, p.y - 70, 'BONUS +' + bonus, '#ffe066', 24 + hot * 8, this.speed * CFG.UNITS_PER_KMH);
    }
    if (it.chainId) {
      this.chainEaten[it.chainId] = (this.chainEaten[it.chainId] || 0) + 1;
      if (this.chainEaten[it.chainId] === it.chainN) {
        var pb = it.chainN * CFG.PERFECT_BONUS;
        this.coinsPicked += pb;
        var pl = DD.app ? DD.app.i18n.t('perfect') : 'PERFECT!';
        this.fx.pop(p.x + 30, p.y - 160, pl + ' +' + pb, COL.accent, 38, this.speed * CFG.UNITS_PER_KMH);
        this.fx.burst(p.x, p.y - 40, COL.good, 14, true);
        this.events.push('perfect');
      }
    }
    if (this.combo >= 2) {
      var label = DD.app ? DD.app.i18n.t('combo', { n: this.combo }) : this.combo + ' COMBO';
      this.fx.pop(p.x + 20, p.y - 110, label, this.combo >= 5 ? COL.accent : COL.white, 30 + hot * 14, this.speed * CFG.UNITS_PER_KMH);
      this.events.push('combo');
    }
  };

  /** コインを拾う。速いほど1枚の価値が上がる */
  Game.prototype.pickCoin = function (it) {
    it.dead = true;
    var val = DD.coinValue(this.speed) * (this.fever > 0 ? 2 : 1) * (it.gem ? CFG.GEMS[it.gem] : 1);
    this.coinsPicked += val;
    if (it.gem) {
      // 宝石：石の色の光と「ルビー +40」
      this.gems[it.gem]++;
      this.lastGem = it.gem;
      var gc = DD.GEM_COL[it.gem];
      this.fx.burst(it.x, it.y, gc.mid, 12, true);
      this.fx.ring(it.x, it.y, 60);
      var gname = DD.app ? DD.app.i18n.t('gem_' + it.gem) : it.gem;
      this.fx.pop(it.x, it.y - 34, gname + ' +' + val, gc.light, 34, this.speed * CFG.UNITS_PER_KMH);
      this.events.push('gem');
    }
    this.coinPop = 1;
    this.addFever(CFG.FEVER_GAIN.coin);
    this.fx.coinSpark(it.x, it.y);
    this.coinSfx = (this.coinSfx || 0) + 1;
    this.events.push('coin');
  };

  /** フィーバーゲージをためる。満タンでフィーバー */
  Game.prototype.addFever = function (n) {
    if (this.fever > 0 || this.over || this.demo) return;
    this.feverGauge = Math.min(CFG.FEVER_MAX, this.feverGauge + n);
    if (this.feverGauge >= CFG.FEVER_MAX) {
      this.feverGauge = 0;
      this.fever = CFG.FEVER_TIME;
      this.feverKind = 'fever';
      this.stamina = Math.min(CFG.STAMINA_MAX, this.stamina + 10);
      this.fx.flash = 0.8;
      this.fx.shake(6, 0.2);
      this.events.push('fever');
    }
  };

  /** フィーバー中に障害物にぶつかる：ふっとばしてコインに */
  Game.prototype.smash = function (it) {
    it.dead = true;
    var cy = it.y - it.h / 2;
    this.fx.burst(it.x, cy, COL.good, 12, true);
    this.fx.ring(it.x, cy, 70);
    this.fx.shake(6, 0.15);
    this.coinsPicked += 3;
    this.coinPop = 1;
    this.fx.pop(it.x, cy - 40, '+3', COL.good, 30, this.speed * CFG.UNITS_PER_KMH);
    this.events.push('smash');
  };

  Game.prototype.hurt = function (it, loss, staminaLoss) {
    var p = this.player;
    p.hit();
    this.hits++;
    if (it.type === 'snake') {
      it.strike = 0.4;
      it.noEat = true; // 当たったヘビはそのまま踏んでも食べられない
    }
    it.bump = 0.3;
    this.combo = 0;
    this.boost = 0;
    this.speed = Math.max(0, this.speed - loss);
    this.stamina = Math.max(0, this.stamina - staminaLoss * this.up.ukemi);
    this.staminaFlash = -1;
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

  /** 高い足場の高さ（なければ 0 = ふつうの地面） */
  Game.prototype.levelAt = function (x) {
    for (var i = 0; i < this.floors.length; i++) {
      var f = this.floors[i];
      if (x >= f.x0 && x < f.x1) return f.y;
    }
    return 0;
  };

  /** その場所の地面の高さ（上がマイナス）。穴なら null。noFever なら、フィーバーの橋を考えない */
  Game.prototype.floorAt = function (x, noFever) {
    var h = this.holeAt(x);
    if (h) return (this.fever > 0 && !noFever) ? (h.y || 0) : null;
    return this.levelAt(x);
  };

  /**
   * 前にある高い足場の壁にぶつかったか。
   * ちょっとの段差（足が上のふちの近く）なら、そのまま上に乗る（引っかからないように）
   */
  Game.prototype.checkWall = function () {
    var p = this.player;
    var ahead = this.floorAt(p.x + 22);
    if (ahead === null || ahead >= p.y - CFG.STEP_UP) return;
    var below = p.y - ahead; // 足が上のふちより どれだけ下にあるか
    if (below < CFG.LEDGE_GRAB || this.fever > 0) {
      p.y = ahead; p.vy = 0; p.onGround = true; p.jumps = 0; return;
    }
    if (this.floorAt(p.x) === null) { this.fall(this.holeAt(p.x) || this.holeNear(p.x)); return; }
    // 壁にぶつかった：痛いけど、上に押し上げて走り続けられるようにする
    if (p.invuln <= 0) this.hurt({ type: 'wall' }, CFG.WALL_LOSS, CFG.WALL_STAMINA);
    p.y = ahead; p.vy = -380; p.onGround = false; p.jumps = 1;
  };

  Game.prototype.holeNear = function (x) {
    for (var i = 0; i < this.holes.length; i++) {
      var h = this.holes[i];
      if (x > h.x0 - 60 && x < h.x1 + 60) return h;
    }
    return null;
  };

  /** サボテンの壁にぶつかった：その場でゲームオーバー（はね返されて、しりもち） */
  Game.prototype.crash = function (it) {
    if (this.over) return;
    var p = this.player;
    this.over = true;
    this.crashed = { t: 0, type: it.type };
    this.speed = 0; this.boost = 0; this.combo = 0; this.fever = 0;
    p.x = Math.min(p.x, it.x - it.w / 2 - 18);
    p.vy = Math.min(p.vy, -420); p.onGround = false; p.extraVX = -260; p.hurt = 1.5;
    this.fx.shake(14, 0.4);
    this.fx.burst(p.x + 20, p.y - 40, COL.bad, 8, true);
    var msg = DD.app ? DD.app.i18n.t('crashed') : 'BLOCKED!';
    this.fx.pop(p.x, p.y - 140, msg, COL.bad, 36, 0);
    this.events.push('hurt');
  };

  /** 穴に落ちた：その場でゲームオーバー（穴の底へ落ちていく） */
  Game.prototype.fall = function (hole) {
    if (this.over) return;
    var p = this.player;
    this.over = true;
    this.fell = hole || this.holeNear(p.x) || { x0: p.x - 60, x1: p.x + 60, y: 0 };
    this.fallT = 0;
    this.fellN = this.speedN();
    this.speed = 0;
    this.boost = 0;
    this.combo = 0;
    this.fever = 0;
    p.extraVX = 0;
    p.hurt = 1;
    // 穴のまん中あたりへ吸いこまれるように
    p.x = U.clamp(p.x, this.fell.x0 + 20, this.fell.x1 - 20);
    this.fx.shake(10, 0.35);
    this.fx.puff(p.x, this.fell.y || 0, 7);
    var fl = DD.app ? DD.app.i18n.t('fellHole') : 'FELL!';
    this.fx.pop(p.x + 10, (this.fell.y || 0) - 130, fl, COL.bad, 40, 0);
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
    // 地形（高さの変化）
    { name: 'stepUp', w: 34, terrain: true },
    { name: 'stepDown', w: 30, terrain: true },
    { name: 'islands', w: 14, terrain: true, obstacle: true },
    // 上からの障害物
    { name: 'overhang', w: 9, obstacle: true },
    // ステージの名物（決まったステージだけ。重さは config.js の STAGE_BIAS）
    { name: 'tumble', w: 22, obstacle: true, stageOnly: true },
    { name: 'tumbleHerd', w: 20, obstacle: true, stageOnly: true },
    { name: 'whirlWall', w: 20, obstacle: true, stageOnly: true },
    { name: 'cactusRow', w: 20, obstacle: true, stageOnly: true },
    { name: 'crackRun', w: 20, obstacle: true, stageOnly: true },
    { name: 'chasm', w: 20, obstacle: true, terrain: true, stageOnly: true },
    { name: 'staircase', w: 20, terrain: true, stageOnly: true },
    { name: 'fallRocks', w: 20, obstacle: true, stageOnly: true },
    { name: 'vultureFlock', w: 20, obstacle: true, stageOnly: true },
    { name: 'bugSwarm', w: 20, stageOnly: true },
    { name: 'fireflyTrail', w: 20, stageOnly: true },
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
      // 高い所にいるほど「下りる」が出やすく、地面にいるときは下りない
      var lvl = this.course.gh ? this.course.floor() : 0;
      if (pt.name === 'stepDown' && lvl > -30) continue;
      if (pt.name === 'stepUp' && lvl < CFG.FLOOR_MIN + 70) continue;
      if (pt.name === this.lastPattern && pt.name === 'snake') continue; // ヘビ2連続はなし
      // 障害物の2連続：はじめは出ない。遠くへ行くほど出るようになる
      if (pt.obstacle && !pt.stageOnly && this.lastObstacle && this.allowTwo === false) continue; // ステージの名物（回転草）は続いてもよい
      // 先に進むほど障害物が増える（ステージの名物は、はじめからよく出る）
      var w = pt.w * (pt.stageOnly ? 1 + 1.5 * d : pt.obstacle ? 1 + CFG.DIFF_OBSTACLE * d : pt.terrain ? 1 : 1 + CFG.PREY_GROW * d);
      // ステージの特色（峡谷はひさし・足場が多い など）
      var bias = CFG.STAGE_BIAS[DD.stageAt(Math.floor(m / CFG.STAGE_M), this.endless).key];
      if (pt.stageOnly && !(bias && bias[pt.name])) continue;
      if (bias && bias[pt.name] !== undefined) w *= bias[pt.name];
      if (pt.name === 'stepDown') w *= 1 + (-lvl) / 60;
      list.push({ name: pt.name, w: w }); total += w;
    }
    var r = Math.random() * total;
    for (i = 0; i < list.length; i++) { r -= list[i].w; if (r <= 0) return list[i].name; }
    return list[0].name;
  };

  /** 並びを1つ置く（確認用。ふだんは spawn から「お手本の走り」で置く） */
  Game.prototype.place = function (name, x) {
    this.course.start(x);
    this.course.build(name);
    return this.course.gh.x - x;
  };

  Game.prototype.spawn = function () {
    if (this.nextSpawnX !== null && this.nextSpawnX > 1e11) return; // 確認用：出現を止めている
    var v = Math.max(this.speed, 35) * CFG.UNITS_PER_KMH;
    // 画面に入る少し前に置いておく（右はしの「もうすぐ来る」印のため）
    var edge = this.cam.x + this.cam.viewW + Math.max(120, v * CFG.MARKER_TIME);
    var c = this.course;
    if (!c.gh) {
      c.start(Math.max(edge, this.player.x + v * CFG.FIRST_SPAWN_DELAY));
      this.nextSpawnX = c.gh.x;
    }
    while (c.gh.x < edge) {
      var name;
      // ステージの切れ目の前後は、障害物のない「ひと休み」の道（マップ画面で止まっても大丈夫なように）
      var bx = (Math.floor(c.gh.x / (CFG.STAGE_M * 36)) + 1) * CFG.STAGE_M * 36;
      var vv = Math.max(this.speed, 35) * CFG.UNITS_PER_KMH;
      if (c.gh.x > this.goalX - vv * 3) name = 'finale'; // ゴール前は平らな道
      else if (!this.endless && c.gh.x > bx - vv * 2.2) { name = 'rest'; this.restTo = bx + vv * 1.3; }
      else if (this.fever > 0.8) name = 'feverCoins';
      else if (this.sinceReward >= (this.rewardEvery || 3) && this.meters() > 60) {
        // ごほうび区間：障害物のない、コインや獲物がたくさんの並び
        name = U.pick(this.meters() > CFG.UNLOCK.whirl ? ['shapes', 'whirl', 'chain', 'shapes'] : ['shapes', 'chain']);
        this.sinceReward = 0;
        this.rewardEvery = 5 + ((Math.random() * 4) | 0);
      } else {
        name = this.pickPattern();
        this.sinceReward++;
      }
      c.build(name);
      this.lastPattern = name;
      this.lastObstacle = /cactus|rock|hole|Hole|Cactus|vulture|islands|overhang|tumble|Wall|crack|chasm|Rocks|Flock/.test(name);
      this.spawned++;
      c.gap(v * U.rand(CFG.SPAWN_GAP_MIN, CFG.SPAWN_GAP_MAX) * (1 - CFG.DIFF_GAP * this.difficulty()));
      this.nextSpawnX = c.gh.x;
    }
  };

  Game.prototype.cull = function () {
    var left = this.cam.x - 200;
    for (var i = this.items.length - 1; i >= 0; i--) {
      // 右はしが画面の左の外に出てから消す（横に長い岩のひさしが、途中で急に消えないように）
      var ci = this.items[i];
      if (ci.dead || ci.x + (ci.w || 0) * this.scaleOf(ci) / 2 + (ci.cullPad || 0) < left) this.items.splice(i, 1);
    }
    for (i = this.holes.length - 1; i >= 0; i--) {
      if (this.holes[i].x1 < left) this.holes.splice(i, 1);
    }
    for (i = this.floors.length - 1; i >= 0; i--) {
      if (this.floors[i].x1 < left) this.floors.splice(i, 1);
    }
  };

  Game.prototype.result = function () {
    return {
      maxSpeed: Math.round(this.maxSpeed),
      distance: Math.round(this.player.x / (CFG.UNITS_PER_KMH * 3.6)), // メートル
      snakes: this.snakes,
      gems: this.gems,
      maxCombo: this.maxCombo,
      coinsPicked: Math.round(this.coinsPicked),
      coinsDist: Math.floor(this.meters() / CFG.DIST_COIN_PER),
      cleared: this.cleared,
      endless: this.endless,
      fell: !!this.fell,
      crashed: !!this.crashed,
      fellWide: !!(this.fell && this.fell.wide),
      hits: this.hits,
      eaten: this.eaten,
      clearTime: this.clearTime,
      coins: Math.round((this.coinsPicked + Math.floor(this.meters() / CFG.DIST_COIN_PER)) * this.up.luck),
      time: this.time
    };
  };

  /** タカの近さ（0〜1）。遅いほど1に近い */
  Game.prototype.danger = function () {
    if (this.demo || this.cleared) return 0;
    if (this.over) return 1;
    if (this.fever > 0) return 0;
    // 速さが土台より落ちるほど、スタミナが少ないほど、タカが迫る
    var slow = U.clamp(1 - this.speed / (this.baseSpeed() * 0.95), 0, 1);
    var tired = U.clamp((CFG.FATIGUE_AT - this.stamina) / CFG.FATIGUE_AT, 0, 1) * 0.85;
    return Math.max(slow * 1.6, tired);
  };

  /** 土台の速さ（km/h）。距離とともに上がっていく */
  Game.prototype.baseSpeed = function () {
    var k = 1 - Math.exp(-this.meters() / CFG.BASE_SPEED_DIST);
    return U.lerp(CFG.BASE_SPEED_START, CFG.BASE_SPEED_MAX, k);
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

  /** 自分のベスト記録の場所に立てる旗 */
  Game.prototype.drawBestFlag = function (ctx, bnd) {
    var x = this.bestM * CFG.UNITS_PER_KMH * 3.6;
    if (x < bnd.left - 200 || x > bnd.right + 200) return;
    var gy = this.levelAt(x), top = gy - 190, wave = Math.sin(this.time * 5) * 5;
    var done = this.bestPassed;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = COL.line; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(x, gy + 4); ctx.lineTo(x, top); ctx.stroke();
    ctx.strokeStyle = '#f3e6c8'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, gy + 2); ctx.lineTo(x, top + 2); ctx.stroke();
    D.oval(ctx, x, top - 4, 8, 8, 0, COL.good, 3);
    var fw = 118, fh = 64, fy = top + 6;
    D.shape(ctx, function (c) {
      c.moveTo(x + 2, fy);
      c.quadraticCurveTo(x + fw * 0.5, fy + wave, x + fw, fy + wave * 0.5);
      c.lineTo(x + fw - 12, fy + fh / 2 + wave * 0.5);
      c.lineTo(x + fw, fy + fh + wave * 0.5);
      c.quadraticCurveTo(x + fw * 0.5, fy + fh + wave, x + 2, fy + fh);
      c.closePath();
    }, done ? '#6cc06b' : COL.bad, 4);
    D.text(ctx, 'BEST', x + fw * 0.44, fy + 21 + wave * 0.6, { size: 22, fill: COL.white, lw: 5 });
    D.text(ctx, this.bestM + 'm', x + fw * 0.44, fy + 46 + wave * 0.6, { size: 17, fill: COL.white, lw: 4 });
    D.oval(ctx, x, gy + 2, 22, 7, 0, 'rgba(74,45,26,0.25)', 0);
    ctx.restore();
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

    // 空・遠景（距離で時間帯が変わる）
    var sky = DD.skyAt(this.meters(), this.endless);
    this.sky = sky;
    DD.currentSky = sky;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    DD.drawSky(ctx, W, H, cam.groundY - cam.y * cam.scale, sky, this.time);
    DD.drawBackdrop(ctx, cam, sky);

    cam.apply(ctx, dpr, sh.x, sh.y);
    DD.drawGround(ctx, cam, this.holes);
    var bnd = cam.bounds();
    for (var fi = 0; fi < this.floors.length; fi++) {
      var fl = this.floors[fi];
      if (fl.x1 > bnd.left && fl.x0 < bnd.right) DD.drawPlatform(ctx, fl, bnd);
    }
    for (var i = 0; i < this.holes.length; i++) {
      var hl = this.holes[i];
      if (hl.x1 > bnd.left && hl.x0 < bnd.right) DD.drawHole(ctx, hl, bnd.bottom);
    }
    // 地面に時間帯の色（キャラクターには かけない：夜でも見やすく）
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    DD.drawGroundTint(ctx, cam, sky);
    // 星空の砂丘：まわりが暗やみ。主人公のまわりだけ見える（獲物や障害物はこの上に描くので、光って見える）
    var wDark = stageWeight(sky, 'night');
    if (wDark > 0.01 && !this.demo) {
      var ps0 = cam.toScreen(this.player.x + 60, this.player.y - 60), big = Math.max(W, H);
      var dg = ctx.createRadialGradient(ps0.x, ps0.y, big * 0.1, ps0.x, ps0.y, big * 0.52);
      dg.addColorStop(0, 'rgba(2, 3, 12, 0)');
      dg.addColorStop(0.55, 'rgba(2, 3, 12, ' + (0.55 * wDark).toFixed(3) + ')');
      dg.addColorStop(1, 'rgba(2, 3, 12, ' + (0.9 * wDark).toFixed(3) + ')');
      ctx.fillStyle = dg; ctx.fillRect(0, 0, W, H);
    }
    cam.apply(ctx, dpr, sh.x, sh.y);

    var p = this.player, vs = this.visScale;
    // ステージの特色の演出（塩の湖の映りこみ・夜のホタル・夜明け前の霧）
    var wSalt = stageWeight(sky, 'salt'), wNight = Math.max(stageWeight(sky, 'night'), stageWeight(sky, 'moonrock')), wFog = stageWeight(sky, 'predawn');
    if (wSalt > 0.01) this.drawReflection(ctx, bnd, wSalt);
    if (wFog > 0.01) drawFog(ctx, bnd, wFog, this.time);

    // 影
    var pf = this.floorAt(p.x);
    if (pf !== null) DD.drawShadow(ctx, p.x + 2, p.y, pf, 26);
    for (i = 0; i < this.items.length; i++) {
      var it = this.items[i];
      if (it.type === 'bug' && it.air) {
        var bf = this.floorAt(it.x);
        if (bf !== null) DD.drawShadow(ctx, it.x, it.y, bf, 12 * vs);
      }
    }

    this.fx.drawDust(ctx);
    if (this.bestM > 0) this.drawBestFlag(ctx, bnd);
    // 速いときは獲物のまわりをふわっと光らせて見つけやすく（夜は虫がホタルのように光る）
    var glow0 = U.clamp((this.speed - CFG.GLOW_FROM) / (CFG.GLOW_FULL - CFG.GLOW_FROM), 0, 1);
    if (wNight > 0.01) drawFireflies(ctx, bnd, wNight, this.time);
    for (i = 0; i < this.items.length; i++) {
      it = this.items[i];
      if (it.dead) continue;
      var glow = it.type === 'bug' ? Math.max(glow0, wNight * (0.75 + 0.25 * Math.sin(this.time * 6 + it.x))) : glow0;
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
    if (this.fell) {
      // 穴に落ちたときは、穴のふちより下を隠して「落ちていく」ように見せる
      var fh = this.fell, fy = fh.y || 0;
      ctx.save();
      ctx.beginPath();
      ctx.rect(bnd.left - 100, bnd.top - 2000, bnd.right - bnd.left + 200, fy - bnd.top + 2000);
      ctx.rect(fh.x0, fy, fh.x1 - fh.x0, 3000);
      ctx.clip();
      p.draw(ctx, 0);
      ctx.restore();
    } else {
      p.draw(ctx, this.speedN());
    }
    if (this.over && !this.fell && !this.crashed) {
      var hk = this.hawkPos();
      DD.drawHawk(ctx, hk.x, hk.y, { t: this.time, dive: hk.dive, talons: hk.talons, angle: hk.angle, scale: 1.3 });
    }
    this.fx.drawFront(ctx);
    // 夜明け前の峡谷：手前にも うすい霧
    if (wFog > 0.01) { ctx.save(); ctx.globalAlpha = 0.5; drawFog(ctx, bnd, wFog, this.time * 1.4 + 7); ctx.restore(); }

    // 画面の座標に戻して集中線・フラッシュ
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // 砂あらしの荒野：手前を砂が横に吹きぬける
    var wStorm = stageWeight(sky, 'storm');
    if (wStorm > 0.01) drawSandstorm(ctx, W, H, wStorm, this.time, cam.x * cam.scale);
    if (!this.demo) {
      var ps = cam.toScreen(p.x + 40, p.y - 40);
      var g0 = cam.toScreen(p.x, 0);
      var lane = { x: g0.x - 30 * cam.scale, y0: g0.y - 230 * cam.scale, y1: g0.y + 16 * cam.scale };
      this.fx.drawSpeedLines(ctx, W, H, ps.x, ps.y, this.speedN(), lane);
      var shadowK = (this.fell || this.crashed) ? 0 : this.over ? Math.max(0, 1 - this.catchT * 3) : 1; // 本物が来たら影は消える
      DD.drawHawkShadow(ctx, W, H, g0.y, g0.x, this.shadow * shadowK, this.time);
      this.drawMarkers(ctx, dpr);
    }
    if (this.fx.flash > 0) {
      ctx.fillStyle = 'rgba(255, 250, 220, ' + (this.fx.flash * 0.5).toFixed(3) + ')';
      ctx.fillRect(0, 0, W, H);
    }
  };

  /** 景色の中で、そのステージがどれくらい混ざっているか（0〜1。切りかわりの途中はまん中） */
  function stageWeight(sky, key) {
    return (sky.a.key === key ? 1 - sky.t : 0) + (sky.b.key === key ? sky.t : 0);
  }

  /** 塩の湖：地面が鏡のように、主人公や獲物をうっすら映す */
  Game.prototype.drawReflection = function (ctx, bnd, w) {
    var self = this;
    ctx.save();
    // 地面（高さ0）の少し下だけに映す。高い足場のところは映さない
    ctx.beginPath();
    ctx.rect(bnd.left - 50, 2, bnd.right - bnd.left + 100, 150);
    for (var i = 0; i < this.floors.length; i++) {
      var f = this.floors[i];
      ctx.rect(Math.max(f.x0, bnd.left - 50), 2, Math.min(f.x1, bnd.right + 50) - Math.max(f.x0, bnd.left - 50), 150);
    }
    for (i = 0; i < this.holes.length; i++) {
      var h = this.holes[i];
      if (!h.y) ctx.rect(h.x0, 2, h.x1 - h.x0, 150);
    }
    ctx.clip('evenodd');
    ctx.globalAlpha = 0.22 * w;
    ctx.scale(1, -1); // 地面の線で上下を反対に
    for (i = 0; i < this.items.length; i++) {
      var it = this.items[i];
      if (it.dead || it.ceiling || it.deco || it.x < bnd.left - 80 || it.x > bnd.right + 80) continue;
      if (this.levelAt(it.x) !== 0) continue;
      var sc = this.scaleOf(it);
      ctx.save(); ctx.translate(it.x, it.y); ctx.scale(sc, sc); ctx.translate(-it.x, -it.y);
      DD.KINDS[it.type].draw(ctx, it);
      ctx.restore();
    }
    if (this.levelAt(this.player.x) === 0) this.player.draw(ctx, this.speedN());
    ctx.restore();
    // 塩のきらめき
    ctx.save();
    ctx.globalAlpha = w;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    for (var k = Math.floor(bnd.left / 90); k * 90 < bnd.right; k++) {
      var tw = Math.sin(self.time * 3 + k * 1.7);
      if (tw < 0.6) continue;
      var sx = k * 90 + U.hash(k) * 60, sy = 12 + U.hash(k + 5) * 60, r = (tw - 0.6) * 10;
      ctx.beginPath(); ctx.moveTo(sx, sy - r); ctx.lineTo(sx + r * 0.3, sy); ctx.lineTo(sx, sy + r); ctx.lineTo(sx - r * 0.3, sy); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(sx - r, sy); ctx.lineTo(sx, sy + r * 0.3); ctx.lineTo(sx + r, sy); ctx.lineTo(sx, sy - r * 0.3); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  };

  /** 夜のホタル：画面のあちこちで、ふわふわ光る */
  function drawFireflies(ctx, bnd, w, t) {
    ctx.save();
    for (var k = Math.floor(bnd.left / 140) - 1; k * 140 < bnd.right + 140; k++) {
      var x = k * 140 + U.hash(k * 3.1) * 120 + Math.sin(t * 0.9 + k) * 30;
      var y = -40 - U.hash(k * 7.3) * 260 + Math.sin(t * 1.3 + k * 2) * 20;
      var a = (0.5 + 0.5 * Math.sin(t * 3 + k * 1.9)) * w;
      var g = ctx.createRadialGradient(x, y, 0, x, y, 16);
      g.addColorStop(0, 'rgba(230, 255, 140, ' + (0.9 * a).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(230, 255, 140, 0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  /** 砂あらし（画面の座標）：かすみと、横に流れる砂のすじ */
  function drawSandstorm(ctx, W, H, w, t, scroll) {
    ctx.save();
    ctx.fillStyle = 'rgba(214, 164, 100, ' + (0.16 * w).toFixed(3) + ')';
    ctx.fillRect(0, 0, W, H);
    ctx.lineCap = 'round';
    for (var i = 0; i < 26; i++) {
      var y = H * (0.1 + U.hash(i * 2.3) * 0.85);
      var len = 40 + U.hash(i * 1.7) * 110;
      var sp = 700 + U.hash(i) * 600;
      var x = W + len - ((t * sp + U.hash(i * 5.1) * 3000 + scroll * 0.4) % (W + len * 2));
      ctx.strokeStyle = 'rgba(255, 232, 190, ' + ((0.25 + U.hash(i * 3.7) * 0.35) * w).toFixed(3) + ')';
      ctx.lineWidth = 1.5 + U.hash(i * 2.9) * 2.5;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + len * 0.5, y - 4, x + len, y + 1); ctx.stroke();
    }
    ctx.restore();
  }

  /** 夜明け前の霧：地面の上を白い霧がゆっくり流れる */
  function drawFog(ctx, bnd, w, t) {
    ctx.save();
    for (var L = 0; L < 3; L++) {
      var y = -20 - L * 60, a = (0.22 - L * 0.05) * w;
      ctx.fillStyle = 'rgba(230, 225, 255, ' + a.toFixed(3) + ')';
      var off = t * (30 + L * 20);
      for (var k = Math.floor((bnd.left + off) / 260) - 1; k * 260 < bnd.right + off + 260; k++) {
        var x = k * 260 - off + U.hash(k + L * 10) * 80;
        ctx.beginPath(); D.ellipse(ctx, x, y, 170 + U.hash(k) * 60, 34 + L * 8, 0); ctx.fill();
      }
    }
    ctx.restore();
  }

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
      if (it.dead || it.coin || it.deco) continue;
      var sc2 = this.scaleOf(it);
      list.push({ x: it.x - it.w * sc2 / 2, it: it, y: it.y - it.h * sc2 / 2 });
    }
    for (i = 0; i < this.holes.length; i++) list.push({ x: this.holes[i].x0, hole: true, y: (this.holes[i].y || 0) + 10 });
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
