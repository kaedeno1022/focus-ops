// ============================================================================
// 設定モーダルとタスク管理
// ============================================================================

let lastModalFocusElement = null;

/**
 * 設定モーダルのスクロール位置を先頭へ戻す
 */
function scrollSettingsModalToTop() {
  window.scrollTo({ top: 0, behavior: 'auto' });

  const modalBody = document.querySelector('#settingsModal .modal-body');
  const modalContent = document.querySelector('#settingsModal .modal-content');
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (modalBody) {
    modalBody.scrollTo({
      top: 0,
      behavior: reduceMotion ? 'auto' : 'smooth'
    });
    modalBody.scrollTop = 0;
  }

  if (modalContent) {
    modalContent.scrollTop = 0;
  }

  requestAnimationFrame(() => {
    if (modalBody) modalBody.scrollTop = 0;
    if (modalContent) modalContent.scrollTop = 0;
  });
}

/**
 * 設定モーダルを開く
 */
function openSettingsModal() {
  const modal = getElement('settingsModal');
  if (!modal) return;

  // リスト画面で開いたステータスドロップダウンが残るとモーダル表示を崩すため、先に閉じる。
  document.querySelectorAll('.status-dropdown').forEach(dropdown => dropdown.remove());

  const activeElement = document.activeElement;
  if (activeElement instanceof HTMLElement) {
    lastModalFocusElement = activeElement;
  }
  
  modal.style.display = 'flex';
  
  // スクロールバーの幅を計算してレイアウトシフトを防止
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
  document.body.style.paddingRight = `${scrollbarWidth}px`;
  document.body.classList.add('no-scroll');
  
  // フォーカスをモーダル内に移動
  setTimeout(() => {
    const closeBtn = getElement('closeSettingsBtn');
    if (closeBtn) closeBtn.focus();
  }, 100);
  
  renderCustomTaskList();
  renderMetadataManagers();
  if (!editingTask) {
    switchTab('custom');
  }
  scrollSettingsModalToTop();
  closeMenu();
}

/**
 * 設定モーダルを閉じる
 */
function closeSettingsModal() {
  const modal = getElement('settingsModal');
  if (!modal) return;
  
  modal.style.display = 'none';
  
  // スクロール防止とパディングを解除
  document.body.classList.remove('no-scroll');
  document.body.style.paddingRight = '';
  
  // 編集モードと入力中フォームをキャンセル
  cancelTaskEdit();
  cancelTagEdit();
  cancelProjectEdit();
  cancelAssigneeEdit();
  cancelStatusEdit();
  switchTab('custom');
  scrollSettingsModalToTop();

  if (lastModalFocusElement && document.body.contains(lastModalFocusElement)) {
    lastModalFocusElement.focus();
  }
}

/**
 * タスク追加フォームを特定のタイプで開く
 * @param {string} taskType - タスクタイプ ('daily' | 'weekly' | 'season')
 */
function openTaskFormWithType(taskType) {
  // 設定モーダルを開く
  openSettingsModal();
  
  // タスク管理タブに切り替え
  switchTab('custom');
  
  // タスクタイプを設定
  const taskTypeSelect = getElement('taskType');
  if (taskTypeSelect) {
    taskTypeSelect.value = taskType;
  }
  
  // タスク名入力フォームにフォーカス
  setTimeout(() => {
    const taskTitleInput = getElement('taskTitle');
    if (taskTitleInput) {
      taskTitleInput.focus();
    }
  }, 200);
}

/**
 * タブを切り替える
 * @param {string} tabName - タブ名 ('custom' | 'tagProject')
 */
function switchTab(tabName) {
  if (tabName !== 'custom') {
    cancelTaskEdit();
  }

  const tabs = {
    custom:     { btn: getElement('customTaskTab'),   panel: getElement('customTaskPanel') },
    tagProject: { btn: getElement('tagProjectTab'),   panel: getElement('tagProjectPanel') },
  };

  Object.entries(tabs).forEach(([key, { btn, panel }]) => {
    const isActive = key === tabName;
    btn?.classList.toggle('active', isActive);
    panel?.classList.toggle('active', isActive);
  });

  if (tabName === 'tagProject') {
    switchManagementSubTab('tag');
  }
}

