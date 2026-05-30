// ============================================================================
// イベントリスナー設定
// ============================================================================

/**
 * イベントリスナーを設定
 */
function setupEventListeners() {
  // 設定ボタン
  const settingsBtn = getElement('settingsBtn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', openSettingsModal);
  }
  
  // 設定モーダル閉じるボタン
  const closeSettingsBtn = getElement('closeSettingsBtn');
  if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener('click', closeSettingsModal);
  }
  
  // モーダル外クリックで閉じる
  const settingsModal = getElement('settingsModal');
  if (settingsModal) {
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) {
        closeSettingsModal();
      }
    });
  }
  
  // タブ切り替え
  const visibilityTab = getElement('visibilityTab');
  if (visibilityTab) {
    visibilityTab.addEventListener('click', () => switchTab('visibility'));
  }
  
  const customTaskTab = getElement('customTaskTab');
  if (customTaskTab) {
    customTaskTab.addEventListener('click', () => switchTab('custom'));
  }

  const tagProjectTab = getElement('tagProjectTab');
  if (tagProjectTab) {
    tagProjectTab.addEventListener('click', () => switchTab('tagProject'));
  }
  
  // カスタムタスク追加フォーム
  const addTaskForm = getElement('addTaskForm');
  if (addTaskForm) {
    addTaskForm.addEventListener('submit', addCustomTask);
  }

  const tagManagerForm = getElement('tagManagerForm');
  if (tagManagerForm) {
    tagManagerForm.addEventListener('submit', handleTagManagerSubmit);
  }

  const projectManagerForm = getElement('projectManagerForm');
  if (projectManagerForm) {
    projectManagerForm.addEventListener('submit', handleProjectManagerSubmit);
  }

  const tagManagerCancelEdit = getElement('tagManagerCancelEdit');
  if (tagManagerCancelEdit) {
    tagManagerCancelEdit.addEventListener('click', cancelTagEdit);
  }

  const projectManagerCancelEdit = getElement('projectManagerCancelEdit');
  if (projectManagerCancelEdit) {
    projectManagerCancelEdit.addEventListener('click', cancelProjectEdit);
  }

  // 表示設定リセットボタン
  const resetVisibilityBtn = getElement('resetVisibilityBtn');
  if (resetVisibilityBtn) {
    resetVisibilityBtn.addEventListener('click', resetVisibility);
  }

  // カスタムタスクリセットボタン
  const resetCustomTasksBtn = getElement('resetCustomTasksBtn');
  if (resetCustomTasksBtn) {
    resetCustomTasksBtn.addEventListener('click', resetCustomTasks);
  }

  // デフォルトタスク編集リセットボタン
  const resetEditedDefaultTasksBtn = getElement('resetEditedDefaultTasksBtn');
  if (resetEditedDefaultTasksBtn) {
    resetEditedDefaultTasksBtn.addEventListener('click', resetEditedDefaultTasks);
  }

  // ハンバーガーメニュー
  const menuToggleBtn = getElement('menuToggleBtn');
  if (menuToggleBtn) {
    menuToggleBtn.addEventListener('click', toggleMenu);
  }

  // オーバーレイクリックでメニューを閉じる
  const menuOverlay = getElement('menuOverlay');
  if (menuOverlay) {
    menuOverlay.addEventListener('click', closeMenu);
  }

  // ESCキーでメニューを閉じる
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeMenu();
      closeSettingsModal();
      closePrivacyModal();
      closeResetDropdown();
      closeModeDropdown();
    }
  });

  // 最低限モードボタン（モードドロップダウン内）
  const minimumBtn = getElement('minimumBtn');
  if (minimumBtn) {
    minimumBtn.addEventListener('click', toggleMinimumMode);
  }

  // 表示モードボタン（モードドロップダウン内）
  const displayModeBtn = getElement('displayModeBtn');
  if (displayModeBtn) {
    displayModeBtn.addEventListener('click', toggleDisplayMode);
  }

  // モードドロップダウン
  const modeMenuBtn = getElement('modeMenuBtn');
  if (modeMenuBtn) {
    modeMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const dropdown = getElement('modeDropdown');
      const isOpen = !dropdown.hidden;
      closeModeDropdown();
      closeResetDropdown();
      if (!isOpen) {
        dropdown.hidden = false;
        modeMenuBtn.setAttribute('aria-expanded', 'true');
      }
    });
  }

  // リセットドロップダウン
  const resetMenuBtn = getElement('resetMenuBtn');
  if (resetMenuBtn) {
    resetMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const dropdown = getElement('resetDropdown');
      const isOpen = !dropdown.hidden;
      if (isOpen) {
        closeResetDropdown();
      } else {
        dropdown.hidden = false;
        resetMenuBtn.setAttribute('aria-expanded', 'true');
      }
    });
  }

  // リセットボタン（ドロップダウン内）
  const dailyResetBtn = getElement('dailyResetBtn');
  if (dailyResetBtn) {
    dailyResetBtn.addEventListener('click', () => { closeResetDropdown(); resetCategory('daily'); });
  }

  const weeklyResetBtn = getElement('weeklyResetBtn');
  if (weeklyResetBtn) {
    weeklyResetBtn.addEventListener('click', () => { closeResetDropdown(); resetCategory('weekly'); });
  }

  const seasonResetBtn = getElement('seasonResetBtn');
  if (seasonResetBtn) {
    seasonResetBtn.addEventListener('click', () => { closeResetDropdown(); resetCategory('season'); });
  }

  const resetAllBtn = getElement('resetAllBtn');
  if (resetAllBtn) {
    resetAllBtn.addEventListener('click', () => { closeResetDropdown(); resetAll(); });
  }

  // ドロップダウン外クリックで閉じる
  document.addEventListener('click', (e) => {
    const resetWrap = document.querySelector('.reset-dropdown-wrap:not(.mode-dropdown-wrap)');
    if (resetWrap && !resetWrap.contains(e.target)) {
      closeResetDropdown();
    }
    const modeWrap = document.querySelector('.mode-dropdown-wrap');
    if (modeWrap && !modeWrap.contains(e.target)) {
      closeModeDropdown();
    }
  });

  // Cookie同意バナー（ページによって存在しない場合あり）
  const acceptCookies = document.getElementById('acceptCookies');
  if (acceptCookies && typeof handleAcceptCookies === 'function') {
    acceptCookies.addEventListener('click', handleAcceptCookies);
  }

  const declineCookies = document.getElementById('declineCookies');
  if (declineCookies && typeof handleDeclineCookies === 'function') {
    declineCookies.addEventListener('click', handleDeclineCookies);
  }

  // プライバシーポリシー（ページによって存在しない場合あり）
  const privacyPolicyBtn = document.getElementById('privacyPolicyBtn');
  if (privacyPolicyBtn && typeof openPrivacyModal === 'function') {
    privacyPolicyBtn.addEventListener('click', openPrivacyModal);
  }

  const closePrivacyBtn = document.getElementById('closePrivacyBtn');
  if (closePrivacyBtn && typeof closePrivacyModal === 'function') {
    closePrivacyBtn.addEventListener('click', closePrivacyModal);
  }

  const privacyModal = document.getElementById('privacyModal');
  if (privacyModal) {
    privacyModal.addEventListener('click', (e) => {
      if (e.target === privacyModal) {
        closePrivacyModal();
      }
    });
  }

  // カンバンビュー切り替え
  const kanbanViewBtn = getElement('kanbanViewBtn');
  if (kanbanViewBtn) {
    kanbanViewBtn.addEventListener('click', toggleKanbanView);
  }

  // ステータス管理フォーム
  const statusManagerForm = getElement('statusManagerForm');
  if (statusManagerForm) {
    statusManagerForm.addEventListener('submit', handleStatusManagerSubmit);
  }

  const statusManagerCancelEdit = getElement('statusManagerCancelEdit');
  if (statusManagerCancelEdit) {
    statusManagerCancelEdit.addEventListener('click', cancelStatusEdit);
  }

  const kanbanTab = getElement('kanbanTab');
  if (kanbanTab) {
    kanbanTab.addEventListener('click', () => switchTab('kanban'));
  }

  // ウィンドウリサイズ時にメニューを閉じる（PC表示に戻った時）
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (window.innerWidth > 700) {
        closeMenu();
      }
    }, 250);
  });
}

