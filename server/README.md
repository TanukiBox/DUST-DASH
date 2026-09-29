# DUST DASH ランキングのサーバー

みんなの記録を集めて順位を返す、小さなプログラムです。Cloudflare の無料プランで動きます（1日10万回まで無料。寝てしまうこともありません）。

- プログラム：`worker.js`（このファイルを、Cloudflare の画面にまるごと貼りつける）
- 記録の置き場所：Cloudflare の D1（データベース）。表は最初のアクセスのときに自動で作られる
- 集めるもの：端末ごとのランダムな番号・えらんだ名前（ことば＋生きもの）・記録（距離・最高時速・かかった時間）だけ。IP アドレスなどは保存しない

## 最初の1回だけやること（Cloudflare の画面で）

画面の名前は Cloudflare の変更で少し変わることがあります。見つからないときは、画面左上の検索に「D1」「Workers」と入れてください。

### 1. データベースを作る
1. https://dash.cloudflare.com にログイン
2. 左のメニュー「ストレージとデータベース（Storage & Databases）」→「D1 SQL データベース（D1 SQL Database）」
3. 「作成（Create）」→ 名前を **`dust-dash-rank`** にして作成

### 2. Worker（プログラムの置き場所）を作る
1. 左のメニュー「Workers と Pages（Workers & Pages）」→「作成（Create）」
2. 「Worker」→「Hello World から始める（Start with Hello World）」
3. 名前を **`dust-dash-rank`** にして「デプロイ（Deploy）」
4. 「コードを編集（Edit code）」を押す → 左の `worker.js` の中身を**全部消して**、このリポジトリの `server/worker.js` の中身を**全部貼りつける** →「デプロイ（Deploy）」

### 3. Worker とデータベースをつなぐ
1. 作った Worker の画面で「設定（Settings）」→「バインディング（Bindings）」→「追加（Add）」
2. 「D1 データベース（D1 database）」をえらぶ
3. 変数名（Variable name）を **`DB`**（半角大文字）、データベースは `dust-dash-rank` をえらんで保存（Deploy）

### 4. 動いているか確かめる
Worker の画面に出ている URL（`https://dust-dash-rank.○○○.workers.dev`）を開いて、
`{"ok":true,"game":"DUST DASH ranking"}` と出れば完成です。

- URL の「○○○」はアカウントごとの名前です。個人の名前が入っているときは、Workers と Pages の画面の「サブドメイン（Subdomain）」の「変更（Change）」で `tanukibox` などに変えられます（先に変えてから、ゲームに URL を書く）。

### 5. ゲームに URL を書く
`js/game/config.js` の `RANK_API: ''` に、4 の URL を書く（例：`RANK_API: 'https://dust-dash-rank.tanukibox.workers.dev'`）。
→ タイトル画面に「ランキング」のボタンが出て、結果画面に「ランキングに参加」が出るようになります。

## こまったときの操作（D1 の画面の「コンソール（Console）」に打つ）

上位を見る（端末の番号・記録・名前の番号）：
```sql
SELECT device, board, value, sub, n1, n2 FROM scores WHERE board = 'dist' ORDER BY value DESC, sub ASC LIMIT 20;
```
`board` は `dist`（距離）・`endless`（エンドレス）・`speed`（最高時速）。

ズルだと思う記録を消して、その端末からの記録を今後は受け付けない：
```sql
DELETE FROM scores WHERE device = 'ここに端末の番号';
UPDATE devices SET banned = 1 WHERE device = 'ここに端末の番号';
```

全部消してやり直す：
```sql
DELETE FROM scores; DELETE FROM devices;
```

## ズルの防ぎ方（できること・できないこと）
- サーバーで「時間のわりに進みすぎ」「ありえない速さ」「ゴールが速すぎる」記録ははじく（うまい自動プレイの記録はすべて通ることを確認済み）。同じ端末から4秒以内に続けて送ることもできない。
- ブラウザのゲームなので、くわしい人が記録をいじるのを完全には防げない。おかしな記録は上の操作で消す。
