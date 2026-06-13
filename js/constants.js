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
  TAGS: 'work_tasks_tags',
  TAG_MASTER: 'work_tasks_tag_master',
  ASSIGNEE_MASTER: 'work_tasks_assignee_master',
  ESTIMATED_TIME: 'work_tasks_estimated_time',
  ASSIGNEES: 'work_tasks_assignees',
  DELETED_DEFAULT_TASKS: 'work_tasks_deleted_defaults',
  TASK_STATUS: 'work_tasks_kanban_status',
  STATUS_MASTER: 'work_tasks_status_master',
  DISPLAY_MODE: 'work_tasks_display_mode',
  ADMIN_MODE: 'work_tasks_admin_mode',
  SHARE_REVISION: 'work_tasks_share_revision',
  SHARE_SAVED_AT: 'work_tasks_share_saved_at',
  PRE_IMPORT_BACKUP: 'work_tasks_pre_import_backup',
  START_DATES: 'work_tasks_start_dates',
  END_DATES: 'work_tasks_end_dates',
  PROJECT_FILTER: 'work_tasks_project_filter',
  KANBAN_VIEW_MODE: 'work_tasks_kanban_view_mode'
};

/** 完了ステータスのID（変更不可の固定値） */
const DONE_STATUS_ID = 'status-done';

/** デフォルトカンバンステータス */
const DEFAULT_KANBAN_STATUSES = [
  { id: 'status-todo',   name: '未着手',    color: '#6b7280', order: 0 },
  { id: 'status-doing',  name: '進行中',    color: '#3b82f6', order: 1 },
  { id: 'status-review', name: 'レビュー中', color: '#f59e0b', order: 2 },
  { id: 'status-done',   name: '完了',      color: '#10b981', order: 3 },
];

/** カンバンステータスマスター（カスタマイズ可能） */
const KANBAN_STATUSES = [...DEFAULT_KANBAN_STATUSES];

/** LocalStorageの最大サイズ（5MB程度を目安） */
const MAX_STORAGE_SIZE = 5 * 1024 * 1024;

/** フォーカス可能な要素のセレクタ */
const FOCUSABLE_ELEMENTS = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/** カテゴリーラベル */
const CATEGORY_LABELS = {
  daily: '今日のタスク',
  weekly: '今週のタスク',
  season: '長期のタスク'
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
        ['今日の確認事項を記録', 'high']
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

/** デフォルトのプロジェクトマスター */
const DEFAULT_PROJECTS = [];

/** デフォルトのタグマスター */
const DEFAULT_TAGS = [
  { id: 'tag-urgent', name: '緊急', color: '#ef4444' },
  { id: 'tag-meeting', name: '会議', color: '#3b82f6' },
  { id: 'tag-dev', name: '開発', color: '#10b981' },
  { id: 'tag-review', name: 'レビュー', color: '#8b5cf6' },
  { id: 'tag-doc', name: 'ドキュメント', color: '#f59e0b' },
  { id: 'tag-report', name: '報告', color: '#06b6d4' },
  { id: 'tag-admin', name: '事務作業', color: '#64748b' }
];

/** デフォルトの担当者マスター */
const DEFAULT_ASSIGNEE_MASTER = [];

/** プロジェクトマスター */
const PROJECTS = DEFAULT_PROJECTS.map(project => ({ ...project }));

/** タグマスター */
const TAGS = DEFAULT_TAGS.map(tag => ({ ...tag }));

/** 担当者マスター */
const ASSIGNEE_MASTER = DEFAULT_ASSIGNEE_MASTER.map(assignee => ({ ...assignee }));