/**
 * リセットドロップダウンを閉じる
 */
function closeResetDropdown() {
  const dropdown = getElement('resetDropdown');
  const btn = getElement('resetMenuBtn');
  if (dropdown) dropdown.hidden = true;
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

/**
 * モードドロップダウンを閉じる
 */
function closeModeDropdown() {
  const dropdown = getElement('modeDropdown');
  const btn = getElement('modeMenuBtn');
  if (dropdown) dropdown.hidden = true;
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

/**
 * カンバンビューを切り替える
 */
function toggleKanbanView() {
  if (displayMode === 'simple') return; // シンプルモードでは無効
  kanbanViewMode = !kanbanViewMode;

  const mainGrid = document.querySelector('.grid');
  const kanbanBoard = getElement('kanbanBoard');
  const btn = getElement('kanbanViewBtn');

  if (kanbanViewMode) {
    if (mainGrid) mainGrid.style.display = 'none';
    if (kanbanBoard) kanbanBoard.style.display = 'flex';
    if (btn) { btn.textContent = 'リストビュー'; btn.classList.add('active'); }
    renderKanbanView();
  } else {
    if (mainGrid) mainGrid.style.display = '';
    if (kanbanBoard) kanbanBoard.style.display = 'none';
    if (btn) { btn.textContent = 'カンバンビュー'; btn.classList.remove('active'); }
    renderAll();
  }
}
