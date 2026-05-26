// ============================================================
// カレンダーコピー機能
// ============================================================
import { WEEKDAYS } from './constants.js';
import { data, copyBase, setCopyBase } from './state.js';
import { save, sortData } from './storage.js';
import { render } from './render.js';
import { showToast, showConfirm } from './ui.js';

export function openCopy(i) {
  setCopyBase(data[i]);
  document.getElementById('copyModal').classList.remove('hidden');
  document.getElementById('overlay').classList.remove('hidden');
  buildCalendar();
}

export function closeModal() {
  document.getElementById('copyModal').classList.add('hidden');
  setCopyBase(null);
  if (document.getElementById('editModal').classList.contains('hidden') &&
      document.getElementById('eventEditModal').classList.contains('hidden')) {
    document.getElementById('overlay').classList.add('hidden');
  }
}

export function selectAll() {
  document.querySelectorAll('#copyCalendar input[type="checkbox"]').forEach(cb => cb.checked = true);
}

export function clearChecks() {
  document.querySelectorAll('#copyCalendar input[type="checkbox"]').forEach(cb => cb.checked = false);
}

export function selectWeekdays() {
  document.querySelectorAll('#copyCalendar input[type="checkbox"]').forEach(cb => {
    const dateStr = cb.value;
    const dow = new Date(dateStr).getDay();
    cb.checked = dow >= 1 && dow <= 5;
  });
}

export async function executeCopy() {
  if (!copyBase) { showToast('コピー元がありません', 'warning'); return; }
  const checked = Array.from(document.querySelectorAll('#copyCalendar input[type="checkbox"]:checked')).map(cb => cb.value);
  if (!checked.length) { showToast('コピー先を選択してください', 'warning'); return; }
  if (!await showConfirm(`${checked.length}日分をコピーしますか？`)) return;
  const dup = data.filter(d => checked.includes(d.日付)).map(d => d.日付);
  let msg = '';
  checked.forEach(dateStr => {
    const alreadyExists = dup.includes(dateStr);
    const newItem = { ...copyBase, 日付: dateStr };
    if (alreadyExists) {
      const idx = data.findIndex(d => d.日付 === dateStr);
      if (idx !== -1) data[idx] = newItem;
    } else {
      data.push(newItem);
    }
  });
  if (dup.length) msg = `(${dup.length}件は上書き更新されました)`;
  sortData(); save(); render();
  closeModal();
  showToast(`${checked.length}日分のコピーが完了しました ${msg}`, 'success');
}

function buildCalendar() {
  if (!copyBase) return;
  const cal = document.getElementById('copyCalendar');
  cal.innerHTML = '';
  const now = new Date();
  const y   = now.getFullYear();
  const m   = now.getMonth();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const firstDow    = new Date(y, m, 1).getDay();
  const monthStr    = `${y}年${m + 1}月`;
  const title = document.createElement('div');
  title.className = 'copy-calendar-title';
  title.textContent = `コピー先カレンダー: ${monthStr}`;
  cal.appendChild(title);
  const grid = document.createElement('div');
  grid.className = 'copy-calendar-grid';
  WEEKDAYS.forEach(wd => {
    const th = document.createElement('div');
    th.className = 'copy-calendar-th';
    th.textContent = wd;
    grid.appendChild(th);
  });
  for (let i = 0; i < firstDow; i++) {
    const empty = document.createElement('div');
    empty.className = 'copy-calendar-empty';
    grid.appendChild(empty);
  }
  const existingSet = new Set(data.map(d => d.日付));
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dow     = new Date(y, m, day).getDay();
    const box = document.createElement('div');
    box.className = 'copy-calendar-box';
    const label   = document.createElement('label');
    label.className = 'copy-calendar-label';
    const cb = document.createElement('input');
    cb.type  = 'checkbox'; cb.value = dateStr;
    const spanDay = document.createElement('span');
    spanDay.textContent = day;
    const badge = existingSet.has(dateStr) ? ' 📝' : '';
    const badgeNode = document.createElement('span');
    badgeNode.textContent = badge;
    label.appendChild(cb);
    label.appendChild(spanDay);
    label.appendChild(badgeNode);
    box.appendChild(label);
    if (dow === 0)      box.classList.add('copy-day-sun');
    else if (dow === 6) box.classList.add('copy-day-sat');
    grid.appendChild(box);
  }
  cal.appendChild(grid);
}

window.openCopy = openCopy;
window.closeModal = closeModal;
window.selectAll = selectAll;
window.clearChecks = clearChecks;
window.selectWeekdays = selectWeekdays;
window.executeCopy = executeCopy;
