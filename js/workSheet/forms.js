// ============================================================
// フォーム制御
// ============================================================
import { STATUS, SUBSTITUTE_VISIBLE_STATUSES, OFF_STATUSES } from './constants.js';
import { currentMode, eventData } from './state.js';
import { getWeekdayLabel, isTimeReversed, timeToMinutes } from './utils.js';
import { showToast } from './ui.js';

export function getFormEl(prefix, id) {
  return document.getElementById(prefix ? `${prefix}-${id}` : id);
}

export function controlTime(prefix = '') {
  if (currentMode === 'bp') return;
  const off   = OFF_STATUSES.includes(getFormEl(prefix, 'status').value);
  const start = getFormEl(prefix, 'start');
  const end   = getFormEl(prefix, 'end');
  start.disabled = off;
  end.disabled   = off;
  if (off) {
    start.value = '';
    end.value   = '';
  } else {
    if (!start.value) start.value = '09:00';
    if (!end.value)   end.value   = '18:00';
  }
}

export function updateSubstituteVisibility(prefix = '') {
  if (currentMode === 'bp') return;
  const v       = getFormEl(prefix, 'status').value;
  const wrap    = document.getElementById(prefix ? `${prefix}-substitute-wrap` : 'substitute-wrap');
  const subInput = getFormEl(prefix, 'substitute');
  const wdSpan  = document.getElementById(prefix ? `${prefix}-substitute-weekday` : 'substitute-weekday');
  if (SUBSTITUTE_VISIBLE_STATUSES.includes(v)) {
    wrap.classList.remove('hidden');
    subInput.required = true;
  } else {
    wrap.classList.add('hidden');
    subInput.required = false;
    subInput.value    = '';
    wdSpan.textContent = '';
  }
}

export function updateBreakOptions(prefix = '') {
  const status   = getFormEl(prefix, 'status').value;
  const startVal = getFormEl(prefix, 'start').value || '00:00';
  const endVal   = getFormEl(prefix, 'end').value;
  const breakSel = getFormEl(prefix, 'break');

  if (status === STATUS.FLEX || status === STATUS.SUBSTITUTE_WORK) {
    breakSel.innerHTML = '<option value=""></option>' +
      ['0.5','1.0','1.5','2.0'].map(v => `<option>${v}</option>`).join('');
    return;
  }
  const reversed     = isTimeReversed(startVal, endVal);
  const effectiveEnd = reversed ? '24:00' : (endVal || '');
  const allowed      = [];
  if (effectiveEnd >= '18:30') allowed.push('0.5');
  if (effectiveEnd >= '19:00') allowed.push('1.0');
  if (effectiveEnd >= '19:30') allowed.push('1.5');
  if (effectiveEnd >= '20:00') allowed.push('2.0');
  const current = breakSel.value;
  breakSel.innerHTML = '<option value=""></option>' +
    allowed.map(v => `<option${current === v ? ' selected' : ''}>${v}</option>`).join('');
}

export function controlBreakDisplay(prefix = '') {
  const breakSel  = getFormEl(prefix, 'break');
  const breakWrap = breakSel.closest('.form-item');
  if (!breakWrap) return;
  if (currentMode === 'bp') { breakWrap.classList.add('hidden'); breakSel.value = ''; return; }

  const status   = getFormEl(prefix, 'status').value;
  const startVal = getFormEl(prefix, 'start').value || '00:00';
  const endVal   = getFormEl(prefix, 'end').value;

  const showAll  = status === STATUS.FLEX || status === STATUS.SUBSTITUTE_WORK;
  const off      = OFF_STATUSES.includes(status);
  const reversed = isTimeReversed(startVal, endVal);

  if (showAll || reversed || (!off && endVal && endVal > '18:00')) {
    breakWrap.classList.remove('hidden');
    updateBreakOptions(prefix);
  } else {
    breakWrap.classList.add('hidden');
    breakSel.value = '';
  }
}

export function initInputForm() {
  document.getElementById('date').addEventListener('change', () => {
    const dateVal = document.getElementById('date').value;
    document.getElementById('weekday').textContent = getWeekdayLabel(dateVal);
    applyEventsToContentField(dateVal);
  });
  document.getElementById('substitute').addEventListener('change', () => {
    document.getElementById('substitute-weekday').textContent = getWeekdayLabel(document.getElementById('substitute').value);
  });
  document.getElementById('status').addEventListener('change', () => {
    controlTime(); controlBreakDisplay(); updateSubstituteVisibility();
  });
  document.getElementById('end').addEventListener('change', () => controlBreakDisplay());
  controlTime(); controlBreakDisplay(); updateSubstituteVisibility();
}

export function initEditModalListeners() {
  document.getElementById('edit-status').addEventListener('change', () => {
    controlTime('edit'); controlBreakDisplay('edit'); updateSubstituteVisibility('edit');
  });
  document.getElementById('edit-end').addEventListener('change', () => controlBreakDisplay('edit'));
  document.getElementById('edit-date').addEventListener('change', () => {
    document.getElementById('edit-weekday').textContent = getWeekdayLabel(document.getElementById('edit-date').value);
  });
  document.getElementById('edit-substitute').addEventListener('change', () => {
    document.getElementById('edit-substitute-weekday').textContent = getWeekdayLabel(document.getElementById('edit-substitute').value);
  });
}

function applyEventsToContentField(dateStr) {
  if (!dateStr || !eventData?.length) return;
  const matched = eventData.filter(ev => {
    const start    = ev.startDate || ev.date || null;
    const end      = ev.endDate   || ev.date || null;
    const excludes = ev.excludeDates
      ? ev.excludeDates.split(',').map(s => s.trim()).filter(Boolean)
      : [];
    if (excludes.includes(dateStr)) return false;
    if (start && dateStr < start)   return false;
    if (end   && dateStr > end)     return false;
    return true;
  }).map(ev => ev.content);
  if (!matched.length) return;

  const contentEl = document.getElementById('content');
  const existing  = contentEl.value.trim();
  const parts     = existing ? existing.split(',').map(s => s.trim()) : [];
  let added = false;
  matched.forEach(c => { if (!parts.includes(c)) { parts.push(c); added = true; } });
  if (added) {
    contentEl.value = parts.join(',').slice(0, 27);
    showToast(`イベントから内容を自動反映しました`, 'info', 2500);
  }
}
