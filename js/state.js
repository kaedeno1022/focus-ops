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

/** 現在編集中のタスク情報 */
let editingTask = null;

/** 現在編集中のタグID */
let editingTagId = null;

/** 現在編集中のプロジェクトID */
let editingProjectId = null;

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
