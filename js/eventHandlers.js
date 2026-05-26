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
  
  // カスタムタスク追加フォーム
  const addTaskForm = getElement('addTaskForm');
  if (addTaskForm) {
    addTaskForm.addEventListener('submit', addCustomTask);
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
    }
  });

  // 最低限モードボタン
  const minimumBtn = getElement('minimumBtn');
  if (minimumBtn) {
    minimumBtn.addEventListener('click', toggleMinimumMode);
  }

  // リセットボタン
  const dailyResetBtn = getElement('dailyResetBtn');
  if (dailyResetBtn) {
    dailyResetBtn.addEventListener('click', () => resetCategory('daily'));
  }

  // モバイル専用デイリーリセットボタン
  const dailyResetBtnMobile = getElement('dailyResetBtnMobile');
  if (dailyResetBtnMobile) {
    dailyResetBtnMobile.addEventListener('click', () => resetCategory('daily'));
  }

  const weeklyResetBtn = getElement('weeklyResetBtn');
  if (weeklyResetBtn) {
    weeklyResetBtn.addEventListener('click', () => resetCategory('weekly'));
  }

  const seasonResetBtn = getElement('seasonResetBtn');
  if (seasonResetBtn) {
    seasonResetBtn.addEventListener('click', () => resetCategory('season'));
  }

  const resetAllBtn = getElement('resetAllBtn');
  if (resetAllBtn) {
    resetAllBtn.addEventListener('click', resetAll);
  }

  // Cookie同意バナー（関数が存在する場合のみ）
  const acceptCookies = getElement('acceptCookies');
  if (acceptCookies && typeof handleAcceptCookies === 'function') {
    acceptCookies.addEventListener('click', handleAcceptCookies);
  }

  const declineCookies = getElement('declineCookies');
  if (declineCookies && typeof handleDeclineCookies === 'function') {
    declineCookies.addEventListener('click', handleDeclineCookies);
  }

  // プライバシーポリシー（関数が存在する場合のみ）
  const privacyPolicyBtn = getElement('privacyPolicyBtn');
  if (privacyPolicyBtn && typeof openPrivacyModal === 'function') {
    privacyPolicyBtn.addEventListener('click', openPrivacyModal);
  }

  const closePrivacyBtn = getElement('closePrivacyBtn');
  if (closePrivacyBtn && typeof closePrivacyModal === 'function') {
    closePrivacyBtn.addEventListener('click', closePrivacyModal);
  }

  const privacyModal = getElement('privacyModal');
  if (privacyModal) {
    privacyModal.addEventListener('click', (e) => {
      if (e.target === privacyModal) {
        closePrivacyModal();
      }
    });
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
