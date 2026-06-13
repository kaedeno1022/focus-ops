// ============================================================================
// イベントリスナー設定
// ============================================================================

/**
 * ボタン連打を防ぎながらイベント処理を実行
 * @param {HTMLButtonElement} button
 * @param {Function} handler
 * @param {number} lockMs
 */
function withButtonGuard(button, handler, lockMs = 450) {
  let locked = false;
  return async (event) => {
    if (locked) return;
    locked = true;
    button.disabled = true;
    try {
      await handler(event);
    } finally {
      setTimeout(() => {
        locked = false;
        button.disabled = false;
      }, lockMs);
    }
  };
}

/**
 * 文字カウンターを設定・更新する
 * @param {string} inputId - 入力要素のID
 * @param {string} counterId - カウンター要素のID
 */
function setupCharCounter(inputId, counterId) {
  const input = getElement(inputId);
  const counter = getElement(counterId);
  if (!input || !counter) return;
  const max = input.maxLength > 0 ? input.maxLength : null;
  if (!max) return;

  const update = () => {
    const len = input.value.length;
    counter.textContent = `${len}/${max}`;
    counter.classList.remove('char-counter--warn', 'char-counter--limit');
    if (len >= max) {
      counter.classList.add('char-counter--limit');
    } else if (len >= Math.floor(max * 0.8)) {
      counter.classList.add('char-counter--warn');
    }
  };

  input.addEventListener('input', update);
  update();
}

/**
 * イベントリスナーを設定
 */
