/*
 * DUST DASH ランキング（みんなの記録）
 * ・サーバーは Cloudflare Workers（server/worker.js）。場所は config.js の RANK_API
 * ・RANK_API が空のときは、ランキングのボタンを出さない（今までどおり、どこにも送らない）
 * ・送るのは「この端末のランダムな番号・えらんだ名前（ことば＋生きものの番号）・記録」だけ
 * ・名前は自由入力にしない（悪いことばが出ないように、組み合わせからえらぶ）
 */
(function (global) {
  'use strict';
  var DD = global.DD = global.DD || {};
  var CFG = DD.CFG;

  DD.RANK_BOARDS = ['dist', 'endless', 'speed'];

  DD.createRank = function (store) {
    var cache = {}; // board → { at, data }

    function api() { return (CFG.RANK_API || '').replace(/\/+$/, ''); }

    /** この端末の番号（はじめて使うときに作る。個人を表すものではない） */
    function device() {
      var id = store.get('rankId', null);
      if (!/^[0-9a-f]{32}$/.test(id || '')) {
        var a = new Uint8Array(16);
        if (global.crypto && global.crypto.getRandomValues) global.crypto.getRandomValues(a);
        else for (var i = 0; i < 16; i++) a[i] = Math.floor(Math.random() * 256);
        id = Array.prototype.map.call(a, function (b) { return (b < 16 ? '0' : '') + b.toString(16); }).join('');
        store.set('rankId', id);
      }
      return id;
    }

    /** 通信（8秒で あきらめる）。成功なら JSON、だめなら null */
    function request(method, path, body) {
      if (!api() || !global.fetch) return Promise.resolve(null);
      var ctrl = global.AbortController ? new global.AbortController() : null;
      var timer = ctrl ? global.setTimeout(function () { ctrl.abort(); }, 8000) : 0;
      return global.fetch(api() + path, {
        method: method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        signal: ctrl ? ctrl.signal : undefined,
        cache: 'no-store'
      }).then(function (r) {
        return r.ok ? r.json() : null;
      }).catch(function () { return null; }).then(function (j) {
        if (timer) global.clearTimeout(timer);
        return j;
      });
    }

    var rank = {
      get enabled() { return !!api(); },
      /** えらんだ名前 { a, b }（まだなら null） */
      get name() { var n = store.get('rankName', null); return n && typeof n.a === 'number' && typeof n.b === 'number' ? n : null; },
      /** ランキングに参加しているか */
      get joined() { return rank.enabled && !!rank.name; },
      /** 名前の文字（今の言語で） */
      nameText: function (n1, n2) {
        var t = DD.app.i18n.t;
        var adj = t('rankAdj').split(','), noun = t('rankNoun').split(',');
        return (adj[n1] || '?') + (DD.app.i18n.lang === 'ja' ? '' : ' ') + (noun[n2] || '?');
      },
      /** 名前を決める（参加する）。前の記録があれば、名前も変わる */
      setName: function (a, b) {
        var had = !!rank.name;
        store.set('rankName', { a: a, b: b });
        cache = {};
        if (had) request('POST', '/name', { device: device(), n1: a, n2: b });
      },
      /** 参加をやめる（この端末からは送らなくなる。のった記録は残る） */
      leave: function () { store.remove('rankName'); },
      /** 1回のプレイの記録を送る。答え：{ dist:{rank,improved,...}, endless:..., speed:... } か null */
      submit: function (res) {
        if (!rank.joined) return Promise.resolve(null);
        var n = rank.name;
        return request('POST', '/submit', {
          device: device(), n1: n.a, n2: n.b,
          dist: res.distance, speed: res.maxSpeed, time: Math.round(res.time * 100) / 100,
          endless: !!res.endless, cleared: !!res.cleared, clearTime: Math.round((res.clearTime || 0) * 100) / 100
        }).then(function (j) {
          if (j && j.ranks) { cache = {}; return j.ranks; }
          return null;
        });
      },
      /** 上位の一覧。20秒は前の答えを使う */
      top: function (board, force) {
        var c = cache[board];
        if (!force && c && Date.now() - c.at < 20000) return Promise.resolve(c.data);
        return request('GET', '/top?board=' + board + '&limit=' + 30 + '&device=' + device()).then(function (j) {
          if (j && j.list) cache[board] = { at: Date.now(), data: j };
          return j;
        });
      },
      /** 記録の表示（dist の sub はゴールまでの時間 ミリ秒） */
      valueText: function (board, value, sub) {
        if (board === 'speed') return value + ' km/h';
        if (board === 'dist' && sub > 0) {
          var s = Math.round(sub / 100) / 10, m = Math.floor(s / 60);
          return 'GOAL ' + m + ':' + ((s - m * 60) < 10 ? '0' : '') + (s - m * 60).toFixed(1);
        }
        return value + ' m';
      }
    };
    return rank;
  };
})(window);
