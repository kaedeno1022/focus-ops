// ============================================================
// カレンダーUI（月間ビュー・イベント選択・編集）
// ============================================================

// ============================================================
// 月間ビュー（入力状況の確認用）
// ============================================================
function renderCalendarView() {
  const container = document.getElementById('calendar-view');
  if (!container) return;

  if (!calendarViewMonth) setCalendarViewMonth(selectedMonth || getCurrentMonthValue());
  const [year, month] = calendarViewMonth.split('-').map(Number);

  const titleEl = document.getElementById('calendar-view-title');
  if (titleEl) titleEl.textContent = formatMonthLabel(calendarViewMonth);

  const byDate = new Map();
  data.forEach(d => { if (d.日付) byDate.set(d.日付, d); });

  const daysInMonth = new Date(year, month, 0).getDate();
  const startDow    = new Date(year, month - 1, 1).getDay();
  const today       = getTodayJST();

  container.textContent = '';

  WEEKDAYS.forEach((wd, i) => {
    const header = document.createElement('div');
    header.className = 'cal-head';
    if (i === 0) header.classList.add('is-sun');
    if (i === 6) header.classList.add('is-sat');
    header.textContent = wd;
    container.appendChild(header);
  });

  for (let i = 0; i < startDow; i++) {
    const empty = document.createElement('div');
    empty.className = 'cal-cell is-empty';
    container.appendChild(empty);
  }

  let totalMinutes = 0;
  let filledDays = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dow     = new Date(year, month - 1, day).getDay();
    const entry   = byDate.get(dateStr);

    const cell = document.createElement('div');
    cell.className = 'cal-cell';
    cell.dataset.date = dateStr;
    if (dow === 0) cell.classList.add('is-sun');
    if (dow === 6) cell.classList.add('is-sat');
    if (dateStr === today) cell.classList.add('is-today');
    if (entry) cell.classList.add('has-entry');

    const dateLine = document.createElement('div');
    dateLine.className = 'cal-date';
    dateLine.textContent = String(day);
    cell.appendChild(dateLine);

    getDatedEventsForDay(eventData, dateStr)
      .forEach(ev => {
        const eventLine = document.createElement('div');
        eventLine.className = 'cal-event';
        eventLine.textContent = ev.content;
        cell.appendChild(eventLine);
      });

    if (entry) {
      filledDays++;
      if (entry.勤務実績) {
        const status = document.createElement('div');
        status.className = 'cal-status';
        status.textContent = entry.勤務実績;
        cell.appendChild(status);
      }
      const minutes = calcWorkMinutes(entry);
      if (minutes !== null) {
        totalMinutes += minutes;
        const time = document.createElement('div');
        time.className = 'cal-time';
        time.textContent = formatHoursMinutes(minutes);
        cell.appendChild(time);
      }
      if (entry.作業内容) {
        const content = document.createElement('div');
        content.className = 'cal-content';
        content.textContent = entry.作業内容;
        cell.appendChild(content);
      }
      cell.title = 'クリックで編集';
    } else {
      cell.title = 'クリックでこの日の入力を開始';
    }

    cell.addEventListener('click', () => openCalendarDate(dateStr));
    container.appendChild(cell);
  }

  const statsEl = document.getElementById('calendar-view-stats');
  if (statsEl) {
    statsEl.textContent =
      `入力済み ${filledDays}日 / 作業時間合計 ${formatHoursMinutes(totalMinutes)}`;
  }
}

// カレンダーの日付をクリックしたときの動作。
// データがあれば編集、なければその日付で入力を始める
function openCalendarDate(dateStr) {
  const index = data.findIndex(d => d.日付 === dateStr);
  if (index !== -1) { editRow(index); return; }

  document.getElementById('date').value = dateStr;
  document.getElementById('weekday').textContent = getWeekdayLabel(dateStr);
  applyEventContent('', { silent: true });
  activateTab('input-tab');
  showToast(`${formatDateLabel(dateStr)}の入力を開始します`, 'info', 2500);
}

