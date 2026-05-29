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
  PROJECT_MASTER: 'work_tasks_project_master',
  DEADLINES: 'work_tasks_deadlines',
  TAGS: 'work_tasks_tags',
  TAG_MASTER: 'work_tasks_tag_master',
  ESTIMATED_TIME: 'work_tasks_estimated_time',
  DELETED_DEFAULT_TASKS: 'work_tasks_deleted_defaults'
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

/** 最低限モードで表示するカテゴリー名 */
const REQUIRED_CATEGORY = '優先度：高';

/** タスクデータ構造 */
const DATA = {
  daily: [
    {
      category: '優先度：高',
      tasks: [
        ['未返信メッセージを整理', 'high'],
        ['今日の確認及び記録を記録', 'high']
      ]
    },
    {
      category: '優先度：中',
      tasks: [
        ['レビュー待ち・確認待ちを整理', 'mid'],
        ['タスク一覧を更新', 'mid']
      ]
    },
    {
      category: '余裕があれば',
      tasks: [
        ['最近のITトレンドの確認', 'low']
      ]
    }
  ],

  weekly: [
    {
      category: '優先度：高',
      tasks: [
        ['今週の進捗を振り返る', 'high'],
        ['来週の優先順位を整理', 'high']
      ]
    },
    {
      category: '優先度：中',
      tasks: [
        ['バックログ・タスク整理', 'mid'],
        ['必要な共有事項をまとめる', 'mid'],
        ['作業ログ・メモを整理', 'mid']
      ]
    },
    {
      category: '余裕があれば',
      tasks: [
        ['作業フロー改善案を考える', 'low']
      ]
    }
  ],

  season: [
    {
      category: '優先度：高',
      tasks: [
        ['重要イベント・期限を確認', 'high'],
        ['不要なタスクや習慣を整理', 'high']
      ]
    },
    {
      category: '優先度：中',
      tasks: [
        ['作業環境・ツールを見直す', 'mid'],
        ['知識・学習内容を整理する', 'mid']
      ]
    },
    {
      category: '余裕があれば',
      tasks: [
        ['ブログ作成', 'low']
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
