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
 * 現在の共有リビジョンを取得
 * @returns {number}
 */
function getShareRevision() {
  const value = Number(localStorage.getItem(STORAGE_KEYS.SHARE_REVISION) || '0');
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

/**
 * 直近保存時刻を取得
 * @returns {string}
 */
function getShareSavedAt() {
  return localStorage.getItem(STORAGE_KEYS.SHARE_SAVED_AT) || '';
}

/**
 * 共有メタ情報を保存
 * @param {number} revision
 * @param {string} savedAt
 */
function setShareMeta(revision, savedAt) {
  localStorage.setItem(STORAGE_KEYS.SHARE_REVISION, String(Math.max(0, Math.floor(revision))));
  localStorage.setItem(STORAGE_KEYS.SHARE_SAVED_AT, savedAt || new Date().toISOString());
}

/**
 * 共有メタ情報を更新
 */
function touchShareMeta() {
  const nextRevision = getShareRevision() + 1;
  setShareMeta(nextRevision, new Date().toISOString());
}

/**
 * バックアップ復元ボタンの表示状態を更新
 */
function updateRestoreBackupButtonVisibility() {
  const btn = document.getElementById('restoreImportBackupBtn');
  if (!btn) return;
  btn.hidden = !localStorage.getItem(STORAGE_KEYS.PRE_IMPORT_BACKUP);
}

/**
 * 取り込み前バックアップを保存
 */
function savePreImportBackup() {
  const snapshot = buildSharePayload();
  const backup = {
    version: 2,
    createdAt: new Date().toISOString(),
    meta: snapshot.meta,
    state: snapshot.state
  };
  localStorage.setItem(STORAGE_KEYS.PRE_IMPORT_BACKUP, JSON.stringify(backup));
  updateRestoreBackupButtonVisibility();
}

/**
 * 取り込み前バックアップから復元
 */
function restorePreImportBackup() {
  const raw = localStorage.getItem(STORAGE_KEYS.PRE_IMPORT_BACKUP);
  if (!raw) {
    showToast('復元できるバックアップがありません', 'info');
    updateRestoreBackupButtonVisibility();
    return;
  }

  const shouldRestore = window.confirm('取り込み前の状態へ戻しますか？\n現在の状態は失われます。');
  if (!shouldRestore) {
    return;
  }

  try {
    const backup = JSON.parse(raw);
    if (!backup || backup.version !== 2 || !backup.state) {
      throw new Error('Invalid backup payload');
    }

    applySharedStateV2(backup.state);
    saveState();
    renderAll();
    updateSystemStatus();
    if (typeof updateAdminModeUI === 'function') updateAdminModeUI();
    if (typeof updateModeMenuBtn === 'function') updateModeMenuBtn();

    localStorage.removeItem(STORAGE_KEYS.PRE_IMPORT_BACKUP);
    updateRestoreBackupButtonVisibility();
    showToast('取り込み前の状態に戻しました', 'success');
  } catch (error) {
    console.error('Failed to restore pre-import backup:', error);
    showToast('バックアップ復元に失敗しました', 'error');
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
    const assigneesData = JSON.stringify(taskAssignees);
    const assigneeMasterData = JSON.stringify(ASSIGNEE_MASTER);
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
    localStorage.setItem(STORAGE_KEYS.ASSIGNEES, assigneesData);
    localStorage.setItem(STORAGE_KEYS.ASSIGNEE_MASTER, assigneeMasterData);
    localStorage.setItem(STORAGE_KEYS.PROJECT_MASTER, projectMasterData);
    localStorage.setItem(STORAGE_KEYS.TAG_MASTER, tagMasterData);
    localStorage.setItem(STORAGE_KEYS.TASK_STATUS, taskStatusData);
    localStorage.setItem(STORAGE_KEYS.STATUS_MASTER, statusMasterData);
    localStorage.setItem(STORAGE_KEYS.DISPLAY_MODE, JSON.stringify(displayMode));
    localStorage.setItem(STORAGE_KEYS.ADMIN_MODE, JSON.stringify(adminMode));
    touchShareMeta();
  } catch (error) {
    console.error('Failed to save state to localStorage:', error);
    
    if (error.name === 'QuotaExceededError') {
      announceToScreenReader('保存容量が不足しています。一部のデータをリセットしてください。');
      alert('保存容量が不足しています。「全リセット」を実行してデータをクリアしてください。');
    }
  }
}

/**
 * Uint8ArrayをBase64URL文字列へ変換
 * @param {Uint8Array} bytes
 * @returns {string}
 */
function uint8ArrayToBase64Url(bytes) {
  const chunkSize = 0x8000;
  let binary = '';

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

/**
 * Base64URL文字列をUint8Arrayへ変換
 * @param {string} value
 * @returns {Uint8Array}
 */
function base64UrlToUint8Array(value) {
  const padded = value
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=');

  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

/**
 * 文字列をgzip圧縮してBase64URL文字列へ変換
 * @param {string} value
 * @returns {Promise<string>}
 */
async function compressTextToBase64Url(value) {
  if (typeof CompressionStream !== 'function') {
    throw new Error('CompressionStream is not supported in this browser');
  }

  const sourceStream = new Blob([value]).stream();
  const compressedStream = sourceStream.pipeThrough(new CompressionStream('gzip'));
  const compressed = new Uint8Array(await new Response(compressedStream).arrayBuffer());
  return uint8ArrayToBase64Url(compressed);
}

/**
 * Base64URL文字列をgzip展開して文字列へ戻す
 * @param {string} value
 * @returns {Promise<string>}
 */
async function decompressBase64UrlToText(value) {
  if (typeof DecompressionStream !== 'function') {
    throw new Error('DecompressionStream is not supported in this browser');
  }

  const compressed = base64UrlToUint8Array(value);
  const sourceStream = new Blob([compressed]).stream();
  const decompressedStream = sourceStream.pipeThrough(new DecompressionStream('gzip'));
  const decompressed = new Uint8Array(await new Response(decompressedStream).arrayBuffer());
  return new TextDecoder().decode(decompressed);
}

/**
 * 現在の状態を共有用オブジェクトへ変換
 * @returns {object}
 */
function buildSharePayload() {
  const hasOwnValues = (obj) => obj && typeof obj === 'object' && Object.keys(obj).length > 0;
  const isJsonEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const omitEmptyStringValues = (obj) => Object.fromEntries(
    Object.entries(obj || {}).filter(([, value]) => {
      if (typeof value === 'string') return value.trim() !== '';
      if (Array.isArray(value)) return value.length > 0;
      return value !== undefined && value !== null;
    })
  );

  const checkedDoneKeys = Object.keys(checkedState).filter((key) => checkedState[key] === true);
  const hiddenTaskKeys = Object.keys(taskVisibility).filter((key) => taskVisibility[key] === false);

  const compactCustomTasks = {};
  if (Array.isArray(customTasks.daily) && customTasks.daily.length > 0) compactCustomTasks.d = customTasks.daily;
  if (Array.isArray(customTasks.weekly) && customTasks.weekly.length > 0) compactCustomTasks.w = customTasks.weekly;
  if (Array.isArray(customTasks.season) && customTasks.season.length > 0) compactCustomTasks.s = customTasks.season;

  const compactState = {};

  if (checkedDoneKeys.length > 0) compactState.c = checkedDoneKeys;
  if (minimumMode) compactState.m = 1;
  if (hiddenTaskKeys.length > 0) compactState.v = hiddenTaskKeys;
  if (hasOwnValues(compactCustomTasks)) compactState.u = compactCustomTasks;

  const compactComments = omitEmptyStringValues(taskComments);
  if (hasOwnValues(compactComments)) compactState.o = compactComments;

  if (hasOwnValues(editedDefaultTasks)) compactState.e = editedDefaultTasks;

  const deletedKeys = [...deletedDefaultTasks];
  if (deletedKeys.length > 0) compactState.x = deletedKeys;

  if (hasOwnValues(taskProjects)) compactState.p = taskProjects;
  if (hasOwnValues(taskDeadlines)) compactState.l = taskDeadlines;
  if (hasOwnValues(taskTags)) compactState.g = taskTags;
  if (hasOwnValues(taskEstimatedTime)) compactState.t = taskEstimatedTime;
  if (hasOwnValues(taskAssignees)) compactState.a = taskAssignees;
  if (hasOwnValues(taskStatus)) compactState.k = taskStatus;

  if (!isJsonEqual(PROJECTS, DEFAULT_PROJECTS)) compactState.pm = PROJECTS;
  if (!isJsonEqual(TAGS, DEFAULT_TAGS)) compactState.tm = TAGS;
  if (!isJsonEqual(ASSIGNEE_MASTER, DEFAULT_ASSIGNEE_MASTER)) compactState.am = ASSIGNEE_MASTER;
  if (!isJsonEqual(KANBAN_STATUSES, DEFAULT_KANBAN_STATUSES)) compactState.sm = KANBAN_STATUSES;

  if (displayMode === 'detail') compactState.d = 1;
  if (adminMode) compactState.r = 1;

  return {
    version: 2,
    meta: {
      revision: getShareRevision(),
      savedAt: getShareSavedAt() || new Date().toISOString()
    },
    state: compactState
  };
}

/**
 * 軽量化された共有状態(v2)をアプリ状態へ反映
 * @param {object} state - 共有状態
 */
function applySharedStateV2(state) {
  const toBooleanFlag = (value) => value === true || value === 'true' || value === 1 || value === '1';

  checkedState = {};
  if (Array.isArray(state.c)) {
    state.c.forEach((key) => {
      checkedState[key] = true;
    });
  }

  minimumMode = toBooleanFlag(state.m);

  taskVisibility = {};
  if (Array.isArray(state.v)) {
    state.v.forEach((key) => {
      taskVisibility[key] = false;
    });
  }

  customTasks = { daily: [], weekly: [], season: [] };
  if (state.u && typeof state.u === 'object') {
    if (Array.isArray(state.u.d)) customTasks.daily = state.u.d;
    if (Array.isArray(state.u.w)) customTasks.weekly = state.u.w;
    if (Array.isArray(state.u.s)) customTasks.season = state.u.s;
  }

  taskComments = state.o && typeof state.o === 'object' ? state.o : {};
  editedDefaultTasks = state.e && typeof state.e === 'object' ? state.e : {};
  deletedDefaultTasks = new Set(Array.isArray(state.x) ? state.x : []);
  taskProjects = state.p && typeof state.p === 'object' ? state.p : {};
  taskDeadlines = state.l && typeof state.l === 'object' ? state.l : {};
  taskTags = state.g && typeof state.g === 'object' ? state.g : {};
  taskEstimatedTime = state.t && typeof state.t === 'object' ? state.t : {};
  taskAssignees = state.a && typeof state.a === 'object' ? state.a : {};
  taskStatus = state.k && typeof state.k === 'object' ? state.k : {};
  displayMode = toBooleanFlag(state.d) ? 'detail' : 'simple';
  adminMode = toBooleanFlag(state.r);

  PROJECTS.length = 0;
  PROJECTS.push(...(Array.isArray(state.pm) ? state.pm : DEFAULT_PROJECTS.map(project => ({ ...project }))));

  TAGS.length = 0;
  TAGS.push(...(Array.isArray(state.tm) ? state.tm : DEFAULT_TAGS.map(tag => ({ ...tag }))));

  ASSIGNEE_MASTER.length = 0;
  ASSIGNEE_MASTER.push(...(Array.isArray(state.am) ? state.am : DEFAULT_ASSIGNEE_MASTER.map(assignee => ({ ...assignee }))));

  KANBAN_STATUSES.length = 0;
  KANBAN_STATUSES.push(...(Array.isArray(state.sm) ? state.sm : DEFAULT_KANBAN_STATUSES.map(status => ({ ...status }))));
}

/**
 * 共有リンクを生成
 * @returns {Promise<string>}
 */
async function buildShareUrl() {
  const payloadJson = JSON.stringify(buildSharePayload());
  const encoded = await compressTextToBase64Url(payloadJson);
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
  const normalize = (value) => (value || '').replace(/\r\n/g, '\n').trim();

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);

      // 書き込み成功扱いでも環境によって実際に反映されない場合があるため検証する。
      if (navigator.clipboard.readText) {
        try {
          const copiedText = await navigator.clipboard.readText();
          if (normalize(copiedText) === normalize(text)) {
            return true;
          }
        } catch (readError) {
          // readTextが許可されない環境ではwriteTextの成功を採用
          return true;
        }
      } else {
        return true;
      }
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

  if (!copied) return false;

  if (navigator.clipboard && navigator.clipboard.readText) {
    try {
      const copiedText = await navigator.clipboard.readText();
      return normalize(copiedText) === normalize(text);
    } catch (readError) {
      // readTextが使えない場合はexecCommand結果を採用
      return true;
    }
  }

  return true;
}

/**
 * 共有リンクを生成してコピー
 */
async function handleShareTasks() {
  try {
    const shareUrl = await buildShareUrl();
    const copied = await copyTextToClipboard(shareUrl);

    if (copied) {
      showToast('共有リンクをコピーしました', 'success');
    } else {
      showToast('自動コピーできないため、表示されたリンクを手動でコピーしてください', 'info', 5000);
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
async function importStateFromShareUrl() {
  const url = new URL(window.location.href);
  const encoded = url.searchParams.get('share');
  if (!encoded) return;

  try {
    const decoded = await decompressBase64UrlToText(encoded);
    const payload = JSON.parse(decoded);

    if (!payload || !payload.state || payload.version !== 2) {
      throw new Error('Invalid payload format');
    }

    const incomingRevision = Number(payload.meta?.revision || 0);
    const incomingSavedAt = payload.meta?.savedAt || '不明';
    const currentRevision = getShareRevision();
    const currentSavedAt = getShareSavedAt() || '不明';
    const hasConflict = currentRevision > 0 && incomingRevision > 0 && incomingRevision !== currentRevision;

    const confirmMessage = hasConflict
      ? `競合を検出しました。\n\n端末: rev ${currentRevision} (${currentSavedAt})\n共有: rev ${incomingRevision} (${incomingSavedAt})\n\n共有データで端末状態を置き換えます。\n必要なら取り込み後に「取り込み前に戻す」で復元できます。\n\nこのまま取り込みますか？`
      : '共有されたタスクデータを取り込みますか？\n現在の端末データは上書きされます。\n（取り込み前状態は1件バックアップします）';

    const shouldImport = window.confirm(confirmMessage);
    if (!shouldImport) {
      clearShareParamFromUrl();
      return;
    }

    savePreImportBackup();
    if (incomingRevision > getShareRevision()) {
      setShareMeta(incomingRevision, incomingSavedAt);
    }

    applySharedStateV2(payload.state);
    saveState();
    clearShareParamFromUrl();
    updateRestoreBackupButtonVisibility();
    showToast('共有データで置き換えました（必要なら「取り込み前に戻す」で復元可能）', 'success', 5000);
  } catch (error) {
    console.error('Failed to import shared data:', error);
    clearShareParamFromUrl();
    showToast('共有データの取り込みに失敗しました', 'error');
  }
}
