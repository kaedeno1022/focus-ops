// ============================================================
// フォーム制御
// ============================================================

function controlTime(prefix = '') {
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

function updateSubstituteVisibility(prefix = '') {
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

function updateBreakOptions(prefix = '') {
  const startVal = getFormEl(prefix, 'start').value || '00:00';
  const endVal   = getFormEl(prefix, 'end').value;
  const breakSel = getFormEl(prefix, 'break');

  // 18:00から休憩時間分を取り切れる勤務でなければ選択させない（勤務実績によらずVBAと同じ制約）
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

function controlBreakDisplay(prefix = '') {
  const breakSel  = getFormEl(prefix, 'break');
  const breakWrap = breakSel.closest('.form-item');
  if (!breakWrap) return;
  if (currentMode === 'bp') { breakWrap.classList.add('hidden'); breakSel.value = ''; return; }

  const status   = getFormEl(prefix, 'status').value;
  const startVal = getFormEl(prefix, 'start').value || '00:00';
  const endVal   = getFormEl(prefix, 'end').value;

  const off      = OFF_STATUSES.includes(status);
  const reversed = isTimeReversed(startVal, endVal);

  if (reversed || (!off && endVal && endVal > '18:00')) {
    breakWrap.classList.remove('hidden');
    updateBreakOptions(prefix);
  } else {
    breakWrap.classList.add('hidden');
    breakSel.value = '';
  }
}

function applyEventsToContentField(dateStr) {
  if (!dateStr || !eventData?.length) return;
  const matched = eventData.filter(ev => matchesEventDate(ev, dateStr)).map(ev => ev.content);
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

function initInputForm() {
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

function initEditModalListeners() {
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

  document.getElementById('event-no-date').addEventListener('change', (e) => {
    const label = document.getElementById('event-calendar-label');
    const dateLabel = document.getElementById('selected-dates-label');
    if (e.target.checked) {
      label.innerHTML = '除外日選択 <span class="label-note">（除外する日付をクリック選択）</span>';
      dateLabel.textContent = '除外中の日付:';
    } else {
      label.innerHTML = '日付選択 <span class="label-note">（カレンダーから複数日をクリック選択）</span>';
      dateLabel.textContent = '選択中の日付:';
    }
  });

  document.getElementById('event-edit-no-date').addEventListener('change', (e) => {
    const label = document.getElementById('event-edit-calendar-label');
    const dateLabel = document.getElementById('event-edit-selected-dates-label');
    if (e.target.checked) {
      label.innerHTML = '除外日選択 <span class="label-note">（除外する日付をクリック選択）</span>';
      dateLabel.textContent = '除外中の日付:';
    } else {
      label.innerHTML = '日付選択 <span class="label-note">（カレンダーから複数日をクリック選択）</span>';
      dateLabel.textContent = '選択中の日付:';
    }
  });
}

function clearForm() {
  ['status', 'late'].forEach(id => document.getElementById(id).value = '');
  ['date', 'substitute', 'content', 'break'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('start').value    = '09:00';
  document.getElementById('end').value      = '18:00';
  document.getElementById('start').disabled = false;
  document.getElementById('end').disabled   = false;
  document.getElementById('weekday').textContent             = '';
  document.getElementById('substitute-weekday').textContent  = '';
  updateSubstituteVisibility(); controlBreakDisplay();
}

