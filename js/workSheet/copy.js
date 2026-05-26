// ============================================================
// カレンダーコピー機能
// ============================================================
import { WEEKDAYS } from './constants.js';
import { data, copyBase, copySelectedDates, setCopyBase, setCopySelectedDates, toggleCopySelectedDate } from './state.js';
import { save, sortData } from './storage.js';
import { render } from './render.js';
import { showToast, showConfirm } from './ui.js';

export function openCopy(i) {
  setCopyBase(data[i]);
  setCopySelectedDates([]);
  document.getElementById('copyModal').classList.remove('hidden');
  document.getElementById('overlay').classList.remove('hidden');
  renderCopyCalendar();
}

export function closeModal() {
  document.getElementById('copyModal').classList.add('hidden');
  setCopyBase(null);
  setCopySelectedDates([]);
  if (document.getElementById('editModal').classList.contains('hidden') &&
      document.getElementById('eventEditModal').classList.contains('hidden')) {
    document.getElementById('overlay').classList.add('hidden');
  }
}

export function selectAll() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const dates = [];
  for (let day = 1; day <= daysInMonth; day++) {
    dates.push(`${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
  }
  setCopySelectedDates(dates);
  renderCopyCalendar();
}

export function clearChecks() {
  setCopySelectedDates([]);
  renderCopyCalendar();
}

export function selectWeekdays() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const dates = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dow = new Date(y, m, day).getDay();
    if (dow >= 1 && dow <= 5) {
      dates.push(dateStr);
    }
  }
  setCopySelectedDates(dates);
  renderCopyCalendar();
}

export async function executeCopy() {
  if (!copyBase) { showToast('コピー元がありません', 'warning'); return; }
  if (!copySelectedDates.length) { showToast('コピー先を選択してください', 'warning'); return; }
  if (!await showConfirm(`${copySelectedDates.length}日分をコピーしますか？`)) return;
  const dup = data.filter(d => copySelectedDates.includes(d.日付)).map(d => d.日付);
  let msg = '';
  copySelectedDates.forEach(dateStr => {
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
  showToast(`${copySelectedDates.length}日分のコピーが完了しました ${msg}`, 'success');
}

export function renderCopyCalendar() {
  if (!copyBase) return;
  const cal = document.getElementById('copyCalendar');
  cal.innerHTML = '';
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const firstDow = new Date(y, m, 1).getDay();
  const monthStr = `${y}年${m + 1}月`;
  
  const title = document.createElement('div');
  title.className = 'copy-calendar-title';
  title.textContent = `コピー先カレンダー: ${monthStr}`;
  cal.appendChild(title);
  
  const grid = document.createElement('div');
  grid.className = 'event-calendar';
  
  // 曜日ヘッダー
  WEEKDAYS.forEach(wd => {
    const th = document.createElement('div');
    th.className = 'calendar-day-header';
    th.textContent = wd;
    grid.appendChild(th);
  });
  
  // 空白セル
  for (let i = 0; i < firstDow; i++) {
    const empty = document.createElement('div');
    empty.className = 'calendar-day empty';
    grid.appendChild(empty);
  }
  
  // 日付セル
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayCell = document.createElement('div');
    dayCell.className = 'calendar-day';
    dayCell.textContent = day;
    
    if (copySelectedDates.includes(dateStr)) {
      dayCell.classList.add('selected');
    }
    
    dayCell.addEventListener('click', () => {
      toggleCopyDate(dateStr);
    });
    
    grid.appendChild(dayCell);
  }
  
  cal.appendChild(grid);
  updateCopySelectedDatesDisplay();
}

export function updateCopySelectedDatesDisplay() {
  const display = document.getElementById('copy-selected-dates-display');
  if (!display) return;
  
  if (copySelectedDates.length === 0) {
    display.textContent = 'なし';
  } else {
    display.textContent = `${copySelectedDates.length}日選択済み`;
  }
}

export function toggleCopyDate(dateStr) {
  toggleCopySelectedDate(dateStr);
  renderCopyCalendar();
}

window.openCopy = openCopy;
window.closeModal = closeModal;
window.selectAll = selectAll;
window.clearChecks = clearChecks;
window.selectWeekdays = selectWeekdays;
window.executeCopy = executeCopy;