function setupEventListeners() {
  // 文字カウンター
  setupCharCounter('taskTitle', 'taskTitleCounter');
  setupCharCounter('taskComment', 'taskCommentCounter');
  setupCharCounter('tagManagerName', 'tagManagerNameCounter');
  setupCharCounter('projectManagerName', 'projectManagerNameCounter');
  setupCharCounter('assigneeManagerName', 'assigneeManagerNameCounter');
  setupCharCounter('statusManagerName', 'statusManagerNameCounter');

  // 設定ボタン
  const settingsBtn = getElement('settingsBtn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', openSettingsModal);
  }

  // 共有リンク作成
  const shareTasksBtn = getElement('shareTasksBtn');
  if (shareTasksBtn) {
    shareTasksBtn.addEventListener('click', withButtonGuard(shareTasksBtn, handleShareTasks, 700));
  }

  const restoreImportBackupBtn = getElement('restoreImportBackupBtn');
  if (restoreImportBackupBtn) {
    restoreImportBackupBtn.addEventListener('click', restorePreImportBackup);
  }

  const dismissImportBackupBtn = getElement('dismissImportBackupBtn');
  if (dismissImportBackupBtn) {
    dismissImportBackupBtn.addEventListener('click', discardPreImportBackup);
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
  const customTaskTab = getElement('customTaskTab');
  if (customTaskTab) {
    customTaskTab.addEventListener('click', () => switchTab('custom'));
  }

  const tagProjectTab = getElement('tagProjectTab');
  if (tagProjectTab) {
    tagProjectTab.addEventListener('click', () => switchTab('tagProject'));
  }

  const tagManagementSubTab = getElement('tagManagementSubTab');
  if (tagManagementSubTab) {
    tagManagementSubTab.addEventListener('click', () => switchManagementSubTab('tag'));
  }

  const projectManagementSubTab = getElement('projectManagementSubTab');
  if (projectManagementSubTab) {
    projectManagementSubTab.addEventListener('click', () => switchManagementSubTab('project'));
  }

  const assigneeManagementSubTab = getElement('assigneeManagementSubTab');
  if (assigneeManagementSubTab) {
    assigneeManagementSubTab.addEventListener('click', () => switchManagementSubTab('assignee'));
  }

  const managementKanbanSubTab = getElement('managementKanbanSubTab');
  if (managementKanbanSubTab) {
    managementKanbanSubTab.addEventListener('click', () => switchManagementSubTab('kanban'));
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

  const assigneeManagerForm = getElement('assigneeManagerForm');
  if (assigneeManagerForm) {
    assigneeManagerForm.addEventListener('submit', handleAssigneeManagerSubmit);
  }

  const tagManagerCancelEdit = getElement('tagManagerCancelEdit');
  if (tagManagerCancelEdit) {
    tagManagerCancelEdit.addEventListener('click', cancelTagEdit);
  }

  const projectManagerCancelEdit = getElement('projectManagerCancelEdit');
  if (projectManagerCancelEdit) {
    projectManagerCancelEdit.addEventListener('click', cancelProjectEdit);
  }

  const assigneeManagerCancelEdit = getElement('assigneeManagerCancelEdit');
  if (assigneeManagerCancelEdit) {
    assigneeManagerCancelEdit.addEventListener('click', cancelAssigneeEdit);
  }

  const resetTagsBtn = getElement('resetTagsBtn');
  if (resetTagsBtn) {
    resetTagsBtn.addEventListener('click', resetTags);
  }

  const resetProjectsBtn = getElement('resetProjectsBtn');
  if (resetProjectsBtn) {
    resetProjectsBtn.addEventListener('click', resetProjects);
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

  // メイン画面のタスク追加ボタン
  const addDailyTaskBtn = getElement('addDailyTaskBtn');
  if (addDailyTaskBtn) {
    addDailyTaskBtn.addEventListener('click', () => openTaskFormWithType('daily'));
  }

  const addWeeklyTaskBtn = getElement('addWeeklyTaskBtn');
  if (addWeeklyTaskBtn) {
    addWeeklyTaskBtn.addEventListener('click', () => openTaskFormWithType('weekly'));
  }

  const addSeasonTaskBtn = getElement('addSeasonTaskBtn');
  if (addSeasonTaskBtn) {
    addSeasonTaskBtn.addEventListener('click', () => openTaskFormWithType('season'));
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
      if (typeof window.closePrivacyModal === 'function') window.closePrivacyModal();
      closeResetDropdown();
      closeModeDropdown();
      closeImportBackupDropdown();
    }

    const target = e.target;
    const isTyping = target instanceof HTMLElement
      && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

    if ((e.ctrlKey || e.metaKey) && e.key === ',') {
      e.preventDefault();
      openSettingsModal();
      return;
    }

    if (!isTyping && e.altKey && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      const btn = getElement('shareTasksBtn');
      if (btn) btn.click();
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

  const adminModeBtn = getElement('adminModeBtn');
  if (adminModeBtn) {
    adminModeBtn.addEventListener('click', toggleAdminMode);
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

    modeMenuBtn.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowDown') return;
      e.preventDefault();
      const dropdown = getElement('modeDropdown');
      if (!dropdown) return;
      if (dropdown.hidden) {
        closeResetDropdown();
        dropdown.hidden = false;
        modeMenuBtn.setAttribute('aria-expanded', 'true');
      }
      const firstItem = dropdown.querySelector('button');
      if (firstItem instanceof HTMLElement) firstItem.focus();
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
        closeModeDropdown();
        dropdown.hidden = false;
        resetMenuBtn.setAttribute('aria-expanded', 'true');
      }
    });

    resetMenuBtn.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowDown') return;
      e.preventDefault();
      const dropdown = getElement('resetDropdown');
      if (!dropdown) return;
      if (dropdown.hidden) {
        closeModeDropdown();
        dropdown.hidden = false;
        resetMenuBtn.setAttribute('aria-expanded', 'true');
      }
      const firstItem = dropdown.querySelector('button');
      if (firstItem instanceof HTMLElement) firstItem.focus();
    });
  }

  // 取り込みバックアップドロップダウン
  const importBackupMenuBtn = getElement('importBackupMenuBtn');
  if (importBackupMenuBtn) {
    importBackupMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const dropdown = getElement('importBackupDropdown');
      if (!dropdown) return;
      const isOpen = !dropdown.hidden;
      closeImportBackupDropdown();
      if (!isOpen) {
        closeModeDropdown();
        closeResetDropdown();
        dropdown.hidden = false;
        importBackupMenuBtn.setAttribute('aria-expanded', 'true');
      }
    });

    importBackupMenuBtn.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowDown') return;
      e.preventDefault();
      const dropdown = getElement('importBackupDropdown');
      if (!dropdown) return;
      if (dropdown.hidden) {
        closeModeDropdown();
        closeResetDropdown();
        dropdown.hidden = false;
        importBackupMenuBtn.setAttribute('aria-expanded', 'true');
      }
      const firstItem = dropdown.querySelector('button');
      if (firstItem instanceof HTMLElement) firstItem.focus();
    });
  }

  // リセットボタン（ドロップダウン内）
  const dailyResetBtn = getElement('dailyResetBtn');
  if (dailyResetBtn) {
    dailyResetBtn.addEventListener('click', withButtonGuard(dailyResetBtn, () => { closeResetDropdown(); resetCategory('daily'); }, 700));
  }

  const weeklyResetBtn = getElement('weeklyResetBtn');
  if (weeklyResetBtn) {
    weeklyResetBtn.addEventListener('click', withButtonGuard(weeklyResetBtn, () => { closeResetDropdown(); resetCategory('weekly'); }, 700));
  }

  const seasonResetBtn = getElement('seasonResetBtn');
  if (seasonResetBtn) {
    seasonResetBtn.addEventListener('click', withButtonGuard(seasonResetBtn, () => { closeResetDropdown(); resetCategory('season'); }, 700));
  }

  const resetAllBtn = getElement('resetAllBtn');
  if (resetAllBtn) {
    resetAllBtn.addEventListener('click', withButtonGuard(resetAllBtn, () => { closeResetDropdown(); resetAll(); }, 700));
  }

  // ドロップダウン外クリックで閉じる
  document.addEventListener('click', (e) => {
    const resetWrap = document.querySelector('.reset-menu-wrap');
    if (resetWrap && !resetWrap.contains(e.target)) {
      closeResetDropdown();
    }
    const modeWrap = document.querySelector('.mode-dropdown-wrap');
    if (modeWrap && !modeWrap.contains(e.target)) {
      closeModeDropdown();
    }
    const importWrap = document.querySelector('.import-dropdown-wrap');
    if (importWrap && !importWrap.contains(e.target)) {
      closeImportBackupDropdown();
    }
    const projectFilterWrap = document.querySelector('.project-filter-dropdown-wrap');
    if (projectFilterWrap && !projectFilterWrap.contains(e.target)) {
      closeProjectFilterDropdown();
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

  // プロジェクトフィルタードロップダウン
  const projectFilterBtn = getElement('projectFilterBtn');
  if (projectFilterBtn) {
    projectFilterBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const dropdown = getElement('projectFilterDropdown');
      const isOpen = !dropdown.hidden;
      closeProjectFilterDropdown();
      closeResetDropdown();
      closeModeDropdown();
      if (!isOpen) {
        dropdown.hidden = false;
        projectFilterBtn.setAttribute('aria-expanded', 'true');
      }
    });
  }

  const projectFilterDropdown = getElement('projectFilterDropdown');
  if (projectFilterDropdown) {
    projectFilterDropdown.addEventListener('click', (e) => {
      const item = e.target.closest('.project-filter-item');
      if (!item) return;
      handleProjectFilterChange(item.dataset.value);
      closeProjectFilterDropdown();
    });
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
 * 取り込みバックアップドロップダウンを閉じる
 */
function closeImportBackupDropdown() {
  const dropdown = getElement('importBackupDropdown');
  const btn = getElement('importBackupMenuBtn');
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
    if (btn) { btn.textContent = 'カンバン表示中'; btn.classList.add('active'); }
    renderKanbanView();
  } else {
    if (mainGrid) mainGrid.style.display = '';
    if (kanbanBoard) kanbanBoard.style.display = 'none';
    if (btn) { btn.textContent = 'リスト表示中'; btn.classList.remove('active'); }
    renderAll();
  }
  saveState();
}

/**
 * プロジェクトフィルタードロップダウンを閉じる
 */
function closeProjectFilterDropdown() {
  const dropdown = getElement('projectFilterDropdown');
  const btn = getElement('projectFilterBtn');
  if (dropdown) dropdown.hidden = true;
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

/**
 * プロジェクトフィルターを変更
 */
function handleProjectFilterChange(value) {
  projectFilter = value || null;
  saveState();
  renderAll();
  if (typeof updateProjectFilterBtnLabel === 'function') {
    updateProjectFilterBtnLabel();
  }
}

