// ============================================================
// UI: Toast & Confirm Dialog
// ============================================================
import { TOAST_ICONS } from './constants.js';

export function showToast(msg, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.style.setProperty('--toast-duration', duration + 'ms');
  toast.innerHTML = `
    <span class="toast-icon">${TOAST_ICONS[type] ?? TOAST_ICONS.info}</span>
    <div class="toast-body"><div class="toast-msg">${msg.replace(/\n/g, '<br>')}</div></div>
    <button class="toast-close" onclick="this.closest('.toast').remove()">✕</button>
    <div class="toast-progress"></div>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast-out');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, duration);
}

export function showConfirm(msg, { title = '確認', danger = false } = {}) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
      <div class="confirm-dialog">
        <div class="confirm-icon">${danger ? '⚠️' : '❓'}</div>
        <div class="confirm-title">${title}</div>
        <div class="confirm-msg">${msg.replace(/\n/g, '<br>')}</div>
        <div class="confirm-btns">
          <button class="confirm-cancel" id="_cfm_no">キャンセル</button>
          <button class="${danger ? 'btn-danger' : ''}" id="_cfm_yes">OK</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const close = result => { overlay.remove(); resolve(result); };
    overlay.querySelector('#_cfm_yes').addEventListener('click', () => close(true));
    overlay.querySelector('#_cfm_no').addEventListener('click',  () => close(false));
    overlay.addEventListener('click', e => { if (e.target === overlay) close(false); });
  });
}

export function initTabs() {
  const tabBtns     = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(tc => tc.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
    });
  });
}
