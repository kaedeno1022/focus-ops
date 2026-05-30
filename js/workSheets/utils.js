// ============================================================
// ユーティリティ関数
// ============================================================

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

function isTimeReversed(startStr, endStr) {
  return !!startStr && !!endStr && timeToMinutes(endStr) < timeToMinutes(startStr);
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
  const abs  = Math.abs(minutes);
  const h    = Math.floor(abs / 60);
  const m    = abs % 60;
  if (h === 0) return `${sign}${m}分`;
  return m > 0 ? `${sign}${h}時間${m}分` : `${sign}${h}時間`;
}

function calcWorkMinutes(d) {
  if (!d.作業開始 || !d.作業終了) return null;
  let start = timeToMinutes(d.作業開始);
  let end   = timeToMinutes(d.作業終了);
  if (end < start) end += 24 * 60;
  const duration = end - start;
  const noon = 12 * 60;
  const afterNoon = 13 * 60;
  const lunchBreak = (start < noon && end > afterNoon) ? 60 : 0;
  const breakAfter18 = Math.round(parseFloat(d['18時以降休憩'] || '0') * 60);
  return Math.max(0, duration - lunchBreak - breakAfter18);
}

function getTodayJST() {
  const now = new Date();
  const jst = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  return jst.toISOString().slice(0, 10);
}

function getISOWeek(dateStr) {
  const date = new Date(dateStr);
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function groupByWeek(dataArray) {
  const weeks = {};
  dataArray.forEach(d => {
    if (!d.日付) return;
    const week = getISOWeek(d.日付);
    if (!weeks[week]) weeks[week] = [];
    weeks[week].push(d);
  });
  return weeks;
}

function calculateOvertime(weeklyData) {
  let totalOvertimeMin = 0;
  Object.values(weeklyData).forEach(weekData => {
    let weekTotalMin = 0;
    let dailyOvertimeMin = 0;
    weekData.forEach(d => {
      const workMin = calcWorkMinutes(d);
      if (workMin === null) return;
      const dayOfWeek = new Date(d.日付).getDay();
      if (dayOfWeek === 0) return;
      weekTotalMin += workMin;
      const dailyOvertime = Math.max(0, workMin - 8 * 60);
      dailyOvertimeMin += dailyOvertime;
    });
    const weeklyOvertime = Math.max(0, weekTotalMin - 40 * 60 - dailyOvertimeMin);
    totalOvertimeMin += dailyOvertimeMin + weeklyOvertime;
  });
  return totalOvertimeMin;
}

function getCurrentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function buildMonthLines(data, calcWorkMinutesFn, minutesToBpTimeFn, minutesToTimeFn, forBP = false) {
  if (!data.length) return null;
  const monthMap = {};
  data.forEach(d => {
    const dateStr = d.日付;
    if (!dateStr) return;
    const [y, m] = dateStr.split('-');
    const key = `${y}-${m}`;
    if (!monthMap[key]) monthMap[key] = [];
    monthMap[key].push(d);
  });
  const lines = [];
  Object.keys(monthMap).sort().forEach(monthKey => {
    lines.push(`【${monthKey}】`);
    const items = monthMap[monthKey];
    items.sort((a, b) => new Date(a.日付) - new Date(b.日付));
    items.forEach(d => {
      const workMin = calcWorkMinutesFn(d);
      const workDisplay = (forBP && workMin !== null)
        ? minutesToBpTimeFn(workMin)
        : (workMin !== null ? minutesToTimeFn(workMin) : '---');
      lines.push(`${d.日付} ${d.作業内容} ${workDisplay}`);
    });
    lines.push('');
  });
  return lines.join('\n');
}

