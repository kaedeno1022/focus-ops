// ============================================================================
// メニュー操作とリセット機能
// ============================================================================

let resetUndoSnapshot = null;
let menuScrollLockY = 0;

/**
 * メニュー表示中に背景スクロールを完全にロック
 */
function lockPageScrollForMenu() {
  if (document.body.classList.contains('menu-open')) return;

  menuScrollLockY = window.scrollY || window.pageYOffset || 0;
  document.documentElement.classList.add('menu-open');
  document.body.classList.add('menu-open');

  document.body.style.position = 'fixed';
  document.body.style.top = `-${menuScrollLockY}px`;
  document.body.style.left = '0';
  document.body.style.right = '0';
  document.body.style.width = '100%';
}

/**
 * メニュー用の背景スクロールロックを解除
 */
function unlockPageScrollForMenu() {
  if (!document.body.classList.contains('menu-open')) return;

  const top = document.body.style.top;

  document.documentElement.classList.remove('menu-open');
  document.body.classList.remove('menu-open');
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.left = '';
  document.body.style.right = '';
  document.body.style.width = '';

  const restoreY = top ? Math.abs(parseInt(top, 10)) : menuScrollLockY;
  window.scrollTo(0, Number.isNaN(restoreY) ? menuScrollLockY : restoreY);
}

/**
 * 最低限モードの固定通知を更新
 */
function updateMinimumModeNotice() {
  const notice = getElement('minimumModeNotice');
  const text = getElement('minimumModeNoticeText');
  if (!notice || !text) return;

  notice.setAttribute('aria-hidden', minimumMode ? 'false' : 'true');

  if (!minimumMode) {
    text.textContent = '';
    notice.hidden = true;
    return;
  }

  const countVisibleTasks = (type, highOnly) => {
    let count = 0;
    const categories = getAllTasks(type) || [];
    categories.forEach(group => {
      if (highOnly && group.category !== REQUIRED_CATEGORY) return;
      group.tasks.forEach(([title]) => {
        const key = createKey(type, group.category, title);
        if (!isTaskVisible(key)) return;
        count++;
      });
    });
    return count;
  };

  const dailyHigh = countVisibleTasks('daily', true);
  const dailyAll = countVisibleTasks('daily', false);
  const weeklyHigh = countVisibleTasks('weekly', true);
  const weeklyAll = countVisibleTasks('weekly', false);
  const seasonHigh = countVisibleTasks('season', true);
  const seasonAll = countVisibleTasks('season', false);

  text.textContent = `高優先度のみ表示中（今日 ${dailyHigh}/${dailyAll}件・今週 ${weeklyHigh}/${weeklyAll}件・長期 ${seasonHigh}/${seasonAll}件）`;
  notice.hidden = false;
}

/**
 * リセット前の状態スナップショットを生成
 * @returns {{checkedState: Object, taskStatus: Object}}
 */
function createResetUndoSnapshot() {
  return {
    checkedState: { ...checkedState },
    taskStatus: { ...taskStatus }
  };
}

/**
 * リセットを取り消し
 */
function undoResetFromSnapshot() {
  if (!resetUndoSnapshot) return;
  checkedState = { ...resetUndoSnapshot.checkedState };
  taskStatus = { ...resetUndoSnapshot.taskStatus };
  saveState();
  renderAll();
  showToast('リセットを取り消しました', 'success', 2600, { dedupeKey: 'reset-undo' });
  resetUndoSnapshot = null;
}

/**
 * メニューを開閉する
 */
function toggleMenu() {
  const menuToggle = getElement('menuToggleBtn');
  const topbar = getElement('topbar');
  const overlay = getElement('menuOverlay');

  if (!menuToggle || !topbar || !overlay) return;

  const isActive = topbar.classList.toggle('active');
  menuToggle.classList.toggle('active', isActive);
  overlay.classList.toggle('active', isActive);
  menuToggle.setAttribute('aria-expanded', isActive.toString());
  menuToggle.setAttribute('aria-label', isActive ? 'メニューを閉じる' : 'メニューを開く');

  if (isActive) {
    lockPageScrollForMenu();
  } else {
    unlockPageScrollForMenu();
  }
  
  if (isActive) {
    // メニューを開いた時
    announceToScreenReader('メニューを開きました');
    
    // 最初のフォーカス可能要素にフォーカス
    setTimeout(() => {
      const firstButton = topbar.querySelector('button');
      if (firstButton) firstButton.focus();
    }, 100);
    
    // フォーカストラップを設定
    cleanupFocusTrap = trapFocus(topbar);
  } else {
    // メニューを閉じた時
    announceToScreenReader('メニューを閉じました');
    
    // フォーカストラップをクリーンアップ
    if (cleanupFocusTrap) {
      cleanupFocusTrap();
      cleanupFocusTrap = null;
    }
    
    // メニューボタンにフォーカスを戻す（スクロール位置は維持）
    menuToggle.focus({ preventScroll: true });
  }
}

