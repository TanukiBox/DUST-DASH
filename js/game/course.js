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
    this.actions = []; // お手本が跳んだ場所（確認用）
    this.nextCoin = x;
    this.coinsOn = false;
  };

  /** 1コマ進める。コインを置く設定なら、同じ間隔でコインを置く */
  Course.prototype.tick = function () {
    var gh = this.gh, v = this.speed();
    gh.x += v * DT;
    if (gh.air) {
      gh.vy += (gh.vy < 0 ? CFG.GRAVITY_UP : CFG.GRAVITY_DOWN) * DT;
      gh.y += gh.vy * DT;
      if (gh.y >= 0 && gh.vy > 0) { gh.y = 0; gh.vy = 0; gh.air = false; gh.jumps = 0; gh.combo = 0; }
    }
    gh.boost *= Math.exp(-DT / CFG.BOOST_TAU);
    if (gh.x >= this.nextCoin) {
      if (this.coinsOn) this.g.items.push(DD.KINDS.coin.create(gh.x, gh.y - 30));
      this.nextCoin += CFG.COIN_GAP_X;
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
  /** 空中で、足がこの高さ（上向きプラス）まで下りてくるまで進む */
  Course.prototype.descendTo = function (h) {
    var gh = this.gh, guard = 0;
    while (gh.air && !(gh.vy > 0 && -gh.y <= h) && guard++ < 2000) this.tick();
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
  Course.prototype.preyHere = function (type, lift) {
    var spec = CFG.PREY[type];
    var x = this.descendTo(spec.h + lift);
    if (x === null) return null;
    var it = DD.createItem(type, x, -lift);
    // 動くトカゲは、着くころにここへ来るよう手前に置く
    if (type === 'lizard' && !this.fixed) {
      var g = this.g, v = Math.max(g.speed, 35) * CFG.UNITS_PER_KMH;
      var ta = (x - g.player.x) / Math.max(50, v - it.vx);
      it.x = x - it.vx * Math.max(0, ta);
    } else if (type === 'lizard') {
      it.vx = 0;
    }
    this.removeCoinsNear(x, -lift - spec.h / 2, spec.w / 2 + 16, spec.h / 2 + 22);
    this.g.items.push(it);
    this.stomp(type);
    return it;
  };

  /** 障害物をお手本のジャンプの一番高い所の真下に置く */
  Course.prototype.obstacleAtApex = function (type) {
    var x = this.toApex();
    var it = DD.createItem(type, x);
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
    for (var i = from; i < items.length; i++) if (items[i].obstacle && !items[i].flying) obs.push(items[i]);
    for (i = items.length - 1; i >= from; i--) {
      var c = items[i];
      if (!c.coin) continue;
      for (var k = 0; k < obs.length; k++) {
        var o = obs[k];
        if (Math.abs(c.x - o.x) < o.w / 2 + 30 && c.y + 30 > -o.h - 20) { items.splice(i, 1); break; }
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
        this.run(lead, groundCoins); this.jump();
        for (k = 0; k < n; k++) {
          var r = Math.random(), last = k === n - 1;
          if (last && k >= 3 && r < 0.35) this.preyHere('snake', 0);
          else if (r < 0.5) this.preyHere('bug', U.rand(50, 110));
          else if (r < 0.72) this.preyHere('bug', 0);
          else this.preyHere('lizard', 0);
        }
        this.land();
        break;
      case 'cactus':
      case 'rock':
        this.run(lead, groundCoins); this.jump();
        this.obstacleAtApex(name);
        this.land();
        break;
      case 'giantCactus':
        // 2段ジャンプの一番高い所の真下に大サボテン
        this.run(lead, groundCoins); this.jump(); this.wait(0.3); this.double();
        this.obstacleAtApex('giantCactus');
        this.land();
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
        g.items.push(DD.createItem('vulture', vx));
        if (name === 'vulture2') {
          var top = DD.createItem('vulture', vx + 40);
          top.baseY = top.y = -(CFG.OBSTACLE.vulture.lift + CFG.OBSTACLE.vulture.h + 6);
          g.items.push(top);
        }
        this.run(v * 0.15, false);
        break;
      case 'feverCoins':
        // フィーバー中はコインの波
        var wl = v * 0.9;
        for (var q = 0; q < 12; q++) {
          g.items.push(DD.KINDS.coin.create(gh.x + q * wl / 12, -60 - Math.sin(q / 11 * Math.PI) * 90));
        }
        if (Math.random() < 0.5) g.items.push(DD.createItem('bug', gh.x + wl * 0.5, -U.rand(60, 120)));
        this.run(wl, false);
        this.nextCoin = gh.x;
        break;
    }
    this.clearCoinsInObstacles(from);
  };

  /** 空中にいた区間 [x0, x1] の真ん中に穴を開ける */
  Course.prototype.hole = function (x0, x1, frac, wide) {
    var len = x1 - x0, w = Math.max(110, len * frac), c = (x0 + x1) / 2;
    var h = { x0: c - w / 2, x1: c + w / 2 };
    if (wide) h.wide = true;
    this.g.holes.push(h);
    // 穴の上に来てしまった地面のコインは消す
    var items = this.g.items;
    for (var i = items.length - 1; i >= 0; i--) {
      var it = items[i];
      if (it.coin && it.y > -45 && it.x > h.x0 - 10 && it.x < h.x1 + 10) items.splice(i, 1);
    }
  };

  /** 並びと並びのすきま（地面を走る） */
  Course.prototype.gap = function (dist) {
    this.run(dist, Math.random() < CFG.COIN_ROW_CHANCE * 0.6);
  };

  DD.Course = Course;
})(window);
