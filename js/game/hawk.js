/*
 * DUST DASH タカ（天敵）
 * ・遅くなるほど、空から大きな影が迫ってくる（画面の座標で描く）
 * ・速度0になると急降下して主人公をつかまえ、空へ連れていく
 * 怖すぎないよう、丸い体に大きな目。まゆ毛で「ねらってる」顔にする。
 */
(function (global) {
  'use strict';
  var DD = global.DD = global.DD || {};
  var CFG = DD.CFG, COL = DD.COL, D = DD.draw, U = DD.util;

  var BROWN = '#8a5530', BROWN_DARK = '#61391d', BELLY = '#f7e7c9', TAIL = '#d9673a', FEET = '#f4c542';

  /**
   * タカを描く（右向き）。x, y は体の中心。
   * pose = { t, dive: 0〜1（翼をたたむ度合い）, talons: bool, scale }
   */
  DD.drawHawk = function (ctx, x, y, pose) {
    var lw = D.LW, t = pose.t || 0, dive = pose.dive || 0;
    var flap = (1 - dive) * Math.sin(t * 12);
    ctx.save();
    ctx.translate(x, y);
    var s = pose.scale || 1.25;
    ctx.scale(s, s);
    if (pose.angle) ctx.rotate(pose.angle);

    // 奥の翼
    wing(ctx, -2, -8, flap, dive, BROWN_DARK, lw, -1);

    // しっぽ（赤茶色＝アカオノスリがモデル）
    D.shape(ctx, function (c) {
      c.moveTo(-20, -4);
      c.lineTo(-48, -12 + dive * 6); c.quadraticCurveTo(-54, 0, -48, 10 - dive * 6);
      c.lineTo(-20, 6); c.closePath();
    }, TAIL, lw);
    ctx.strokeStyle = 'rgba(97, 57, 29, 0.6)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-44, -8); ctx.lineTo(-44, 6); ctx.stroke();

    // 足（つかむときに前へ出す）
    if (pose.talons) {
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      var feet = function () {
        ctx.beginPath();
        ctx.moveTo(2, 12); ctx.lineTo(8, 26);
        ctx.moveTo(8, 26); ctx.lineTo(15, 28); ctx.moveTo(8, 26); ctx.lineTo(12, 33); ctx.moveTo(8, 26); ctx.lineTo(3, 31);
        ctx.moveTo(-6, 12); ctx.lineTo(-4, 26);
        ctx.moveTo(-4, 26); ctx.lineTo(3, 29); ctx.moveTo(-4, 26); ctx.lineTo(-1, 33); ctx.moveTo(-4, 26); ctx.lineTo(-10, 30);
      };
      feet(); ctx.lineWidth = 8; ctx.strokeStyle = COL.line; ctx.stroke();
      feet(); ctx.lineWidth = 4; ctx.strokeStyle = FEET; ctx.stroke();
    }

    // 胴体
    D.oval(ctx, 0, 0, 27, 17, -0.05, BROWN, lw);
    ctx.save();
    ctx.beginPath(); D.ellipse(ctx, 0, 0, 27, 17, -0.05); ctx.clip();
    ctx.fillStyle = BELLY;
    ctx.beginPath(); D.ellipse(ctx, 6, 9, 22, 11, 0); ctx.fill();
    ctx.fillStyle = BROWN_DARK;
    for (var i = 0; i < 4; i++) { ctx.beginPath(); D.ellipse(ctx, -4 + i * 7, 9 + (i % 2) * 2, 2.4, 1.7, 0); ctx.fill(); }
    ctx.restore();
    D.oval(ctx, 0, 0, 27, 17, -0.05, null, lw);

    // 頭
    D.oval(ctx, 25, -10, 14, 13, 0, BROWN, lw);
    ctx.save();
    ctx.beginPath(); D.ellipse(ctx, 25, -10, 14, 13, 0); ctx.clip();
    ctx.fillStyle = BELLY;
    ctx.beginPath(); D.ellipse(ctx, 29, -1, 10, 7, 0); ctx.fill();
    ctx.restore();
    // くちばし（黄色い根元＋先が曲がる）
    D.shape(ctx, function (c) {
      c.moveTo(35, -14); c.quadraticCurveTo(47, -15, 47, -6);
      c.quadraticCurveTo(43, -8, 37, -6); c.closePath();
    }, '#4d4642', lw * 0.8);
    D.oval(ctx, 35, -12, 3.6, 3.2, 0, FEET, lw * 0.6);
    // 大きな目と、ねらいを定めたまゆ毛
    D.eye(ctx, 28, -13, 5.5, 0.7, pose.eyeDown || 0.2, false);
    ctx.strokeStyle = COL.line; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(22, -21); ctx.lineTo(33, -18.5); ctx.stroke();

    // 手前の翼
    wing(ctx, 0, -6, flap, dive, BROWN, lw, 1);
    ctx.restore();
  };

  /** 翼。dive=1 で後ろにたたむ。side=1 が手前 */
  function wing(ctx, x, y, flap, dive, color, lw, side) {
    ctx.save();
    ctx.translate(x, y);
    var lift = -34 - flap * 22;          // 翼の先の高さ
    var back = -20 - dive * 22;          // 翼の先の後ろへの伸び
    var tipY = U.lerp(lift, -8, dive);
    D.shape(ctx, function (c) {
      c.moveTo(10, 0);
      c.quadraticCurveTo(4, tipY * 0.6, back + 4, tipY);
      // 指のように分かれた先
      c.lineTo(back - 4, tipY + 4);
      c.lineTo(back - 2, tipY + 9);
      c.lineTo(back - 9, tipY + 12);
      c.lineTo(back - 6, tipY + 17);
      c.quadraticCurveTo(-12, U.lerp(-2, 2, dive), -14, 4);
      c.closePath();
    }, color, lw);
    if (side > 0) {
      ctx.fillStyle = 'rgba(247, 231, 201, 0.45)';
      ctx.beginPath();
      ctx.moveTo(4, -2); ctx.quadraticCurveTo(0, tipY * 0.45, back + 2, tipY + 6);
      ctx.lineTo(back + 6, tipY + 12); ctx.quadraticCurveTo(-4, -2, -6, 2);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  /**
   * 空から迫るタカの影（上から見た形）。画面の座標で描く。
   * danger 0〜1：遅いほど大きく、濃く、主人公に近づく。
   */
  DD.drawHawkShadow = function (ctx, W, H, groundY, playerX, danger, t) {
    if (danger <= 0.01) return;
    var size = Math.min(W, H) * U.lerp(0.18, 0.7, danger);
    // 左上の遠くから、主人公の真上へ近づいてくる（体全体が画面に入るように）
    var cx = U.lerp(-size * 0.3, Math.max(playerX + size * 0.45, size * 0.6), danger) + Math.sin(t * 0.9) * size * 0.12;
    var cy = U.lerp(groundY * 0.12, groundY * 0.45, danger) + Math.sin(t * 1.3) * size * 0.06;
    var rot = Math.sin(t * 0.7) * 0.12 + 0.1;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.scale(size / 100, size / 100);
    ctx.globalAlpha = U.lerp(0.1, 0.34, danger);
    ctx.fillStyle = '#3a2112';
    var f = Math.sin(t * 2.2) * 3; // ゆっくり羽ばたく
    ctx.beginPath();
    // 上から見たタカ：大きく広げた翼・扇のしっぽ・頭
    ctx.moveTo(0, -30);
    ctx.quadraticCurveTo(6, -30, 7, -20);
    ctx.quadraticCurveTo(28, -24 - f, 52, -14 - f);
    ctx.lineTo(56, -8 - f); ctx.lineTo(50, -6 - f); ctx.lineTo(54, -2 - f); ctx.lineTo(46, 0 - f); ctx.lineTo(48, 5 - f);
    ctx.quadraticCurveTo(24, 2, 8, 8);
    ctx.lineTo(16, 30); ctx.quadraticCurveTo(0, 36, -16, 30); ctx.lineTo(-8, 8);
    ctx.quadraticCurveTo(-24, 2, -48, 5 - f);
    ctx.lineTo(-46, 0 - f); ctx.lineTo(-54, -2 - f); ctx.lineTo(-50, -6 - f); ctx.lineTo(-56, -8 - f);
    ctx.lineTo(-52, -14 - f);
    ctx.quadraticCurveTo(-28, -24 - f, -7, -20);
    ctx.quadraticCurveTo(-6, -30, 0, -30);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 画面のふちが暗くなる
    var v = danger * danger;
    if (v > 0.05) {
      var g = ctx.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.35, W / 2, H * 0.45, Math.max(W, H) * 0.8);
      g.addColorStop(0, 'rgba(58, 33, 18, 0)');
      g.addColorStop(1, 'rgba(58, 33, 18, ' + (0.4 * v).toFixed(3) + ')');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
  };
})(window);
