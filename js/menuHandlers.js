// ============================================================================
// メニュー操作とリセット機能
// ============================================================================

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

  // メニューが開いている時は背景のスクロールを防ぐ
  document.body.style.overflow = isActive ? 'hidden' : '';
  
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
    
    // メニューボタンにフォーカスを戻す
    menuToggle.focus();
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
  document.body.style.overflow = '';
  
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

  const btn = getElement('minimumBtn');
  if (btn) {
    btn.textContent = minimumMode ? '最低限モード ON' : '最低限モード OFF';
    btn.classList.toggle('active', minimumMode);
    btn.setAttribute('aria-pressed', minimumMode.toString());
  }
  
  // スクリーンリーダーへの通知
  announceToScreenReader(
    minimumMode ? '最低限モードをオンにしました。優先度：高のタスクのみ表示されます。' : '最低限モードをオフにしました。全てのタスクが表示されます。'
  );

  saveState();
  renderAll();
  updateSystemStatus();
  closeMenu(); // モバイルでメニューを閉じる
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

  Object.keys(checkedState).forEach(key => {
    if (key.startsWith(`${type}_`)) {
      checkedState[key] = false;
    }
  });
  
  // トーストメッセージを表示
  showToast(`${label}タスクをリセットしました`, 'success');

  saveState();
  renderAll();
  updateSystemStatus();
  closeMenu(); // モバイルでメニューを閉じる
}

/**
 * 全タスクをリセット
 */
function resetAll() {
  if (!confirm('全チェックをリセットしますか？')) {
    return;
  }

  checkedState = {};
  
  // トーストメッセージを表示
  showToast('全てのタスクをリセットしました', 'success');

  saveState();
  renderAll();
  updateSystemStatus();
  closeMenu(); // モバイルでメニューを閉じる
}

/**
 * 表示設定をリセット（全タスクを表示状態に戻す）
 */
function resetVisibility() {
  if (!confirm('全てのタスクを表示状態に戻しますか？')) {
    return;
  }

  taskVisibility = {};
  
  // トーストメッセージを表示
  showToast('表示設定をリセットしました', 'success');

  saveState();
  renderAll();
  updateSystemStatus();
  renderVisibilitySettings();
}

/**
 * カスタムタスクを全削除
 */
function resetCustomTasks() {
  if (!confirm('全てのカスタムタスクを削除しますか？\nこの操作は元に戻せません。')) {
    return;
  }

  // カスタムタスクのチェック状態も削除
  ['daily', 'weekly', 'season'].forEach(type => {
    const tasks = customTasks[type] || [];
    tasks.forEach(task => {
      const category = getCategoryFromPriority(task.priority);
      const key = createKey(type, category, task.title);
      delete checkedState[key];
      delete taskComments[key];
      delete taskVisibility[key];
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
  updateSystemStatus();
  renderCustomTaskList();
}

/**
 * デフォルトタスクの編集をリセット
 */
function resetEditedDefaultTasks() {
  if (!confirm('全てのデフォルトタスクの編集を元に戻しますか？\nこの操作は元に戻せません。')) {
    return;
  }

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
  updateSystemStatus();
  renderCustomTaskList();
  renderVisibilitySettings();
}
