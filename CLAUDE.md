# Focus Ops — CLAUDE.md

## プロジェクト構成

ビルドシステムなし・フレームワークなしのバニラ JS + HTML + CSS。
`<script>` タグで直接ロード。モジュールシステムは存在しない。

| ページ | 役割 |
|--------|------|
| `work_sheet.html` | 作業表（勤怠記録）。メイン機能 |
| `index.html` | ランディング。work_sheet.html への入り口 |

`work_sheet.html` は `css/worksheet.css` のみを読む。`index.html` 用の `css/variables.css` `css/index.css` のクラスや変数は使えない（両者はCSS変数体系が独立している）。

外部への通信は行わない（アクセス解析・CDN・フォント等を含む）。データはブラウザの LocalStorage にのみ保存する。

---

## 日時の扱い

日時はすべて日本時間（JST）で扱う。端末のタイムゾーンに依存させない。

- 現在日時は `jstNow()` を経由する。`new Date()` を直接使わない
- `'YYYY-MM-DD'` の解釈は `parseDate()` を使う。`new Date('2026-08-01')` はUTC解釈になり曜日がずれる
- 曜日は `getWeekday()` / `getWeekdayLabel()` を使う

いずれも `js/workSheets/utils.js` にある。`tests/utils.test.js` が TZ を変えた別プロセスで一致を検証している。

---

## LocalStorage

読み書きは `js/workSheets/storage.js` のヘルパーを経由する。容量超過やプライベートブラウジングで
`setItem` が例外を投げても呼び出し側が止まらないよう、例外はここで捕まえる。

| 用途 | 関数 |
|------|------|
| JSONとして保存する値 | `readJSON()` / `writeJSON()` |
| 素の文字列（モード・日付） | `readString()` / `writeString()` |
| 削除 | `removeStored()` |

キー名は `constants.js` の定数を使い、リテラルを書かない。
勤務データと15分調整差分は社員用/BP用で別キーなので、`dataKey()` / `roundDiffsKey()` を通す。

---

## メッセージの組み立て

トースト・確認ダイアログのメッセージには作業内容やイベント名などのユーザー入力が載る。
`innerHTML` を使うと入力した文字列がHTMLとして解釈されるため、`textContent` を使う。
改行を含む場合は `ui.js` の `setMultilineText()` を使う。

---

## 状態管理: js/workSheets/state.js

`AppState` のような単一オブジェクトへの集約はしていない。モジュールスコープの `let` 変数と setter 関数の組で管理する。

```javascript
// state.js
let data = [];
let currentMode = 'employee'; // 'employee' | 'bp'
function setData(newData) { data = newData; }
function setCurrentMode(mode) { currentMode = mode; }
```

他ファイルから状態を書き換えるときは setter を経由する（`<script>` の分割ロードでスコープが共有されているため直接代入も動くが、setter 経由が既存の作法）。

---

## スクリプトのロード順序

依存関係があるため順序は厳守。

```
theme.js               ← defer なし（flash防止のため同期ロード）
js/workSheets/constants.js
js/workSheets/state.js
js/workSheets/utils.js
js/workSheets/calc.js
js/workSheets/storage.js
js/workSheets/ui.js
js/workSheets/calendar.js
js/workSheets/forms.js
js/workSheets/render.js
js/workSheets/data.js
js/workSheets/events.js
js/workSheets/checkin.js
js/workSheets/json.js
js/workSheets/copy.js
js/workSheets/main.js  ← 最後
```

新ファイルを追加するときは依存するファイルより後ろに置く。

---

## CSS

色はかならず CSS 変数で指定する。ハードコードするとダークモードで崩れる。

```css
/* OK */
background: var(--card);
color: var(--text);

/* NG */
background: #ffffff;
```

---

## README.md の更新ルール

以下のいずれかに該当する変更をしたら **必ず README.md を更新する**。

- 新機能の追加・既存機能の削除
- ファイル構成の変更（新規ファイル追加、ファイル名変更、削除）
- 技術スタックの変更

更新対象のセクション目安:

| 変更内容 | 更新するセクション |
|----------|------------------|
| 機能追加・削除 | 「機能」セクション |
| ファイル追加・削除 | 「ファイル構成」セクション |
| 起動方法・依存関係の変更 | 「ローカル起動」セクション |

---

## 手動テストのチェックリスト

ビルドシステムなしのブラウザアプリのため、動作確認はブラウザ自動操作ツール（claude-in-chrome等）で自走せず、**該当項目をユーザに依頼する**。変更内容に応じて関係する項目だけを挙げて依頼すればよい。

変更後に確認すべき項目は以下。

- 出退勤記録の入力 → リロード → 状態が保持されているか
- チェックイン/チェックアウトの記録
- 出社したまま日付が変わった場合の警告表示と、退勤時刻を入力してその日で登録できるか
- 出社記録の取り消し
- 社員用 / BP用のモード切り替え
- 振替・代休・変則勤務・有休など勤務状態の登録
- 月次サマリー（総勤務時間・残業・休暇取得数）の集計、集計のクリップボードコピー
- 月間カレンダービュー（月移動、日付クリックで編集/入力開始）
- 作業内容の入力補助（履歴サジェスト・前回の内容・文字数カウンタ）
- 削除・全体クリア・コピー後の「元に戻す」
- JSON エクスポート / インポート
- イベント編集（除外日が編集対象月と異なる月でも、編集対象月のカレンダーが開くか）
- イベントの日付未選択（全日程に反映される）
- モーダルのキーボード操作（Escapeで閉じる、Tabがモーダル内で循環する）
- ダークモード切り替え（index.html / work_sheet.html）
- モバイル幅（700px以下）での表示崩れ（タブ5つ・カレンダービュー）
