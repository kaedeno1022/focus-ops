// ============================================================================
// タスクメタデータ管理（プロジェクト、締め切り、タグ、予想時間）
// ============================================================================

const DEFAULT_PROJECT_ID = 'proj-none';
let metadataIdCounter = 0;

function getManagedProjects() {
  return PROJECTS.filter(project => project.id !== DEFAULT_PROJECT_ID);
}

function generateMetadataId(prefix) {
  metadataIdCounter += 1;
  return `${prefix}-${Date.now()}-${metadataIdCounter}-${Math.random().toString(36).slice(2, 6)}`;
}

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
  getManagedProjects().forEach(project => {
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
 * メタデータ管理画面（タグ・プロジェクト）を描画
 */
function renderMetadataManagers() {
  renderTagManagerList();
  renderProjectManagerList();
}

/**
 * タグ管理リストを描画
 */
function renderTagManagerList() {
  const container = document.getElementById('tagManagerList');
  if (!container) return;

  container.innerHTML = '';
  if (TAGS.length === 0) {
    container.innerHTML = '<p class="empty-message">タグはまだ登録されていません。</p>';
    return;
  }

  TAGS.forEach(tag => {
    const item = document.createElement('div');
    item.className = 'custom-task-item';

    const info = document.createElement('div');
    info.className = 'task-info';
    const title = document.createElement('strong');
    title.className = 'manager-item-title';
    const colorDot = document.createElement('span');
    colorDot.className = 'manager-color-dot';
    colorDot.style.background = tag.color;
    const nameText = document.createElement('span');
    nameText.textContent = tag.name;
    title.appendChild(colorDot);
    title.appendChild(nameText);
    const detail = document.createElement('small');
    detail.textContent = `ID: ${tag.id}`;
    info.appendChild(title);
    info.appendChild(detail);

    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'button-group';

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn-main btn-small';
    editBtn.textContent = '編集';
    editBtn.addEventListener('click', () => startTagEdit(tag.id));

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn-danger btn-small';
    deleteBtn.textContent = '削除';
    deleteBtn.addEventListener('click', () => deleteTag(tag.id));

    buttonGroup.appendChild(editBtn);
    buttonGroup.appendChild(deleteBtn);
    item.appendChild(info);
    item.appendChild(buttonGroup);
    container.appendChild(item);
  });
}

/**
 * プロジェクト管理リストを描画
 */
function renderProjectManagerList() {
  const container = document.getElementById('projectManagerList');
  if (!container) return;

  const projects = getManagedProjects();
  container.innerHTML = '';
  if (projects.length === 0) {
    container.innerHTML = '<p class="empty-message">プロジェクトはまだ登録されていません。</p>';
    return;
  }

  projects.forEach(project => {
    const item = document.createElement('div');
    item.className = 'custom-task-item';

    const info = document.createElement('div');
    info.className = 'task-info';
    const title = document.createElement('strong');
    title.className = 'manager-item-title';
    const colorDot = document.createElement('span');
    colorDot.className = 'manager-color-dot';
    colorDot.style.background = project.color;
    const nameText = document.createElement('span');
    nameText.textContent = project.name;
    title.appendChild(colorDot);
    title.appendChild(nameText);
    const detail = document.createElement('small');
    detail.textContent = `ID: ${project.id}`;
    info.appendChild(title);
    info.appendChild(detail);

    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'button-group';

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn-main btn-small';
    editBtn.textContent = '編集';
    editBtn.addEventListener('click', () => startProjectEdit(project.id));

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn-danger btn-small';
    deleteBtn.textContent = '削除';
    deleteBtn.addEventListener('click', () => deleteProject(project.id));

    buttonGroup.appendChild(editBtn);
    buttonGroup.appendChild(deleteBtn);
    item.appendChild(info);
    item.appendChild(buttonGroup);
    container.appendChild(item);
  });
}

/**
 * タグを作成/更新
 * @param {Event} e
 */
function handleTagManagerSubmit(e) {
  e.preventDefault();
  const nameInput = document.getElementById('tagManagerName');
  const colorInput = document.getElementById('tagManagerColor');
  if (!nameInput || !colorInput) return;

  const name = nameInput.value.trim();
  const color = colorInput.value;
  if (!name) return;

  if (editingTagId) {
    const target = TAGS.find(tag => tag.id === editingTagId);
    if (target) {
      target.name = name;
      target.color = color;
    }
    showToast('タグを更新しました', 'success');
  } else {
    const id = generateMetadataId('tag');
    TAGS.push({ id, name, color });
    showToast('タグを追加しました', 'success');
  }

  saveState();
  cancelTagEdit();
  initTagSelector();
  renderMetadataManagers();
  renderAll();
}

/**
 * プロジェクトを作成/更新
 * @param {Event} e
 */
function handleProjectManagerSubmit(e) {
  e.preventDefault();
  const nameInput = document.getElementById('projectManagerName');
  const colorInput = document.getElementById('projectManagerColor');
  if (!nameInput || !colorInput) return;

  const name = nameInput.value.trim();
  const color = colorInput.value;
  if (!name) return;

  if (editingProjectId) {
    const target = PROJECTS.find(project => project.id === editingProjectId);
    if (target) {
      target.name = name;
      target.color = color;
    }
    showToast('プロジェクトを更新しました', 'success');
  } else {
    const id = generateMetadataId('proj');
    PROJECTS.push({ id, name, color });
    showToast('プロジェクトを追加しました', 'success');
  }

  saveState();
  cancelProjectEdit();
  initProjectSelector();
  renderMetadataManagers();
  renderAll();
}

/**
 * タグ編集開始
 * @param {string} tagId
 */
function startTagEdit(tagId) {
  const target = TAGS.find(tag => tag.id === tagId);
  const nameInput = document.getElementById('tagManagerName');
  const colorInput = document.getElementById('tagManagerColor');
  const submitBtn = document.querySelector('#tagManagerForm button[type="submit"]');
  const cancelBtn = document.getElementById('tagManagerCancelEdit');
  if (!target || !nameInput || !colorInput || !submitBtn || !cancelBtn) return;

  editingTagId = tagId;
  nameInput.value = target.name;
  colorInput.value = target.color;
  submitBtn.textContent = 'タグを更新';
  cancelBtn.style.display = 'inline-block';
}

/**
 * プロジェクト編集開始
 * @param {string} projectId
 */
function startProjectEdit(projectId) {
  const target = PROJECTS.find(project => project.id === projectId);
  const nameInput = document.getElementById('projectManagerName');
  const colorInput = document.getElementById('projectManagerColor');
  const submitBtn = document.querySelector('#projectManagerForm button[type="submit"]');
  const cancelBtn = document.getElementById('projectManagerCancelEdit');
  if (!target || !nameInput || !colorInput || !submitBtn || !cancelBtn) return;

  editingProjectId = projectId;
  nameInput.value = target.name;
  colorInput.value = target.color;
  submitBtn.textContent = 'プロジェクトを更新';
  cancelBtn.style.display = 'inline-block';
}

/**
 * タグ編集キャンセル
 */
function cancelTagEdit() {
  const form = document.getElementById('tagManagerForm');
  const submitBtn = document.querySelector('#tagManagerForm button[type="submit"]');
  const cancelBtn = document.getElementById('tagManagerCancelEdit');
  if (form) form.reset();
  if (submitBtn) submitBtn.textContent = 'タグを追加';
  if (cancelBtn) cancelBtn.style.display = 'none';
  const colorInput = document.getElementById('tagManagerColor');
  if (colorInput) colorInput.value = '#3b82f6';
  editingTagId = null;
}

/**
 * プロジェクト編集キャンセル
 */
function cancelProjectEdit() {
  const form = document.getElementById('projectManagerForm');
  const submitBtn = document.querySelector('#projectManagerForm button[type="submit"]');
  const cancelBtn = document.getElementById('projectManagerCancelEdit');
  if (form) form.reset();
  if (submitBtn) submitBtn.textContent = 'プロジェクトを追加';
  if (cancelBtn) cancelBtn.style.display = 'none';
  const colorInput = document.getElementById('projectManagerColor');
  if (colorInput) colorInput.value = '#8b5cf6';
  editingProjectId = null;
}

/**
 * タグ削除
 * @param {string} tagId
 */
function deleteTag(tagId) {
  const target = TAGS.find(tag => tag.id === tagId);
  if (!target) return;
  if (!confirm(`タグ「${target.name}」を削除しますか？`)) return;

  const index = TAGS.findIndex(tag => tag.id === tagId);
  if (index > -1) {
    TAGS.splice(index, 1);
  }

  Object.keys(taskTags).forEach(key => {
    taskTags[key] = (taskTags[key] || []).filter(id => id !== tagId);
    if (taskTags[key].length === 0) {
      delete taskTags[key];
    }
  });

  if (editingTagId === tagId) {
    cancelTagEdit();
  }

  saveState();
  initTagSelector();
  renderMetadataManagers();
  renderAll();
  showToast('タグを削除しました', 'success');
}

/**
 * プロジェクト削除
 * @param {string} projectId
 */
function deleteProject(projectId) {
  const target = PROJECTS.find(project => project.id === projectId);
  if (!target || projectId === DEFAULT_PROJECT_ID) return;
  if (!confirm(`プロジェクト「${target.name}」を削除しますか？`)) return;

  const index = PROJECTS.findIndex(project => project.id === projectId);
  if (index > -1) {
    PROJECTS.splice(index, 1);
  }

  Object.keys(taskProjects).forEach(key => {
    if (taskProjects[key] === projectId) {
      delete taskProjects[key];
    }
  });

  if (editingProjectId === projectId) {
    cancelProjectEdit();
  }

  saveState();
  initProjectSelector();
  renderMetadataManagers();
  renderAll();
  showToast('プロジェクトを削除しました', 'success');
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