/**
 * メニューを閉じる
 */
function closeMenu() {
  const menuToggle = getElement('menuToggleBtn');
  const topbar = getElement('topbar');
  const overlay = getElement('menuOverlay');

  if (!menuToggle || !topbar || !overlay) return;

  topbar.classList.remove('active');
  menuToggle.classList.remove('active');
  overlay.classList.remove('active');
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'メニューを開く');
  unlockPageScrollForMenu();
  
  // フォーカストラップをクリーンアップ
  if (cleanupFocusTrap) {
    cleanupFocusTrap();
    cleanupFocusTrap = null;
  }
}

/**
 * 最低限モードをトグル
 */
function toggleMinimumMode() {
  minimumMode = !minimumMode;

  const badge = document.getElementById('minimumModeBadge');
  if (badge) badge.textContent = minimumMode ? 'ON' : 'OFF';
  const btn = getElement('minimumBtn');
  if (btn) {
    btn.classList.toggle('active', minimumMode);
    btn.setAttribute('aria-pressed', minimumMode.toString());
  }
  updateModeMenuBtn();

  // スクリーンリーダーへの通知
  announceToScreenReader(
    minimumMode
      ? '最低限モードをオンにしました。高優先度タスクのみ表示され、進捗母数も高優先度のみになります。'
      : '最低限モードをオフにしました。全てのタスクが表示されます。'
  );

  saveState();
  renderAll();
  updateMinimumModeNotice();
  if (!window.matchMedia('(max-width: 700px)').matches) closeMenu(); // デスクトップのみ閉じる
}

/**
 * 表示モードをトグル（シンプルモード ⇔ 詳細モード）
 */
function toggleDisplayMode() {
  displayMode = displayMode === 'simple' ? 'detail' : 'simple';
  const badge = document.getElementById('displayModeBadge');
  if (badge) badge.textContent = displayMode === 'detail' ? '詳細' : 'シンプル';
  const btn = getElement('displayModeBtn');
  if (btn) {
    btn.classList.toggle('active', displayMode === 'detail');
    btn.setAttribute('aria-pressed', (displayMode === 'detail').toString());
  }
  // カンバンビューボタンの表示制御
  const kanbanViewBtn = getElement('kanbanViewBtn');
  if (kanbanViewBtn) kanbanViewBtn.style.display = displayMode === 'simple' ? 'none' : '';

  // シンプルモードへの切り替え時、カンバンビューが起動中なら終了
  if (displayMode === 'simple' && kanbanViewMode) {
    kanbanViewMode = false;
    const mainGrid = document.querySelector('.grid');
    const kanbanBoard = getElement('kanbanBoard');
    if (mainGrid) mainGrid.style.display = '';
    if (kanbanBoard) kanbanBoard.style.display = 'none';
  }

  updateModeMenuBtn();
  announceToScreenReader(
    displayMode === 'detail'
      ? '詳細モードに切り替えました。着手状況が完了になるとタスクが完了扱いになります。'
      : 'シンプルモードに切り替えました。チェックボックスで完了管理します。'
  );
  saveState();
  renderAll();
  if (!window.matchMedia('(max-width: 700px)').matches) closeMenu(); // デスクトップのみ閉じる
}

/**
 * モードメニューボタンのアクティブ状態を更新
 */
function updateModeMenuBtn() {
  const btn = getElement('modeMenuBtn');
  if (!btn) return;
  const anyActive = minimumMode || displayMode === 'detail' || adminMode;
  btn.classList.toggle('active', anyActive);
}

/**
 * 管理者モードUIを更新
 */
function updateAdminModeUI() {
  const badge = document.getElementById('adminModeBadge');
  if (badge) badge.textContent = adminMode ? 'ON' : 'OFF';

  const btn = getElement('adminModeBtn');
  if (btn) {
    btn.classList.toggle('active', adminMode);
    btn.setAttribute('aria-pressed', adminMode.toString());
  }

  const assigneeGroup = document.getElementById('taskAssigneeGroup');
  if (assigneeGroup) {
    assigneeGroup.style.display = adminMode ? '' : 'none';
  }

  const assigneeSubTab = document.getElementById('assigneeManagementSubTab');
  const assigneeSubPanel = document.getElementById('assigneeManagementSubPanel');
  if (assigneeSubTab) {
    assigneeSubTab.style.display = adminMode ? '' : 'none';
  }
  if (assigneeSubPanel) {
    assigneeSubPanel.style.display = adminMode ? '' : 'none';
  }

  if (!adminMode && assigneeSubTab?.classList.contains('active') && typeof switchManagementSubTab === 'function') {
    switchManagementSubTab('tag');
  }
}

