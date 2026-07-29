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
  breakSel.textContent = '';
  const blank = document.createElement('option');
  blank.value = '';
  breakSel.appendChild(blank);
  allowed.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = v;
    if (current === v) opt.selected = true;
    breakSel.appendChild(opt);
  });
}

// notify を true にすると、時刻の変更で休憩の指定が外れたことをトーストで知らせる
function controlBreakDisplay(prefix = '', notify = false) {
  const breakSel  = getFormEl(prefix, 'break');
  const breakWrap = breakSel.closest('.form-item');
  if (!breakWrap) return;

  const previous = breakSel.value;

  if (currentMode === 'bp') {
    breakWrap.classList.add('hidden');
    breakSel.value = '';
    return;
  }

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

  // 選択肢の作り直しで値が黙って消えるため、消えたことを明示する
  if (notify && previous && breakSel.value !== previous) {
    showToast(`勤務時間の変更により「18時以降休憩 ${previous}」の指定を解除しました`, 'warning', 4500);
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
  if (!added) return;

  const joined = parts.join(',');
  contentEl.value = joined.slice(0, CONTENT_MAX_LENGTH);
  updateContentCounters();
  if (joined.length > CONTENT_MAX_LENGTH) {
    showToast(`イベントから内容を反映しましたが、${CONTENT_MAX_LENGTH}文字を超えたため切り詰めました`, 'warning', 4500);
  } else {
    showToast('イベントから内容を自動反映しました', 'info', 2500);
  }
}

// ============================================================
// 作業内容の入力補助
// ============================================================

// 過去の作業内容を使用回数の多い順に datalist へ流し込む
function updateContentHistory() {
  const list = document.getElementById('content-history');
  if (!list) return;

  const counts = new Map();
  data.forEach(d => {
    const c = (d.作業内容 || '').trim();
    if (c) counts.set(c, (counts.get(c) || 0) + 1);
  });

  const sorted = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 30);

  list.textContent = '';
  sorted.forEach(([value]) => {
    const opt = document.createElement('option');
    opt.value = value;
    list.appendChild(opt);
  });
}

// 直近の作業内容を入力欄に入れる。日付が入っていればその日より前の直近を探す
function applyLastContent(prefix = '') {
  const contentEl = getFormEl(prefix, 'content');
  if (!contentEl) return;

  const dateVal = getFormEl(prefix, 'date').value;
  // data は日付昇順なので、条件に合う最後の要素が直近になる
  const candidates = data.filter(d => (d.作業内容 || '').trim() && (!dateVal || d.日付 < dateVal));
  const last = candidates[candidates.length - 1];

  if (!last) { showToast('参照できる過去の作業内容がありません', 'info'); return; }
  contentEl.value = last.作業内容.slice(0, CONTENT_MAX_LENGTH);
  updateContentCounters();
  showToast(`${formatDateLabel(last.日付)}の内容を反映しました`, 'success', 2500);
}

const CONTENT_COUNTER_TARGETS = [
  { input: 'content',        counter: 'content-counter' },
  { input: 'edit-content',   counter: 'edit-content-counter' },
  { input: 'simple_content', counter: 'simple-content-counter' },
];

function updateContentCounters() {
  CONTENT_COUNTER_TARGETS.forEach(({ input, counter }) => {
    const inputEl   = document.getElementById(input);
    const counterEl = document.getElementById(counter);
    if (!inputEl || !counterEl) return;
    const len = inputEl.value.length;
    counterEl.textContent = `${len} / ${CONTENT_MAX_LENGTH}`;
    counterEl.classList.toggle('is-limit', len >= CONTENT_MAX_LENGTH);
  });
}

function initContentHelpers() {
  CONTENT_COUNTER_TARGETS.forEach(({ input }) => {
    const inputEl = document.getElementById(input);
    if (inputEl) inputEl.addEventListener('input', updateContentCounters);
  });
  updateContentCounters();
  updateContentHistory();
}

// ============================================================
// 初期化
// ============================================================
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
    controlTime(); controlBreakDisplay('', true); updateSubstituteVisibility();
  });
  document.getElementById('start').addEventListener('change', () => controlBreakDisplay('', true));
  document.getElementById('end').addEventListener('change', () => controlBreakDisplay('', true));
  controlTime(); controlBreakDisplay(); updateSubstituteVisibility();
}

// イベントの日付指定ラベルを、常時表示のON/OFFに応じて切り替える
function updateEventDateLabels(prefix) {
  const isEdit    = prefix === 'edit';
  const checkbox  = document.getElementById(isEdit ? 'event-edit-no-date' : 'event-no-date');
  const label     = document.getElementById(isEdit ? 'event-edit-calendar-label' : 'event-calendar-label');
  const dateLabel = document.getElementById(isEdit ? 'event-edit-selected-dates-label' : 'selected-dates-label');
  if (!checkbox || !label || !dateLabel) return;

  const note = document.createElement('span');
  note.className = 'label-note';
  label.textContent = '';

  if (checkbox.checked) {
    label.appendChild(document.createTextNode('除外日選択 '));
    note.textContent = '（除外する日付をクリック選択）';
    dateLabel.textContent = '除外中の日付:';
  } else {
    label.appendChild(document.createTextNode('日付選択 '));
    note.textContent = '（未選択なら全日程に反映／複数日をクリック選択）';
    dateLabel.textContent = '選択中の日付:';
  }
  label.appendChild(note);
}

function initEditModalListeners() {
  document.getElementById('edit-status').addEventListener('change', () => {
    controlTime('edit'); controlBreakDisplay('edit', true); updateSubstituteVisibility('edit');
  });
  document.getElementById('edit-start').addEventListener('change', () => controlBreakDisplay('edit', true));
  document.getElementById('edit-end').addEventListener('change', () => controlBreakDisplay('edit', true));
  document.getElementById('edit-date').addEventListener('change', () => {
    document.getElementById('edit-weekday').textContent = getWeekdayLabel(document.getElementById('edit-date').value);
  });
  document.getElementById('edit-substitute').addEventListener('change', () => {
    document.getElementById('edit-substitute-weekday').textContent = getWeekdayLabel(document.getElementById('edit-substitute').value);
  });

  document.getElementById('event-no-date').addEventListener('change', () => updateEventDateLabels(''));
  document.getElementById('event-edit-no-date').addEventListener('change', () => updateEventDateLabels('edit'));
}

function clearForm() {
  ['status', 'late'].forEach(id => document.getElementById(id).value = '');
  ['substitute', 'content', 'break'].forEach(id => document.getElementById(id).value = '');
  // 当日の入力が大半なので日付は今日を初期値にする
  const today = getTodayJST();
  document.getElementById('date').value     = today;
  document.getElementById('start').value    = '09:00';
  document.getElementById('end').value      = '18:00';
  document.getElementById('start').disabled = false;
  document.getElementById('end').disabled   = false;
  document.getElementById('weekday').textContent             = getWeekdayLabel(today);
  document.getElementById('substitute-weekday').textContent  = '';
  updateSubstituteVisibility(); controlBreakDisplay();
  updateContentCounters();
}
