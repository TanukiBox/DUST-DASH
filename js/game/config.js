/*
 * DUST DASH 調整用の数値
 * 遊びの手ざわりはほぼここの数字で決まる。試遊して変えたくなったらここを触る。
 * 座標の単位は「ゲーム内の長さ」。主人公の背の高さがだいたい 70。
 */
(function (global) {
  'use strict';
  var DD = global.DD = global.DD || {};

  DD.CFG = {
    // ---- 画面 ----
    VIEW_MIN_W: 480,          // 最低限見える横幅（スマホ縦画面の基準）
    VIEW_MIN_H: 620,          // 最低限見える縦幅
    ZOOM_OUT_AT_TOP: 0.45,    // 速いほど引きの画にする割合（0.45 = 最大で45%広く見える）
    PLAYER_SCREEN_X: 0.2,     // 主人公を画面の左から何割の位置に置くか

    // ---- 速度（km/h）----
    UNITS_PER_KMH: 10,        // 1 km/h で1秒に進む長さ
    START_SPEED: 45,          // スタート時の速さ
    DECAY_BASE: 1.3,          // 自然減速：毎秒 (BASE + RATE × 今の速さ) km/h 下がる
    DECAY_RATE: 0.026,
    SPEED_FX_FROM: 55,        // この速さから集中線が出はじめる
    SPEED_FX_FULL: 160,       // この速さで演出が最大

    // ---- ジャンプ ----
    GRAVITY_UP: 2600,         // 上がっている間の重力
    GRAVITY_DOWN: 3100,       // 落ちている間の重力（少し強めでキビキビ）
    JUMP_V: 930,              // 1段目のジャンプ力
    DOUBLE_JUMP_V: 860,       // 2段目のジャンプ力
    STOMP_BOUNCE_V: 760,      // 獲物を踏んだときの跳ね返り
    SNAKE_BOUNCE_V: 1500,     // ヘビを踏んだときの大ジャンプ
    COYOTE_TIME: 0.09,        // 足場から離れた直後でも地上ジャンプできる猶予（秒）
    JUMP_BUFFER: 0.13,        // 着地の少し前に押しても着地と同時に跳べる猶予（秒）

    // ---- 獲物 ----
    PREY: {
      bug:    { gain: 5,  w: 34, h: 26 },               // 虫：少し加速
      lizard: { gain: 10, w: 60, h: 22, vx: 70 },       // トカゲ：中くらい加速（自分も右へ走る）
      snake:  { gain: 20, w: 66, h: 44, hitLoss: 14 }   // ヘビ：大きく加速／横から当たると減速
    },
    STOMP_MARGIN_X: 14,       // 踏みつけ判定を横に広げる量（大きいほど簡単）
    HURT_INVULN: 1.0,         // 当たった後の無敵時間（秒）

    // ---- 出現 ----
    SPAWN_GAP_MIN: 0.8,       // 次の出現までの間隔（秒換算・最小）
    SPAWN_GAP_MAX: 1.4,       // 同（最大）
    FIRST_SPAWN_DELAY: 1.2    // スタートから最初の出現まで（秒換算）
  };
})(window);
