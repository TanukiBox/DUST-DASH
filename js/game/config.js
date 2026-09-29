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
    STAMINA_DRAIN: 1.7,       // スタミナが毎秒減る量（はじめ）
    STAMINA_DRAIN_GROW: 0.02, // 1秒ごとに減る量がこれだけ増える（60秒で1.6倍、120秒で2.1倍、180秒で2.7倍）
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
      snake:  { gain: 20, stamina: 15, w: 66, h: 44, hitLoss: 14, hitStamina: 12 }    // ヘビ：大きく／横から当たると減る
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

    // ---- コイン（段階2：J）----
    COIN_GAP_X: 46,           // 道すじに並べるコインの間隔（ゲーム内の長さ。いつも同じ間隔）
    COIN_RADIUS: 40,          // コインを拾える近さ
    COIN_MULT: [[0, 1], [80, 2], [120, 3], [160, 4]], // この速さ（km/h）以上で1枚の価値が何倍か
    COIN_ROW_CHANCE: 0.45,    // 跳ぶ前の助走や、並びのすきまに地面のコインを置く確率
    DIST_COIN_PER: 10,        // この距離（m）ごとにコイン1枚のボーナス
    // 宝石：コイン何枚分か（速さの倍率・フィーバーの2倍もかかる）
    GEMS: { sapphire: 10, emerald: 20, ruby: 40 },

    // ---- フィーバー ----
    FEVER_MAX: 100,
    FEVER_TIME: 5,            // フィーバーの長さ（秒）
    FEVER_BOOST: 45,          // フィーバー中に上乗せされる速さ（km/h）
    FEVER_MAGNET: 300,        // フィーバー中にコインを吸い寄せる範囲
    FEVER_GAIN: { bug: 4, lizard: 7, snake: 11, coin: 0.12 }, // ゲージのたまる量

    // ---- ごほうび・ボーナス ----
    COMBO_BONUS: 2,           // コンボ3以上で、1回踏むごとに コンボ数×これ のコイン
    PERFECT_BONUS: 10,        // 並びを全部食べたとき、1匹につき これ のコイン
    WHIRL_V: 1750,            // つむじ風で飛ばされる勢い
    PREY_WITH_OBSTACLE: 1.6,  // 障害物を越えた後に獲物を置く確率の倍率（エサの多さ。0で置かない）
    PREY_GROW: 1.5,           // 先へ進むほど、獲物だけの並びも出やすくする（障害物が増える分、エサも減らないように）
    TUMBLE_VX: 170,           // 回転草がこちらへ転がってくる速さ
    CACTUS_WALL_H: 360,       // サボテンの壁の高さ（2段ジャンプの最高点より高い）
    CACTUS_WALL_W: 150,
    FALL_ROCK_LEAD: 1.3,      // 落石が落ちはじめる時間（主人公が着く何秒前か）
    CEILING_CLEAR: 118,       // 岩のひさしの下のすきま（走っていればくぐれる高さ）
    // ステージの特色：並びの出やすさの倍率
    STAGE_BIAS: {
    // 名物（tumble・whirlWall など stageOnly の並び）は、ここに書いたステージにしか出ない。数字は出やすさ
      desert:   { bugSwarm: 7, chain: 1.6, bugGround: 1.4, bugAir: 1.4, overhang: 0 },
      canyon:   { chasm: 9, overhang: 2.5, islands: 1.5, stepUp: 1.3 },
      salt:     { crackRun: 9, hole: 1.6, holeBug: 1.6, stepUp: 0.3, stepDown: 0.3, islands: 0.3, overhang: 0 },
      cactus:   { whirlWall: 6, cactusRow: 6, cactus: 2.2, cactusBug: 2, giantCactus: 2, overhang: 0, hole: 0.5 },
      sunset:   { staircase: 12, stepUp: 1.2, stepDown: 3, islands: 1.2 },
      storm:    { tumbleHerd: 6, tumble: 5, rock: 1.2, rockRock: 1.2, cactus: 0.3, giantCactus: 0.5 },
      night:    { fireflyTrail: 9, bugAir: 2, chain: 1.6, vulture: 1.2 },
      moonrock: { fallRocks: 9, overhang: 2.2, islands: 1.5, rock: 0.4 },
      predawn:  { vultureFlock: 9, vulture: 2, vulture2: 2, wideHole: 1.3 },
      oasis:    { whirlWall: 2.5, tumbleHerd: 2, fallRocks: 2.5, crackRun: 2, chasm: 2, vultureFlock: 2, tumble: 1.5, chain: 1.3 }
    },

    // ---- 地形（高い足場）----
    STEP_UP: 14,              // これより低い段差は、そのまま乗り越える
    LEDGE_GRAB: 34,           // 足が上のふちよりこれだけ下でも、上に乗れる（引っかからないように）
    FLOOR_MIN: -230,          // 足場のいちばん高い所
    WALL_LOSS: 12,            // 足場の壁にぶつかったときの減速（km/h）
    WALL_STAMINA: 8,          // 同、スタミナが減る量

    // ---- 障害物 ----
    OBSTACLE: {
      cactusTall:  { w: 40, h: 72 },
      cactusRound: { w: 44, h: 42 },
      rockBig:     { w: 62, h: 40 },
      rockSmall:   { w: 46, h: 28 },
      giantCactus: { w: 56, h: 205 },            // 2段ジャンプでよける
      vulture:     { w: 72, h: 78, lift: 90, vx: 120 } // lift = 地面から体の下までの高さ（走っていればくぐれる）
    },
    OBSTACLE_LOSS: 20,        // サボテン・岩に当たったときの減速（km/h。すぐ戻る）
    OBSTACLE_STAMINA: 15,     // 同、スタミナが減る量
    // 穴に落ちたらその場でゲームオーバー（フィーバー中だけは穴の上も走れる）
    HOLE_WIDTH: 0.3,          // 穴の幅（秒換算。速いほど広くなる）
    WIDE_HOLE_WIDTH: 0.85,    // 大穴の幅（1回のジャンプでは届かない）

    // ---- タカ ----
    // 影は「速さが土台より落ちたとき」と「スタミナが少ないとき」に大きく迫る
    HAWK_CRY_AT: 0.72,        // 影がここまで近づいたら鳴き声
    HAWK_DIVE_TIME: 0.6,      // 急降下にかかる時間（秒）
    HAWK_CARRY_TIME: 1.1,     // つかんで飛び去る時間（秒）→ その後に結果画面

    // ---- 背景 ----
    STAGE_M: 700,             // 1ステージの長さ（m）。全10ステージ（background.js の DD.STAGES）
    GOAL_M: 7000,             // ゴール（10ステージ目の終わり）。ここまで逃げきるとエンディング。クリアするとエンドレスモード
    STAGE_BLEND_M: 70,        // ステージの終わりの、この距離で次の景色へ切り替わる
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
      rockRock: 600, holeRock: 800,
      stepUp: 60, stepDown: 60, islands: 150, overhang: 250, whirl: 120, tumble: 0
    },
    MILESTONE: 250,           // この距離ごとに「○m 突破！」を出す
    // ---- シェア ----
    SHARE_URL: 'https://tanukibox.github.io/DUST-DASH/', // ゲームを公開している URL（GitHub Pages）。シェアの文章に入る
    SITE_URL: 'https://tanukibox.github.io/',            // Tanuki Box のトップページ（タイトルの「Tanuki Box」から開く）
    RANK_API: '',             // ランキングのサーバー（Cloudflare Workers の URL）。空ならランキングは出さない（server/README.md）

    // ---- 出現 ----
    SPAWN_GAP_MIN: 0.8,       // 次の出現までの間隔（秒換算・最小）
    SPAWN_GAP_MAX: 1.4,       // 同（最大）
    FIRST_SPAWN_DELAY: 1.2    // スタートから最初の出現まで（秒換算）
  };
})(window);
