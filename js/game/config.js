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
    STOMP_MARGIN_X: 26,       // 踏みつけ判定を横に広げる量（大きいほど簡単）
    ASSIST: true,             // 踏みつけアシスト（落ちる途中で獲物の真上に吸い寄せる）
    ASSIST_MIN: 0.55,         // アシストが効く範囲（ちょうどの時間の何倍まで。広いほど簡単）
    ASSIST_MAX: 1.6,
    ASSIST_STRENGTH: 12,      // 吸い寄せの強さ
    HITSTOP: 0.045,           // 踏んだ瞬間に止まる時間（秒）
    HITSTOP_BIG: 0.09,        // ヘビを踏んだとき

    // ---- コンボ ----
    COMBO_STEP: 0.25,         // コンボ1つごとに加速が何割増えるか
    COMBO_MAX_MULT: 2.5,      // 加速の倍率の上限
    CHAIN_GAP: 0.6,           // コンボ用の並びの間隔（秒換算）
    HURT_INVULN: 1.0,         // 当たった後の無敵時間（秒）

    // ---- 障害物 ----
    OBSTACLE: {
      cactusTall:  { w: 40, h: 72 },
      cactusRound: { w: 44, h: 42 },
      rockBig:     { w: 62, h: 40 },
      rockSmall:   { w: 46, h: 28 },
      giantCactus: { w: 56, h: 205 },            // 2段ジャンプでよける
      vulture:     { w: 72, h: 78, lift: 90, vx: 120 } // lift = 地面から体の下までの高さ（走っていればくぐれる）
    },
    OBSTACLE_LOSS: 18,        // サボテン・岩に当たったときの減速（km/h）
    HOLE_LOSS: 26,            // 穴に落ちたときの減速（km/h）
    HOLE_WIDTH: 0.3,          // 穴の幅（秒換算。速いほど広くなる）
    WIDE_HOLE_WIDTH: 0.85,    // 大穴の幅（1回のジャンプでは届かない）
    HOLE_RECOVER_V: 1250,     // 穴から飛び出す勢い

    // ---- 速いときの見やすさ ----
    PREY_ZOOM_COMP: 0.85,     // 引きの画になった分、獲物・障害物を大きく描く割合
    GLOW_FROM: 60,            // この速さから獲物のまわりが光る
    GLOW_FULL: 120,
    MARKER_FROM: 60,          // この速さから、画面右はしに「もうすぐ来る」印を出す
    MARKER_TIME: 0.9,         // 何秒前から印を出すか

    // ---- だんだん難しく ----
    RAMP_DISTANCE: 900,       // この距離（m）で難しさが最大になる
    OBSTACLE_RAMP: 1.5,       // 最大のとき、障害物の出やすさが何倍増えるか（1.5 = 2.5倍）

    // ---- 出現 ----
    SPAWN_GAP_MIN: 0.8,       // 次の出現までの間隔（秒換算・最小）
    SPAWN_GAP_MAX: 1.4,       // 同（最大）
    FIRST_SPAWN_DELAY: 1.2    // スタートから最初の出現まで（秒換算）
  };
})(window);