/**
 * 管理タブ内のサブタブを切り替える
 * @param {string} subTabName - サブタブ名 ('tag' | 'project' | 'assignee' | 'kanban')
 */
function switchManagementSubTab(subTabName) {
  if (subTabName === 'assignee' && !adminMode) {
    subTabName = 'tag';
  }

  if (subTabName !== 'tag') {
    cancelTagEdit();
  }
  if (subTabName !== 'project') {
    cancelProjectEdit();
  }
  if (subTabName !== 'assignee') {
    cancelAssigneeEdit();
  }
  if (subTabName !== 'kanban') {
    cancelStatusEdit();
  }

  const subTabs = {
    tag: { btn: getElement('tagManagementSubTab'), panel: getElement('tagManagementSubPanel') },
    project: { btn: getElement('projectManagementSubTab'), panel: getElement('projectManagementSubPanel') },
    assignee: { btn: getElement('assigneeManagementSubTab'), panel: getElement('assigneeManagementSubPanel') },
    kanban: { btn: getElement('managementKanbanSubTab'), panel: getElement('managementKanbanSubPanel') }
  };

  Object.entries(subTabs).forEach(([key, { btn, panel }]) => {
    const isActive = key === subTabName;
    btn?.classList.toggle('active', isActive);
    panel?.classList.toggle('active', isActive);
  });
}

/**
 * 表示設定をレンダリング（廃止: タスク一覧に統合）
 */
function renderVisibilitySettings() {
  // この関数は廃止されました
  // 表示設定はrenderCustomTaskList内で管理されています
}

/**
 * 全タスクリスト（デフォルト+カスタム）をレンダリング
 */
