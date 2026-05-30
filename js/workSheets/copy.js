// ============================================================
// カレンダーコピー機能
// ============================================================

function openCopy(i) {
  setCopyBase(data[i]);
  setCopySelectedDates([]);
  document.getElementById('copyModal').classList.remove('hidden');
  document.getElementById('overlay').classList.remove('hidden');
  renderCopyCalendar();
}

function closeModal() {
  document.getElementById('copyModal').classList.add('hidden');
  setCopyBase(null);
  setCopySelectedDates([]);
  if (document.getElementById('editModal').classList.contains('hidden') &&
      document.getElementById('eventEditModal').classList.contains('hidden')) {
    document.getElementById('overlay').classList.add('hidden');
  }
}

function resolveMonth() {
  if (selectedMonth) return selectedMonth;
  const monthFilter = document.getElementById('data-month-filter');
  if (monthFilter && monthFilter.value) return monthFilter.value;
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function selectAll() {
  const [y, m] = resolveMonth().split('-').map(Number);
  const dates = [];
  for (let day = 1; day <= new Date(y, m, 0).getDate(); day++) {
    dates.push(`${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
  }
  setCopySelectedDates(dates);
  renderCopyCalendar();
}

function clearChecks() {
  setCopySelectedDates([]);
  renderCopyCalendar();
}

function selectWeekdays() {
  const [y, m] = resolveMonth().split('-').map(Number);
  const dates = [];
  for (let day = 1; day <= new Date(y, m, 0).getDate(); day++) {
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dow = new Date(y, m - 1, day).getDay();
    if (dow >= 1 && dow <= 5) dates.push(dateStr);
  }
  setCopySelectedDates(dates);
  renderCopyCalendar();
}

async function executeCopy() {
  if (!copyBase) { showToast('コピー元がありません', 'warning'); return; }
  if (!copySelectedDates || copySelectedDates.length === 0) {
    showToast('コピー先を選択してください', 'warning'); return;
  }
  if (!await showConfirm(`${copySelectedDates.length}日分をコピーしますか？`)) return;

  const dup = data.filter(d => copySelectedDates.includes(d.日付)).map(d => d.日付);
  copySelectedDates.forEach(dateStr => {
    const newItem = { ...copyBase, 日付: dateStr };
    const idx = data.findIndex(d => d.日付 === dateStr);
    if (idx !== -1) {
      data[idx] = newItem;
    } else {
      data.push(newItem);
    }
  });

  const msg = dup.length ? `(${dup.length}件は上書き更新されました)` : '';
  sortData(); save(); render();
  closeModal();
  showToast(`${copySelectedDates.length}日分のコピーが完了しました ${msg}`, 'success');
}

function renderCopyCalendar() {
  if (!copyBase) return;
  const cal = document.getElementById('copyCalendar');
  cal.innerHTML = '';

  const monthValue = resolveMonth();
  const [y, m] = monthValue.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const firstDow    = new Date(y, m - 1, 1).getDay();

  const title = document.createElement('div');
  title.className = 'copy-calendar-title';
  title.textContent = `コピー先カレンダー: ${y}年${m}月`;
  cal.appendChild(title);

  const grid = document.createElement('div');
  grid.className = 'event-calendar';

  WEEKDAYS.forEach(wd => {
    const th = document.createElement('div');
    th.className = 'calendar-day-header';
    th.textContent = wd;
    grid.appendChild(th);
  });

  for (let i = 0; i < firstDow; i++) {
    const empty = document.createElement('div');
    empty.className = 'calendar-day empty';
    grid.appendChild(empty);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayCell = document.createElement('div');
    dayCell.className = 'calendar-day';
    dayCell.textContent = day;
    if (copySelectedDates.includes(dateStr)) dayCell.classList.add('selected');
    dayCell.addEventListener('click', () => toggleCopyDate(dateStr));
    grid.appendChild(dayCell);
  }

  cal.appendChild(grid);
  updateCopySelectedDatesDisplay();
}

function toggleCopyDate(dateStr) {
  const idx = copySelectedDates.indexOf(dateStr);
  if (idx > -1) {
    copySelectedDates.splice(idx, 1);
  } else {
    copySelectedDates.push(dateStr);
  }
  copySelectedDates.sort();
  renderCopyCalendar();
}

function updateCopySelectedDatesDisplay() {
  const display = document.getElementById('copy-selected-dates-display');
  if (!display) return;
  display.textContent = copySelectedDates.length === 0
    ? 'なし'
    : `${copySelectedDates.length}日選択済み`;
}

