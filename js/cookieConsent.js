// ============================================================================
// Cookie同意とプライバシーポリシー
// ============================================================================

(function() {
  'use strict';

  // LocalStorageキー
  const COOKIE_CONSENT_KEY = 'work_tasks_cookie_consent';

  /**
   * 要素を取得（内部ヘルパー関数）
   */
  function getEl(id) {
    return document.getElementById(id);
  }

  /**
   * Cookie同意バナーを表示
   */
  function showCookieConsent() {
    const banner = getEl('cookieConsent');
    if (banner) {
      banner.style.display = 'block';
    }
  }

  /**
   * Cookie同意バナーを非表示
   */
  function hideCookieConsent() {
    const banner = getEl('cookieConsent');
    if (banner) {
      banner.style.display = 'none';
    }
  }

  /**
   * Cookie同意を処理
   */
  function handleAcceptCookies() {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
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
      localStorage.setItem(COOKIE_CONSENT_KEY, 'declined');
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
      const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
      
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
    const modal = getEl('privacyModal');
    if (modal) {
      modal.style.display = 'flex';
      document.body.classList.add('no-scroll');
      
      // モーダル内の最初のフォーカス可能な要素にフォーカス
      const closeBtn = getEl('closePrivacyBtn');
      if (closeBtn) {
        setTimeout(() => closeBtn.focus(), 100);
      }
    }
  }

  /**
   * プライバシーポリシーモーダルを閉じる
   */
  function closePrivacyModal() {
    const modal = getEl('privacyModal');
    if (modal) {
      modal.style.display = 'none';
      document.body.classList.remove('no-scroll');
    }
  }

  /**
   * イベントリスナーを設定
   */
  function setupCookieEventListeners() {
    const acceptBtn = getEl('acceptCookies');
    if (acceptBtn) {
      acceptBtn.addEventListener('click', handleAcceptCookies);
    }

    const declineBtn = getEl('declineCookies');
    if (declineBtn) {
      declineBtn.addEventListener('click', handleDeclineCookies);
    }

    const privacyBtn = getEl('privacyPolicyBtn');
    if (privacyBtn) {
      privacyBtn.addEventListener('click', openPrivacyModal);
    }

    const closePrivacyBtn = getEl('closePrivacyBtn');
    if (closePrivacyBtn) {
      closePrivacyBtn.addEventListener('click', closePrivacyModal);
    }
  }

  // DOMロード後に初期化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initCookieConsent();
      setupCookieEventListeners();
    });
  } else {
    initCookieConsent();
    setupCookieEventListeners();
  }

  // グローバルに公開（他のファイルとの互換性のため）
  window.initCookieConsent = initCookieConsent;
  window.handleAcceptCookies = handleAcceptCookies;
  window.handleDeclineCookies = handleDeclineCookies;
  window.openPrivacyModal = openPrivacyModal;
  window.closePrivacyModal = closePrivacyModal;
})();
