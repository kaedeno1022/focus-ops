// ============================================================================
// タスクメタデータ管理（プロジェクト、締め切り、タグ、予想時間）
// ============================================================================

/**
 * プロジェクトセレクタを初期化
 */
function initProjectSelector() {
  const projectSelect = document.getElementById('taskProject');
  if (!projectSelect) return;
  
  // 既存のオプションをクリア（最初のプレースホルダーは残す）
  while (projectSelect.options.length > 1) {
    projectSelect.remove(1);
  }
  
  // プロジェクトオプションを追加
  PROJECTS.forEach(project => {
    const option = document.createElement('option');
    option.value = project.id;
    option.textContent = project.name;
    projectSelect.appendChild(option);
  });
}

/**
 * タグセレクタを初期化
 */
function initTagSelector() {
  const tagContainer = document.getElementById('taskTags');
  if (!tagContainer) return;
  
  tagContainer.innerHTML = '';
  
  TAGS.forEach(tag => {
    const label = document.createElement('label');
    label.className = 'tag-checkbox-label';
    label.style.cssText = 'display: inline-flex; align-items: center; gap: 6px; margin-right: 12px; margin-bottom: 8px; cursor: pointer;';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = tag.id;
    checkbox.className = 'tag-checkbox';
    
    const badge = document.createElement('span');
    badge.textContent = tag.name;
    badge.style.cssText = `
      display: inline-block;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      color: #fff;
      background-color: ${tag.color};
      border: 1px solid rgba(255, 255, 255, 0.2);
    `;
    
    label.appendChild(checkbox);
    label.appendChild(badge);
    tagContainer.appendChild(label);
  });
}

/**
 * タスクメタデータをフォームから取得
 * @returns {Object} メタデータオブジェクト
 */
function getTaskMetadataFromForm() {
  const projectSelect = document.getElementById('taskProject');
  const deadlineInput = document.getElementById('taskDeadline');
  const hoursInput = document.getElementById('taskEstimatedHours');
  const minutesInput = document.getElementById('taskEstimatedMinutes');
  const tagCheckboxes = document.querySelectorAll('.tag-checkbox:checked');
  
  const metadata = {};
  
  // プロジェクト
  if (projectSelect && projectSelect.value) {
    metadata.project = projectSelect.value;
  }
  
  // 締め切り
  if (deadlineInput && deadlineInput.value) {
    metadata.deadline = deadlineInput.value;
  }
  
  // タグ
  if (tagCheckboxes.length > 0) {
    metadata.tags = Array.from(tagCheckboxes).map(cb => cb.value);
  }
  
  // 予想作業時間
  const hours = parseInt(hoursInput?.value || 0);
  const minutes = parseInt(minutesInput?.value || 0);
  const totalMinutes = hours * 60 + minutes;
  if (totalMinutes > 0) {
    metadata.estimatedTime = totalMinutes;
  }
  
  return metadata;
}

/**
 * タスクメタデータをフォームに設定
 * @param {Object} metadata - メタデータオブジェクト
 */
function setTaskMetadataToForm(metadata) {
  const projectSelect = document.getElementById('taskProject');
  const deadlineInput = document.getElementById('taskDeadline');
  const hoursInput = document.getElementById('taskEstimatedHours');
  const minutesInput = document.getElementById('taskEstimatedMinutes');
  
  // プロジェクト
  if (projectSelect && metadata.project) {
    projectSelect.value = metadata.project;
  } else if (projectSelect) {
    projectSelect.value = '';
  }
  
  // 締め切り
  if (deadlineInput && metadata.deadline) {
    deadlineInput.value = metadata.deadline;
  } else if (deadlineInput) {
    deadlineInput.value = '';
  }
  
  // タグ
  const tagCheckboxes = document.querySelectorAll('.tag-checkbox');
  tagCheckboxes.forEach(cb => {
    cb.checked = metadata.tags && metadata.tags.includes(cb.value);
  });
  
  // 予想作業時間
  if (metadata.estimatedTime) {
    const hours = Math.floor(metadata.estimatedTime / 60);
    const minutes = metadata.estimatedTime % 60;
    if (hoursInput) hoursInput.value = hours;
    if (minutesInput) minutesInput.value = minutes;
  } else {
    if (hoursInput) hoursInput.value = '';
    if (minutesInput) minutesInput.value = '';
  }
}

/**
 * タスクメタデータをクリア
 */
function clearTaskMetadataForm() {
  const projectSelect = document.getElementById('taskProject');
  const deadlineInput = document.getElementById('taskDeadline');
  const hoursInput = document.getElementById('taskEstimatedHours');
  const minutesInput = document.getElementById('taskEstimatedMinutes');
  const tagCheckboxes = document.querySelectorAll('.tag-checkbox');
  
  if (projectSelect) projectSelect.value = '';
  if (deadlineInput) deadlineInput.value = '';
  if (hoursInput) hoursInput.value = '';
  if (minutesInput) minutesInput.value = '';
  tagCheckboxes.forEach(cb => cb.checked = false);
}

/**
 * タスクメタデータを保存
 * @param {string} key - タスクキー
 * @param {Object} metadata - メタデータオブジェクト
 */
function saveTaskMetadata(key, metadata) {
  if (metadata.project) {
    taskProjects[key] = metadata.project;
  }
  
  if (metadata.deadline) {
    taskDeadlines[key] = metadata.deadline;
  }
  
  if (metadata.tags && metadata.tags.length > 0) {
    taskTags[key] = metadata.tags;
  }
  
  if (metadata.estimatedTime) {
    taskEstimatedTime[key] = metadata.estimatedTime;
  }
  
  saveState();
}

/**
 * タスクメタデータを取得
 * @param {string} key - タスクキー
 * @returns {Object} メタデータオブジェクト
 */
function getTaskMetadata(key) {
  return {
    project: taskProjects[key],
    deadline: taskDeadlines[key],
    tags: taskTags[key],
    estimatedTime: taskEstimatedTime[key]
  };
}

/**
 * タスクメタデータを削除
 * @param {string} key - タスクキー
 */
function deleteTaskMetadata(key) {
  delete taskProjects[key];
  delete taskDeadlines[key];
  delete taskTags[key];
  delete taskEstimatedTime[key];
  saveState();
}
