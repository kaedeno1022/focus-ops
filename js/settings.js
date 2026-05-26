// ============================================================================
// 設定モーダルとタスク管理
// ============================================================================

/**
 * 設定モーダルを開く
 */
function openSettingsModal() {
  const modal = getElement('settingsModal');
  if (!modal) return;
  
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
  
  renderVisibilitySettings();
  renderCustomTaskList();
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
  
  // 編集モードをキャンセル
  if (editingTask) {
    cancelTaskEdit();
  }
}

/**
 * タブを切り替える
 * @param {string} tabName - タブ名 ('visibility' or 'custom')
 */
function switchTab(tabName) {
  const visibilityTab = getElement('visibilityTab');
  const customTaskTab = getElement('customTaskTab');
  const visibilityPanel = getElement('visibilityPanel');
  const customTaskPanel = getElement('customTaskPanel');
  
  if (tabName === 'visibility') {
    visibilityTab?.classList.add('active');
    customTaskTab?.classList.remove('active');
    visibilityPanel?.classList.add('active');
    customTaskPanel?.classList.remove('active');
  } else {
    visibilityTab?.classList.remove('active');
    customTaskTab?.classList.add('active');
    visibilityPanel?.classList.remove('active');
    customTaskPanel?.classList.add('active');
  }
}

/**
 * 表示設定をレンダリング
 */
function renderVisibilitySettings() {
  ['daily', 'weekly', 'season'].forEach(type => {
    const container = getElement(`${type}VisibilitySettings`);
    if (!container) return;
    
    container.innerHTML = '';
    
    // 重複を防ぐため、既に表示したタスクキーを記録
    const displayedKeys = new Set();
    
    const categories = getAllTasks(type);
    const edited = editedDefaultTasks[type] || {};
    
    // 元のデフォルトタスクも確認するため
    const defaultTasks = DATA[type] || [];
    const originalTasksMap = new Map(); // key -> {originalTitle, originalPriority, originalCategory}
    
    defaultTasks.forEach(group => {
      group.tasks.forEach(([title, priority]) => {
        const key = createKey(type, group.category, title);
        originalTasksMap.set(key, {
          originalTitle: title,
          originalPriority: priority,
          originalCategory: group.category
        });
      });
    });
    
    categories.forEach(group => {
      group.tasks.forEach(([title, priority]) => {
        const key = createKey(type, group.category, title);
        
        // 既に表示済みの場合はスキップ
        if (displayedKeys.has(key)) {
          return;
        }
        displayedKeys.add(key);
        
        const visible = isTaskVisible(key);
        
        const item = document.createElement('div');
        item.className = 'visibility-item';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = visible;
        checkbox.id = `vis_${key}`;
        
        const label = document.createElement('label');
        label.htmlFor = checkbox.id;
        label.textContent = `[${group.category}] ${title}`;
        
        checkbox.addEventListener('change', () => {
          taskVisibility[key] = checkbox.checked;
          saveState();
          renderAll();
          updateSystemStatus();
        });
        
        // 編集ボタンを追加
        const editBtn = document.createElement('button');
        editBtn.className = 'btn-main btn-small';
        editBtn.textContent = '編集';
        editBtn.type = 'button';
        
        // タスクがカスタムかデフォルトかを判定
        const isCustomTask = customTasks[type]?.some(t => 
          t.title === title && getCategoryFromPriority(t.priority) === group.category
        );
        
        // 元のタスク情報を特定（編集済みの場合を考慮）
        let originalInfo = null;
        if (!isCustomTask) {
          // 編集済みタスクから元の情報を探す
          for (const [origKey, editData] of Object.entries(edited)) {
            if (editData.title === title && getCategoryFromPriority(editData.priority) === group.category) {
              originalInfo = originalTasksMap.get(origKey);
              break;
            }
          }
          // 編集されていない場合は元のまま
          if (!originalInfo && originalTasksMap.has(key)) {
            originalInfo = originalTasksMap.get(key);
          }
        }
        
        editBtn.addEventListener('click', () => {
          if (originalInfo) {
            // デフォルトタスクの場合、元の情報を渡して開く
            openTaskEditForm(type, group.category, title, priority, false, originalInfo);
          } else {
            // カスタムタスクの場合
            openTaskEditForm(type, group.category, title, priority, true);
          }
        });
        
        // 2行レイアウト: 1行目にチェックボックス+ラベル、2行目に編集ボタン
        const header = document.createElement('div');
        header.className = 'visibility-item-header';
        header.appendChild(checkbox);
        header.appendChild(label);
        
        item.appendChild(header);
        item.appendChild(editBtn);
        container.appendChild(item);
      });
    });
  });
}

