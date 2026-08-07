// ============================================================
// UI: Toast & Confirm Dialog & モーダル & タブ
//
// メッセージは textContent で流し込む。
// 作業内容やイベント名などのユーザー入力がそのままメッセージに載るため、
// innerHTML を使うと入力した文字列がHTMLとして解釈されてしまう。
// ============================================================

// 改行を <br> に変換しつつ、本文はテキストノードとして入れる
function setMultilineText(el, text) {
  el.textContent = '';
  String(text ?? '').split('\n').forEach((line, i) => {
    if (i > 0) el.appendChild(document.createElement('br'));
    el.appendChild(document.createTextNode(line));
  });
}

// action を渡すとトースト内にボタンを出す（削除の「元に戻す」など）
// action: { label: string, onClick: () => void }
function showToast(msg, type = 'info', duration = 3500, action = null) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.style.setProperty('--toast-duration', duration + 'ms');

  const icon = document.createElement('span');
  icon.className = 'toast-icon';
  icon.textContent = TOAST_ICONS[type] ?? TOAST_ICONS.info;

  const body = document.createElement('div');
  body.className = 'toast-body';
  const msgEl = document.createElement('div');
  msgEl.className = 'toast-msg';
  setMultilineText(msgEl, msg);
  body.appendChild(msgEl);

  const progress = document.createElement('div');
  progress.className = 'toast-progress';

  toast.append(icon, body, progress);

  let timer = null;
  const dismiss = () => {
    if (timer) clearTimeout(timer);
    toast.classList.add('toast-out');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  };

  if (action && typeof action.onClick === 'function') {
    const actionBtn = document.createElement('button');
    actionBtn.type = 'button';
    actionBtn.className = 'toast-action';
    actionBtn.textContent = action.label || '実行';
    actionBtn.addEventListener('click', () => {
      dismiss();
      action.onClick();
    });
    body.appendChild(actionBtn);
  }

  container.appendChild(toast);
  timer = setTimeout(dismiss, duration);
}

// ============================================================
// フォーカス管理
// ============================================================
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusableIn(container) {
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR))
    // 親が hidden の要素はレイアウトを持たないので offsetParent で除外する
    .filter(el => el.offsetParent !== null);
}

// Tab / Shift+Tab をコンテナ内で循環させる
function trapTabKey(e, container) {
  if (e.key !== 'Tab') return;
  const items = focusableIn(container);
  if (items.length === 0) return;
  const first = items[0];
  const last  = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

function focusFirstIn(container) {
  const items = focusableIn(container);
  if (items.length > 0) items[0].focus();
}

// ============================================================
// 確認ダイアログ
// ============================================================
function showConfirm(msg, { title = '確認', danger = false, okLabel = 'OK' } = {}) {
  return new Promise(resolve => {
    const previouslyFocused = document.activeElement;

    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';

    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');

    const iconEl = document.createElement('div');
    iconEl.className = 'confirm-icon';
    iconEl.textContent = danger ? '⚠️' : '❓';

    const titleEl = document.createElement('div');
    titleEl.className = 'confirm-title';
    titleEl.textContent = title;

    const msgEl = document.createElement('div');
    msgEl.className = 'confirm-msg';
    setMultilineText(msgEl, msg);

    const btns = document.createElement('div');
    btns.className = 'confirm-btns';
    const noBtn = document.createElement('button');
    noBtn.type = 'button';
    noBtn.className = 'confirm-cancel';
    noBtn.textContent = 'キャンセル';
    const yesBtn = document.createElement('button');
    yesBtn.type = 'button';
    if (danger) yesBtn.className = 'btn-danger';
    yesBtn.textContent = okLabel;
    btns.append(noBtn, yesBtn);

    dialog.append(iconEl, titleEl, msgEl, btns);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    const onKeyDown = e => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close(false);
      } else if (e.key === 'Enter' && document.activeElement !== noBtn) {
        e.preventDefault();
        close(true);
      } else {
        trapTabKey(e, dialog);
      }
    };

    function close(result) {
      document.removeEventListener('keydown', onKeyDown, true);
      overlay.remove();
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
      resolve(result);
    }

    document.addEventListener('keydown', onKeyDown, true);
    yesBtn.addEventListener('click', () => close(true));
    noBtn.addEventListener('click', () => close(false));
    overlay.addEventListener('click', e => { if (e.target === overlay) close(false); });

    yesBtn.focus();
  });
}

// ============================================================
// モーダル（編集・コピー・イベント編集）
// ============================================================
const MODAL_IDS = ['editModal', 'copyModal', 'eventEditModal', 'leaveModal'];

let modalReturnFocus = null;

function anyModalOpen() {
  return MODAL_IDS.some(id => {
    const el = document.getElementById(id);
    return el && !el.classList.contains('hidden');
  });
}

// 指定のモーダルを開き、他のモーダルは閉じる
function showModal(id) {
  const target = document.getElementById(id);
  if (!target) return;

  if (!anyModalOpen()) modalReturnFocus = document.activeElement;

  MODAL_IDS.forEach(mid => {
    if (mid === id) return;
    const el = document.getElementById(mid);
    if (el) el.classList.add('hidden');
  });

  target.classList.remove('hidden');
  const overlay = document.getElementById('overlay');
  if (overlay) overlay.classList.remove('hidden');
  document.body.classList.add('no-scroll');
  focusFirstIn(target);
}

// 指定のモーダルを閉じる。他に開いているモーダルがなければオーバーレイも閉じる
function hideModal(id) {
  const target = document.getElementById(id);
  if (target) target.classList.add('hidden');
  if (anyModalOpen()) return;

  const overlay = document.getElementById('overlay');
  if (overlay) overlay.classList.add('hidden');
  document.body.classList.remove('no-scroll');
  if (modalReturnFocus && typeof modalReturnFocus.focus === 'function') {
    modalReturnFocus.focus();
  }
  modalReturnFocus = null;
}

function closeAllModals() {
  closeEditModal();
  closeModal();
  closeEditEventModal();
  closeLeaveModal();
}

function initModalKeyboard() {
  document.addEventListener('keydown', e => {
    // 確認ダイアログが出ているあいだは、そちら側のハンドラに任せる
    if (document.querySelector('.confirm-overlay')) return;
    if (!anyModalOpen()) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      closeAllModals();
      return;
    }
    const openModalEl = MODAL_IDS
      .map(id => document.getElementById(id))
      .find(el => el && !el.classList.contains('hidden'));
    if (openModalEl) trapTabKey(e, openModalEl);
  });
}

// ============================================================
// タブ
// ============================================================
function activateTab(tabId) {
  const btn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
  if (btn) btn.click();
}

function initTabs() {
  const tabBtns     = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      tabContents.forEach(tc => tc.classList.remove('active'));
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      const content = document.getElementById(btn.dataset.tab);
      if (content) content.classList.add('active');
      onTabActivated(btn.dataset.tab);
    });
  });
}

// タブ切り替え時に、そのタブが必要とする再描画を行う
function onTabActivated(tabId) {
  if (tabId === 'calendar-tab') renderCalendarView();
}

// ============================================================
// クリップボード
// ============================================================
async function copyTextToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // 権限がない場合は下のフォールバックを試す
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}
