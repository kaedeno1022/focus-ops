// ============================================================
// 状態管理
//
// 配列そのものを差し替えるときは setter を経由する。
// data / eventData / selectedDates は参照を保ったまま push・splice で
// 書き換えている箇所もあるため、差し替えと破壊的変更のどちらなのかを意識して扱う。
// ============================================================
let data = [];
let eventData = [];
let editIndex = null;
let copyBase = null;
let currentMode = 'employee'; // 'employee' | 'bp'
let editEventIndex = null;
let selectedMonth = '';
let selectedEventMonth = '';
let selectedDates = [];
let copySelectedDates = [];
let editEventCalendarMonth = '';
let calendarViewMonth = '';
// 直前の破壊的操作を取り消すためのスナップショット
let undoSnapshot = null;

function setData(newData) { data = newData; }
function setEventData(newEventData) { eventData = newEventData; }
function setEditIndex(index) { editIndex = index; }
function setCopyBase(base) { copyBase = base; }
function setCurrentMode(mode) { currentMode = mode; }
function setEditEventIndex(index) { editEventIndex = index; }
function setSelectedMonth(m) { selectedMonth = m; }
function setSelectedEventMonth(m) { selectedEventMonth = m; }
function setSelectedDates(arr) { selectedDates = arr; }
function setCopySelectedDates(arr) { copySelectedDates = arr; }
function setEditEventCalendarMonth(m) { editEventCalendarMonth = m; }
function setCalendarViewMonth(m) { calendarViewMonth = m; }
function setUndoSnapshot(snapshot) { undoSnapshot = snapshot; }
