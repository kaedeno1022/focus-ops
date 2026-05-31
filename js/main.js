// ============================================================================
// アプリケーション初期化
// ============================================================================

/**
 * アプリケーションを初期化
 */
function init() {
  // Cookie同意を初期化（関数が存在する場合のみ）
  if (typeof initCookieConsent === 'function') {
    initCookieConsent();
  }

  // 共有リンクがある場合は起動時に取り込み
  if (typeof importStateFromShareUrl === 'function') {
    importStateFromShareUrl();
  }
  
  // 最低限モードの初期化
  if (minimumMode) {
    const badge = document.getElementById('minimumModeBadge');
    if (badge) badge.textContent = 'ON';
    const btn = getElement('minimumBtn');
    if (btn) { btn.classList.add('active'); btn.setAttribute('aria-pressed', 'true'); }
  }

  // 表示モードの初期化
  if (displayMode === 'detail') {
    const badge = document.getElementById('displayModeBadge');
    if (badge) badge.textContent = '詳細';
    const btn = getElement('displayModeBtn');
    if (btn) { btn.classList.add('active'); btn.setAttribute('aria-pressed', 'true'); }
  }

  // モードメニューボタンの初期状態
  if (typeof updateModeMenuBtn === 'function') updateModeMenuBtn();

  // シンプルモード時はカンバンビューボタンを非表示
  const kanbanViewBtn = getElement('kanbanViewBtn');
  if (kanbanViewBtn) kanbanViewBtn.style.display = displayMode === 'simple' ? 'none' : '';

  // プロジェクトとタグのセレクタを初期化
  initProjectSelector();
  initTagSelector();

  setupEventListeners();
  renderAll();
  
  // システムステータスを初期化
  updateSystemStatus();
}

// DOMの準備完了後に初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
