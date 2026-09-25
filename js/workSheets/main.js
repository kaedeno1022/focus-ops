// ============================================================
// メインエントリーポイント・初期化・window公開
// ============================================================

// ============================================================
// モード切り替え
// ============================================================
function closeModeDropdown() {
  const dropdown = document.getElementById('modeDropdown');
  const btn = document.getElementById('modeMenuBtn');
  if (dropdown) dropdown.hidden = true;
  if (btn) btn.setAttribute('aria-expanded', 'false');
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

// モードに応じた表示の切り替え。データの読み込みは行わない
function applyModeUI(mode) {
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

  const btn = document.getElementById('modeMenuBtn');
  if (btn) btn.textContent = `モード: ${mode === 'bp' ? 'BP用' : '社員用'} ▾`;
  closeModeDropdown();

  document.querySelectorAll('.mode-employee-only').forEach(el => el.classList.toggle('hidden', mode !== 'employee'));
  document.querySelectorAll('.mode-bp-only').forEach(el  => el.classList.toggle('hidden', mode !== 'bp'));

  controlTime(); controlBreakDisplay(); updateSubstituteVisibility();
  controlTime('edit'); controlBreakDisplay('edit'); updateSubstituteVisibility('edit');
}

function switchMode(mode) {
  setCurrentMode(mode);
  writeString(MODE_KEY, mode);
  // モードごとに保存先が別なので、取り消し用のスナップショットは持ち越さない
  setUndoSnapshot(null);
  load();
  applyModeUI(mode);
  render();
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
  // カレンダービューも選択した月に追従させる
  if (el.value) setCalendarViewMonth(el.value);
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
// バックアップ案内
// ============================================================
function initBackupNotice() {
  const exportBtn = document.getElementById('backup-notice-export');
  const laterBtn  = document.getElementById('backup-notice-later');
  if (exportBtn) exportBtn.addEventListener('click', () => exportFullBackup());
  if (laterBtn)  laterBtn.addEventListener('click', () => snoozeBackupNotice());
}

// ============================================================
// 複数タブの同期
// ============================================================
// 各タブは起動時に読んだ配列を丸ごと書き戻すため、別タブの変更を取り込まないと黙って消してしまう
function initStorageSync() {
  // 退勤のように1操作で複数キーが書き換わるため、まとめて1回だけ読み直す
  let reloadTimer = null;
  window.addEventListener('storage', e => {
    // 下書きは1文字ごとに書かれるので、入力欄だけを黙って追従させる
    if (e.key === CHECKIN_DRAFT_KEY) { syncCheckinDraft(); return; }
    const syncKeys = [dataKey(), roundDiffsKey(), EVENT_STORAGE_KEY, CHECKIN_KEY,
      LEAVE_BASELINE_KEY, LAST_EXPORT_KEY, MISSING_DISMISSED_KEY];
    // key が null なのは別タブで localStorage.clear() されたとき
    if (e.key !== null && !syncKeys.includes(e.key)) return;
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(reloadFromStorage, 100);
  });
}

function reloadFromStorage() {
  // モーダルは編集対象を配列の添字で持っているため、読み直した配列に対して保存すると別の行を上書きしうる
  const hadModal = anyModalOpen();
  if (hadModal) closeAllModals();
  // 取り消すと別タブの変更ごと巻き戻るため、スナップショットは捨てる
  setUndoSnapshot(null);

  load();
  loadEventData();
  render();
  renderEventTable();
  renderEventCalendar();
  updateCheckinUI();
  syncCheckinDraft();

  if (hadModal) {
    showToast('別のタブでデータが更新されたため、編集中の画面を閉じて最新の内容を読み込みました', 'warning', 8000);
  } else {
    showToast('別のタブでの変更を読み込みました', 'info');
  }
}

function syncCheckinDraft() {
  const contentEl = document.getElementById('simple_content');
  if (!contentEl || document.activeElement === contentEl) return;
  contentEl.value = readString(CHECKIN_DRAFT_KEY);
  updateContentCounters();
}

// ============================================================
// 初期化
// ============================================================
function init() {
  initModeMenu();
  initTabs();
  initInputForm();
  initSubmitShortcuts();
  initEditModalListeners();
  initModalKeyboard();
  initBackupNotice();
  initCalendarViewControls();
  initLeaveRangeFilter();

  const savedMode = readString(MODE_KEY);
  setCurrentMode(savedMode === 'bp' ? 'bp' : 'employee');
  applyModeUI(currentMode);

  loadEventData();
  load();
  clearForm();

  // 月フィルタの初期化から render() / renderEventTable() が走る
  initMonthFilters();
  initCheckinDraft();
  initContentHelpers();
  updateCheckinUI();
  renderEventCalendar();
  initStorageSync();
}

function initLeaveRangeFilter() {
  const startEl = document.getElementById('leave-range-start');
  const endEl = document.getElementById('leave-range-end');
  if (!startEl || !endEl) return;
  const today = getTodayJST();
  startEl.value = today.slice(0, 8) + '01'; // 当月1日
  endEl.value = today;
}

function initCalendarViewControls() {
  const prevBtn  = document.getElementById('calendar-prev');
  const nextBtn  = document.getElementById('calendar-next');
  const todayBtn = document.getElementById('calendar-today');
  if (prevBtn)  prevBtn.addEventListener('click',  () => shiftCalendarMonth(-1));
  if (nextBtn)  nextBtn.addEventListener('click',  () => shiftCalendarMonth(1));
  if (todayBtn) todayBtn.addEventListener('click', () => resetCalendarMonth());
}

// ============================================================
// window公開（HTMLのonclickから呼ぶもの）
// ============================================================
window.addData              = addData;
window.editRow              = editRow;
window.saveEditData         = saveEditData;
window.closeEditModal       = closeEditModal;
window.del                  = del;
window.clearAll             = clearAll;
window.clearRoundDiffs      = clearRoundDiffs;
window.importEventsToContents = importEventsToContents;
window.formatTimes          = formatTimes;
window.copySummary          = copySummary;
window.addEvent             = addEvent;
window.clearEventForm       = clearEventForm;
window.closeEditEventModal  = closeEditEventModal;
window.saveEditEvent        = saveEditEvent;
window.clearAllEvents       = clearAllEvents;
window.simpleCheckIn        = simpleCheckIn;
window.simpleCheckOut       = simpleCheckOut;
window.cancelCheckIn        = cancelCheckIn;
window.editCheckInTime      = editCheckInTime;
window.applyEventsToCheckin = applyEventsToCheckin;
window.applyLastContent     = applyLastContent;
window.exportJSON           = exportJSON;
window.exportFullBackup     = exportFullBackup;
window.restoreFullBackup    = restoreFullBackup;
window.importJSON           = importJSON;
window.exportEventJSON      = exportEventJSON;
window.importEventJSON      = importEventJSON;
window.applyEventContent    = applyEventContent;
window.openCopy             = openCopy;
window.openCopyFromForm     = openCopyFromForm;
window.closeModal           = closeModal;
window.closeAllModals       = closeAllModals;
window.selectAll            = selectAll;
window.clearChecks          = clearChecks;
window.selectWeekdays       = selectWeekdays;
window.executeCopy          = executeCopy;
window.switchMode           = switchMode;
window.openLeaveSettings    = openLeaveSettings;
window.closeLeaveModal      = closeLeaveModal;
window.saveLeaveSettings    = saveLeaveSettings;
window.clearLeaveSettings   = clearLeaveSettings;
window.checkLeaveUsage      = checkLeaveUsage;

document.addEventListener('DOMContentLoaded', init);
