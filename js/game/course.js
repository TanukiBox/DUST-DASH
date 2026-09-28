/*
 * DUST DASH コースづくり（「お手本の走り」から作る）
 *
 * まず見えない「お手本ランナー」を走らせて、1本の道すじ（ジャンプの軌道）を決める。
 * そのあとで、
 *   ・獲物は「お手本がちょうど降りてくる場所」に置く
 *   ・障害物は「お手本のジャンプの一番高い所の真下」に置く
 *   ・穴は「お手本が空中にいる区間」に開ける
 *   ・コインは道すじの上に、同じ間隔で並べる
 * こうすると、コインが重ならず、取れないコインもできない（道すじそのものが実際に跳べる軌道なので）。
 */
(function (global) {
  'use strict';
  var DD = global.DD = global.DD || {};
  var CFG = DD.CFG, U = DD.util;

  var DT = 1 / 120;

  function Course(game) {
    this.g = game;
    this.gh = null; // お手本ランナー { x, y, vy, air, jumps, boost, combo }
  }

  /** お手本ランナーの横の速さ（その場所に着くころの見込み。食べた加速も入れる） */
  Course.prototype.speed = function () {
    var g = this.g, gh = this.gh;
    var now = Math.max(g.speed, 35) * CFG.UNITS_PER_KMH;
    var ta = Math.max(0, (gh.x - g.player.x) / now);
    var boost = g.boost * Math.exp(-ta / CFG.BOOST_TAU) + gh.boost;
    return Math.max(35, g.baseSpeed() + boost) * CFG.UNITS_PER_KMH;
  };

  Course.prototype.start = function (x) {
    this.gh = { x: x, y: 0, vy: 0, air: false, jumps: 0, boost: 0, combo: 0 };
    this.seg = null; // 今お手本が走っている高い足場（x1 は伸び続ける）
    this.actions = []; // お手本が跳んだ場所（確認用）
    this.nextCoin = x;
    this.coinsOn = false;
  };

  /** 1コマ進める。コインを置く設定なら、同じ間隔でコインを置く */
  Course.prototype.tick = function () {
    var gh = this.gh, v = this.speed(), g = this.g;
    gh.x += v * DT;
    var fy = g.floorAt(gh.x, true);
    if (!gh.air) {
      if (fy === null || fy > gh.y + 3) { gh.air = true; gh.vy = 0; } // 段差を下りる
      else gh.y = fy;
    }
    if (gh.air) {
      var py = gh.y;
      gh.vy += (gh.vy < 0 ? CFG.GRAVITY_UP : CFG.GRAVITY_DOWN) * DT;
      gh.y += gh.vy * DT;
      if (fy !== null && gh.vy > 0 && gh.y >= fy && py <= fy + 30) { gh.y = fy; gh.vy = 0; gh.air = false; gh.jumps = 0; gh.combo = 0; }
    }
    gh.boost *= Math.exp(-DT / CFG.BOOST_TAU);
    if (gh.x >= this.nextCoin) {
      if (this.coinsOn) this.g.items.push(DD.KINDS.coin.create(gh.x, gh.y - 30));
      this.nextCoin += CFG.COIN_GAP_X;
    }
  };

  // ---- 足場 ----
  /** お手本が今いる地面の高さ */
  Course.prototype.floor = function () { var f = this.g.floorAt(this.gh.x, true); return f === null ? 0 : f; };

  /** x から先の地面の高さを y にする（0 ならふつうの地面） */
  Course.prototype.setLevel = function (x, y) {
    if (this.seg) { this.seg.x1 = x; this.seg = null; }
    if (y < -1) {
      this.seg = { x0: x, x1: Infinity, y: y };
      this.g.floors.push(this.seg);
    }
  };

  // ---- お手本ランナーの動き ----
  Course.prototype.run = function (dist, coins) {
    this.coinsOn = !!coins;
    var end = this.gh.x + dist;
    while (this.gh.x < end) this.tick();
    this.coinsOn = true;
  };
  Course.prototype.jump = function () {
    var gh = this.gh;
    this.jumpFloor = gh.y; // 跳んだ足場の高さ（獲物・障害物はこの高さに置く）
    this.coinsOn = true;
    gh.vy = -CFG.JUMP_V; gh.air = true; gh.jumps = 1;
    this.actions.push({ x: gh.x, a: 'jump' });
    return gh.x;
  };
  Course.prototype.double = function () {
    this.gh.vy = -CFG.DOUBLE_JUMP_V; this.gh.jumps = 2;
    this.actions.push({ x: this.gh.x, a: 'double' });
  };
  Course.prototype.wait = function (sec) {
    for (var t = 0; t < sec; t += DT) this.tick();
  };
  /** 空中で、足が y（ゲーム内の座標）まで下りてくるまで進む */
  Course.prototype.descendTo = function (y) {
    var gh = this.gh, guard = 0;
    while (gh.air && !(gh.vy > 0 && gh.y >= y) && guard++ < 2000) this.tick();
    return gh.air ? gh.x : null;
  };
  Course.prototype.toApex = function () {
    var gh = this.gh, guard = 0, best = gh.x, top = gh.y;
    while (gh.air && gh.vy < 0 && guard++ < 2000) this.tick();
    return gh.x;
  };
  Course.prototype.land = function () {
    var guard = 0;
    while (this.gh.air && guard++ < 4000) this.tick();
    return this.gh.x;
  };
  /** 獲物を踏んだ：跳ね返る（食べた分だけ速くなる見込みも入れる） */
  Course.prototype.stomp = function (type) {
    var gh = this.gh, spec = CFG.PREY[type];
    gh.combo++;
    gh.boost += spec.gain * Math.min(1 + CFG.COMBO_STEP * (gh.combo - 1), CFG.COMBO_MAX_MULT);
    gh.vy = -(type === 'snake' ? CFG.SNAKE_BOUNCE_V : CFG.STOMP_BOUNCE_V);
    gh.jumps = 1;
  };

  // ---- 置くもの ----
  /** 獲物をお手本の降りてくる所に置いて、踏む */
  Course.prototype.preyHere = function (type, lift, floorY) {
    var spec = CFG.PREY[type];
    var fl = floorY === undefined ? this.jumpFloor : floorY;
    var x = this.descendTo(fl - spec.h - lift);
    if (x === null) return null;
    var it = DD.createItem(type, x, fl - lift);
    it.y = it.baseY = fl - lift;
    // 動くトカゲは、着くころにここへ来るよう手前に置く
    if (type === 'lizard' && !this.fixed) {
      var g = this.g, v = Math.max(g.speed, 35) * CFG.UNITS_PER_KMH;
      var ta = (x - g.player.x) / Math.max(50, v - it.vx);
      var sx = x - it.vx * Math.max(0, ta);
      // 走ってくる道が平らなときだけ動かす（段差や穴があると、足場に埋まって見えるため）
      var flat = true;
      for (var qx = sx - it.w / 2; qx <= x + it.w / 2; qx += 16) {
        if (g.floorAt(qx, true) !== fl) { flat = false; break; }
      }
      if (flat) it.x = sx; else it.vx = 0;
    } else if (type === 'lizard') {
      it.vx = 0;
    }
    this.removeCoinsNear(x, fl - lift - spec.h / 2, spec.w / 2 + 16, spec.h / 2 + 22);
    this.g.items.push(it);
    this.stomp(type);
    this.lastPrey = it;
    return it;
  };

  /** 障害物をお手本のジャンプの一番高い所の真下に置く */
  Course.prototype.obstacleAtApex = function (type) {
    var x = this.toApex();
    var it = DD.createItem(type, x);
    it.y = this.jumpFloor;
    this.g.items.push(it);
    return it;
  };

  Course.prototype.removeCoinsNear = function (x, y, rx, ry) {
    var items = this.g.items;
    for (var i = items.length - 1; i >= 0; i--) {
      var c = items[i];
      if (c.coin && Math.abs(c.x - x) < rx && Math.abs(c.y - y) < ry) items.splice(i, 1);
    }
  };

  /** 念のため：障害物に重なるコインは消す（取れないコインを残さない） */
  Course.prototype.clearCoinsInObstacles = function (from) {
    var items = this.g.items, obs = [];
    for (var i = from; i < items.length; i++) if (items[i].obstacle && !items[i].flying && !items[i].ceiling && !items[i].moving) obs.push(items[i]);
    for (i = items.length - 1; i >= from; i--) {
      var c = items[i];
      if (!c.coin) continue;
      for (var k = 0; k < obs.length; k++) {
        var o = obs[k];
        if (Math.abs(c.x - o.x) < o.w / 2 + 30 && c.y + 30 > o.y - o.h - 20) { items.splice(i, 1); break; }
      }
    }
  };

  // ------------------------------------------------------------
  // 並び（パターン）。どれも「走る → 跳ぶ → …… → 着地」の順で道すじを作る
  // ------------------------------------------------------------
  Course.prototype.build = function (name) {
    var g = this.g, gh = this.gh, from = g.items.length;
    var v = this.speed();
    var lead = v * U.rand(0.25, 0.4); // 跳ぶ前の助走（地面のコイン）
    var groundCoins = Math.random() < CFG.COIN_ROW_CHANCE;
    this.fixed = false;
    var k, x0, x1, n;
    switch (name) {
      case 'bugGround':
      case 'lizard':
      case 'snake':
        this.run(lead, groundCoins); this.jump();
        this.preyHere(name === 'bugGround' ? 'bug' : name, 0);
        if (name === 'snake') { var mark = g.items.length; this.toApex(); this.bigAtApex(mark, 'sapphire'); }
        this.land();
        break;
      case 'bugAir':
        this.run(lead, groundCoins); this.jump();
        this.preyHere('bug', U.rand(60, 120));
        this.land();
        break;
      case 'chain':
        // 踏んで跳ねると、ちょうど次の獲物に降りる並び
        n = 3 + ((Math.random() * 3) | 0);
        this.fixed = true;
        var cid = ++this.chainSeq || (this.chainSeq = 1);
        this.run(lead, groundCoins); this.jump();
        for (k = 0; k < n; k++) {
          var r = Math.random(), last = k === n - 1, pr;
          if (last && k >= 3 && r < 0.35) pr = this.preyHere('snake', 0);
          else if (r < 0.5) pr = this.preyHere('bug', U.rand(50, 110));
          else if (r < 0.72) pr = this.preyHere('bug', 0);
          else pr = this.preyHere('lizard', 0);
          if (pr) { pr.chainId = cid; pr.chainN = n; }
        }
        if (this.lastPrey && this.lastPrey.type === 'snake') this.bigAtApex(from, 'sapphire'); // ヘビの大ジャンプのてっぺんにサファイア
        this.land();
        break;
      case 'cactus':
      case 'rock':
        this.run(lead, groundCoins); this.jump();
        this.obstacleAtApex(name);
        this.land();
        break;
      case 'tumble':
        this.run(lead, groundCoins); this.jump(); this.tumbleAtApex(); this.land();
        break;

      // ---- ステージの名物 ----
      case 'tumbleHerd':
        // 砂あらし：回転草の群れ。リズムよく跳び続ける
        n = 2 + ((Math.random() * 2) | 0);
        this.run(lead, groundCoins);
        for (k = 0; k < n; k++) { this.jump(); this.tumbleAtApex(); this.land(); if (k < n - 1) this.run(v * U.rand(0.12, 0.2), true); }
        break;
      case 'whirlWall':
        // サボテンの森：2段ジャンプでも越えられないサボテンの壁。手前のつむじ風に乗って越える
        this.run(v * U.rand(0.35, 0.5), true);
        var wwf = this.floor();
        var wwh = DD.KINDS.whirl.create(gh.x + 10, wwf);
        wwh.toWall = true; // この先に壁がある（矢印で「乗れ！」と知らせる）
        g.items.push(wwh);
        gh.vy = -CFG.WHIRL_V; gh.air = true; gh.jumps = 1; this.jumpFloor = wwf;
        this.actions.push({ x: gh.x, a: 'whirl' });
        var mkw = g.items.length, guardW = 0;
        // 十分高くなったところの真下に壁
        while (gh.air && gh.vy < 0 && gh.y > wwf - CFG.CACTUS_WALL_H - 150 && guardW++ < 2000) this.tick();
        var wall = DD.KINDS.cactusWall.create(gh.x + CFG.CACTUS_WALL_W / 2 + 10);
        wall.y = wwf;
        g.items.push(wall);
        this.toApex();
        this.bigAtApex(mkw, 'emerald');
        this.preyHere('bug', U.rand(240, 300), wwf);
        this.land();
        this.run(v * 0.25, true);
        break;
      case 'cactusRow':
        // サボテンの森：サボテンが3つ続く
        this.run(lead, groundCoins);
        for (k = 0; k < 3; k++) {
          this.jump(); this.obstacleAtApex(k === 1 && Math.random() < 0.5 ? 'rock' : 'cactus'); this.land();
          if (k < 2) this.run(v * U.rand(0.1, 0.18), true);
        }
        break;
      case 'crackRun':
        // 塩の湖：ひび割れ（穴）が続く。とん、とん、とんと跳ぶ
        n = 3 + ((Math.random() * 2) | 0);
        this.run(lead, groundCoins);
        for (k = 0; k < n; k++) {
          x0 = this.jump(); x1 = this.land(); this.hole(x0, x1, 0.5);
          if (k < n - 1) this.run(v * U.rand(0.08, 0.14), true);
        }
        break;
      case 'staircase':
        // 夕焼けのメサ：大階段を3段かけ上がる（高い所にいたら、いったん地面へ跳び下りてから）
        this.run(lead, groundCoins);
        if (this.floor() < -40) {
          this.jump(); this.setLevel(gh.x + v * 0.12, 0); this.land();
          this.run(v * U.rand(0.2, 0.3), true);
        }
        for (k = 0; k < 3; k++) {
          var sc0 = this.floor(), sc1 = Math.max(CFG.FLOOR_MIN, sc0 - U.rand(55, 75));
          if (sc1 >= sc0 - 20) break;
          this.jump(); var sax = this.toApex(); this.setLevel(sax - 10, sc1); this.land();
          this.run(v * U.rand(0.12, 0.2), true);
        }
        break;
      case 'fallRocks':
        // 月夜の岩山：空から岩が落ちてくる（1〜2個）
        n = 1 + ((Math.random() * 2) | 0);
        this.run(lead, groundCoins);
        for (k = 0; k < n; k++) { this.jump(); this.obstacleAtApex('fallRock'); this.land(); if (k < n - 1) this.run(v * U.rand(0.2, 0.3), true); }
        break;
      case 'vultureFlock':
        // 夜明け前の峡谷：霧の中からハゲワシの群れ（ジャンプせずに走りぬける）
        this.run(v * 0.3, false);
        var fx0 = gh.x + v * 0.35, fl2 = this.floor();
        this.run(v * 1.1, true);
        var vs2 = CFG.OBSTACLE.vulture.vx, now2 = Math.max(g.speed, 35) * CFG.UNITS_PER_KMH;
        for (k = 0; k < 3; k++) {
          var mx = fx0 + k * v * 0.3;
          var tt = Math.max(0, (mx - g.player.x) / (now2 + vs2));
          var vk = DD.createItem('vulture', mx + vs2 * tt);
          vk.baseY = vk.y = fl2 - CFG.OBSTACLE.vulture.lift - (k === 1 ? CFG.OBSTACLE.vulture.h + 6 : 0);
          g.items.push(vk);
        }
        this.run(v * 0.15, false);
        break;
      case 'bugSwarm':
      case 'fireflyTrail':
        // 朝の砂漠：虫の大群／星空の砂丘：空にホタルの道。着地せずに踏み続ける
        n = 5 + ((Math.random() * 3) | 0);
        this.fixed = true;
        var sid = ++this.chainSeq || (this.chainSeq = 1);
        this.run(lead, groundCoins); this.jump();
        for (k = 0; k < n; k++) {
          var sp = name === 'fireflyTrail' ? this.preyHere('bug', U.rand(70, 130)) : this.preyHere('bug', Math.random() < 0.5 ? 0 : U.rand(40, 100));
          if (sp) { sp.chainId = sid; sp.chainN = n; }
        }
        this.land();
        break;
      case 'giantCactus':
        // 2段ジャンプの一番高い所の真下に大サボテン
        this.run(lead, groundCoins); this.jump(); this.wait(0.3); this.double();
        this.obstacleAtApex('giantCactus');
        this.land();
        this.bigAtApex(from, 'emerald');
        break;
      case 'hole':
        this.run(lead, groundCoins); x0 = this.jump(); x1 = this.land();
        this.hole(x0, x1, 0.55);
        break;
      case 'wideHole':
        this.run(lead, groundCoins); x0 = this.jump(); this.wait(0.32); this.double(); x1 = this.land();
        this.hole(x0, x1, 0.72, true);
        break;
      case 'holeBug':
        // 穴の上の虫を踏んで渡る
        this.run(lead, groundCoins); x0 = this.jump();
        this.preyHere('bug', U.rand(70, 110));
        x1 = this.land();
        this.hole(x0, x1, 0.6);
        break;
      case 'cactusBug':
        // サボテンを越えて、下りてくる所に虫
        this.run(lead, groundCoins); this.jump();
        this.obstacleAtApex('cactus');
        this.preyHere('bug', U.rand(40, 70));
        this.land();
        break;
      case 'rockRock':
        this.run(lead, groundCoins); this.jump(); this.obstacleAtApex('rock'); this.land();
        this.run(v * U.rand(0.18, 0.28), true); this.jump(); this.obstacleAtApex('rock'); this.land();
        break;
      case 'holeRock':
        this.run(lead, groundCoins); x0 = this.jump(); x1 = this.land(); this.hole(x0, x1, 0.55);
        this.run(v * U.rand(0.2, 0.3), true); this.jump(); this.obstacleAtApex('cactus'); this.land();
        break;
      case 'vulture':
      case 'vulture2':
        // 地面を走る道すじ（コインの列）の上をハゲワシが飛んでくる
        this.run(v * 0.3, false);
        var mid = gh.x + v * 0.35;
        this.run(v * 0.7, true);
        var vs = CFG.OBSTACLE.vulture.vx;
        var now = Math.max(g.speed, 35) * CFG.UNITS_PER_KMH;
        var ta = Math.max(0, (mid - g.player.x) / (now + vs));
        var vx = mid + vs * ta * (1 + 0.0); // 出会う所 mid に来るよう、右に置く
        var fl0 = this.floor();
        var vul = DD.createItem('vulture', vx);
        vul.baseY = vul.y = fl0 - CFG.OBSTACLE.vulture.lift;
        g.items.push(vul);
        if (name === 'vulture2') {
          var top = DD.createItem('vulture', vx + 40);
          top.baseY = top.y = fl0 - (CFG.OBSTACLE.vulture.lift + CFG.OBSTACLE.vulture.h + 6);
          g.items.push(top);
        }
        this.run(v * 0.15, false);
        break;
      // ---- 地形 ----
      case 'stepUp':
        // 高い台地へ跳び乗る
        var up = U.rand(60, 115), cur = this.floor();
        var ny = Math.max(CFG.FLOOR_MIN, cur - up);
        this.run(lead, groundCoins); this.jump();
        var ax = this.toApex();
        this.setLevel(ax - 10, ny);
        this.land();
        this.run(v * U.rand(0.25, 0.45), true);
        break;
      case 'stepDown':
        // 台地のはしから跳び下りる
        var cur2 = this.floor();
        var ny2 = Math.min(0, cur2 + U.rand(70, 140));
        if (ny2 > -40) ny2 = 0;
        this.run(lead, groundCoins);
        this.jump();
        this.setLevel(this.gh.x + v * 0.12, ny2);
        this.land();
        this.run(v * U.rand(0.2, 0.35), true);
        break;
      case 'islands':
      case 'chasm':
        // 高さのちがう足場を、穴をこえて跳び移っていく（峡谷の「谷渡り」は4つ続く）
        n = name === 'chasm' ? 4 : 2 + ((Math.random() * 3) | 0);
        this.run(lead, groundCoins);
        for (k = 0; k < n; k++) {
          var lvFrom = this.floor();
          var to = U.clamp(lvFrom + U.rand(-90, 70), CFG.FLOOR_MIN, 0);
          if (to > -30 && k < n - 1) to = -U.rand(40, 90);
          x0 = this.jump() + 12;
          if (to < lvFrom) this.toApex();
          var xd = this.descendTo(to - 6);
          if (xd === null) { this.land(); break; }
          var xs = Math.max(x0 + 80, xd - 50);
          this.g.holes.push({ x0: x0, x1: xs, y: lvFrom, island: true });
          this.setLevel(xs, to);
          this.land();
          this.run(v * U.rand(0.3, 0.55), true);
        }
        break;
      // ---- 上からの障害物 ----
      case 'overhang':
        // 岩のひさしの下を走り抜ける（ジャンプすると頭をぶつける）
        this.run(v * 0.25, groundCoins);
        var ol = v * U.rand(0.55, 0.9), fl1 = this.floor();
        var ox0 = gh.x;
        this.run(ol, true);
        g.items.push(DD.KINDS.overhang.create(ox0 + ol / 2, fl1 - CFG.CEILING_CLEAR, ol));
        this.run(v * 0.2, false);
        break;

      // ---- ごほうび ----
      case 'whirl':
        // つむじ風で空高く。空のコインとルビー、空の虫
        this.run(lead, true);
        var wf = this.floor();
        g.items.push(DD.KINDS.whirl.create(gh.x + 10, wf));
        this.coinsOn = true;
        gh.vy = -CFG.WHIRL_V; gh.air = true; gh.jumps = 1; this.jumpFloor = wf;
        this.actions.push({ x: gh.x, a: 'whirl' });
        var mk3 = g.items.length;
        this.toApex();
        this.bigAtApex(mk3, 'ruby');
        this.preyHere('bug', U.rand(260, 320), wf);
        this.preyHere('bug', U.rand(150, 200), wf);
        this.land();
        this.run(v * 0.2, true);
        break;
      case 'shapes':
        // コインで形を描く（ハート・ひし形・かたまり・星）。まん中を跳びぬける
        this.run(lead, true);
        this.jump();
        var ax2 = this.toApex(), ay2 = gh.y - 30;
        this.shape(U.pick(['heart', 'diamond', 'block', 'star']), ax2, ay2);
        this.land();
        this.run(v * 0.2, true);
        break;
      case 'rest':
        // ステージの切れ目：まっすぐな道に地面のコインだけ
        this.run(Math.max(60, g.restTo - gh.x), true);
        break;
      case 'finale':
        // ゴールへの最後の直線：地面の高さへもどして、コインの道。ゴール門を置く
        if (!g.goalPlaced) {
          g.goalPlaced = true;
          if (this.floor() < -1) { this.setLevel(gh.x + 40, 0); this.run(80, true); }
          this.run(Math.max(0, g.goalX - gh.x), true);
          g.items.push(DD.KINDS.goal.create(g.goalX));
        }
        this.run(v * 2, false);
        break;
      case 'feverCoins':
        // フィーバー中はコインの波
        var wl = v * 0.9;
        for (var q = 0; q < 12; q++) {
          g.items.push(DD.KINDS.coin.create(gh.x + q * wl / 12, this.floor() - 60 - Math.sin(q / 11 * Math.PI) * 90));
        }
        if (Math.random() < 0.5) g.items.push(DD.createItem('bug', gh.x + wl * 0.5, this.floor() - U.rand(60, 120)));
        this.run(wl, false);
        this.nextCoin = gh.x;
        break;
    }
    for (var pi = from; pi < g.items.length; pi++) if (!g.items[pi].pat) g.items[pi].pat = name; // 確認用：どの並びで置いたか
    this.clearCoinsInObstacles(from);
  };

  /** 回転草：ジャンプの一番高い所で真下を通るように、先の方から転がしてくる */
  Course.prototype.tumbleAtApex = function () {
    var g = this.g;
    var tx = this.toApex(), tfl = this.jumpFloor;
    // 主人公がここへ着くまでの時間：今の速さと、そこでのお手本の速さの間くらいで見積もる
    var vNow = Math.max(g.speed, 35) * CFG.UNITS_PER_KMH, vThere = this.speed();
    var sx = tx + CFG.TUMBLE_VX * Math.max(0, (tx - g.player.x) / ((vNow + vThere) / 2));
    var flat = true;
    for (var qx = tx - 40; qx <= sx + 40; qx += 16) { if (g.floorAt(qx, true) !== tfl) { flat = false; break; } }
    var tw = flat ? DD.KINDS.tumble.create(sx, tfl) : DD.createItem('rock', tx);
    tw.y = tw.baseY = tfl;
    g.items.push(tw);
    return tw;
  };

  /** 新しく置いたコインのうち、いちばん高い所のものを宝石にする */
  Course.prototype.bigAtApex = function (from, gem) {
    var items = this.g.items, best = null;
    for (var i = from; i < items.length; i++) if (items[i].coin && (!best || items[i].y < best.y)) best = items[i];
    if (best) { best.big = true; best.gem = gem; }
  };

  /** コインで形を描く。まわりの道すじのコインは消して、形だけにする */
  Course.prototype.shape = function (kind, cx, cy) {
    var pts = [], i, a;
    if (kind === 'heart') {
      for (i = 0; i < 14; i++) {
        a = i / 14 * Math.PI * 2;
        pts.push([16 * Math.pow(Math.sin(a), 3), -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a))]);
      }
      pts = pts.map(function (q) { return [q[0] * 4.2, q[1] * 4.2 - 6]; });
      pts.push([0, -6]);
    } else if (kind === 'diamond') {
      for (i = -3; i <= 3; i++) { var hh = 3 - Math.abs(i); for (var j = -hh; j <= hh; j += 2) pts.push([i * 30, j * 30]); }
    } else if (kind === 'block') {
      for (i = -3; i <= 3; i++) for (var r = -1; r <= 1; r++) pts.push([i * 34, r * 34]);
    } else {
      for (i = 0; i < 10; i++) { a = -Math.PI / 2 + i * Math.PI / 5; var rr = i % 2 ? 36 : 80; pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
      pts.push([0, 0]);
    }
    this.removeCoinsNear(cx, cy, 130, 110);
    for (i = 0; i < pts.length; i++) {
      // まん中は宝石
      var center = Math.abs(pts[i][0]) < 1 && Math.abs(pts[i][1]) < 1;
      this.g.items.push(DD.KINDS.coin.create(cx + pts[i][0], cy + pts[i][1], center ? DD.pickGem() : null));
    }
    if (kind === 'block') this.g.items.push(DD.KINDS.coin.create(cx, cy - 72, DD.pickGem()));
  };

  /** 空中にいた区間 [x0, x1] の真ん中に穴を開ける */
  Course.prototype.hole = function (x0, x1, frac, wide) {
    var len = x1 - x0, w = Math.max(110, len * frac), c = (x0 + x1) / 2;
    var h = { x0: c - w / 2, x1: c + w / 2, y: this.jumpFloor || 0 };
    if (wide) h.wide = true;
    this.g.holes.push(h);
    // 穴の上に来てしまった地面のコインは消す
    var items = this.g.items;
    for (var i = items.length - 1; i >= 0; i--) {
      var it = items[i];
      if (it.coin && it.y > h.y - 45 && it.x > h.x0 - 10 && it.x < h.x1 + 10) items.splice(i, 1);
    }
  };

  /** 並びと並びのすきま（地面を走る） */
  Course.prototype.gap = function (dist) {
    this.run(dist, Math.random() < CFG.COIN_ROW_CHANCE * 0.6);
  };

  DD.Course = Course;
})(window);