function renderCustomTaskList() {
  const container = getElement('customTaskList');
  if (!container) return;
  
  container.innerHTML = '';
  
  // 期間ごとにタスクを収集
  const tasksByType = { daily: [], weekly: [], season: [] };
  
  ['daily', 'weekly', 'season'].forEach(type => {
    // デフォルトタスクを収集
    const defaultTasks = DATA[type] || [];
    const edited = editedDefaultTasks[type] || {};
    
    defaultTasks.forEach(group => {
      group.tasks.forEach(([title, priority]) => {
        const key = createKey(type, group.category, title);
        // 削除済みタスクはスキップ
        if (deletedDefaultTasks.has(key)) return;
        
        // 編集されている場合は編集後の情報を使用
        const taskInfo = edited[key] ? {
          title: edited[key].title,
          priority: edited[key].priority,
          originalCategory: group.category,
          originalTitle: title,
          originalPriority: priority
        } : {
          title: title,
          priority: priority,
          originalCategory: group.category,
          originalTitle: title,
          originalPriority: priority
        };
        
        const category = getCategoryFromPriority(taskInfo.priority);
        const taskKey = edited[key] ? createKey(type, category, taskInfo.title) : key;
        
        tasksByType[type].push({
          type,
          title: taskInfo.title,
          priority: taskInfo.priority,
          category,
          key: taskKey,
          originalKey: key,
          originalCategory: taskInfo.originalCategory,
          originalTitle: taskInfo.originalTitle,
          originalPriority: taskInfo.originalPriority,
          isCustom: false,
          isEdited: !!edited[key]
        });
      });
    });
    
    // カスタムタスクを収集
    const tasks = customTasks[type] || [];
    
    tasks.forEach((task, index) => {
      const category = getCategoryFromPriority(task.priority);
      const key = createKey(type, category, task.title);
      
      tasksByType[type].push({
        type,
        title: task.title,
        priority: task.priority,
        category,
        key,
        isCustom: true,
        customIndex: index
      });
    });
  });
  
  // 各期間のタスクを優先度 → タイトル順でソート
  const priorityOrder = { high: 1, mid: 2, low: 3 };
  
  ['daily', 'weekly', 'season'].forEach(type => {
    tasksByType[type].sort((a, b) => {
      // 優先度でソート
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      // タイトルでソート
      return a.title.localeCompare(b.title, 'ja');
    });
  });
  
  // 全タスク数を確認
  const totalTasks = tasksByType.daily.length + tasksByType.weekly.length + tasksByType.season.length;
  
  // タスクが存在しない場合
  if (totalTasks === 0) {
    const emptyWrap = document.createElement('div');
    emptyWrap.className = 'empty-state-wrap';

    const emptyMsg = document.createElement('p');
    emptyMsg.className = 'empty-message';
    emptyMsg.textContent = 'タスクはまだ追加されていません。';

    const ctaBtn = document.createElement('button');
    ctaBtn.type = 'button';
    ctaBtn.className = 'btn-main btn-small empty-state-cta';
    ctaBtn.textContent = '最初の1件を追加';
    ctaBtn.addEventListener('click', () => {
      const form = getElement('addTaskForm');
      if (!form) return;
      switchTab('custom');
      form.taskTitle.focus();
    });

    emptyWrap.appendChild(emptyMsg);
    emptyWrap.appendChild(ctaBtn);
    container.appendChild(emptyWrap);
    return;
  }
  
  // 期間ごとにグループ表示
  const typeLabels = {
    daily: '今日のタスク',
    weekly: '今週のタスク',
    season: '長期のタスク'
  };
  
  ['daily', 'weekly', 'season'].forEach(type => {
    const tasks = tasksByType[type];
    if (tasks.length === 0) return;
    
    // グループヘッダー
    const groupHeader = document.createElement('div');
    groupHeader.className = 'task-group-header';
    groupHeader.innerHTML = `
      <h3>${typeLabels[type]}</h3>
      <span class="task-count">${tasks.length}件</span>
    `;
    container.appendChild(groupHeader);
    
    // タスクを表示
    tasks.forEach(task => {
    const item = document.createElement('div');
    item.className = 'custom-task-item';
    
    const info = document.createElement('div');
    info.className = 'task-info';
    
    const priorityLabel = {
      high: '高',
      mid: '中',
      low: '低'
    }[task.priority];
    
    const comment = taskComments[task.key] || '';
    
    info.innerHTML = `
      <strong>${task.title}</strong><br>
      <small>${task.category} / 優先度: ${priorityLabel}</small>
      ${comment ? `<br><small class="task-comment-small">💬 ${comment}</small>` : ''}
    `;
    
    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'button-group';
    
    // 表示/非表示トグルボタン
    const isVisible = taskVisibility[task.key] !== false;
    const visibilityBtn = document.createElement('button');
    visibilityBtn.className = 'btn-secondary btn-small';
    visibilityBtn.textContent = isVisible ? '表示中' : '非表示';
    visibilityBtn.type = 'button';
    visibilityBtn.title = isVisible ? '非表示にする' : '表示する';
    
    visibilityBtn.addEventListener('click', () => {
      taskVisibility[task.key] = !isVisible;
      saveState();
      renderCustomTaskList();
      renderAll();
      showToast(`${task.title}を${!isVisible ? '表示' : '非表示'}に設定`, 'success');
    });
    
    // 編集ボタン
    const editBtn = document.createElement('button');
    editBtn.className = 'btn-main btn-small';
    editBtn.textContent = '編集';
    editBtn.type = 'button';
    
    editBtn.addEventListener('click', () => {
      // デフォルトタスクの場合は元の情報を渡す
      const originalInfo = task.isCustom ? null : {
        originalCategory: task.originalCategory,
        originalTitle: task.originalTitle,
        originalPriority: task.originalPriority
      };
      openTaskEditForm(task.type, task.category, task.title, task.priority, task.isCustom, originalInfo);
    });
    
    // 削除ボタン
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-danger btn-small';
    deleteBtn.textContent = '削除';
    deleteBtn.type = 'button';
    
    deleteBtn.addEventListener('click', () => {
      if (confirm(`「${task.title}」を削除しますか？`)) {
        if (task.isCustom) {
          // カスタムタスクの削除
          customTasks[task.type].splice(task.customIndex, 1);
        } else {
          // デフォルトタスクの削除（deletedDefaultTasksに追加）
          deletedDefaultTasks.add(task.originalKey);
          // 編集情報も削除
          if (editedDefaultTasks[task.type] && editedDefaultTasks[task.type][task.originalKey]) {
            delete editedDefaultTasks[task.type][task.originalKey];
          }
        }
        
        // コメントとメタデータも削除
        if (taskComments[task.key]) {
          delete taskComments[task.key];
        }
        if (taskVisibility[task.key] !== undefined) {
          delete taskVisibility[task.key];
        }
        deleteTaskMetadata(task.key);
        
        saveState();
        renderCustomTaskList();
        renderAll();
        showToast(`${task.title}を削除`, 'success');
      }
    });
    
    buttonGroup.appendChild(visibilityBtn);
    buttonGroup.appendChild(editBtn);
    buttonGroup.appendChild(deleteBtn);
    
      item.appendChild(info);
      item.appendChild(buttonGroup);
      container.appendChild(item);
    });
  });
}

