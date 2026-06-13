// ============================================================================
// 状態管理 — AppState に一元化
// ============================================================================

const AppState = {
  // --- 永続化される状態（localStorage に保存）---

  /** チェック状態 */
  checkedState: loadFromStorage(STORAGE_KEYS.CHECKED) || {},

  /** 最低限モード */
  minimumMode: (() => {
    const v = loadFromStorage(STORAGE_KEYS.MINIMUM);
    return v === true || v === 'true' || v === 1 || v === '1';
  })(),

  /** タスク表示設定 */
  taskVisibility: loadFromStorage(STORAGE_KEYS.VISIBILITY) || {},

  /** カスタムタスク */
  customTasks: loadFromStorage(STORAGE_KEYS.CUSTOM_TASKS) || {
    daily: [],
    weekly: [],
    season: []
  },

  /** タスクコメント */
  taskComments: loadFromStorage(STORAGE_KEYS.COMMENTS) || {},

  /** 編集されたデフォルトタスク */
  editedDefaultTasks: loadFromStorage(STORAGE_KEYS.EDITED_DEFAULT_TASKS) || {},

  /** 削除されたデフォルトタスクのキーセット */
  deletedDefaultTasks: new Set(loadFromStorage(STORAGE_KEYS.DELETED_DEFAULT_TASKS) || []),

  /** タスクのプロジェクト紐付け */
  taskProjects: loadFromStorage(STORAGE_KEYS.PROJECTS) || {},

  /** タスクのタグ */
  taskTags: loadFromStorage(STORAGE_KEYS.TAGS) || {},

  /** タスクの予想作業時間（分） */
  taskEstimatedTime: loadFromStorage(STORAGE_KEYS.ESTIMATED_TIME) || {},

  /** タスクの担当者 */
  taskAssignees: loadFromStorage(STORAGE_KEYS.ASSIGNEES) || {},

  /** タスクのカンバンステータス */
  taskStatus: loadFromStorage(STORAGE_KEYS.TASK_STATUS) || {},

  /** タスクの開始日 */
  taskStartDates: loadFromStorage(STORAGE_KEYS.START_DATES) || {},

  /** タスクの終了日 */
  taskEndDates: loadFromStorage(STORAGE_KEYS.END_DATES) || {},

  /** カンバンビューモード */
  kanbanViewMode: (() => {
    const v = loadFromStorage(STORAGE_KEYS.KANBAN_VIEW_MODE);
    return v === true || v === 1 || v === '1' || v === 'true';
  })(),

  /** プロジェクトフィルター（選択中のプロジェクトID、nullは全て表示） */
  projectFilter: loadFromStorage(STORAGE_KEYS.PROJECT_FILTER) || null,

  /** タスク表示モード ('simple' | 'detail') */
  displayMode: loadFromStorage(STORAGE_KEYS.DISPLAY_MODE) || 'simple',

  /** 担当者管理モード */
  adminMode: (() => {
    const v = loadFromStorage(STORAGE_KEYS.ADMIN_MODE);
    return v === true || v === 'true' || v === 1 || v === '1';
  })(),

  // --- UI状態（永続化しない）---

  /** 現在編集中のカンバンステータスID */
  editingStatusId: null,

  /** 現在編集中のタスク情報 */
  editingTask: null,

  /** 現在編集中のタグID */
  editingTagId: null,

  /** 現在編集中のプロジェクトID */
  editingProjectId: null,

  /** 現在編集中の担当者ID */
  editingAssigneeId: null,

  /** フォーカストラップのクリーンアップ関数 */
  cleanupFocusTrap: null,
};

// タグ/プロジェクトマスターをストレージから復元
// state.js は他モジュール初期化前に読み込まれる。
// 配列参照を維持するため再代入せず、length=0→push で中身のみ差し替える。
const savedProjectMaster = loadFromStorage(STORAGE_KEYS.PROJECT_MASTER);
if (Array.isArray(savedProjectMaster) && savedProjectMaster.length > 0) {
  PROJECTS.length = 0;
  PROJECTS.push(...savedProjectMaster);
}

const savedTagMaster = loadFromStorage(STORAGE_KEYS.TAG_MASTER);
if (Array.isArray(savedTagMaster) && savedTagMaster.length > 0) {
  TAGS.length = 0;
  TAGS.push(...savedTagMaster);
}

const savedStatusMaster = loadFromStorage(STORAGE_KEYS.STATUS_MASTER);
if (Array.isArray(savedStatusMaster) && savedStatusMaster.length > 0) {
  KANBAN_STATUSES.length = 0;
  KANBAN_STATUSES.push(...savedStatusMaster);
}

const savedAssigneeMaster = loadFromStorage(STORAGE_KEYS.ASSIGNEE_MASTER);
if (Array.isArray(savedAssigneeMaster)) {
  ASSIGNEE_MASTER.length = 0;
  ASSIGNEE_MASTER.push(...savedAssigneeMaster);
}

// ============================================================================
// システムステータス管理
// ============================================================================
