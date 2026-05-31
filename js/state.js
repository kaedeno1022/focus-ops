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

/** タスクの締め切り */
let taskDeadlines = loadFromStorage(STORAGE_KEYS.DEADLINES) || {};

/** タスクのタグ */
let taskTags = loadFromStorage(STORAGE_KEYS.TAGS) || {};

/** タスクの予想作業時間（分） */
let taskEstimatedTime = loadFromStorage(STORAGE_KEYS.ESTIMATED_TIME) || {};

/** タスクの担当者 */
let taskAssignees = loadFromStorage(STORAGE_KEYS.ASSIGNEES) || {};

/** タスクのカンバンステータス */
let taskStatus = loadFromStorage(STORAGE_KEYS.TASK_STATUS) || {};

/** カンバンビューモード */
let kanbanViewMode = false;

/** タスク表示モード ('simple' | 'detail') */
let displayMode = loadFromStorage(STORAGE_KEYS.DISPLAY_MODE) || 'simple';

/** 管理者モード */
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

/**
 * 総合進捗率を計算
 * @returns {number} 0-100の進捗率
 */
function calculateOverallCompletion() {
  let totalTasks = 0;
  let completedTasks = 0;

  ['daily', 'weekly', 'season'].forEach(type => {
    const categories = getAllTasks(type);
    if (!categories) return;

    categories.forEach(group => {
      if (minimumMode && group.category !== REQUIRED_CATEGORY) {
        return;
      }

      group.tasks.forEach(([title, priority]) => {
        const key = createKey(type, group.category, title);
        
        if (!isTaskVisible(key)) {
          return;
        }

        totalTasks++;
        if (checkedState[key]) {
          completedTasks++;
        }
      });
    });
  });

  return totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
}

/**
 * システムステータスを更新
 */
function updateSystemStatus() {
  // Last Sync時刻を更新
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const lastSyncElement = document.getElementById('lastSyncTime');
  if (lastSyncElement) {
    lastSyncElement.textContent = `Today ${hours}:${minutes}`;
  }

  // 総合進捗率を更新
  const completion = calculateOverallCompletion();
  const completionElement = document.getElementById('overallCompletion');
  if (completionElement) {
    completionElement.textContent = `${completion}%`;
  }
}
