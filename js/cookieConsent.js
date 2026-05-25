// ============================================================================
// Cookie同意とプライバシーポリシー
// ============================================================================

/**
 * Cookie同意バナーを表示
 */
function showCookieConsent() {
  const banner = getElement('cookieConsent');
  if (banner) {
    banner.style.display = 'block';
  }
}

/**
 * Cookie同意バナーを非表示
 */
function hideCookieConsent() {
  const banner = getElement('cookieConsent');
  if (banner) {
    banner.style.display = 'none';
  }
}

/**
 * Cookie同意を処理
 */
function handleAcceptCookies() {
  try {
    localStorage.setItem(STORAGE_KEYS.COOKIE_CONSENT, 'accepted');
    hideCookieConsent();
    // GA4は既に有効なので、ここでは特に何もしない
  } catch (error) {
    console.error('Cookie同意の保存に失敗:', error);
  }
}

/**
 * Cookie拒否を処理
 */
function handleDeclineCookies() {
  try {
    localStorage.setItem(STORAGE_KEYS.COOKIE_CONSENT, 'declined');
    hideCookieConsent();
    // GA4を無効化
    if (typeof window.gtag === 'function') {
      window['ga-disable-G-WPV9BG4YSJ'] = true;
    }
  } catch (error) {
    console.error('Cookie拒否の保存に失敗:', error);
  }
}

/**
 * Cookie同意状態をチェックして初期化
 */
function initCookieConsent() {
  try {
    const consent = localStorage.getItem(STORAGE_KEYS.COOKIE_CONSENT);
    
    if (!consent) {
      // 同意状態が保存されていない場合、バナーを表示
      showCookieConsent();
    } else if (consent === 'declined') {
      // 拒否されている場合、GA4を無効化
      if (typeof window.gtag === 'function') {
        window['ga-disable-G-WPV9BG4YSJ'] = true;
      }
    }
  } catch (error) {
    console.error('Cookie同意状態の確認に失敗:', error);
    showCookieConsent();
  }
}

/**
 * プライバシーポリシーモーダルを開く
 */
function openPrivacyModal() {
  const modal = getElement('privacyModal');
  if (modal) {
    modal.style.display = 'flex';
    document.body.classList.add('no-scroll');
    
    // モーダル内の最初のフォーカス可能な要素にフォーカス
    const closeBtn = getElement('closePrivacyBtn');
    if (closeBtn) {
      setTimeout(() => closeBtn.focus(), 100);
    }
  }
}

/**
 * プライバシーポリシーモーダルを閉じる
 */
function closePrivacyModal() {
  const modal = getElement('privacyModal');
  if (modal) {
    modal.style.display = 'none';
    document.body.classList.remove('no-scroll');
  }
}
