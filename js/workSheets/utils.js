// ============================================================
// ユーティリティ関数
//
// 日時はすべて日本時間（JST）で扱う。
// 端末のタイムゾーンがJST以外でも「今日」「現在時刻」がずれないよう、
// 現在日時の取得は jstNow() を経由し、日付文字列の解釈は parseDate() に統一する。
// ============================================================

const JST_OFFSET_MIN = 9 * 60;

// 現在日時をJSTの壁時計として持つ Date を返す。
// getFullYear() / getHours() などのローカル系APIでJSTの値が読める
// （UTCへ変換すると二重にずれるため toISOString() には使わないこと）
function jstNow() {
  const now = new Date();
  return new Date(now.getTime() + (JST_OFFSET_MIN + now.getTimezoneOffset()) * 60 * 1000);
}

// 'YYYY-MM-DD' を暦日として解釈する。
// new Date('YYYY-MM-DD') はUTC解釈になり端末のタイムゾーンで曜日がずれるため使わない
function parseDate(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function toDateString(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getTodayJST() {
  return toDateString(jstNow());
}

function getCurrentMonthValue() {
  const now = jstNow();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function nowTimeStr() {
  const now = jstNow();
  return minutesToTime(now.getHours() * 60 + now.getMinutes());
}

function getWeekday(dateStr) {
  const d = parseDate(dateStr);
  return d ? WEEKDAYS[d.getDay()] : '';
}

function getWeekdayLabel(dateStr) {
  const wd = getWeekday(dateStr);
  return wd ? `(${wd})` : '';
}

// 'YYYY-MM' を「YYYY年M月」に整形する
function formatMonthLabel(monthStr) {
  if (!monthStr) return '';
  const [y, m] = monthStr.split('-').map(Number);
  if (!y || !m) return monthStr;
  return `${y}年${m}月`;
}

// 'YYYY-MM-DD' を「M月D日(曜)」に整形する
function formatDateLabel(dateStr) {
  const d = parseDate(dateStr);
  if (!d) return dateStr || '';
  return `${d.getMonth() + 1}月${d.getDate()}日${getWeekdayLabel(dateStr)}`;
}

function getFormEl(prefix, id) {
  return document.getElementById(prefix ? `${prefix}-${id}` : id);
}

// イベントがその日付に該当するか。
// 日付未選択（dates が空配列）のイベントは全日程に該当させる
function matchesEventDate(ev, dateStr) {
  const dates = Array.isArray(ev.dates) ? ev.dates : null;
  if (ev.alwaysShow) return !dates || !dates.includes(dateStr);
  if (dates) return dates.length === 0 || dates.includes(dateStr);
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

// 日付を明示的に指定したイベント（常時表示ではなく dates を持つもの）のうち、
// その日付に該当するものだけを返す。カレンダービューでの表示に使う
function getDatedEventsForDay(events, dateStr) {
  return events.filter(ev => !ev.alwaysShow && Array.isArray(ev.dates) && ev.dates.includes(dateStr));
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

function formatHoursMinutes(minutes) {
  const sign = minutes < 0 ? '-' : '';
  // 作業時間は0.01時間（＝0.6分）単位で丸められるため、表示時に分へ寄せる
  const abs  = Math.round(Math.abs(minutes));
  const h    = Math.floor(abs / 60);
  const m    = abs % 60;
  if (h === 0) return `${sign}${m}分`;
  return m > 0 ? `${sign}${h}時間${m}分` : `${sign}${h}時間`;
}
