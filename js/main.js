// ============================================================================
// アプリケーション初期化
// ============================================================================

/**
 * 一部ブラウザ拡張が発生させる既知のノイズエラーを抑制
 */
function suppressKnownExtensionMessageErrors() {
  const isKnownMessageChannelError = (message) => {
    if (!message) return false;
    return message.includes('A listener indicated an asynchronous response by returning true')
      && message.includes('message channel closed before a response was received');
  };

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason;
    const message = typeof reason === 'string'
      ? reason
      : (reason && typeof reason.message === 'string' ? reason.message : '');

    if (isKnownMessageChannelError(message)) {
      event.preventDefault();
    }
  });

  window.addEventListener('error', (event) => {
    const message = event?.message || '';
    if (isKnownMessageChannelError(message)) {
      event.preventDefault();
    }
  });
}

/**
 * アプリケーションを初期化
 */
async function init() {
  suppressKnownExtensionMessageErrors();

  // Cookie同意を初期化（関数が存在する場合のみ）
  if (typeof initCookieConsent === 'function') {
    initCookieConsent();
  }

  // 共有リンクがある場合は起動時に取り込み
  if (typeof importStateFromShareUrl === 'function') {
    await importStateFromShareUrl();
  }
  
  // 最低限モードの初期化
  if (AppState.minimumMode) {
    const badge = document.getElementById('minimumModeBadge');
    if (badge) badge.textContent = 'ON';
    const btn = getElement('minimumBtn');
    if (btn) { btn.classList.add('active'); btn.setAttribute('aria-pressed', 'true'); }
  }

  // 表示モードの初期化
  if (AppState.displayMode === 'detail') {
    const badge = document.getElementById('displayModeBadge');
    if (badge) badge.textContent = '詳細';
    const btn = getElement('displayModeBtn');
    if (btn) { btn.classList.add('active'); btn.setAttribute('aria-pressed', 'true'); }
  }

  // 担当者管理モードの初期化
  if (typeof updateAdminModeUI === 'function') {
    updateAdminModeUI();
  }

  // モードメニューボタンの初期状態
  if (typeof updateModeMenuBtn === 'function') updateModeMenuBtn();
  if (typeof updateMinimumModeNotice === 'function') updateMinimumModeNotice();

  // シンプルモード時はカンバンビューボタンを非表示
  const kanbanViewBtn = getElement('kanbanViewBtn');
  if (kanbanViewBtn) kanbanViewBtn.style.display = AppState.displayMode === 'simple' ? 'none' : '';

  // カンバンビューモードの UI を復元
  if (AppState.kanbanViewMode && AppState.displayMode !== 'simple') {
    const mainGrid = document.querySelector('.grid');
    const kanbanBoard = getElement('kanbanBoard');
    if (mainGrid) mainGrid.style.display = 'none';
    if (kanbanBoard) kanbanBoard.style.display = 'flex';
    if (kanbanViewBtn) { kanbanViewBtn.textContent = 'カンバン表示中'; kanbanViewBtn.classList.add('active'); }
  }

  // プロジェクトフィルターセレクトを初期化
  initProjectFilterSelect();

  // プロジェクトとタグのセレクタを初期化
  initProjectSelector();
  initTagSelector();
  if (typeof initAssigneeSelector === 'function') {
    initAssigneeSelector();
  }

  setupEventListeners();
  if (typeof updateRestoreBackupButtonVisibility === 'function') {
    updateRestoreBackupButtonVisibility();
  }
  renderAll();
}

// DOMの準備完了後に初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    init();
  });
} else {
  init();
}
