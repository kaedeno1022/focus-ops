// ============================================================
// カレンダーコピー機能
// ============================================================

// source は一覧の既存行の添字（コピー）か、フォーム入力中の下書き（複数日への新規一括登録）
function openCopy(source) {
  const isDraft = typeof source !== 'number';
  setCopyBase(isDraft ? source : data[source]);
  setCopyIsDraft(isDraft);
  setCopySelectedDates([]);
  renderCopyCalendar();
  showModal('copyModal');
}

function openCopyFromForm() {
  if (!validateWorkItem()) return;
  openCopy(buildWorkItem());
}

function closeModal() {
  setCopyBase(null);
  setCopyIsDraft(false);
  setCopySelectedDates([]);
  hideModal('copyModal');
}

// コピー先カレンダーに出す月。表示中の月がなければコピー元の日付、それもなければ当月
function resolveMonth() {
  if (selectedMonth) return selectedMonth;
  const monthFilter = document.getElementById('data-month-filter');
  if (monthFilter && monthFilter.value) return monthFilter.value;
  if (copyBase?.日付) return copyBase.日付.slice(0, 7);
  return getCurrentMonthValue();
}

function monthDates(monthValue, filter = null) {
  const [y, m] = monthValue.split('-').map(Number);
  const dates = [];
  for (let day = 1; day <= new Date(y, m, 0).getDate(); day++) {
    const dow = new Date(y, m - 1, day).getDay();
    if (filter && !filter(dow)) continue;
    dates.push(`${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
  }
  return dates;
}

function selectAll() {
  setCopySelectedDates(monthDates(resolveMonth()));
  renderCopyCalendar();
}

function clearChecks() {
  setCopySelectedDates([]);
  renderCopyCalendar();
}

function selectWeekdays() {
  setCopySelectedDates(monthDates(resolveMonth(), dow => dow >= 1 && dow <= 5));
  renderCopyCalendar();
}

async function executeCopy() {
  if (!copyBase) { showToast('コピー元がありません', 'warning'); return; }
  if (!copySelectedDates || copySelectedDates.length === 0) {
    showToast('コピー先を選択してください', 'warning'); return;
  }

  const verb = copyIsDraft ? '登録' : 'コピー';
  const dup = data.filter(d => copySelectedDates.includes(d.日付)).map(d => d.日付);
  const confirmMsg = dup.length
    ? `${copySelectedDates.length}日分を${verb}しますか？\n（${dup.length}件は既存データを上書きします）`
    : `${copySelectedDates.length}日分を${verb}しますか？`;
  if (!await showConfirm(confirmMsg)) return;

  takeUndoSnapshot();
  copySelectedDates.forEach(dateStr => {
    const newItem = { ...copyBase, 日付: dateStr };
    const idx = data.findIndex(d => d.日付 === dateStr);
    if (idx !== -1) data[idx] = newItem;
    else data.push(newItem);
  });

  sortData(); save(); render();
  const count = copySelectedDates.length;
  const wasDraft = copyIsDraft;
  closeModal();
  if (wasDraft) clearForm();
  const msg = dup.length ? `（${dup.length}件は上書き更新）` : '';
  showToast(`${count}日分の${verb}が完了しました ${msg}`, 'success', 8000, undoAction());
}

function renderCopyCalendar() {
  if (!copyBase) return;
  const cal = document.getElementById('copyCalendar');
  cal.textContent = '';

  const titleEl = document.getElementById('copyModalTitle');
  if (titleEl) {
    titleEl.textContent = copyIsDraft
      ? '📅 登録先をカレンダーから選択（複数日へ一括登録）'
      : '📅 コピー先をカレンダーから選択';
  }

  const monthValue = resolveMonth();
  const [y, m] = monthValue.split('-').map(Number);

  const title = document.createElement('div');
  title.className = 'copy-calendar-title';
  title.textContent = `コピー先カレンダー: ${formatMonthLabel(monthValue)}`;
  cal.appendChild(title);

  const grid = document.createElement('div');
  grid.className = 'event-calendar';
  buildCalendarGrid(grid, y, m - 1, copySelectedDates, toggleCopyDate);
  cal.appendChild(grid);

  updateCopySelectedDatesDisplay();
}

function toggleCopyDate(dateStr) {
  toggleInList(copySelectedDates, dateStr);
  renderCopyCalendar();
}

function updateCopySelectedDatesDisplay() {
  const display = document.getElementById('copy-selected-dates-display');
  if (!display) return;
  display.textContent = copySelectedDates.length === 0
    ? 'なし'
    : `${copySelectedDates.length}日選択済み`;
}
