// ============================================================================
// アプリケーション初期化
// ============================================================================

/**
 * アプリケーションを初期化
 */
function init() {
  // Cookie同意を初期化
  initCookieConsent();
  
  // 最低限モードが有効な場合、UIを更新
  if (minimumMode) {
    const btn = getElement('minimumBtn');
    if (btn) {
      btn.textContent = '最低限モード ON';
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
    }
  }

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
