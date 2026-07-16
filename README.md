# Focus Ops

作業記録ツール

## 機能

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
├── work_sheet.html         # 作業表ツール
├── css/
│   ├── variables.css       # CSS変数・カラーパレット（ダークモード含む）
│   ├── components.css      # ボタン・カード・進捗バー（index.html用）
│   ├── modals.css          # 設定モーダル・Cookie バナー（index.html用）
│   ├── index.css           # ランディング専用
│   └── worksheet.css       # 作業表専用（独立したCSS変数体系）
└── js/
    ├── theme.js            # ダークモード管理
    ├── cookieConsent.js    # Cookie同意・プライバシーポリシー
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
