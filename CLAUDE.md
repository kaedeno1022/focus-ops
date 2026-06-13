# Focus Ops — CLAUDE.md

## プロジェクト構成

ビルドシステムなし・フレームワークなしのバニラ JS + HTML + CSS。
`<script>` タグで直接ロード。モジュールシステムは存在しない。

| ページ | 役割 |
|--------|------|
| `daily.html` | 業務タスク管理 |
| `work_sheet.html` | 作業表（勤怠記録） |
| `index.html` | ランディング |

`work_sheet.html` は `css/worksheet.css` のみを読む。`daily.html` 用の CSS クラスや変数は使えない。

---

## 状態管理: AppState

すべてのアプリ状態は `js/state.js` の `const AppState` に集約されている。

```javascript
// 正しい
AppState.checkedState[key] = true;
AppState.minimumMode = !AppState.minimumMode;

// NG（変数として存在しない）
checkedState[key] = true;
```

状態変更後は必ず `saveState()` → `renderAll()` を呼ぶ。

### AppState に含まれない定数配列

`PROJECTS`, `TAGS`, `ASSIGNEE_MASTER`, `KANBAN_STATUSES` は `constants.js` で定義。
再代入不可。中身の差し替えは `.length = 0` → `.push()` で行う。

---

## スクリプトのロード順序

依存関係があるため順序は厳守。

```
theme.js        ← defer なし（flash防止のため同期ロード）
constants.js    ← STORAGE_KEYS, DATA, マスター配列
storage.js      ← loadFromStorage()
state.js        ← AppState（constants/storage に依存）
utils.js
taskMetadata.js
taskRenderer.js
menuHandlers.js
settings.js
eventHandlers.js
main.js         ← 最後
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

## 変数名のリネームをするとき

`sed` や `replace_all` は以下2パターンで壊れるので手動確認が必要。

```javascript
// 1. オブジェクトリテラルのキー名（ドット付き変数名はキーにできない）
return { checkedState: { ...AppState.checkedState } };
//        ↑ キー名はそのまま。AppState.checkedState: にしてはいけない。

// 2. ローカル変数のプロパティアクセス
AppState.checkedState = { ...snapshot.checkedState };
//                                    ↑ snapshot は AppState ではない。
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

変更後は以下を確認する。

- タスクのチェック → リロード → 状態が保持されているか
- リセット → 元に戻す（アンドゥ）
- 共有リンクの生成・取り込み
- ダークモード切り替え（3ページ）
- カンバンビュー切り替え（詳細モード時のみ有効）
- モバイル幅（700px以下）のハンバーガーメニュー