/**
 * カスタムタスクリストをレンダリング
 */
function renderCustomTaskList() {
  const container = getElement('customTaskList');
  if (!container) return;
  
  container.innerHTML = '';
  
  let hasCustomTasks = false;
  
  ['daily', 'weekly', 'season'].forEach(type => {
    const tasks = customTasks[type] || [];
    
    tasks.forEach((task, index) => {
      hasCustomTasks = true;
      
      const item = document.createElement('div');
      item.className = 'custom-task-item';
      
      const info = document.createElement('div');
      info.className = 'task-info';
      
      const typeLabel = {
        daily: 'デイリー',
        weekly: 'ウィークリー',
        season: 'シーズン'
      }[type];
      
      const priorityLabel = {
        high: '高',
        mid: '中',
        low: '低'
      }[task.priority];
      
      const category = getCategoryFromPriority(task.priority);
      
      const key = createKey(type, category, task.title);
      const comment = taskComments[key] || '';
      
      info.innerHTML = `
        <strong>${task.title}</strong><br>
        <small>${typeLabel} / ${category} / 優先度: ${priorityLabel}</small>
        ${comment ? `<br><small class="task-comment-small">💬 ${comment}</small>` : ''}
      `;
      
      const buttonGroup = document.createElement('div');
      buttonGroup.className = 'button-group';
      
      // 編集ボタン
      const editBtn = document.createElement('button');
      editBtn.className = 'btn-main btn-small';
      editBtn.textContent = '編集';
      editBtn.type = 'button';
      
      editBtn.addEventListener('click', () => {
        openTaskEditForm(type, category, task.title, task.priority, true);
      });
      
      // 削除ボタン
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn-danger btn-small';
      deleteBtn.textContent = '削除';
      deleteBtn.type = 'button';
      
      deleteBtn.addEventListener('click', () => {
        if (confirm(`「${task.title}」を削除しますか？`)) {
          customTasks[type].splice(index, 1);
          
          // コメントとメタデータも削除
          const category = getCategoryFromPriority(task.priority);
          const key = createKey(type, category, task.title);
          if (taskComments[key]) {
            delete taskComments[key];
          }
          deleteTaskMetadata(key);
          
          saveState();
          renderCustomTaskList();
          renderAll();
          updateSystemStatus();
          // トーストメッセージを表示
          showToast(`${task.title}を削除しました`, 'success');
        }
      });
      
      buttonGroup.appendChild(editBtn);
      buttonGroup.appendChild(deleteBtn);
      
      item.appendChild(info);
      item.appendChild(buttonGroup);
      container.appendChild(item);
    });
  });
  
  if (!hasCustomTasks) {
    container.innerHTML = '<p class="empty-message">カスタムタスクはまだ追加されていません。</p>';
  }
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
    cancelTaskEdit();
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
  renderCustomTaskList();
  renderAll();
  updateSystemStatus();
  
  const categoryLabel = getCategoryFromPriority(priority);
  // トーストメッセージを表示
  showToast(`${title}を${categoryLabel}に追加しました`, 'success');
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
    const oldMetadata = getTaskMetadata(currentKey);
    deleteTaskMetadata(currentKey);
    
    // フォームから新しいメタデータを取得してマージ
    const newMetadata = getTaskMetadataFromForm();
    const mergedMetadata = {
      project: newMetadata.project !== undefined ? newMetadata.project : oldMetadata.project,
      deadline: newMetadata.deadline !== undefined ? newMetadata.deadline : oldMetadata.deadline,
      tags: newMetadata.tags !== undefined ? newMetadata.tags : oldMetadata.tags,
      estimatedTime: newMetadata.estimatedTime !== undefined ? newMetadata.estimatedTime : oldMetadata.estimatedTime
    };
    saveTaskMetadata(newKey, mergedMetadata);
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
  updateSystemStatus();
  renderVisibilitySettings();

  // トーストメッセージを表示
  showToast(`${newTitle}を更新しました`, 'success');
}