/**
 * カスタムタスクを追加
 * @param {Event} e - フォームイベント
 */
function addCustomTask(e) {
  e.preventDefault();
  
  const form = e.target;
  const type = form.taskType.value;
  const title = form.taskTitle.value.trim();
  const priority = form.taskPriority.value;
  const comment = form.taskComment.value.trim();
  
  if (!title) {
    alert('タスク名を入力してください。');
    return;
  }
  
  // 編集モードの場合
  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn && submitBtn.dataset.editMode === 'true') {
    saveTaskEdit(type, title, priority, comment);
    return;
  }
  
  // 優先度に基づいてカテゴリを自動設定
  const category = getCategoryFromPriority(priority);
  
  // 重複チェック
  const key = createKey(type, category, title);
  const allTasks = getAllTasks(type);
  let isDuplicate = false;
  
  allTasks.forEach(group => {
    group.tasks.forEach(([taskTitle]) => {
      const existingKey = createKey(type, group.category, taskTitle);
      if (existingKey === key) {
        isDuplicate = true;
      }
    });
  });
  
  if (isDuplicate) {
    alert('同じ名前のタスクが既に存在します。');
    return;
  }

  // 開始日・終了日の逆転チェック
  if (!validateTaskDateOrder()) return;
  
  // カスタムタスクを追加
  if (!customTasks[type]) {
    customTasks[type] = [];
  }
  
  customTasks[type].push({
    title,
    priority
  });
  
  // コメントがある場合は保存
  if (comment) {
    taskComments[key] = comment;
  }
  
  // メタデータを保存
  const metadata = getTaskMetadataFromForm();
  saveTaskMetadata(key, metadata);
  
  saveState();
  form.reset();
  clearTaskMetadataForm();
  if (typeof cancelTaskEdit === 'function') {
    // Ensure form UI is explicitly in add mode even after previous edit operations.
    cancelTaskEdit();
  }
  renderCustomTaskList();
  renderAll();

  if (form.taskTitle) {
    form.taskTitle.focus();
  }
  
  const categoryLabel = getCategoryFromPriority(priority);
  // トーストメッセージを表示
  showToast(`${title}を${categoryLabel}に追加しました（続けて追加できます）`, 'success');
}

/**
 * タスク編集フォームを開く
 * @param {string} type - タスクタイプ
 * @param {string} category - カテゴリー名
 * @param {string} title - タスクタイトル
 * @param {string} priority - 優先度
 * @param {boolean} isCustomTask - カスタムタスクかどうか
 * @param {Object} [originalInfo] - デフォルトタスクの元の情報（編集済みデフォルトタスクの場合）
 */
