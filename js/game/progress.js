/*
 * DUST DASH 強化とセーブ（段階2：K 強化5種・L セーブ）
 * コイン・強化のレベル・最高記録をブラウザに保存する。
 */
(function (global) {
  'use strict';
  var DD = global.DD = global.DD || {};

  // ------------------------------------------------------------
  // 強化5種。どれも5段階。全部そろえるのに30分〜1時間くらいが目安
  // ------------------------------------------------------------
  DD.UPGRADES = [
    { id: 'stamina', icon: 'bolt' },     // スタミナの減りが遅くなる
    { id: 'dash',    icon: 'dash' },     // スタート直後に無敵ダッシュ
    { id: 'ukemi',   icon: 'shield' },   // ぶつかったときに減るスタミナが少なくなる
    { id: 'glutton', icon: 'bug' },      // 食べたときの回復とフィーバーのたまり方が増える
    { id: 'luck',    icon: 'coin' }      // もらえるコインが増える
  ];
  DD.UPGRADE_MAX = 5;
  DD.UPGRADE_COST = [700, 1600, 3200, 5500, 9000]; // レベル1〜5にするのに必要なコイン（全部で100000）

  /** 強化の効き目（レベル lv のとき） */
  DD.upgradeEffect = {
    stamina: function (lv) { return 1 - 0.05 * lv; },          // スタミナの減り方の倍率（lv5 で 0.75倍）
    dash:    function (lv) { return lv > 0 ? 1 + lv : 0; },    // スタートダッシュの秒数（lv5 で 6秒）
    ukemi:   function (lv) { return 1 - 0.1 * lv; },           // ぶつかったときのスタミナ減少の倍率（lv5 で 0.5倍）
    glutton: function (lv) { return 1 + 0.08 * lv; },          // 食べたときの回復・フィーバーの倍率（lv5 で 1.4倍）
    luck:    function (lv) { return 1 + 0.15 * lv; }           // コインの倍率（lv5 で 1.75倍）
  };

  DD.createProgress = function (store) {
    var data = {
      coins: store.get('coins', 0),
      upg: store.get('upg', {}),
      best: store.get('best', { speed: 0, dist: 0, combo: 0 })
    };
    function save() {
      store.set('coins', data.coins);
      store.set('upg', data.upg);
      store.set('best', data.best);
    }
    var api = {
      get coins() { return data.coins; },
      get best() { return data.best; },
      level: function (id) { return data.upg[id] || 0; },
      effect: function (id) { return DD.upgradeEffect[id](api.level(id)); },
      /** 次のレベルの値段（最大なら null） */
      cost: function (id) {
        var lv = api.level(id);
        return lv >= DD.UPGRADE_MAX ? null : DD.UPGRADE_COST[lv];
      },
      canBuy: function (id) { var c = api.cost(id); return c !== null && data.coins >= c; },
      buy: function (id) {
        if (!api.canBuy(id)) return false;
        data.coins -= api.cost(id);
        data.upg[id] = api.level(id) + 1;
        save();
        return true;
      },
      /** 1回のプレイが終わったとき。新記録の項目を返す */
      finishRun: function (res) {
        data.coins += res.coins;
        var rec = {};
        if (res.maxSpeed > data.best.speed) { data.best.speed = res.maxSpeed; rec.speed = true; }
        if (res.distance > data.best.dist) { data.best.dist = res.distance; rec.dist = true; }
        if (res.maxCombo > data.best.combo) { data.best.combo = res.maxCombo; rec.combo = true; }
        save();
        return rec;
      },
      /** 確認用：全部消す */
      reset: function () { data.coins = 0; data.upg = {}; data.best = { speed: 0, dist: 0, combo: 0 }; save(); }
    };
    return api;
  };
})(window);
