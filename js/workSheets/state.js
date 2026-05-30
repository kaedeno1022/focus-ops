// ============================================================
// 状態管理
// ============================================================
let data = [];
let eventData = [];
let editIndex = null;
let copyBase = null;
let Els = {};
let currentMode = 'employee'; // 'employee' | 'bp'
let editEventIndex = null;
let selectedMonth = '';
let selectedEventMonth = '';
let selectedDates = [];
let copySelectedDates = [];
let editEventCalendarMonth = '';

function setData(newData) { data = newData; }
function setEventData(newEventData) { eventData = newEventData; }
function setEditIndex(index) { editIndex = index; }
function setCopyBase(base) { copyBase = base; }
function setEls(els) { Els = els; }
function setCurrentMode(mode) { currentMode = mode; }
function setEditEventIndex(index) { editEventIndex = index; }
function setSelectedMonth(m) { selectedMonth = m; }
function setSelectedEventMonth(m) { selectedEventMonth = m; }
function setSelectedDates(arr) { selectedDates = arr; }
function setCopySelectedDates(arr) { copySelectedDates = arr; }
function setEditEventCalendarMonth(m) { editEventCalendarMonth = m; }

