// ============================================================
// 状態管理
// ============================================================
export let data = [];
export let eventData = [];
export let editIndex = null;
export let copyBase = null;
export let Els = {};
export let currentMode = 'employee'; // 'employee' | 'bp'
export let eventMode = 'single'; // 'single' | 'range'
export let editEventIndex = null;
export let selectedMonth = ''; // データ一覧の選択月 (YYYY-MM)
export let selectedEventMonth = ''; // イベント一覧の選択月 (YYYY-MM)
export let selectedDates = []; // 複数日選択用

export function setData(newData) {
  data = newData;
}

export function setEventData(newEventData) {
  eventData = newEventData;
}

export function setEditIndex(index) {
  editIndex = index;
}

export function setCopyBase(base) {
  copyBase = base;
}

export function setEls(els) {
  Els = els;
}

export function setCurrentMode(mode) {
  currentMode = mode;
}

export function setEventMode(mode) {
  eventMode = mode;
}

export function setEditEventIndex(index) {
  editEventIndex = index;
}

export function setSelectedMonth(month) {
  selectedMonth = month;
}

export function setSelectedEventMonth(month) {
  selectedEventMonth = month;
}

export function setSelectedDates(dates) {
  selectedDates = dates;
}

export function toggleSelectedDate(date) {
  const idx = selectedDates.indexOf(date);
  if (idx > -1) {
    selectedDates.splice(idx, 1);
  } else {
    selectedDates.push(date);
  }
  selectedDates.sort();
}