function shiftCalendarMonth(delta) {
  const [year, month] = (calendarViewMonth || getCurrentMonthValue()).split('-').map(Number);
  const shifted = new Date(year, month - 1 + delta, 1);
  setCalendarViewMonth(`${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, '0')}`);
  renderCalendarView();
}

function resetCalendarMonth() {
  setCalendarViewMonth(getCurrentMonthValue());
  renderCalendarView();
}

// ============================================================
// イベント追加フォーム用カレンダー
// ============================================================
function renderEventCalendar() {
  const calendarDiv = document.getElementById('event-calendar');
  if (!calendarDiv) return;
  calendarDiv.textContent = '';

  const monthFilter = document.getElementById('event-month-filter');
  const monthValue  = (monthFilter && monthFilter.value) || getCurrentMonthValue();
  const [year, month] = monthValue.split('-').map(Number);

  buildCalendarGrid(calendarDiv, year, month - 1, selectedDates, toggleEventDate);
  updateSelectedDatesDisplay();
}

function toggleEventDate(dateStr) {
  toggleInList(selectedDates, dateStr);
  renderEventCalendar();
}

function updateSelectedDatesDisplay() {
  const displayElement = document.getElementById('selected-dates-display');
  if (displayElement) displayElement.textContent = formatDateList(selectedDates);
}

// ============================================================
// イベント編集モーダル用カレンダー
// ============================================================
function renderEditEventCalendar() {
  const calendarDiv = document.getElementById('event-edit-calendar');
  if (!calendarDiv) return;
  calendarDiv.textContent = '';

  const monthValue = editEventCalendarMonth
    || (selectedDates.length > 0 ? selectedDates[0].slice(0, 7) : getCurrentMonthValue());
  const [year, month] = monthValue.split('-').map(Number);

  buildCalendarGrid(calendarDiv, year, month - 1, selectedDates, toggleEditEventDate);
  updateEditSelectedDatesDisplay();
}

function toggleEditEventDate(dateStr) {
  toggleInList(selectedDates, dateStr);
  renderEditEventCalendar();
}

function updateEditSelectedDatesDisplay() {
  const displayElement = document.getElementById('event-edit-selected-dates-display');
  if (displayElement) displayElement.textContent = formatDateList(selectedDates);
}

// ============================================================
// 共通ヘルパー
// ============================================================

// 選択リストに対する追加・削除をまとめる（配列の参照は保つ）
function toggleInList(list, value) {
  const index = list.indexOf(value);
  if (index > -1) list.splice(index, 1);
  else list.push(value);
  list.sort();
}

function buildCalendarGrid(container, year, month, selectedList, onToggle) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDow    = new Date(year, month, 1).getDay();

  WEEKDAYS.forEach(wd => {
    const dayHeader = document.createElement('div');
    dayHeader.className = 'calendar-day-header';
    dayHeader.textContent = wd;
    container.appendChild(dayHeader);
  });

  for (let i = 0; i < startDow; i++) {
    const emptyDay = document.createElement('div');
    emptyDay.className = 'calendar-day empty';
    container.appendChild(emptyDay);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayDiv  = document.createElement('div');
    dayDiv.className = 'calendar-day';
    dayDiv.textContent = day;
    dayDiv.dataset.date = dateStr;
    if (selectedList.includes(dateStr)) dayDiv.classList.add('selected');
    dayDiv.addEventListener('click', () => onToggle(dateStr));
    container.appendChild(dayDiv);
  }
}

function formatDateList(dates) {
  if (dates.length === 0) return 'なし';
  const maxDisplay = 8;
  if (dates.length <= maxDisplay) return dates.join(', ');
  return `${dates.slice(0, maxDisplay).join(', ')}, ... (他${dates.length - maxDisplay}日)`;
}
