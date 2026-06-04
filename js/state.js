// ============================================================================
// 状態管理
// ============================================================================

/** チェック状態 */
let checkedState = loadFromStorage(STORAGE_KEYS.CHECKED) || {};

/** 最低限モード */
const minimumModeRaw = loadFromStorage(STORAGE_KEYS.MINIMUM);
let minimumMode = minimumModeRaw === true || minimumModeRaw === 'true' || minimumModeRaw === 1 || minimumModeRaw === '1';

/** タスク表示設定 */
let taskVisibility = loadFromStorage(STORAGE_KEYS.VISIBILITY) || {};

/** カスタムタスク */
let customTasks = loadFromStorage(STORAGE_KEYS.CUSTOM_TASKS) || {
  daily: [],
  weekly: [],
  season: []
};

/** タスクコメント */
let taskComments = loadFromStorage(STORAGE_KEYS.COMMENTS) || {};

/** 編集されたデフォルトタスク */
let editedDefaultTasks = loadFromStorage(STORAGE_KEYS.EDITED_DEFAULT_TASKS) || {};

/** 削除されたデフォルトタスクのキーセット */
let deletedDefaultTasks = new Set(loadFromStorage(STORAGE_KEYS.DELETED_DEFAULT_TASKS) || []);

/** タスクのプロジェクト紐付け */
let taskProjects = loadFromStorage(STORAGE_KEYS.PROJECTS) || {};

/** タスクのタグ */
let taskTags = loadFromStorage(STORAGE_KEYS.TAGS) || {};

/** タスクの予想作業時間（分） */
let taskEstimatedTime = loadFromStorage(STORAGE_KEYS.ESTIMATED_TIME) || {};

/** タスクの担当者 */
let taskAssignees = loadFromStorage(STORAGE_KEYS.ASSIGNEES) || {};

/** タスクのカンバンステータス */
let taskStatus = loadFromStorage(STORAGE_KEYS.TASK_STATUS) || {};

/** タスクの開始日 */
let taskStartDates = loadFromStorage(STORAGE_KEYS.START_DATES) || {};

/** タスクの終了日 */
let taskEndDates = loadFromStorage(STORAGE_KEYS.END_DATES) || {};

/** カンバンビューモード */
let kanbanViewMode = false;

/** プロジェクトフィルター（選択中のプロジェクトID、nullは全て表示） */
let projectFilter = loadFromStorage(STORAGE_KEYS.PROJECT_FILTER) || null;

/** タスク表示モード ('simple' | 'detail') */
let displayMode = loadFromStorage(STORAGE_KEYS.DISPLAY_MODE) || 'simple';

/** 担当者管理モード */
const adminModeRaw = loadFromStorage(STORAGE_KEYS.ADMIN_MODE);
let adminMode = adminModeRaw === true || adminModeRaw === 'true' || adminModeRaw === 1 || adminModeRaw === '1';

/** 現在編集中のカンバンステータスID */
let editingStatusId = null;

/** 現在編集中のタスク情報 */
let editingTask = null;

/** 現在編集中のタグID */
let editingTagId = null;

/** 現在編集中のプロジェクトID */
let editingProjectId = null;

/** 現在編集中の担当者ID */
let editingAssigneeId = null;

/** フォーカストラップのクリーンアップ関数 */
let cleanupFocusTrap = null;

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

