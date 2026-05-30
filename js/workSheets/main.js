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
function switchMode(mode) {
  setCurrentMode(mode);
  localStorage.setItem(MODE_KEY, mode);
  load(); render();

  document.getElementById('mode-employee').classList.toggle('active', mode === 'employee');
  document.getElementById('mode-bp').classList.toggle('active', mode === 'bp');

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
