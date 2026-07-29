# Focus Ops — CLAUDE.md

## プロジェクト構成

ビルドシステムなし・フレームワークなしのバニラ JS + HTML + CSS。
`<script>` タグで直接ロード。モジュールシステムは存在しない。

| ページ | 役割 |
|--------|------|
| `work_sheet.html` | 作業表（勤怠記録）。メイン機能 |
| `index.html` | ランディング。work_sheet.html への入り口 |

`work_sheet.html` は `css/worksheet.css` のみを読む。`index.html` 用の `css/components.css` `css/modals.css` 等のクラスや変数は使えない。

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
- 社員用 / BP用のモード切り替え
- 振替・代休・変則勤務・有休など勤務状態の登録
- 月次サマリー（総勤務時間・残業・休暇取得数）の集計
- JSON エクスポート / インポート
- イベント編集（除外日が編集対象月と異なる月でも、編集対象月のカレンダーが開くか）
- ダークモード切り替え（index.html / work_sheet.html）
- モバイル幅（700px以下）での表示崩れ