/**
 * 管理者モードをトグル
 */
function toggleAdminMode() {
  adminMode = !adminMode;
  updateAdminModeUI();
  updateModeMenuBtn();

  announceToScreenReader(
    adminMode
      ? '管理者モードをオンにしました。担当者入力と表示が有効になります。'
      : '管理者モードをオフにしました。担当者入力と表示を非表示にしました。'
  );

  saveState();
  renderAll();
  if (!window.matchMedia('(max-width: 700px)').matches) closeMenu();
}

/**
 * カテゴリーをリセット
 * @param {string} type - タスクタイプ (daily/weekly/season)
 */
function resetCategory(type) {
  const label = CATEGORY_LABELS[type];
  if (!label) {
    console.error(`Invalid category type: ${type}`);
    return;
  }

  if (!confirm(`${label}をリセットしますか？`)) {
    return;
  }

  resetUndoSnapshot = createResetUndoSnapshot();

  Object.keys(checkedState).forEach(key => {
    if (key.startsWith(`${type}_`)) {
      checkedState[key] = false;
    }
  });

  Object.keys(taskStatus).forEach(key => {
    if (key.startsWith(`${type}_`)) {
      delete taskStatus[key];
    }
  });

  showToast(`${label}をリセットしました`, 'success', 8000, {
    dedupeKey: 'reset-undo',
    actions: [
      {
        label: '元に戻す',
        onClick: undoResetFromSnapshot
      }
    ]
  });

  saveState();
  renderAll();
  closeMenu(); // モバイルでメニューを閉じる
}

/**
 * 全タスクをリセット
 */
function resetAll() {
  if (!confirm('全タスクのチェック・進捗状態をリセットしますか？')) {
    return;
  }

  resetUndoSnapshot = createResetUndoSnapshot();

  checkedState = {};
  taskStatus = {};

  showToast('全タスクのチェック・進捗状態をリセットしました', 'success', 8000, {
    dedupeKey: 'reset-undo',
    actions: [
      {
        label: '元に戻す',
        onClick: undoResetFromSnapshot
      }
    ]
  });

  saveState();
  renderAll();
  closeMenu(); // モバイルでメニューを閉じる
}

/**
 * 表示設定をリセット（全タスクを表示状態に戻す）
 */
function resetVisibility() {
  if (!confirm('全てのタスクを表示状態に戻しますか？\n（削除したデフォルトタスクも復元されます）')) {
    return;
  }

  taskVisibility = {};
  deletedDefaultTasks.clear();
  
  // トーストメッセージを表示
  showToast('表示設定をリセットしました', 'success');

  saveState();
  renderAll();
  renderVisibilitySettings();
}

/**
 * カスタムタスクを全削除
 */
function resetCustomTasks() {
  if (!confirm('全てのカスタムタスクを削除しますか？\nこの操作は元に戻せません。')) {
    return;
  }

  cancelTaskEdit();

  // カスタムタスクのチェック状態も削除
  ['daily', 'weekly', 'season'].forEach(type => {
    const tasks = customTasks[type] || [];
    tasks.forEach(task => {
      const category = getCategoryFromPriority(task.priority);
      const key = createKey(type, category, task.title);
      delete checkedState[key];
      delete taskComments[key];
      delete taskVisibility[key];
      deleteTaskMetadata(key);
    });
  });

  // カスタムタスクをクリア
  customTasks = {
    daily: [],
    weekly: [],
    season: []
  };
  
  // トーストメッセージを表示
  showToast('カスタムタスクを全て削除しました', 'success');

  saveState();
  renderAll();
  renderCustomTaskList();
}

/**
 * デフォルトタスクの編集をリセット
 */
function resetEditedDefaultTasks() {
  if (!confirm('全てのデフォルトタスクの編集を元に戻しますか？\nこの操作は元に戻せません。')) {
    return;
  }

  cancelTaskEdit();

  // 編集されたデフォルトタスクの古いチェック状態とコメントを削除
  ['daily', 'weekly', 'season'].forEach(type => {
    const edited = editedDefaultTasks[type] || {};
    Object.keys(edited).forEach(key => {
      const editData = edited[key];
      const newCategory = getCategoryFromPriority(editData.priority);
      const newKey = createKey(type, newCategory, editData.title);
      
      // 編集後のキーのデータを削除
      if (newKey !== key) {
        delete checkedState[newKey];
        delete taskComments[newKey];
      }
    });
  });

  // 編集されたデフォルトタスクをクリア
  editedDefaultTasks = {};
  
  // トーストメッセージを表示
  showToast('デフォルトタスクの編集を全てリセットしました', 'success');

  saveState();
  renderAll();
  renderCustomTaskList();
  renderVisibilitySettings();
}