function openTaskEditForm(type, category, title, priority, isCustomTask, originalInfo = null) {
  const form = getElement('addTaskForm');
  if (!form) return;

  // ステータス変更ドロップダウンが開いたまま編集へ遷移した場合に備えて必ず閉じる。
  document.querySelectorAll('.status-dropdown').forEach(dropdown => dropdown.remove());

  // 編集中のタスク情報を保存
  // originalInfoがある場合（編集済みデフォルトタスク）は元の情報を使用
  const editCategory = originalInfo ? originalInfo.originalCategory : category;
  const editTitle = originalInfo ? originalInfo.originalTitle : title;
  const editPriority = originalInfo ? originalInfo.originalPriority : priority;
  
  editingTask = {
    type,
    category: editCategory,
    title: editTitle,
    priority: editPriority,
    isCustomTask,
    originalKey: createKey(type, editCategory, editTitle)
  };

  // フォームに現在の値を設定
  form.taskType.value = type;
  form.taskTitle.value = title;
  form.taskPriority.value = priority;
  
  // コメントを取得（現在のキーで）
  const currentCategory = getCategoryFromPriority(priority);
  const currentKey = createKey(type, currentCategory, title);
  form.taskComment.value = taskComments[currentKey] || '';

  // メタデータをフォームに反映
  const metadata = getTaskMetadata(currentKey);
  setTaskMetadataToForm(metadata);

  // 送信ボタンのテキストを変更
  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.textContent = 'タスクを更新';
    submitBtn.dataset.editMode = 'true';
  }

  // フォームの上にメッセージを表示
  let editNotice = form.querySelector('.edit-notice');
  if (!editNotice) {
    editNotice = document.createElement('div');
    editNotice.className = 'edit-notice';
    form.insertBefore(editNotice, form.firstChild);
  }
  editNotice.textContent = `編集モード: ${title}`;
  editNotice.style.display = 'block';

  // キャンセルボタンを追加（まだなければ）
  let cancelBtn = form.querySelector('.cancel-edit-btn');
  if (!cancelBtn) {
    cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn-secondary cancel-edit-btn';
    cancelBtn.textContent = '編集をキャンセル';
    submitBtn.insertAdjacentElement('afterend', cancelBtn);

    cancelBtn.addEventListener('click', cancelTaskEdit);
  }
  cancelBtn.style.display = 'inline-block';

  // 設定モーダルを開いてカスタムタスクタブに切り替え
  openSettingsModal();
  switchTab('custom');

  // タイトル入力欄にフォーカス
  setTimeout(() => form.taskTitle.focus(), 100);
}

/**
 * タスク編集をキャンセル
 */
function cancelTaskEdit() {
  const form = getElement('addTaskForm');
  if (!form) return;

  // フォームをリセット
  form.reset();

  // 送信ボタンのテキストを戻す
  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.textContent = 'タスクを追加';
    delete submitBtn.dataset.editMode;
  }

  // 編集通知を非表示
  const editNotice = form.querySelector('.edit-notice');
  if (editNotice) {
    editNotice.style.display = 'none';
  }

  // キャンセルボタンを非表示
  const cancelBtn = form.querySelector('.cancel-edit-btn');
  if (cancelBtn) {
    cancelBtn.style.display = 'none';
  }

  // 編集中のタスク情報をクリア
  editingTask = null;
}

/**
 * タスク編集を保存
 * @param {string} newType - 新しいタスクタイプ
 * @param {string} newTitle - 新しいタスクタイトル
 * @param {string} newPriority - 新しい優先度
 * @param {string} newComment - 新しいコメント
 */
