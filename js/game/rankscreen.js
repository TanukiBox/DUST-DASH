/*
 * DUST DASH ランキングの画面
 * ・ranking … みんなの順位（距離 / エンドレス / 最高時速 の3つ）
 * ・rankName … 名前をえらぶ（ことば＋生きもの。自由入力はしない）
 */
(function (global) {
  'use strict';
  var DD = global.DD = global.DD || {};
  var COL = DD.COL, D = DD.draw, U = DD.util;

  function T(key, params) { return DD.app.i18n.t(key, params); }
  function SU() { return DD.sceneUtil; }

  var BOARD_LABEL = { dist: 'distance', endless: 'endlessDist', speed: 'topSpeed' };

  /** トロフィーの絵（ボタンなどに使う） */
  DD.drawTrophy = function (ctx, x, y, s, fill) {
    ctx.save();
    ctx.translate(x, y); ctx.scale(s / 24, s / 24);
    fill = fill || COL.good;
    D.shape(ctx, function (c) { c.moveTo(-9, -10); c.quadraticCurveTo(-17, -10, -15, -3); c.quadraticCurveTo(-13, 3, -6, 3); }, null, 3);
    D.shape(ctx, function (c) { c.moveTo(9, -10); c.quadraticCurveTo(17, -10, 15, -3); c.quadraticCurveTo(13, 3, 6, 3); }, null, 3);
    D.shape(ctx, function (c) { c.moveTo(-10, -12); c.lineTo(10, -12); c.quadraticCurveTo(10, 6, 0, 7); c.quadraticCurveTo(-10, 6, -10, -12); c.closePath(); }, fill, 3);
    D.shape(ctx, function (c) { D.roundRect(c, -3, 6, 6, 5, 1); }, fill, 2.5);
    D.shape(ctx, function (c) { D.roundRect(c, -8, 11, 16, 5, 2); }, COL.sandDeep, 2.5);
    ctx.restore();
  };

  /** 名前の見本の位置を画面に出す（一覧の1行） */
  function medal(ctx, rank, x, y) {
    var col = rank === 1 ? '#ffcf3f' : rank === 2 ? '#d7dde3' : rank === 3 ? '#e2a26a' : null;
    if (col) {
      D.oval(ctx, x, y, 15, 15, 0, col, 3);
      D.text(ctx, String(rank), x, y + 1, { size: 16, fill: COL.ink, lw: 0 });
    } else {
      D.text(ctx, String(rank), x, y + 1, { size: 17, fill: COL.sandDeep, lw: 0, maxW: 40 });
    }
  }

  // ------------------------------------------------------------
  // みんなの順位
  // ------------------------------------------------------------
  var Ranking = {
    /** arg = { board, back: { scene, arg } } */
    enter: function (app, arg) {
      arg = arg || {};
      this.back = arg.back || { scene: 'title' };
      this.board = arg.board || (SU().currentMode(app) === 'endless' ? 'endless' : 'dist');
      this.demo = app.demoGame = app.demoGame || new DD.Game({ demo: true });
      this.t = 0;
      this.data = {};
      var self = this;
      this.tabBtns = DD.RANK_BOARDS.map(function (b) {
        return { x: 0, y: 0, w: 0, h: 0, onPress: function () {
          app.sfx.play('ui');
          if (self.board === b && self.data[b] === null) self.load(app, b, true);
          self.board = b; self.load(app, b);
        } };
      });
      this.listBtn = { x: 0, y: 0, w: 0, h: 0, onPress: function () { if (self.data[self.board] === null) { app.sfx.play('ui'); self.load(app, self.board, true); } } };
      this.nameBtn = { x: 0, y: 0, w: 0, h: 0, onPress: function () {
        app.sfx.play('ui');
        app.go('rankName', { back: { scene: 'ranking', arg: { board: self.board, back: self.back } } });
      } };
      this.backBtn = { x: 0, y: 0, w: 0, h: 0, onPress: function () { app.sfx.play('ui'); app.go(self.back.scene, self.back.arg); } };
      this.startBtn = { x: 0, y: 0, w: 0, h: 0, onPress: function () { app.sfx.play('ui'); app.go('play'); } };
      app.setButtons([this.listBtn].concat(this.tabBtns, [this.nameBtn, this.backBtn, this.startBtn]));
      if (this.back.scene !== 'result') app.bgm.play('title');
      if (arg.wait) {
        // 記録を送っている途中：送り終わってから順位を読む
        this.data[this.board] = 'loading';
        arg.wait.then(function () { self.load(app, self.board, true); });
      } else {
        this.load(app, this.board);
      }
    },
    load: function (app, board, force) {
      var self = this;
      if (this.data[board] === undefined || force) {
        this.data[board] = 'loading';
        app.rank.top(board, force).then(function (j) { self.data[board] = j || null; });
      }
    },
    update: function (app, dt) {
      this.t += dt;
      this.demo.update(dt, app.W, app.H);
    },
    render: function (app, ctx) {
      this.demo.render(ctx, app.dpr);
      SU().uiSpace(ctx, app);
      var ui = app.ui, self = this;
      ctx.fillStyle = 'rgba(74, 45, 26, 0.5)';
      ctx.fillRect(0, 0, ui.w, ui.h);

      var land = ui.w > ui.h * 1.15;
      var pw = Math.min(ui.w - 28, 440), sideW = 180;
      if (land && ui.w < pw + sideW + 60) pw = ui.w - sideW - 60;
      var top = ui.safeTop + 40, foot = land ? 0 : 96;
      var ph = Math.min(ui.h - ui.safeBottom - top - foot - 14, 640);
      var px = land ? (ui.w - (pw + 24 + sideW)) / 2 : (ui.w - pw) / 2, py = top;
      var ccx = px + pw / 2;

      D.shape(ctx, function (c) { D.roundRect(c, px, py + 6, pw, ph, 28); }, COL.sandDeep, 5);
      D.shape(ctx, function (c) { D.roundRect(c, px, py, pw, ph, 28); }, COL.cream, 5);
      var rw = Math.min(pw * 0.66, 260), rh = 52;
      D.shape(ctx, function (c) { D.roundRect(c, ccx - rw / 2, py - rh / 2, rw, rh, 18); }, COL.accent, 5);
      DD.drawTrophy(ctx, ccx - rw / 2 + 30, py, 30);
      D.text(ctx, T('ranking'), ccx + 14, py + 1, { size: 26, fill: COL.white, maxW: rw - 70 });

      // タブ（距離 / エンドレス / 最高時速）
      var tabY = py + 40, tabH = 38, tabGap = 6, tabW = (pw - 32 - tabGap * 2) / 3;
      DD.RANK_BOARDS.forEach(function (b, i) {
        var r = { x: px + 16 + i * (tabW + tabGap), y: tabY, w: tabW, h: tabH }, on = b === self.board;
        D.shape(ctx, function (c) { D.roundRect(c, r.x, r.y, r.w, r.h, r.h / 2); }, on ? COL.accent : '#f3e2c0', 3);
        D.text(ctx, T(BOARD_LABEL[b]), r.x + r.w / 2, r.y + r.h / 2 + 1, { size: 16, fill: on ? COL.white : COL.ink, lw: 0, maxW: r.w - 14 });
        SU().place(app, self.tabBtns[i], r);
      });

      // 一覧
      var listY = tabY + tabH + 14, footH = 78;
      var listH = py + ph - footH - listY;
      var rowH = 34, rows = Math.max(3, Math.floor(listH / rowH));
      var d = this.data[this.board];
      SU().place(app, this.listBtn, { x: px, y: listY, w: pw, h: listH });
      if (d === 'loading' || d === undefined) {
        D.text(ctx, T('rankLoading'), ccx, listY + listH / 2, { size: 20, fill: COL.sandDeep, lw: 0 });
      } else if (d === null) {
        D.text(ctx, T('rankError'), ccx, listY + listH / 2, { size: 18, fill: COL.bad, lw: 0, maxW: pw - 40 });
      } else if (!d.list.length) {
        D.text(ctx, T('rankEmpty'), ccx, listY + listH / 2, { size: 20, fill: COL.sandDeep, lw: 0, maxW: pw - 40 });
      } else {
        var list = d.list.slice(0, rows), meIn = list.some(function (r) { return r.me; });
        // 自分が一覧の外なら、いちばん下の行を自分にする
        if (d.me && !meIn && list.length >= rows) list = list.slice(0, rows - 2).concat([{ gap: true }, { rank: d.me.rank, value: d.me.value, sub: d.me.sub, n1: -1, me: true }]);
        else if (d.me && !meIn) list.push({ rank: d.me.rank, value: d.me.value, sub: d.me.sub, n1: -1, me: true });
        var nm = app.rank.name;
        list.forEach(function (r, i) {
          var y = listY + i * rowH + rowH / 2;
          if (r.gap) { D.text(ctx, '⋮', ccx, y, { size: 18, fill: COL.sandDeep, lw: 0 }); return; }
          if (r.me) D.shape(ctx, function (c) { D.roundRect(c, px + 10, y - rowH / 2 + 2, pw - 20, rowH - 4, 12); }, 'rgba(255, 207, 63, 0.55)', 0);
          else if (i % 2 === 0) D.shape(ctx, function (c) { D.roundRect(c, px + 10, y - rowH / 2 + 2, pw - 20, rowH - 4, 12); }, 'rgba(201, 140, 74, 0.1)', 0);
          medal(ctx, r.rank, px + 36, y);
          var valT = app.rank.valueText(self.board, r.value, r.sub);
          var valW = D.measure(ctx, valT, 18);
          var name = r.me && nm ? app.rank.nameText(nm.a, nm.b) : r.n1 >= 0 ? app.rank.nameText(r.n1, r.n2) : T('rankYou');
          D.text(ctx, name, px + 60, y + 1, { size: 17, fill: COL.ink, lw: 0, align: 'left', maxW: pw - 60 - valW - 46 });
          D.text(ctx, valT, px + pw - 22, y + 1, { size: 18, fill: r.me ? '#c85e23' : COL.accent, lw: 0, align: 'right' });
        });
      }

      // 下：自分の順位・名前
      var fy = py + ph - footH;
      ctx.strokeStyle = 'rgba(74, 45, 26, 0.2)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(px + 20, fy); ctx.lineTo(px + pw - 20, fy); ctx.stroke();
      var name = app.rank.name;
      if (name) {
        var mine = d && d !== 'loading' && d.me ? T('rankMine', { n: d.me.rank, total: d.total }) : T('rankNote2');
        D.text(ctx, mine, ccx, fy + 20, { size: 15, fill: COL.sandDeep, lw: 0, maxW: pw - 30 });
        var cbw = 92, cb = { x: px + pw - 16 - cbw, y: fy + 36, w: cbw, h: 32 };
        D.text(ctx, T('rankNameLabel') + (app.i18n.lang === 'ja' ? '：' : ': ') + app.rank.nameText(name.a, name.b), px + 20, fy + 53, { size: 17, fill: COL.ink, lw: 0, align: 'left', maxW: pw - cbw - 50 });
        D.shape(ctx, function (c) { D.roundRect(c, cb.x, cb.y, cb.w, cb.h, 16); }, '#f3e2c0', 3);
        D.text(ctx, T('rankChange'), cb.x + cb.w / 2, cb.y + cb.h / 2 + 1, { size: 15, fill: COL.ink, lw: 0, maxW: cb.w - 12 });
        SU().place(app, this.nameBtn, cb);
      } else {
        D.text(ctx, T('rankNotJoined'), ccx, fy + 20, { size: 15, fill: COL.sandDeep, lw: 0, maxW: pw - 30 });
        var jb = { x: ccx - 110, y: fy + 34, w: 220, h: 38 };
        D.button(ctx, jb, T('rankJoin'), { size: 18, fill: '#6cc06b', shade: '#3f8a45' });
        SU().place(app, this.nameBtn, jb);
      }

      // もどる・スタート
      var back, start;
      if (land) {
        start = { x: px + pw + 24, y: py + ph - 64 * 2 - 18, w: sideW, h: 64 };
        back = { x: px + pw + 24, y: py + ph - 64, w: sideW, h: 64 };
      } else {
        var by = py + ph + 22, gapB = 12;
        var sbw = Math.min(pw * 0.58, 230), bbw = Math.min(pw - sbw - gapB, 150), bx0 = (ui.w - (sbw + gapB + bbw)) / 2;
        back = { x: bx0, y: by, w: bbw, h: 60 };
        start = { x: bx0 + bbw + gapB, y: by, w: sbw, h: 60 };
      }
      D.button(ctx, back, T('back'), { size: 22, fill: '#b9a58a', shade: '#8a7760' });
      D.button(ctx, start, this.back.scene === 'result' ? T('retry') : T('start'), { size: 26 });
      SU().place(app, this.backBtn, back);
      SU().place(app, this.startBtn, start);
    },
    press: function (app, p) {
      if (p.x === null) { app.sfx.play('ui'); app.go(this.back.scene, this.back.arg); }
    }
  };

  // ------------------------------------------------------------
  // 名前をえらぶ
  // ------------------------------------------------------------
  function nameCount(key) { return T(key).split(',').length; }

  var RankName = {
    /** arg = { back: { scene, arg }, pending: 結果（参加したら、この記録を送ってランキングを見せる） } */
    enter: function (app, arg) {
      arg = arg || {};
      this.back = arg.back || { scene: 'title' };
      this.pending = arg.pending || null;
      this.demo = app.demoGame = app.demoGame || new DD.Game({ demo: true });
      this.t = 0;
      this.pop = 0;
      var cur = app.rank.name;
      this.a = cur ? cur.a : Math.floor(Math.random() * nameCount('rankAdj'));
      this.b = cur ? cur.b : Math.floor(Math.random() * nameCount('rankNoun'));
      var self = this;
      function step(part, d) {
        return { x: 0, y: 0, w: 0, h: 0, onPress: function () {
          var n = nameCount(part === 'a' ? 'rankAdj' : 'rankNoun');
          self[part] = (self[part] + d + n) % n; self.pop = 1; app.sfx.play('ui');
        } };
      }
      this.aPrev = step('a', -1); this.aNext = step('a', 1);
      this.bPrev = step('b', -1); this.bNext = step('b', 1);
      this.randBtn = { x: 0, y: 0, w: 0, h: 0, onPress: function () {
        self.a = Math.floor(Math.random() * nameCount('rankAdj'));
        self.b = Math.floor(Math.random() * nameCount('rankNoun'));
        self.pop = 1; app.sfx.play('coin', 1);
      } };
      this.okBtn = { x: 0, y: 0, w: 0, h: 0, onPress: function () { self.ok(app); } };
      this.noBtn = { x: 0, y: 0, w: 0, h: 0, onPress: function () {
        app.sfx.play('ui');
        if (app.rank.name && !self.pending) app.rank.leave();
        app.go(self.back.scene, self.back.arg);
      } };
      app.setButtons([this.aPrev, this.aNext, this.bPrev, this.bNext, this.randBtn, this.okBtn, this.noBtn]);
    },
    ok: function (app) {
      app.sfx.play('buy');
      app.rank.setName(this.a, this.b);
      var res = this.pending;
      if (res && !res.rankSent) {
        // 参加したばかり：今の記録を送って、順位を見せる
        res.rankSent = true;
        res.ranks = 'sending';
        var wait = app.rank.submit(res).then(function (r) { res.ranks = r; });
        app.go('ranking', { board: res.endless ? 'endless' : 'dist', back: this.back, wait: wait });
      } else {
        app.go(this.back.scene, this.back.arg);
      }
    },
    update: function (app, dt) {
      this.t += dt;
      this.pop = Math.max(0, this.pop - dt * 5);
      this.demo.update(dt, app.W, app.H);
    },
    render: function (app, ctx) {
      this.demo.render(ctx, app.dpr);
      SU().uiSpace(ctx, app);
      var ui = app.ui;
      ctx.fillStyle = 'rgba(74, 45, 26, 0.5)';
      ctx.fillRect(0, 0, ui.w, ui.h);
      var pw = Math.min(ui.w - 28, 420), ph = 380;
      var avail = ui.h - ui.safeTop - ui.safeBottom - 30;
      var fit = Math.min(1, avail / (ph + 40));
      var px = (ui.w - pw) / 2, py = Math.max(ui.safeTop + 40, (ui.h - ph) / 2);
      if (fit < 1) py = ui.safeTop + 40;
      var ccx = px + pw / 2, cx0 = ui.w / 2, cy0 = ui.safeTop + 15;
      ctx.save();
      ctx.translate(cx0, cy0); ctx.scale(fit, fit); ctx.translate(-cx0, -cy0);
      var map = function (r) { return { x: cx0 + (r.x - cx0) * fit, y: cy0 + (r.y - cy0) * fit, w: r.w * fit, h: r.h * fit }; };

      D.shape(ctx, function (c) { D.roundRect(c, px, py + 6, pw, ph, 28); }, COL.sandDeep, 5);
      D.shape(ctx, function (c) { D.roundRect(c, px, py, pw, ph, 28); }, COL.cream, 5);
      var rw = Math.min(pw * 0.7, 270), rh = 52;
      D.shape(ctx, function (c) { D.roundRect(c, ccx - rw / 2, py - rh / 2, rw, rh, 18); }, COL.accent, 5);
      D.text(ctx, T('rankNameTitle'), ccx, py + 1, { size: 25, fill: COL.white, maxW: rw - 24 });

      // えらんだ名前（大きく）
      var s = 1 + this.pop * 0.12;
      ctx.save();
      ctx.translate(ccx, py + 70); ctx.scale(s, s);
      D.text(ctx, app.rank.nameText(this.a, this.b), 0, 0, { size: 30, fill: COL.accent, lw: 0, maxW: pw - 40 });
      ctx.restore();

      // ことば・生きもの を ◀ ▶ でえらぶ
      var adj = T('rankAdj').split(','), noun = T('rankNoun').split(',');
      [['a', adj[this.a], this.aPrev, this.aNext, py + 130], ['b', noun[this.b], this.bPrev, this.bNext, py + 184]].forEach(function (row) {
        var y = row[4], bw = 50, bh = 42;
        var l = { x: px + 20, y: y - bh / 2, w: bw, h: bh }, r = { x: px + pw - 20 - bw, y: y - bh / 2, w: bw, h: bh };
        D.shape(ctx, function (c) { D.roundRect(c, l.x + bw, y - 19, pw - 40 - bw * 2, 38, 12); }, '#fff', 3);
        D.text(ctx, row[1], ccx, y + 1, { size: 20, fill: COL.ink, lw: 0, maxW: pw - 40 - bw * 2 - 20 });
        D.button(ctx, l, '◀', { size: 20, fill: '#b9a58a', shade: '#8a7760' });
        D.button(ctx, r, '▶', { size: 20, fill: '#b9a58a', shade: '#8a7760' });
        SU().place(app, row[2], map(l)); SU().place(app, row[3], map(r));
      });
      var rb = { x: ccx - 80, y: py + 222, w: 160, h: 40 };
      D.button(ctx, rb, T('rankRandom'), { size: 18, fill: '#7fb8e8', shade: '#4d87b8' });
      SU().place(app, this.randBtn, map(rb));
      D.text(ctx, T('rankNote'), ccx, py + 290, { size: 14, fill: COL.sandDeep, lw: 0, maxW: pw - 30 });
      if (!app.rank.name) D.text(ctx, T('rankNote2'), ccx, py + 312, { size: 14, fill: COL.sandDeep, lw: 0, maxW: pw - 30 });

      // けってい・参加しない（参加しているときは「参加をやめる」）
      var fy = py + ph + 22, gapB = 12;
      var obw = Math.min(pw * 0.55, 220), nbw = Math.min(pw - obw - gapB, 170), bx0 = (ui.w - (obw + gapB + nbw)) / 2;
      var no = { x: bx0, y: fy, w: nbw, h: 60 }, ok = { x: bx0 + nbw + gapB, y: fy, w: obw, h: 60 };
      var noLabel = app.rank.name && !this.pending ? T('rankLeave') : T('rankNo');
      D.button(ctx, no, noLabel, { size: 18, fill: '#b9a58a', shade: '#8a7760' });
      D.button(ctx, ok, T('rankOk'), { size: 26, fill: '#6cc06b', shade: '#3f8a45' });
      ctx.restore();
      SU().place(app, this.noBtn, map(no));
      SU().place(app, this.okBtn, map(ok));
    },
    press: function (app, p) {
      if (p.x === null) this.ok(app);
    }
  };

  DD.Scenes.ranking = Ranking;
  DD.Scenes.rankName = RankName;
})(window);
