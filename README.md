# Focus Ops

業務タスク管理と作業記録の統合ツール

## 機能

### 業務タスク管理（daily.html）

- 今日/今週/長期のタスクをチェックリストで管理
- リアルタイム進捗バー（カテゴリ別の完了率）
- シンプルモード（チェックボックス）/ 詳細モード（カンバン風ステータス管理）
- カンバンビュー（ステータスレーン別に並べて表示）
- 最低限モード（高優先度タスクのみ表示）
- 担当者管理モード（担当者の入力・表示を有効化）
- プロジェクト・タグ・締め切り・予想作業時間・担当者をタスクに付与
- カスタムタスクの追加・編集・削除（デフォルトタスクの編集も可）
- プロジェクトフィルター（選択プロジェクトのタスクのみ表示）
- カテゴリ別・全リセット（元に戻す対応）
- 共有リンク（gzip 圧縮 URL で状態を共有・取り込み）
- ダークモード対応

### 作業表ツール（work_sheet.html）

- 社員用 / BP用 のモード切り替え
- 出退勤時刻・作業内容を日別に記録
- チェックイン/チェックアウトでワンクリック記録
- 振替・代休・変則勤務・有休などの勤務状態に対応
- イベント登録（繰り返し予定の自動反映）
- 月次サマリー（総勤務時間・残業・休暇取得数）
- JSON エクスポート / インポート
- クリップボードへの書式付きコピー
- ダークモード対応

### 共通

- レスポンシブ対応（PC / タブレット / モバイル）
- Cookie 同意バナー・プライバシーポリシー（GA4 計測対応）

---

## 技術スタック

- HTML5 / CSS3 / JavaScript (ES6+)
- フレームワーク・ビルドツールなし（バニラ JS）
- データ保存: LocalStorage のみ（サーバーなし）

---

## ファイル構成

```
focus-ops/
├── index.html              # ランディングページ
├── daily.html              # 業務タスク管理
├── work_sheet.html         # 作業表ツール
├── css/
│   ├── variables.css       # CSS変数・カラーパレット（ダークモード含む）
│   ├── base.css            # リセット・アクセシビリティ
│   ├── layout.css          # ヘッダー・トップバー・レイアウト
│   ├── components.css      # ボタン・カード・進捗バー
│   ├── tasks.css           # タスク要素・カテゴリー
│   ├── modals.css          # 設定モーダル・Cookie バナー
│   ├── responsive.css      # レスポンシブ
│   ├── index.css           # ランディング専用
│   └── worksheet.css       # 作業表専用（独立したCSS変数体系）
└── js/
    ├── theme.js            # ダークモード管理
    ├── constants.js        # 定数・タスクデータ・マスターデータ
    ├── storage.js          # LocalStorage・共有リンク生成
    ├── state.js            # AppState（アプリ全状態を一元管理）
    ├── utils.js            # ユーティリティ関数
    ├── taskMetadata.js     # プロジェクト・タグ・担当者・ステータス管理
    ├── taskRenderer.js     # タスク要素の生成・レンダリング
    ├── menuHandlers.js     # メニュー・リセット・モード切り替え
    ├── settings.js         # 設定モーダル・タスク編集フォーム
    ├── cookieConsent.js    # Cookie同意・プライバシーポリシー
    ├── eventHandlers.js    # イベントリスナー設定
    ├── main.js             # 初期化
    └── workSheets/         # 作業表ツール専用モジュール
        ├── main.js
        ├── state.js
        ├── constants.js
        ├── storage.js
        ├── data.js
        ├── render.js
        ├── forms.js
        ├── events.js
        ├── checkin.js
        ├── calendar.js
        ├── clipboard.js
        ├── copy.js
        ├── json.js
        ├── ui.js
        └── utils.js
```

---

## ローカル起動

```bash
# Python 3
python -m http.server 8000

# Node.js
npx http-server
```

`http://localhost:8000` をブラウザで開く。

### WSL 環境での設定

```bash
git config core.filemode false
```

---

## ブラウザ対応

Chrome / Edge / Firefox / Safari（各最新版）、モバイルブラウザ対応。
