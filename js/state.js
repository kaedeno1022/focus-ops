// ============================================================================
// 状態管理
// ============================================================================

/** チェック状態 */
let checkedState = loadFromStorage(STORAGE_KEYS.CHECKED) || {};

/** 最低限モード */
let minimumMode = loadFromStorage(STORAGE_KEYS.MINIMUM) || false;

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

/** 現在編集中のタスク情報 */
let editingTask = null;

/** フォーカストラップのクリーンアップ関数 */
let cleanupFocusTrap = null;
