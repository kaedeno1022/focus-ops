// ============================================================
// ユーティリティ関数
// ============================================================

function getFormEl(prefix, id) {
  return document.getElementById(prefix ? `${prefix}-${id}` : id);
}

function matchesEventDate(ev, dateStr) {
  if (ev.alwaysShow) return !ev.dates || !ev.dates.includes(dateStr);
  if (ev.dates) return ev.dates.includes(dateStr);
  const start = ev.startDate || ev.date || null;
  const end   = ev.endDate   || ev.date || null;
  const excludes = ev.excludeDates
    ? ev.excludeDates.split(',').map(s => s.trim()).filter(Boolean)
    : [];
  if (excludes.includes(dateStr)) return false;
  if (start && dateStr < start) return false;
  if (end && dateStr > end) return false;
  return true;
}

function getWeekdayLabel(dateStr) {
  return dateStr ? `(${WEEKDAYS[new Date(dateStr).getDay()]})` : '';
}

function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

function roundToQuarter(timeStr, mode = 'nearest') {
  if (!timeStr) return '';
  const total = timeToMinutes(timeStr);
  let rounded;
  if (mode === 'up')        rounded = Math.ceil(total  / 15) * 15;
  else if (mode === 'down') rounded = Math.floor(total / 15) * 15;
  else                      rounded = Math.round(total / 15) * 15;
  return minutesToTime(rounded);
}

// 日マタギ勤務かどうか。VBAは「開始 >= 終了」を日マタギとみなすため等号を含める
function isTimeReversed(startStr, endStr) {
  return !!startStr && !!endStr && timeToMinutes(endStr) <= timeToMinutes(startStr);
}

function nowTimeStr() {
  const now = new Date();
  return minutesToTime(now.getHours() * 60 + now.getMinutes());
}

function minutesToBpTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}

function formatHoursMinutes(minutes) {
  const sign = minutes < 0 ? '-' : '';
  // 作業時間は0.01時間（＝0.6分）単位で丸められるため、表示時に分へ寄せる
  const abs  = Math.round(Math.abs(minutes));
  const h    = Math.floor(abs / 60);
  const m    = abs % 60;
  if (h === 0) return `${sign}${m}分`;
  return m > 0 ? `${sign}${h}時間${m}分` : `${sign}${h}時間`;
}

function getTodayJST() {
  const now = new Date();
  const jst = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  return jst.toISOString().slice(0, 10);
}

function getCurrentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