function saveTaskEdit(newType, newTitle, newPriority, newComment) {
  if (!editingTask) return;

  const { type: oldType, category: oldCategory, title: oldTitle, isCustomTask, originalKey } = editingTask;
  const newCategory = getCategoryFromPriority(newPriority);
  const newKey = createKey(newType, newCategory, newTitle);
  
  // 現在のタスクのキーを取得（編集済みの場合は編集後のキー）
  let currentKey = originalKey;
  if (!isCustomTask) {
    const edited = editedDefaultTasks[oldType] || {};
    if (edited[originalKey]) {
      // 既に編集されている場合、現在のキーは編集後のもの
      const currentCategory = getCategoryFromPriority(edited[originalKey].priority);
      currentKey = createKey(oldType, currentCategory, edited[originalKey].title);
    }
  } else {
    currentKey = createKey(oldType, oldCategory, oldTitle);
  }

  if (isCustomTask) {
    // カスタムタスクの編集
    const taskIndex = customTasks[oldType]?.findIndex(t => 
      t.title === oldTitle && getCategoryFromPriority(t.priority) === oldCategory
    );

    if (taskIndex !== -1) {
      // タスクタイプが変更された場合
      if (oldType !== newType) {
        // 古いタイプから削除
        customTasks[oldType].splice(taskIndex, 1);
        // 新しいタイプに追加
        if (!customTasks[newType]) {
          customTasks[newType] = [];
        }
        customTasks[newType].push({
          title: newTitle,
          priority: newPriority
        });
      } else {
        // 同じタイプ内で更新
        customTasks[oldType][taskIndex] = {
          title: newTitle,
          priority: newPriority
        };
      }
    }
  } else {
    // デフォルトタスクの編集
    if (!editedDefaultTasks[oldType]) {
      editedDefaultTasks[oldType] = {};
    }
    
    // タスクタイプが変更された場合は、カスタムタスクとして追加
    if (oldType !== newType) {
      // 元のデフォルトタスクを非表示にする
      taskVisibility[originalKey] = false;
      
      // 編集記録から削除
      if (editedDefaultTasks[oldType] && editedDefaultTasks[oldType][originalKey]) {
        delete editedDefaultTasks[oldType][originalKey];
      }
      
      // 新しいタイプにカスタムタスクとして追加
      if (!customTasks[newType]) {
        customTasks[newType] = [];
      }
      customTasks[newType].push({
        title: newTitle,
        priority: newPriority
      });
    } else {
      // 同じタイプ内で編集情報を保存（originalKeyをキーとして使用）
      editedDefaultTasks[oldType][originalKey] = {
        title: newTitle,
        priority: newPriority,
        originalTitle: oldTitle,
        originalPriority: editingTask.priority
      };
    }
  }

  // 開始日・終了日の逆転チェック
  if (!validateTaskDateOrder()) return;

  // チェック状態・コメント・メタデータを移行（currentKeyから新しいキーへ）
  if (currentKey !== newKey) {
    if (checkedState[currentKey]) {
      checkedState[newKey] = checkedState[currentKey];
      delete checkedState[currentKey];
    }
    
    if (taskComments[currentKey]) {
      // 古いコメントを新しいキーに移動（新しいコメントがない場合）
      if (!newComment) {
        taskComments[newKey] = taskComments[currentKey];
      }
      delete taskComments[currentKey];
    }

    // メタデータを移行
    deleteTaskMetadata(currentKey);

    // フォーム入力を正として保存（未入力は削除扱い）
    const newMetadata = getTaskMetadataFromForm();
    saveTaskMetadata(newKey, newMetadata);
  } else {
    // 同じキーの場合はメタデータを更新
    const newMetadata = getTaskMetadataFromForm();
    saveTaskMetadata(newKey, newMetadata);
  }

  // 新しいコメントを保存
  if (newComment) {
    taskComments[newKey] = newComment;
  } else if (!taskComments[newKey]) {
    // 新しいコメントがなく、移行もされていない場合は削除
    delete taskComments[newKey];
  }

  saveState();
  renderCustomTaskList();
  renderAll();

  // 更新後は追加モードへ戻して、次の新規追加と区別しやすくする
  cancelTaskEdit();
  scrollSettingsModalToTop();

  const reopenEdit = () => {
    if (typeof openTaskEditFromMain === 'function') {
      openTaskEditFromMain(newType, newCategory, newTitle, newPriority);
    }
  };

  // トーストメッセージを表示
  showToast(`${newTitle}の編集が完了しました`, 'success', 4500, {
    dedupeKey: 'task-edit-updated',
    actions: [
      {
        label: 'もう一度編集',
        onClick: reopenEdit
      }
    ]
  });
}

/**
 * メイン画面のタスクから編集フォームを開く
 * @param {string} type - タスクタイプ
 * @param {string} category - 表示中カテゴリ
 * @param {string} title - 表示中タイトル
 * @param {string} priority - 表示中優先度
 */
function openTaskEditFromMain(type, category, title, priority) {
  const key = createKey(type, category, title);
  const isCustomTask = customTasks[type]?.some(task => (
    task.title === title && getCategoryFromPriority(task.priority) === category
  ));

  let originalInfo = null;
  if (!isCustomTask) {
    const defaultTasks = DATA[type] || [];
    const originalTasksMap = new Map();

    defaultTasks.forEach(group => {
      group.tasks.forEach(([defaultTitle, defaultPriority]) => {
        const originalKey = createKey(type, group.category, defaultTitle);
        originalTasksMap.set(originalKey, {
          originalTitle: defaultTitle,
          originalPriority: defaultPriority,
          originalCategory: group.category
        });
      });
    });

    const edited = editedDefaultTasks[type] || {};
    for (const [originalKey, editData] of Object.entries(edited)) {
      if (editData.title === title && getCategoryFromPriority(editData.priority) === category) {
        originalInfo = originalTasksMap.get(originalKey) || null;
        break;
      }
    }

    if (!originalInfo && originalTasksMap.has(key)) {
      originalInfo = originalTasksMap.get(key);
    }
  }

  openTaskEditForm(type, category, title, priority, isCustomTask, originalInfo);
}
