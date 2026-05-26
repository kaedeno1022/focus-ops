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
