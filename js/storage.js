// ============================================================================
// LocalStorage操作
// ============================================================================

/**
 * LocalStorageからデータを読み込む
 * @param {string} key - ストレージキー
 * @returns {any} パース済みのデータ
 */
function loadFromStorage(key) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error(`Failed to load ${key} from localStorage:`, error);
    return null;
  }
}

/**
 * 状態をLocalStorageに保存（サイズ制限チェック付き）
 */
function saveState() {
  try {
    const checkedData = JSON.stringify(checkedState);
    const minimumData = JSON.stringify(minimumMode);
    const visibilityData = JSON.stringify(taskVisibility);
    const customData = JSON.stringify(customTasks);
    
    // データサイズチェック
    const totalSize = new Blob([checkedData, minimumData, visibilityData, customData]).size;
    if (totalSize > MAX_STORAGE_SIZE) {
      console.warn('Storage size limit approaching. Consider data cleanup.');
      announceToScreenReader('データ容量が上限に近づいています');
    }
    
    const commentsData = JSON.stringify(taskComments);
    const editedDefaultData = JSON.stringify(editedDefaultTasks);
    const deletedDefaultData = JSON.stringify([...deletedDefaultTasks]);
    const projectsData = JSON.stringify(taskProjects);
    const deadlinesData = JSON.stringify(taskDeadlines);
    const tagsData = JSON.stringify(taskTags);
    const estimatedTimeData = JSON.stringify(taskEstimatedTime);
    const projectMasterData = JSON.stringify(PROJECTS);
    const tagMasterData = JSON.stringify(TAGS);
    const taskStatusData = JSON.stringify(taskStatus);
    const statusMasterData = JSON.stringify(KANBAN_STATUSES);
    
    localStorage.setItem(STORAGE_KEYS.CHECKED, checkedData);
    localStorage.setItem(STORAGE_KEYS.MINIMUM, minimumData);
    localStorage.setItem(STORAGE_KEYS.VISIBILITY, visibilityData);
    localStorage.setItem(STORAGE_KEYS.CUSTOM_TASKS, customData);
    localStorage.setItem(STORAGE_KEYS.COMMENTS, commentsData);
    localStorage.setItem(STORAGE_KEYS.EDITED_DEFAULT_TASKS, editedDefaultData);
    localStorage.setItem(STORAGE_KEYS.DELETED_DEFAULT_TASKS, deletedDefaultData);
    localStorage.setItem(STORAGE_KEYS.PROJECTS, projectsData);
    localStorage.setItem(STORAGE_KEYS.DEADLINES, deadlinesData);
    localStorage.setItem(STORAGE_KEYS.TAGS, tagsData);
    localStorage.setItem(STORAGE_KEYS.ESTIMATED_TIME, estimatedTimeData);
    localStorage.setItem(STORAGE_KEYS.PROJECT_MASTER, projectMasterData);
    localStorage.setItem(STORAGE_KEYS.TAG_MASTER, tagMasterData);
    localStorage.setItem(STORAGE_KEYS.TASK_STATUS, taskStatusData);
    localStorage.setItem(STORAGE_KEYS.STATUS_MASTER, statusMasterData);
    localStorage.setItem(STORAGE_KEYS.DISPLAY_MODE, JSON.stringify(displayMode));
  } catch (error) {
    console.error('Failed to save state to localStorage:', error);
    
    if (error.name === 'QuotaExceededError') {
      announceToScreenReader('保存容量が不足しています。一部のデータをリセットしてください。');
      alert('保存容量が不足しています。「全リセット」を実行してデータをクリアしてください。');
    }
  }
}

/**
 * Base64URL形式でエンコード
 * @param {string} value - エンコード対象文字列
 * @returns {string}
 */
