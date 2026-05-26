// ============================================================
// 簡易チェックイン/チェックアウト
// ============================================================
import { CHECKIN_KEY, ROUND_DIFFS_KEY } from './constants.js';
import { currentMode, eventData } from './state.js';
import { getTodayJST, nowTimeStr, roundToQuarter, timeToMinutes } from './utils.js';
import { showToast } from './ui.js';

export function updateCheckinUI() {
  const info = JSON.parse(localStorage.getItem(CHECKIN_KEY) || 'null');
  if (!info || !info.status) {
    document.getElementById('checkin-status-text').textContent  = 'チェックアウト中';
    document.getElementById('checkin-btn').textContent          = '出勤';
    document.getElementById('checkin-btn').classList.remove('btn-danger');
    document.getElementById('checkin-status').classList.remove('status-in');
    document.getElementById('checkin-status').classList.add('status-out');
    document.getElementById('checkin-detail').innerHTML = '';
    return;
  }
  document.getElementById('checkin-status-text').textContent = 'チェックイン中';
  document.getElementById('checkin-btn').textContent         = '退勤';
  document.getElementById('checkin-btn').classList.add('btn-danger');
  document.getElementById('checkin-status').classList.remove('status-out');
  document.getElementById('checkin-status').classList.add('status-in');
  const started = info.startTime || '---';
  const det     = `<div class="checkin-detail-row"><span class="checkin-detail-label">出勤:</span><span class="checkin-detail-value">${started}</span></div>`;
  document.getElementById('checkin-detail').innerHTML = det;
}

export function simpleCheckIn() {
  const info = JSON.parse(localStorage.getItem(CHECKIN_KEY) || 'null');
  if (!info || !info.status) { doCheckIn(); return; }
  doCheckOut();
}

export function doCheckIn() {
  const now = nowTimeStr();
  const rounded = roundToQuarter(now, 'up');
  const today = getTodayJST();
  let matchedContent = '';
  if (eventData?.length) {
    const matched = eventData.filter(ev => {
      const st = ev.startDate || ev.date || null;
      const ed = ev.endDate   || ev.date || null;
      const exc = ev.excludeDates ? ev.excludeDates.split(',').map(s => s.trim()).filter(Boolean) : [];
      if (exc.includes(today)) return false;
      if (st && today < st) return false;
      if (ed && today > ed) return false;
      return true;
    });
    if (matched.length) {
      matchedContent = matched.map(ev => ev.content).join(',');
    }
  }
  const diff = timeToMinutes(rounded) - timeToMinutes(now);
  localStorage.setItem(CHECKIN_KEY, JSON.stringify({
    status: 'in', startTime: rounded, date: today, content: matchedContent,
  }));
  if (diff > 0 && currentMode === 'employee') {
    const existingDiffs = JSON.parse(localStorage.getItem(ROUND_DIFFS_KEY) || '[]');
    existingDiffs.push({ type: 'in', actual: now, rounded, diffMinutes: diff });
    localStorage.setItem(ROUND_DIFFS_KEY, JSON.stringify(existingDiffs));
  }
  updateCheckinUI();
  showToast(`出勤しました (${rounded})\n内容: ${matchedContent || '(なし)'}`, 'success', 4000);
}

export function doCheckOut() {
  const info = JSON.parse(localStorage.getItem(CHECKIN_KEY) || 'null');
  if (!info || !info.status) { showToast('チェックインしていません', 'warning'); return; }
  const now = nowTimeStr();
  const rounded = roundToQuarter(now, 'down');
  const diff = timeToMinutes(now) - timeToMinutes(rounded);
  if (diff > 0 && currentMode === 'employee') {
    const existingDiffs = JSON.parse(localStorage.getItem(ROUND_DIFFS_KEY) || '[]');
    existingDiffs.push({ type: 'out', actual: now, rounded, diffMinutes: diff });
    localStorage.setItem(ROUND_DIFFS_KEY, JSON.stringify(existingDiffs));
  }
  const started = info.startTime || '???';
  const content = info.content || '';
  const dateStr = info.date || getTodayJST();
  document.getElementById('date').value     = dateStr;
  document.getElementById('start').value    = started;
  document.getElementById('end').value      = rounded;
  document.getElementById('content').value  = content.slice(0, 27);
  const tabFirst = document.querySelector('.tab-btn');
  if (tabFirst) {
    tabFirst.click();
    window.scrollTo({ top: 600, behavior: 'smooth' });
  }
  localStorage.removeItem(CHECKIN_KEY);
  updateCheckinUI();
  showToast(`退勤しました (${rounded})\n時刻を入力欄に反映しました`, 'info', 4000);
}

export function simpleCheckOut() {
  doCheckOut();
}

export function applyEventsToCheckin() {
  const today = getTodayJST();
  if (!eventData?.length) { showToast('イベントデータがありません', 'info'); return; }
  const matched = eventData.filter(ev => {
    const st = ev.startDate || ev.date || null;
    const ed = ev.endDate   || ev.date || null;
    const exc = ev.excludeDates ? ev.excludeDates.split(',').map(s => s.trim()).filter(Boolean) : [];
    if (exc.includes(today)) return false;
    if (st && today < st) return false;
    if (ed && today > ed) return false;
    return true;
  }).map(ev => ev.content);
  if (!matched.length) { showToast('今日のイベントはありません', 'info'); return; }
  const contentEl = document.getElementById('simple_content');
  contentEl.value = matched.join(',').slice(0, 27);
  showToast(`イベントを反映しました`, 'success', 2500);
}

window.simpleCheckIn = simpleCheckIn;
window.simpleCheckOut = simpleCheckOut;
window.applyEventsToCheckin = applyEventsToCheckin;
