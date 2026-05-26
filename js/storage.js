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
    const projectsData = JSON.stringify(taskProjects);
    const deadlinesData = JSON.stringify(taskDeadlines);
    const tagsData = JSON.stringify(taskTags);
    const estimatedTimeData = JSON.stringify(taskEstimatedTime);
    
    localStorage.setItem(STORAGE_KEYS.CHECKED, checkedData);
    localStorage.setItem(STORAGE_KEYS.MINIMUM, minimumData);
    localStorage.setItem(STORAGE_KEYS.VISIBILITY, visibilityData);
    localStorage.setItem(STORAGE_KEYS.CUSTOM_TASKS, customData);
    localStorage.setItem(STORAGE_KEYS.COMMENTS, commentsData);
    localStorage.setItem(STORAGE_KEYS.EDITED_DEFAULT_TASKS, editedDefaultData);
    localStorage.setItem(STORAGE_KEYS.PROJECTS, projectsData);
    localStorage.setItem(STORAGE_KEYS.DEADLINES, deadlinesData);
    localStorage.setItem(STORAGE_KEYS.TAGS, tagsData);
    localStorage.setItem(STORAGE_KEYS.ESTIMATED_TIME, estimatedTimeData);
  } catch (error) {
    console.error('Failed to save state to localStorage:', error);
    
    if (error.name === 'QuotaExceededError') {
      announceToScreenReader('保存容量が不足しています。一部のデータをリセットしてください。');
      alert('保存容量が不足しています。「全リセット」を実行してデータをクリアしてください。');
    }
  }
}
