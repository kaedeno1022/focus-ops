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
 * 担当者データを配列へ正規化（旧データ文字列にも対応）
 * @param {string|string[]|undefined|null} value
 * @returns {string[]}
 */
function normalizeAssigneeList(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map(name => String(name).trim()).filter(Boolean))];
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.includes(',')) {
      return [...new Set(trimmed.split(',').map(name => name.trim()).filter(Boolean))];
    }
    return [trimmed];
  }

  return [];
}

/**
 * 管理フォームまでスクロールして入力にフォーカス
 * @param {HTMLElement|null} formElement
 * @param {HTMLElement|null} focusTarget
 */
function scrollToManagerForm(formElement, focusTarget) {
  if (!formElement) return;

  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  formElement.scrollIntoView({
    behavior: reduceMotion ? 'auto' : 'smooth',
    block: 'start'
  });

  setTimeout(() => {
    focusTarget?.focus();
  }, reduceMotion ? 0 : 200);
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
 * プロジェクトフィルターセレクトを初期化
 */
function initProjectFilterSelect() {
  const dropdown = document.getElementById('projectFilterDropdown');
  const btn = document.getElementById('projectFilterBtn');
  if (!dropdown || !btn) return;

  // ドロップダウンをリセット
  dropdown.innerHTML = '';

  // 「全て」項目を追加
  const allItem = document.createElement('button');
  allItem.className = 'reset-dropdown-item project-filter-item';
  allItem.type = 'button';
  allItem.dataset.value = '';
  allItem.innerHTML = '<span class="reset-item-label">全て表示</span>';
  dropdown.appendChild(allItem);

  // プロジェクト項目を追加
  const projects = getManagedProjects();
  if (projects.length > 0) {
    const divider = document.createElement('div');
    divider.className = 'reset-dropdown-divider';
    dropdown.appendChild(divider);

    projects.forEach(project => {
      const item = document.createElement('button');
      item.className = 'reset-dropdown-item project-filter-item';
      item.type = 'button';
      item.dataset.value = project.id;
      item.innerHTML = `<span class="reset-item-label">${project.name}</span>`;
      dropdown.appendChild(item);
    });
  }

  // 現在のフィルターに合わせてボタンテキストを更新
  updateProjectFilterBtnLabel();
}

function updateProjectFilterBtnLabel() {
  const btn = document.getElementById('projectFilterBtn');
  if (!btn) return;
  if (projectFilter) {
    const projects = getManagedProjects();
    const found = projects.find(p => p.id === projectFilter);
    btn.textContent = found ? `${found.name} ▾` : 'プロジェクト: 全て ▾';
  } else {
    btn.textContent = 'プロジェクト: 全て ▾';
  }
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
 * 担当者セレクタを初期化
 * @param {string[]} selectedAssignees
 */
function initAssigneeSelector(selectedAssignees = []) {
  const assigneeContainer = document.getElementById('taskAssigneeChecklist');
  if (!assigneeContainer) return;

  const selectedSet = new Set(normalizeAssigneeList(selectedAssignees));
  assigneeContainer.innerHTML = '';

  ASSIGNEE_MASTER.forEach(assignee => {
    const label = document.createElement('label');
    label.className = 'assignee-checkbox-label';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'assignee-checkbox';
    checkbox.value = assignee.name;
    checkbox.checked = selectedSet.has(assignee.name);

    const text = document.createElement('span');
    text.textContent = assignee.name;

    label.appendChild(checkbox);
    label.appendChild(text);
    assigneeContainer.appendChild(label);
  });

  selectedSet.forEach(name => {
    if (Array.from(assigneeContainer.querySelectorAll('.assignee-checkbox')).some(checkbox => checkbox.value === name)) {
      return;
    }

    const label = document.createElement('label');
    label.className = 'assignee-checkbox-label';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'assignee-checkbox';
    checkbox.value = name;
    checkbox.checked = true;

    const text = document.createElement('span');
    text.textContent = `${name} (既存)`;

    label.appendChild(checkbox);
    label.appendChild(text);
    assigneeContainer.appendChild(label);
  });
}

/**
 * タスクメタデータをフォームから取得
 * @returns {Object} メタデータオブジェクト
 */
function getTaskMetadataFromForm() {
  const projectSelect = document.getElementById('taskProject');
  const assigneeCheckboxes = document.querySelectorAll('.assignee-checkbox:checked');
  const startDateInput = document.getElementById('taskStartDate');
  const endDateInput = document.getElementById('taskEndDate');
  const hoursInput = document.getElementById('taskEstimatedHours');
  const minutesInput = document.getElementById('taskEstimatedMinutes');
  const tagCheckboxes = document.querySelectorAll('.tag-checkbox:checked');
  
  const metadata = {};
  
  // プロジェクト
  if (projectSelect && projectSelect.value) {
    metadata.project = projectSelect.value;
  }

  // 担当者
  metadata.assignee = Array.from(assigneeCheckboxes).map(checkbox => checkbox.value).filter(Boolean);
  
  // 開始日
  if (startDateInput && startDateInput.value) {
    metadata.startDate = startDateInput.value;
  }
  
  // 終了日
  if (endDateInput && endDateInput.value) {
    metadata.endDate = endDateInput.value;
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
  const assigneeContainer = document.getElementById('taskAssigneeChecklist');
  const startDateInput = document.getElementById('taskStartDate');
  const endDateInput = document.getElementById('taskEndDate');
  const hoursInput = document.getElementById('taskEstimatedHours');
  const minutesInput = document.getElementById('taskEstimatedMinutes');
  
  // プロジェクト
  if (projectSelect && metadata.project) {
    projectSelect.value = metadata.project;
  } else if (projectSelect) {
    projectSelect.value = '';
  }

  if (assigneeContainer) {
    const selectedAssignees = normalizeAssigneeList(metadata.assignee);
    initAssigneeSelector(selectedAssignees);
  }
  
  // 開始日
  if (startDateInput && metadata.startDate) {
    startDateInput.value = metadata.startDate;
  } else if (startDateInput) {
    startDateInput.value = '';
  }
  
  // 終了日
  if (endDateInput && metadata.endDate) {
    endDateInput.value = metadata.endDate;
  } else if (endDateInput) {
    endDateInput.value = '';
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
  const assigneeCheckboxes = document.querySelectorAll('.assignee-checkbox');
  const startDateInput = document.getElementById('taskStartDate');
  const endDateInput = document.getElementById('taskEndDate');
  const hoursInput = document.getElementById('taskEstimatedHours');
  const minutesInput = document.getElementById('taskEstimatedMinutes');
  const tagCheckboxes = document.querySelectorAll('.tag-checkbox');
  
  if (projectSelect) projectSelect.value = '';
  assigneeCheckboxes.forEach(checkbox => checkbox.checked = false);
  if (startDateInput) startDateInput.value = '';
  if (endDateInput) endDateInput.value = '';
  if (hoursInput) hoursInput.value = '';
  if (minutesInput) minutesInput.value = '';
  tagCheckboxes.forEach(cb => cb.checked = false);
}

/**
 * メタデータ管理画面（タグ・プロジェクト・ステータス）を描画
 */
function renderMetadataManagers() {
  renderTagManagerList();
  renderProjectManagerList();
  renderAssigneeManagerList();
  initAssigneeSelector();
  renderStatusManagerList();
  initProjectFilterSelect();
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
    buttonGroup.classList.add('manager-action-groups');

    const primaryActions = document.createElement('div');
    primaryActions.className = 'manager-primary-actions';

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

    primaryActions.appendChild(editBtn);
    primaryActions.appendChild(deleteBtn);
    buttonGroup.appendChild(primaryActions);
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
    buttonGroup.classList.add('manager-action-groups');

    const primaryActions = document.createElement('div');
    primaryActions.className = 'manager-primary-actions';

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

    primaryActions.appendChild(editBtn);
    primaryActions.appendChild(deleteBtn);
    buttonGroup.appendChild(primaryActions);
    item.appendChild(info);
    item.appendChild(buttonGroup);
    container.appendChild(item);
  });
}

/**
 * 担当者管理リストを描画
 */
function renderAssigneeManagerList() {
  const container = document.getElementById('assigneeManagerList');
  if (!container) return;

  container.innerHTML = '';
  if (ASSIGNEE_MASTER.length === 0) {
    container.innerHTML = '<p class="empty-message">担当者はまだ登録されていません。</p>';
    return;
  }

  ASSIGNEE_MASTER.forEach(assignee => {
    const item = document.createElement('div');
    item.className = 'custom-task-item';

    const info = document.createElement('div');
    info.className = 'task-info';
    const title = document.createElement('strong');
    title.className = 'manager-item-title';
    const nameText = document.createElement('span');
    nameText.textContent = assignee.name;
    title.appendChild(nameText);
    const detail = document.createElement('small');
    detail.textContent = `ID: ${assignee.id}`;
    info.appendChild(title);
    info.appendChild(detail);

    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'button-group';
    buttonGroup.classList.add('manager-action-groups');

    const primaryActions = document.createElement('div');
    primaryActions.className = 'manager-primary-actions';

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn-main btn-small';
    editBtn.textContent = '編集';
    editBtn.addEventListener('click', () => startAssigneeEdit(assignee.id));

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn-danger btn-small';
    deleteBtn.textContent = '削除';
    deleteBtn.addEventListener('click', () => deleteAssignee(assignee.id));

    primaryActions.appendChild(editBtn);
    primaryActions.appendChild(deleteBtn);
    buttonGroup.appendChild(primaryActions);
    item.appendChild(info);
    item.appendChild(buttonGroup);
    container.appendChild(item);
  });
}

/**
 * 担当者を作成/更新
 * @param {Event} e
 */
function handleAssigneeManagerSubmit(e) {
  e.preventDefault();
  const nameInput = document.getElementById('assigneeManagerName');
  if (!nameInput) return;

  const name = nameInput.value.trim();
  if (!name) return;

  if (editingAssigneeId) {
    const target = ASSIGNEE_MASTER.find(assignee => assignee.id === editingAssigneeId);
    if (target) {
      const oldName = target.name;
      target.name = name;

      Object.keys(taskAssignees).forEach(key => {
        const current = normalizeAssigneeList(taskAssignees[key]);
        if (current.length === 0 || !current.includes(oldName)) {
          return;
        }

        const updated = current.map(assigneeName => assigneeName === oldName ? name : assigneeName);
        taskAssignees[key] = updated;
      });
    }
    showToast('担当者を更新しました', 'success');
  } else {
    const id = generateMetadataId('assignee');
    ASSIGNEE_MASTER.push({ id, name });
    showToast('担当者を追加しました', 'success');
  }

  saveState();
  cancelAssigneeEdit();
  renderAssigneeManagerList();
  initAssigneeSelector();
  renderAll();
}

/**
 * 担当者編集開始
 * @param {string} assigneeId
 */
function startAssigneeEdit(assigneeId) {
  const target = ASSIGNEE_MASTER.find(assignee => assignee.id === assigneeId);
  const form = document.getElementById('assigneeManagerForm');
  const nameInput = document.getElementById('assigneeManagerName');
  const submitBtn = document.querySelector('#assigneeManagerForm button[type="submit"]');
  const cancelBtn = document.getElementById('assigneeManagerCancelEdit');
  if (!target || !form || !nameInput || !submitBtn || !cancelBtn) return;

  if (typeof switchTab === 'function') {
    switchTab('tagProject');
  }
  if (typeof switchManagementSubTab === 'function') {
    switchManagementSubTab('assignee');
  }

  editingAssigneeId = assigneeId;
  nameInput.value = target.name;
  submitBtn.textContent = '担当者を更新';
  cancelBtn.style.display = 'inline-block';
  scrollToManagerForm(form, nameInput);
}

/**
 * 担当者編集キャンセル
 */
function cancelAssigneeEdit() {
  const form = document.getElementById('assigneeManagerForm');
  const submitBtn = document.querySelector('#assigneeManagerForm button[type="submit"]');
  const cancelBtn = document.getElementById('assigneeManagerCancelEdit');
  if (form) form.reset();
  if (submitBtn) submitBtn.textContent = '担当者を追加';
  if (cancelBtn) cancelBtn.style.display = 'none';
  editingAssigneeId = null;
}

/**
 * 担当者削除
 * @param {string} assigneeId
 */
function deleteAssignee(assigneeId) {
  const target = ASSIGNEE_MASTER.find(assignee => assignee.id === assigneeId);
  if (!target) return;
  if (!confirm(`担当者「${target.name}」を削除しますか？`)) return;

  const index = ASSIGNEE_MASTER.findIndex(assignee => assignee.id === assigneeId);
  if (index > -1) {
    ASSIGNEE_MASTER.splice(index, 1);
  }

  if (editingAssigneeId === assigneeId) {
    cancelAssigneeEdit();
  }

  Object.keys(taskAssignees).forEach(key => {
    const current = normalizeAssigneeList(taskAssignees[key]);
    if (!current.includes(target.name)) {
      return;
    }

    const updated = current.filter(name => name !== target.name);
    if (updated.length === 0) {
      delete taskAssignees[key];
    } else {
      taskAssignees[key] = updated;
    }
  });

  saveState();
  renderAssigneeManagerList();
  initAssigneeSelector();
  showToast('担当者を削除しました', 'success');
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
  const form = document.getElementById('tagManagerForm');
  const nameInput = document.getElementById('tagManagerName');
  const colorInput = document.getElementById('tagManagerColor');
  const submitBtn = document.querySelector('#tagManagerForm button[type="submit"]');
  const cancelBtn = document.getElementById('tagManagerCancelEdit');
  if (!target || !form || !nameInput || !colorInput || !submitBtn || !cancelBtn) return;

  if (typeof switchTab === 'function') {
    switchTab('tagProject');
  }
  if (typeof switchManagementSubTab === 'function') {
    switchManagementSubTab('tag');
  }

  editingTagId = tagId;
  nameInput.value = target.name;
  colorInput.value = target.color;
  submitBtn.textContent = 'タグを更新';
  cancelBtn.style.display = 'inline-block';
  scrollToManagerForm(form, nameInput);
}

/**
 * プロジェクト編集開始
 * @param {string} projectId
 */
function startProjectEdit(projectId) {
  const target = PROJECTS.find(project => project.id === projectId);
  const form = document.getElementById('projectManagerForm');
  const nameInput = document.getElementById('projectManagerName');
  const colorInput = document.getElementById('projectManagerColor');
  const submitBtn = document.querySelector('#projectManagerForm button[type="submit"]');
  const cancelBtn = document.getElementById('projectManagerCancelEdit');
  if (!target || !form || !nameInput || !colorInput || !submitBtn || !cancelBtn) return;

  if (typeof switchTab === 'function') {
    switchTab('tagProject');
  }
  if (typeof switchManagementSubTab === 'function') {
    switchManagementSubTab('project');
  }

  editingProjectId = projectId;
  nameInput.value = target.name;
  colorInput.value = target.color;
  submitBtn.textContent = 'プロジェクトを更新';
  cancelBtn.style.display = 'inline-block';
  scrollToManagerForm(form, nameInput);
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
 * タグマスターを初期状態へ戻す
 */
function resetTags() {
  if (!confirm('タグを初期状態に戻しますか？\nこの操作は元に戻せません。')) {
    return;
  }

  TAGS.length = 0;
  TAGS.push(...DEFAULT_TAGS.map(tag => ({ ...tag })));

  const validTagIds = new Set(TAGS.map(tag => tag.id));
  Object.keys(taskTags).forEach(key => {
    const nextTags = (taskTags[key] || []).filter(id => validTagIds.has(id));
    if (nextTags.length > 0) {
      taskTags[key] = nextTags;
    } else {
      delete taskTags[key];
    }
  });

  cancelTagEdit();
  initTagSelector();
  renderMetadataManagers();
  renderAll();
  saveState();
  showToast('タグを初期状態にリセットしました', 'success');
}

/**
 * プロジェクトマスターを初期状態へ戻す
 */
function resetProjects() {
  if (!confirm('プロジェクトを初期状態に戻しますか？\nこの操作は元に戻せません。')) {
    return;
  }

  PROJECTS.length = 0;
  PROJECTS.push(...DEFAULT_PROJECTS.map(project => ({ ...project })));

  const validProjectIds = new Set(PROJECTS.map(project => project.id));
  Object.keys(taskProjects).forEach(key => {
    if (!validProjectIds.has(taskProjects[key])) {
      delete taskProjects[key];
    }
  });

  cancelProjectEdit();
  initProjectSelector();
  renderMetadataManagers();
  renderAll();
  saveState();
  showToast('プロジェクトを初期状態にリセットしました', 'success');
}

/**
 * タスクメタデータを保存
 * @param {string} key - タスクキー
 * @param {Object} metadata - メタデータオブジェクト
 */
function saveTaskMetadata(key, metadata) {
  if (metadata.project) {
    taskProjects[key] = metadata.project;
  } else {
    delete taskProjects[key];
  }

  if (metadata.startDate) {
    taskStartDates[key] = metadata.startDate;
  } else {
    delete taskStartDates[key];
  }

  if (metadata.endDate) {
    taskEndDates[key] = metadata.endDate;
  } else {
    delete taskEndDates[key];
  }

  if (metadata.tags && metadata.tags.length > 0) {
    taskTags[key] = metadata.tags;
  } else {
    delete taskTags[key];
  }

  if (metadata.estimatedTime) {
    taskEstimatedTime[key] = metadata.estimatedTime;
  } else {
    delete taskEstimatedTime[key];
  }

  const assigneeList = normalizeAssigneeList(metadata.assignee);
  if (assigneeList.length > 0) {
    taskAssignees[key] = assigneeList;
  } else {
    delete taskAssignees[key];
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
    assignee: normalizeAssigneeList(taskAssignees[key]),
    startDate: taskStartDates[key],
    endDate: taskEndDates[key],
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
  delete taskAssignees[key];
  delete taskStartDates[key];
  delete taskEndDates[key];
  delete taskTags[key];
  delete taskEstimatedTime[key];
  saveState();
}

// ============================================================================
// カンバンステータス管理
// ============================================================================

/**
 * ステータスの並び順を変更
 * @param {string} statusId
 * @param {'up'|'down'} direction
 */
function moveStatus(statusId, direction) {
  const index = KANBAN_STATUSES.findIndex(s => s.id === statusId);
  if (index < 0) return;
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= KANBAN_STATUSES.length) return;
  [KANBAN_STATUSES[index], KANBAN_STATUSES[targetIndex]] = [KANBAN_STATUSES[targetIndex], KANBAN_STATUSES[index]];
  KANBAN_STATUSES.forEach((s, i) => { s.order = i; });
  saveState();
  renderStatusManagerList();
  renderAll();
}

/**
 * ステータス管理リストを描画
 */
function renderStatusManagerList() {
  const container = document.getElementById('statusManagerList');
  if (!container) return;

  container.innerHTML = '';

  KANBAN_STATUSES.forEach((status, index) => {
    const item = document.createElement('div');
    item.className = 'custom-task-item';

    const isDoneStatus = status.id === DONE_STATUS_ID;

    const info = document.createElement('div');
    info.className = 'task-info';
    const title = document.createElement('strong');
    title.className = 'manager-item-title';
    const colorDot = document.createElement('span');
    colorDot.className = 'manager-color-dot';
    colorDot.style.background = status.color;
    const nameText = document.createElement('span');
    nameText.textContent = status.name;
    title.appendChild(colorDot);
    title.appendChild(nameText);
    const detail = document.createElement('small');
    detail.textContent = `ID: ${status.id}`;
    info.appendChild(title);
    info.appendChild(detail);

    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'button-group';
    buttonGroup.classList.add('manager-action-groups');

    const primaryActions = document.createElement('div');
    primaryActions.className = 'manager-primary-actions';

    const moveActions = document.createElement('div');
    moveActions.className = 'manager-move-actions';

    // 並び替えボタン
    const upBtn = document.createElement('button');
    upBtn.type = 'button';
    upBtn.className = 'btn-main btn-small';
    upBtn.textContent = '▲';
    upBtn.title = '上に移動';
    upBtn.disabled = index === 0;
    upBtn.addEventListener('click', () => moveStatus(status.id, 'up'));

    const downBtn = document.createElement('button');
    downBtn.type = 'button';
    downBtn.className = 'btn-main btn-small';
    downBtn.textContent = '▼';
    downBtn.title = '下に移動';
    downBtn.disabled = index === KANBAN_STATUSES.length - 1;
    downBtn.addEventListener('click', () => moveStatus(status.id, 'down'));

    if (!isDoneStatus) {
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'btn-main btn-small';
      editBtn.textContent = '編集';
      editBtn.addEventListener('click', () => startStatusEdit(status.id));

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'btn-danger btn-small';
      deleteBtn.textContent = '削除';
      deleteBtn.disabled = KANBAN_STATUSES.length <= 1;
      deleteBtn.addEventListener('click', () => deleteStatus(status.id));

      primaryActions.appendChild(editBtn);
      primaryActions.appendChild(deleteBtn);
    }

    moveActions.appendChild(upBtn);
    moveActions.appendChild(downBtn);
    if (primaryActions.children.length > 0) {
      buttonGroup.appendChild(primaryActions);
    }
    buttonGroup.appendChild(moveActions);
    item.appendChild(info);
    item.appendChild(buttonGroup);
    container.appendChild(item);
  });
}

/**
 * ステータスを作成/更新
 * @param {Event} e
 */
function handleStatusManagerSubmit(e) {
  e.preventDefault();
  const nameInput = document.getElementById('statusManagerName');
  const colorInput = document.getElementById('statusManagerColor');
  if (!nameInput || !colorInput) return;

  const name = nameInput.value.trim();
  const color = colorInput.value;
  if (!name) return;

  if (editingStatusId) {
    if (editingStatusId === DONE_STATUS_ID) {
      showToast('完了ステータスは編集できません。', 'warning');
      return;
    }
    const target = KANBAN_STATUSES.find(s => s.id === editingStatusId);
    if (target) {
      target.name = name;
      target.color = color;
    }
    showToast('ステータスを更新しました', 'success');
  } else {
    const id = generateMetadataId('status');
    KANBAN_STATUSES.push({ id, name, color, order: KANBAN_STATUSES.length });
    showToast('ステータスを追加しました', 'success');
  }

  saveState();
  cancelStatusEdit();
  renderStatusManagerList();
  renderAll();
}

/**
 * ステータス編集開始
 * @param {string} statusId
 */
function startStatusEdit(statusId) {
  const target = KANBAN_STATUSES.find(s => s.id === statusId);
  const form = document.getElementById('statusManagerForm');
  const nameInput = document.getElementById('statusManagerName');
  const colorInput = document.getElementById('statusManagerColor');
  const submitBtn = document.querySelector('#statusManagerForm button[type="submit"]');
  const cancelBtn = document.getElementById('statusManagerCancelEdit');
  if (!target || !form || !nameInput || !colorInput || !submitBtn || !cancelBtn) return;

  if (typeof switchTab === 'function') {
    switchTab('tagProject');
  }
  if (typeof switchManagementSubTab === 'function') {
    switchManagementSubTab('kanban');
  }

  editingStatusId = statusId;
  nameInput.value = target.name;
  colorInput.value = target.color;
  submitBtn.textContent = 'ステータスを更新';
  cancelBtn.style.display = 'inline-block';
  scrollToManagerForm(form, nameInput);
}

/**
 * ステータス編集キャンセル
 */
function cancelStatusEdit() {
  const form = document.getElementById('statusManagerForm');
  const submitBtn = document.querySelector('#statusManagerForm button[type="submit"]');
  const cancelBtn = document.getElementById('statusManagerCancelEdit');
  if (form) form.reset();
  if (submitBtn) submitBtn.textContent = 'ステータスを追加';
  if (cancelBtn) cancelBtn.style.display = 'none';
  const colorInput = document.getElementById('statusManagerColor');
  if (colorInput) colorInput.value = '#6b7280';
  editingStatusId = null;
}

/**
 * ステータス削除
 * @param {string} statusId
 */
function deleteStatus(statusId) {
  if (statusId === DONE_STATUS_ID) {
    alert('完了ステータスは削除できません。');
    return;
  }
  if (KANBAN_STATUSES.length <= 1) {
    alert('少なくとも1つのステータスが必要です。');
    return;
  }
  const target = KANBAN_STATUSES.find(s => s.id === statusId);
  if (!target) return;
  const fallbackId = KANBAN_STATUSES.find(s => s.id !== statusId)?.id;
  if (!confirm(`「${target.name}」を削除しますか？\nこのステータスのタスクは「${KANBAN_STATUSES.find(s => s.id === fallbackId)?.name}」に移動します。`)) return;

  const index = KANBAN_STATUSES.findIndex(s => s.id === statusId);
  if (index > -1) KANBAN_STATUSES.splice(index, 1);

  Object.keys(taskStatus).forEach(key => {
    if (taskStatus[key] === statusId) {
      if (fallbackId) {
        taskStatus[key] = fallbackId;
      } else {
        delete taskStatus[key];
      }
    }
  });

  if (editingStatusId === statusId) cancelStatusEdit();

  saveState();
  renderStatusManagerList();
  renderAll();
  showToast('ステータスを削除しました', 'success');
}

/**
 * ステータスをデフォルトに戻す
 */
function resetKanbanStatuses() {
  if (!confirm('カンバンステータスをデフォルトに戻しますか？\nカスタムステータスは削除されます。')) return;

  const defaultIds = new Set(DEFAULT_KANBAN_STATUSES.map(s => s.id));
  Object.keys(taskStatus).forEach(key => {
    if (!defaultIds.has(taskStatus[key])) {
      taskStatus[key] = DEFAULT_KANBAN_STATUSES[0].id;
    }
  });

  KANBAN_STATUSES.length = 0;
  KANBAN_STATUSES.push(...DEFAULT_KANBAN_STATUSES.map(s => ({ ...s })));

  cancelStatusEdit();
  saveState();
  renderStatusManagerList();
  renderAll();
  showToast('ステータスをデフォルトに戻しました', 'success');
}
