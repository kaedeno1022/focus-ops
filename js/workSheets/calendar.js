// ============================================================
// カレンダーUI（イベント選択・編集）
// ============================================================

// ============================================================
// イベント追加フォーム用カレンダー
// ============================================================
function renderEventCalendar() {
  const calendarDiv = document.getElementById('event-calendar');
  if (!calendarDiv) return;
  calendarDiv.innerHTML = '';

  const monthFilter = document.getElementById('event-month-filter');
  let year, month;
  if (monthFilter && monthFilter.value) {
    const [y, m] = monthFilter.value.split('-');
    year  = parseInt(y);
    month = parseInt(m) - 1;
  } else {
    const now = new Date();
    year  = now.getFullYear();
    month = now.getMonth();
  }

  buildCalendarGrid(calendarDiv, year, month, selectedDates, toggleEventDate);
  updateSelectedDatesDisplay();
}

function toggleEventDate(dateStr) {
  const index = selectedDates.indexOf(dateStr);
  if (index > -1) {
    selectedDates.splice(index, 1);
  } else {
    selectedDates.push(dateStr);
  }
  selectedDates.sort();
  renderEventCalendar();
}

function updateSelectedDatesDisplay() {
  const displayElement = document.getElementById('selected-dates-count') ||
                        document.getElementById('selected-dates-display');
  if (displayElement) {
    displayElement.textContent = formatDateList(selectedDates);
  }
}

// ============================================================
// イベント編集モーダル用カレンダー
// ============================================================
function renderEditEventCalendar() {
  const calendarDiv = document.getElementById('event-edit-calendar');
  if (!calendarDiv) return;
  calendarDiv.innerHTML = '';

  let year, month;
  if (editEventCalendarMonth) {
    const [y, m] = editEventCalendarMonth.split('-');
    year  = parseInt(y);
    month = parseInt(m) - 1;
  } else if (selectedDates.length > 0) {
    const [y, m] = selectedDates[0].split('-');
    year  = parseInt(y);
    month = parseInt(m) - 1;
  } else {
    const now = new Date();
    year  = now.getFullYear();
    month = now.getMonth();
  }

  buildCalendarGrid(calendarDiv, year, month, selectedDates, toggleEditEventDate);
  updateEditSelectedDatesDisplay();
}

function toggleEditEventDate(dateStr) {
  const index = selectedDates.indexOf(dateStr);
  if (index > -1) {
    selectedDates.splice(index, 1);
  } else {
    selectedDates.push(dateStr);
  }
  selectedDates.sort();
  renderEditEventCalendar();
}

function updateEditSelectedDatesDisplay() {
  const displayElement = document.getElementById('event-edit-selected-dates-display');
  if (displayElement) {
    displayElement.textContent = formatDateList(selectedDates);
  }
}

// ============================================================
// 共通ヘルパー
// ============================================================
function buildCalendarGrid(container, year, month, selectedList, onToggle) {
  const firstDay    = new Date(year, month, 1);
  const lastDay     = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDow    = firstDay.getDay();

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

