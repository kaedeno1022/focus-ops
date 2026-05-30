// ============================================================
// メインエントリーポイント・初期化・window公開
// ============================================================

// CRUD

// Events

// JSON

// Copy

// Clipboard

// ============================================================
// モード切り替え
// ============================================================
function closeModeDropdown() {
  const dropdown = document.getElementById('modeDropdown');
  const btn = document.getElementById('modeMenuBtn');
  if (dropdown) dropdown.hidden = true;
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

function updateModeMenuButtonLabel(mode) {
  const btn = document.getElementById('modeMenuBtn');
  if (!btn) return;
  btn.textContent = `モード: ${mode === 'bp' ? 'BP用' : '社員用'} ▾`;
}

function initModeMenu() {
  const btn = document.getElementById('modeMenuBtn');
  const dropdown = document.getElementById('modeDropdown');
  if (!btn || !dropdown) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const willOpen = dropdown.hidden;
    dropdown.hidden = !willOpen;
    btn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
  });

  dropdown.addEventListener('click', (e) => e.stopPropagation());
  document.addEventListener('click', closeModeDropdown);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModeDropdown();
  });
}

function switchMode(mode) {
  setCurrentMode(mode);
  localStorage.setItem(MODE_KEY, mode);
  load(); render();

  const employeeBtn = document.getElementById('mode-employee');
  const bpBtn = document.getElementById('mode-bp');

  if (employeeBtn) {
    employeeBtn.classList.toggle('active', mode === 'employee');
    employeeBtn.setAttribute('aria-pressed', mode === 'employee' ? 'true' : 'false');
  }
  if (bpBtn) {
    bpBtn.classList.toggle('active', mode === 'bp');
    bpBtn.setAttribute('aria-pressed', mode === 'bp' ? 'true' : 'false');
  }

  updateModeMenuButtonLabel(mode);
  closeModeDropdown();

  document.querySelectorAll('.mode-employee-only').forEach(el => el.classList.toggle('hidden', mode !== 'employee'));
  document.querySelectorAll('.mode-bp-only').forEach(el  => el.classList.toggle('hidden', mode !== 'bp'));

  controlTime(); controlBreakDisplay(); updateSubstituteVisibility();
  controlTime('edit'); controlBreakDisplay('edit'); updateSubstituteVisibility('edit');
}

// ============================================================
// 月フィルタ
// ============================================================
function initMonthFilters() {
  const dataMonthSelect    = document.getElementById('data-month-filter');
  const eventMonthSelect   = document.getElementById('event-month-filter');
  const dataMonthClearBtn  = document.getElementById('data-month-clear');
  const eventMonthClearBtn = document.getElementById('event-month-clear');

  if (dataMonthSelect) {
    dataMonthSelect.value = getCurrentMonthValue();
    dataMonthSelect.addEventListener('change', () => filterDataByMonth());
    filterDataByMonth();
  }
  if (eventMonthSelect) {
    eventMonthSelect.value = getCurrentMonthValue();
    eventMonthSelect.addEventListener('change', () => filterEventsByMonth());
    filterEventsByMonth();
  }
  if (dataMonthClearBtn) {
    dataMonthClearBtn.addEventListener('click', () => {
      if (!dataMonthSelect) return;
      dataMonthSelect.value = '';
      filterDataByMonth();
    });
  }
  if (eventMonthClearBtn) {
    eventMonthClearBtn.addEventListener('click', () => {
      if (!eventMonthSelect) return;
      eventMonthSelect.value = '';
      filterEventsByMonth();
    });
  }
}

function filterDataByMonth() {
  const el = document.getElementById('data-month-filter');
  if (!el) return;
  setSelectedMonth(el.value);
  render();
}

function filterEventsByMonth() {
  const el = document.getElementById('event-month-filter');
  if (!el) return;
  setSelectedEventMonth(el.value);
  renderEventTable();
  renderEventCalendar();
}

// ============================================================
// 初期化
// ============================================================
function init() {
  const saved = localStorage.getItem(MODE_KEY);
  initModeMenu();
  if (saved) setCurrentMode(saved);
  switchMode(saved || 'employee');
  loadEventData(); renderEventTable();
  load(); render();
  initTabs(); initInputForm(); initEditModalListeners();
  controlTime(); controlBreakDisplay(); updateSubstituteVisibility();
  updateCheckinUI();
  setEventModeUI();
  initMonthFilters();
}

// ============================================================
// window公開
// ============================================================
window.addData              = addData;
window.editRow              = editRow;
window.saveEditData         = saveEditData;
window.closeEditModal       = closeEditModal;
window.del                  = del;
window.clearAll             = clearAll;
window.clearRoundDiffs      = clearRoundDiffs;
window.importEventsToContents = () => importEventsToContents(eventData);
window.formatTimes          = formatTimes;
window.addEvent             = addEvent;
window.clearEventForm       = clearEventForm;
window.closeEditEventModal  = closeEditEventModal;
window.saveEditEvent        = saveEditEvent;
window.clearAllEvents       = clearAllEvents;
window.simpleCheckIn        = simpleCheckIn;
window.simpleCheckOut       = simpleCheckOut;
window.applyEventsToCheckin = applyEventsToCheckin;
window.exportJSON           = exportJSON;
window.importJSON           = importJSON;
window.exportEventJSON      = exportEventJSON;
window.importEventJSON      = importEventJSON;
window.openCopy             = openCopy;
window.closeModal           = closeModal;
window.selectAll            = selectAll;
window.clearChecks          = clearChecks;
window.selectWeekdays       = selectWeekdays;
window.executeCopy          = executeCopy;
window.switchMode           = switchMode;
window.filterDataByMonth    = filterDataByMonth;
window.filterEventsByMonth  = filterEventsByMonth;
window.renderEventCalendar  = renderEventCalendar;

document.addEventListener('DOMContentLoaded', init);
