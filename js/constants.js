// ============================================================================
// 定数定義
// ============================================================================

/** LocalStorageのキー */
const STORAGE_KEYS = {
  CHECKED: 'work_tasks_checked',
  MINIMUM: 'work_tasks_minimum',
  VISIBILITY: 'work_tasks_visibility',
  CUSTOM_TASKS: 'work_tasks_custom',
  COMMENTS: 'work_tasks_comments',
  EDITED_DEFAULT_TASKS: 'work_tasks_edited',
  COOKIE_CONSENT: 'work_tasks_cookie_consent',
  PROJECTS: 'work_tasks_projects',
  DEADLINES: 'work_tasks_deadlines',
  TAGS: 'work_tasks_tags',
  ESTIMATED_TIME: 'work_tasks_estimated_time'
};

/** LocalStorageの最大サイズ（5MB程度を目安） */
const MAX_STORAGE_SIZE = 5 * 1024 * 1024;

/** フォーカス可能な要素のセレクタ */
const FOCUSABLE_ELEMENTS = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/** カテゴリーラベル */
const CATEGORY_LABELS = {
  daily: '今日のタスク',
  weekly: '今週のタスク',
  season: '今月のタスク'
};

/** 必須カテゴリー名 */
const REQUIRED_CATEGORY = '優先度：高';

/** タスクデータ構造 */
const DATA = {
  daily: [
    {
      category: '優先度：高',
      tasks: [
        ['メール確認・返信', 'high'],
        ['朝礼・デイリースタンドアップ', 'high'],
        ['進行中タスクの進捗確認', 'high'],
        ['日報作成・提出', 'high'],
        ['Slack・チャット確認', 'high']
      ]
    },
    {
      category: '優先度：中',
      tasks: [
        ['ドキュメント更新', 'mid'],
        ['コードレビュー', 'mid'],
        ['会議議事録作成', 'mid'],
        ['タスク管理ツール更新', 'mid']
      ]
    },
    {
      category: '余裕があれば',
      tasks: [
        ['技術記事・ブログ執筆', 'low'],
        ['学習・自己啓発', 'low'],
        ['環境整備・最適化', 'low']
      ]
    }
  ],

  weekly: [
    {
      category: '優先度：高',
      tasks: [
        ['週次レポート作成', 'high'],
        ['1on1ミーティング', 'high'],
        ['プロジェクト進捗レビュー', 'high'],
        ['週次振り返り', 'high']
      ]
    },
    {
      category: '優先度：中',
      tasks: [
        ['バックログ整理', 'mid'],
        ['技術的負債の確認', 'mid'],
        ['チーム定例会議', 'mid']
      ]
    },
    {
      category: '余裕があれば',
      tasks: [
        ['ナレッジ共有会参加', 'mid'],
        ['他チームとの情報交換', 'mid']
      ]
    }
  ],

  season: [
    {
      category: '優先度：高',
      tasks: [
        ['月次報告書作成', 'high'],
        ['経費精算', 'high'],
        ['目標設定・振り返り', 'high'],
        ['月次KPI確認', 'high']
      ]
    },
    {
      category: '優先度：中',
      tasks: [
        ['プロジェクト予算確認', 'mid'],
        ['四半期計画レビュー', 'mid'],
        ['人事評価関連', 'mid']
      ]
    },
    {
      category: '余裕があれば',
      tasks: [
        ['業務フロー改善提案', 'mid'],
        ['ツール導入検討', 'mid']
      ]
    }
  ]
};

/** プロジェクトマスター */
const PROJECTS = [
  { id: 'proj-none', name: 'プロジェクトなし', color: '#64748b' },
  { id: 'proj-1', name: 'プロジェクトA', color: '#3b82f6' },
  { id: 'proj-2', name: 'プロジェクトB', color: '#8b5cf6' },
  { id: 'proj-3', name: 'プロジェクトC', color: '#ec4899' },
  { id: 'proj-4', name: '運用・保守', color: '#10b981' },
  { id: 'proj-5', name: '自己啓発', color: '#f59e0b' }
];

/** タグマスター */
const TAGS = [
  { id: 'tag-urgent', name: '緊急', color: '#ef4444' },
  { id: 'tag-meeting', name: '会議', color: '#3b82f6' },
  { id: 'tag-dev', name: '開発', color: '#10b981' },
  { id: 'tag-review', name: 'レビュー', color: '#8b5cf6' },
  { id: 'tag-doc', name: 'ドキュメント', color: '#f59e0b' },
  { id: 'tag-report', name: '報告', color: '#06b6d4' },
  { id: 'tag-admin', name: '事務作業', color: '#64748b' }
];