function toBase64Url(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

/**
 * Base64URL形式をデコード
 * @param {string} value - デコード対象文字列
 * @returns {string}
 */
function fromBase64Url(value) {
  const padded = value
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/**
 * 現在の状態を共有用オブジェクトへ変換
 * @returns {object}
 */
function buildSharePayload() {
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    state: {
      checkedState,
      minimumMode,
      taskVisibility,
      customTasks,
      taskComments,
      editedDefaultTasks,
      deletedDefaultTasks: [...deletedDefaultTasks],
      taskProjects,
      taskDeadlines,
      taskTags,
      taskEstimatedTime,
      projectMaster: PROJECTS,
      tagMaster: TAGS,
      taskStatus,
      statusMaster: KANBAN_STATUSES,
      displayMode
    }
  };
}

/**
 * 共有状態をアプリ状態へ反映
 * @param {object} state - 共有状態
 */
function applySharedState(state) {
  checkedState = state.checkedState && typeof state.checkedState === 'object' ? state.checkedState : {};
  minimumMode = Boolean(state.minimumMode);
  taskVisibility = state.taskVisibility && typeof state.taskVisibility === 'object' ? state.taskVisibility : {};
  customTasks = state.customTasks && typeof state.customTasks === 'object'
    ? state.customTasks
    : { daily: [], weekly: [], season: [] };
  taskComments = state.taskComments && typeof state.taskComments === 'object' ? state.taskComments : {};
  editedDefaultTasks = state.editedDefaultTasks && typeof state.editedDefaultTasks === 'object' ? state.editedDefaultTasks : {};
  deletedDefaultTasks = new Set(Array.isArray(state.deletedDefaultTasks) ? state.deletedDefaultTasks : []);
  taskProjects = state.taskProjects && typeof state.taskProjects === 'object' ? state.taskProjects : {};
  taskDeadlines = state.taskDeadlines && typeof state.taskDeadlines === 'object' ? state.taskDeadlines : {};
  taskTags = state.taskTags && typeof state.taskTags === 'object' ? state.taskTags : {};
  taskEstimatedTime = state.taskEstimatedTime && typeof state.taskEstimatedTime === 'object' ? state.taskEstimatedTime : {};
  taskStatus = state.taskStatus && typeof state.taskStatus === 'object' ? state.taskStatus : {};
  displayMode = state.displayMode === 'detail' ? 'detail' : 'simple';

  if (Array.isArray(state.projectMaster) && state.projectMaster.length > 0) {
    PROJECTS.length = 0;
    PROJECTS.push(...state.projectMaster);
  }

  if (Array.isArray(state.tagMaster) && state.tagMaster.length > 0) {
    TAGS.length = 0;
    TAGS.push(...state.tagMaster);
  }

  if (Array.isArray(state.statusMaster) && state.statusMaster.length > 0) {
    KANBAN_STATUSES.length = 0;
    KANBAN_STATUSES.push(...state.statusMaster);
  }
}

/**
 * 共有リンクを生成
 * @returns {string}
 */
function buildShareUrl() {
  const payloadJson = JSON.stringify(buildSharePayload());
  const encoded = toBase64Url(payloadJson);
  const url = new URL(window.location.href);

  url.searchParams.set('share', encoded);
  url.hash = '';

  return url.toString();
}

/**
 * 共有URLパラメータをURLから除去
 */
function clearShareParamFromUrl() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has('share')) return;
  url.searchParams.delete('share');
  history.replaceState({}, '', url.toString());
}

/**
 * クリップボードへコピー（フォールバック付き）
 * @param {string} text - コピーする文字列
 * @returns {Promise<boolean>}
 */
async function copyTextToClipboard(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (error) {
    console.warn('Clipboard API failed:', error);
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'readonly');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();

  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch (error) {
    copied = false;
  } finally {
    textarea.remove();
  }

  return copied;
}

/**
 * 共有リンクを生成してコピー
 */
async function handleShareTasks() {
  try {
    const shareUrl = buildShareUrl();
    const copied = await copyTextToClipboard(shareUrl);

    if (copied) {
      showToast('共有リンクをコピーしました', 'success');
    } else {
      window.prompt('共有リンクをコピーしてください', shareUrl);
    }

    if (shareUrl.length > 4000) {
      showToast('共有リンクが長めです。共有先でURL省略に注意してください。', 'info', 5000);
    }
  } catch (error) {
    console.error('Failed to build share link:', error);
    showToast('共有リンクの作成に失敗しました', 'error');
  }
}

/**
 * URLの共有データを取り込む（必要時のみ）
 */
function importStateFromShareUrl() {
  const url = new URL(window.location.href);
  const encoded = url.searchParams.get('share');
  if (!encoded) return;

  try {
    const decoded = fromBase64Url(encoded);
    const payload = JSON.parse(decoded);

    if (!payload || payload.version !== 1 || !payload.state) {
      throw new Error('Invalid payload format');
    }

    const shouldImport = window.confirm('共有されたタスクデータを取り込みますか？\n現在の端末データは上書きされます。');
    if (!shouldImport) {
      clearShareParamFromUrl();
      return;
    }

    applySharedState(payload.state);
    saveState();
    clearShareParamFromUrl();
    showToast('共有データを取り込みました', 'success');
  } catch (error) {
    console.error('Failed to import shared data:', error);
    clearShareParamFromUrl();
    showToast('共有データの取り込みに失敗しました', 'error');
  }
}
