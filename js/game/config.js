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

    // ---- 速度（km/h）とスタミナ ----
    // ウインドランナー式：スタミナは時間とともに減り続け、減り方はだんだん速くなる → 上手でもいつかは終わる
    UNITS_PER_KMH: 10,        // 1 km/h で1秒に進む長さ
    BASE_SPEED_START: 50,     // スタートの速さ
    BASE_SPEED_MAX: 115,      // 土台の速さは距離とともにここへ近づく
    BASE_SPEED_DIST: 1200,    // 土台の速さの上がり方（m。この距離で約6割まで上がる）
    BOOST_TAU: 2.6,           // 食べて上がった速さが元に戻るまでの目安（秒）
    SPEED_FOLLOW: 2.2,        // ぶつかって落ちた速さが戻る早さ
    STAMINA_MAX: 100,
    STAMINA_DRAIN: 1.8,       // スタミナが毎秒減る量（はじめ）
    STAMINA_DRAIN_GROW: 0.012,// 1秒ごとに減る量がこれだけ増える（60秒で約1.4倍、120秒で約1.8倍、240秒で約2.6倍）
    FATIGUE_AT: 25,           // スタミナがこれ以下になると足が遅くなりはじめる
    FATIGUE_MIN: 0.5,         // スタミナが0に近いときの速さの割合
    EXHAUST_DECEL: 45,        // バテてから止まるまでの減速（km/h／秒）
    COMBO_STAMINA_MAX: 1.6,   // コンボでスタミナ回復が増える上限（倍）
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
      // gain = 加速（km/h）、stamina = スタミナ回復
      bug:    { gain: 5,  stamina: 5, w: 34, h: 26 },                              // 虫：少し
      lizard: { gain: 10, stamina: 8, w: 60, h: 22, vx: 70 },                        // トカゲ：中くらい（自分も右へ走る）
      snake:  { gain: 20, stamina: 15, w: 66, h: 44, hitLoss: 14, hitStamina: 8 }    // ヘビ：大きく／横から当たると減る
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
    OBSTACLE_LOSS: 15,        // サボテン・岩に当たったときの減速（km/h。すぐ戻る）
    OBSTACLE_STAMINA: 8,      // 同、スタミナが減る量
    HOLE_LOSS: 25,            // 穴に落ちたときの減速（km/h）
    HOLE_STAMINA: 14,         // 同、スタミナが減る量
    HOLE_WIDTH: 0.3,          // 穴の幅（秒換算。速いほど広くなる）
    WIDE_HOLE_WIDTH: 0.85,    // 大穴の幅（1回のジャンプでは届かない）
    HOLE_RECOVER_V: 1250,     // 穴から飛び出す勢い

    // ---- タカ ----
    // 影は「速さが土台より落ちたとき」と「スタミナが少ないとき」に大きく迫る
    HAWK_CRY_AT: 0.72,        // 影がここまで近づいたら鳴き声
    HAWK_DIVE_TIME: 0.6,      // 急降下にかかる時間（秒）
    HAWK_CARRY_TIME: 1.1,     // つかんで飛び去る時間（秒）→ その後に結果画面

    // ---- 背景 ----
    DAY_CYCLE_M: 1000,        // 夜明け→昼→夕焼け→星空 の1周の距離（m）
    DAY_START: 0.06,          // スタート地点の時間帯（0=夜明け、0.14〜0.46=昼、0.6=夕焼け、0.72〜0.9=夜）
    PARALLAX_FAR: 0.08,       // 遠くの台地が流れる速さ（地面を1として）
    PARALLAX_MID: 0.25,       // 砂丘
    PARALLAX_NEAR: 0.55,      // 手前の草木

    // ---- 速いときの見やすさ ----
    PREY_ZOOM_COMP: 0.85,     // 引きの画になった分、獲物・障害物を大きく描く割合
    GLOW_FROM: 60,            // この速さから獲物のまわりが光る
    GLOW_FULL: 120,
    MARKER_FROM: 60,          // この速さから、画面右はしに「もうすぐ来る」印を出す
    MARKER_TIME: 0.9,         // 何秒前から印を出すか

    // ---- 距離でだんだん難しく ----
    // 難しさ d は 0 から始まり、距離が伸びるほど 1 に近づく（DIFF_DISTANCE m で約0.63、2倍で約0.86）
    DIFF_DISTANCE: 600,
    DIFF_OBSTACLE: 3.0,       // d=1 のとき障害物の出やすさが何倍増えるか（3.0 = 4倍）
    DIFF_GAP: 0.3,            // d=1 のとき出現の間隔が何割つまるか
    DIFF_TWO_IN_ROW: 0.6,     // d=1 のとき障害物が2つ続けて来る確率
    // この距離（m）を越えると出てくるもの
    UNLOCK: {
      snake: 30, cactus: 40, rock: 40, hole: 80, holeBug: 80, cactusBug: 100,
      giantCactus: 150, vulture: 200, wideHole: 350, vulture2: 500,
      rockRock: 600, holeRock: 800
    },
    MILESTONE: 250,           // この距離ごとに「○m 突破！」を出す

    // ---- 出現 ----
    SPAWN_GAP_MIN: 0.8,       // 次の出現までの間隔（秒換算・最小）
    SPAWN_GAP_MAX: 1.4,       // 同（最大）
    FIRST_SPAWN_DELAY: 1.2    // スタートから最初の出現まで（秒換算）
  };
})(window);
