// ============================================================
// Work Sheet Application - 統合版
// ============================================================
(function() {
  'use strict';

  // ============================================================
  // 定数定義
  // ============================================================
  const STATUS = {
    SUBSTITUTE_WORK: '振替出勤日',
    SUBSTITUTE_OFF:  '振替休日',
    FLEX:            '変則勤務',
    COMPENSATORY:    '代休',
  };

  const SUBSTITUTE_VISIBLE_STATUSES = [
    STATUS.COMPENSATORY,
    STATUS.SUBSTITUTE_OFF,
    STATUS.SUBSTITUTE_WORK
  ];

  const OFF_STATUSES = [
    '有休', '有休（計画）', 'プロジェクト休暇', '特別休暇', '代休',
    '振替休日', '休業', '欠勤', '欠勤（生理休暇）',
  ];

  const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

  const TOAST_ICONS = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };

  const STORAGE_KEY     = 'workData';
  const BP_STORAGE_KEY  = 'workData_bp';
  const MODE_KEY        = 'workMode';
  const EVENT_STORAGE_KEY = 'eventData';
  const CHECKIN_KEY     = 'simpleCheckIn';
  const ROUND_DIFFS_KEY = 'roundDiffs';

  // ============================================================
  // 状態管理
  // ============================================================
  let data = [];
  let eventData = [];
  let editIndex = null;
  let copyBase = null;
  let Els = {};
  let currentMode = 'employee'; // 'employee' | 'bp'
  let eventMode = 'single'; // 'single' | 'range'
  let editEventIndex = null;

  function setData(newData) {
    data = newData;
  }

  function setEventData(newEventData) {
    eventData = newEventData;
  }

  function setEditIndex(index) {
    editIndex = index;
  }

  function setCopyBase(base) {
    copyBase = base;
  }

  function setEls(els) {
    Els = els;
  }

  function setCurrentMode(mode) {
    currentMode = mode;
  }

  function setEventMode(mode) {
    eventMode = mode;
  }

  function setEditEventIndex(index) {
    editEventIndex = index;
  }

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
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}時間${m}分` : `${h}時間`;
  }

  function calcWorkMinutes(d) {
    if (!d.作業開始 || !d.作業終了) return null;
    let start = timeToMinutes(d.作業開始);
    let end   = timeToMinutes(d.作業終了);
    if (end < start) end += 24 * 60;
    const duration = end - start;
    
    // 12時-13時の休憩時間を判定
    // 作業開始が12:00より前で、作業終了が13:00より後の場合に1時間の休憩を引く
    const noon = 12 * 60;      // 12:00
    const afterNoon = 13 * 60; // 13:00
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

  // ============================================================
  // localStorage管理
  // ============================================================
  function save() {
    const key = currentMode === 'bp' ? BP_STORAGE_KEY : STORAGE_KEY;
    localStorage.setItem(key, JSON.stringify(data));
  }

  function load() {
    const key = currentMode === 'bp' ? BP_STORAGE_KEY : STORAGE_KEY;
    const s = localStorage.getItem(key);
    setData(s ? JSON.parse(s) : []);
  }

  function sortData() {
    data.sort((a, b) => new Date(a.日付) - new Date(b.日付));
  }

  function saveEventData() {
    localStorage.setItem(EVENT_STORAGE_KEY, JSON.stringify(eventData));
  }

  function loadEventData() {
    const s = localStorage.getItem(EVENT_STORAGE_KEY);
    if (s) setEventData(JSON.parse(s));
  }

  // ============================================================
  // UI: Toast & Confirm Dialog
  // ============================================================
  function showToast(msg, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.style.setProperty('--toast-duration', duration + 'ms');
    toast.innerHTML = `
      <span class="toast-icon">${TOAST_ICONS[type] ?? TOAST_ICONS.info}</span>
      <div class="toast-body"><div class="toast-msg">${msg.replace(/\n/g, '<br>')}</div></div>
      <button class="toast-close" onclick="this.closest('.toast').remove()">✕</button>
      <div class="toast-progress"></div>
    `;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('toast-out');
      toast.addEventListener('animationend', () => toast.remove(), { once: true });
    }, duration);
  }

  function showConfirm(msg, { title = '確認', danger = false } = {}) {
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.className = 'confirm-overlay';
      overlay.innerHTML = `
        <div class="confirm-dialog">
          <div class="confirm-icon">${danger ? '⚠️' : '❓'}</div>
          <div class="confirm-title">${title}</div>
          <div class="confirm-msg">${msg.replace(/\n/g, '<br>')}</div>
          <div class="confirm-btns">
            <button class="confirm-cancel" id="_cfm_no">キャンセル</button>
            <button class="${danger ? 'btn-danger' : ''}" id="_cfm_yes">OK</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      const close = result => { overlay.remove(); resolve(result); };
      overlay.querySelector('#_cfm_yes').addEventListener('click', () => close(true));
      overlay.querySelector('#_cfm_no').addEventListener('click',  () => close(false));
      overlay.addEventListener('click', e => { if (e.target === overlay) close(false); });
    });
  }

  function initTabs() {
    const tabBtns     = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(tc => tc.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
      });
    });
  }

  // ============================================================
  // フォーム制御
  // ============================================================
  function getFormEl(prefix, id) {
    return document.getElementById(prefix ? `${prefix}-${id}` : id);
  }

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

  function controlBreakDisplay(prefix = '') {
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

  // ============================================================
  // レンダリング(テーブル表示)
  // ============================================================
  function render() {
    // ヘッダー更新
    const thead = document.getElementById('list-thead-tr');
    const table = thead.closest('table');
    if (currentMode === 'bp') {
      thead.innerHTML = '<th>日付</th><th>曜</th><th>開始</th><th>終了</th><th>内容</th><th>操作</th>';
      if (table) {
        table.classList.add('mode-bp');
        table.classList.remove('mode-employee');
      }
    } else {
      thead.innerHTML = '<th>日付</th><th>曜</th><th>実績</th><th>開始</th><th>終了</th><th>18時以降休憩</th><th>遅刻</th><th>振替</th><th>内容</th><th>操作</th>';
      if (table) {
        table.classList.add('mode-employee');
        table.classList.remove('mode-bp');
      }
    }

    const tbody = document.getElementById('tbody');
    tbody.innerHTML = '';
    const frag = document.createDocumentFragment();
    data.forEach((d, i) => {
      const tr = document.createElement('tr');
      const dateObj = new Date(d.日付);
      const weekday = WEEKDAYS[dateObj.getDay()];
      if (currentMode === 'bp') {
        [
          d.日付,
          weekday,
          d.作業開始,
          d.作業終了,
          d.作業内容,
        ].forEach(text => { const td = document.createElement('td'); td.textContent = text || ''; tr.appendChild(td); });
      } else {
        [
          d.日付,
          weekday,
          d.勤務実績,
          d.作業開始,
          d.作業終了,
          d['18時以降休憩'] || '',
          d.遅刻早退,
          d.振替代休対象日,
          d.作業内容,
        ].forEach(text => { const td = document.createElement('td'); td.textContent = text || ''; tr.appendChild(td); });
      }
      const tdOp = document.createElement('td');
      tdOp.className = 'td-ops';
      const editBtn = document.createElement('button');
      editBtn.textContent = '✏ 編集'; editBtn.className = 'btn-secondary btn-sm';
      editBtn.onclick = () => window.editRow(i);
      const copyBtn = document.createElement('button');
      copyBtn.textContent = '📅 コピー'; copyBtn.className = 'btn-secondary btn-sm';
      copyBtn.onclick = () => window.openCopy(i);
      const delBtn = document.createElement('button');
      delBtn.textContent = '🗑 削除'; delBtn.className = 'btn-danger btn-sm';
      delBtn.onclick = () => window.del(i);
      tdOp.appendChild(editBtn); tdOp.appendChild(copyBtn); tdOp.appendChild(delBtn);
      tr.appendChild(tdOp);
      frag.appendChild(tr);
    });
    tbody.appendChild(frag);
    updateWorkSummary();
  }

  function updateWorkSummary() {
    const sumArea = document.getElementById('work-summary');
    sumArea.innerHTML = '';

    if (!data.length) {
      sumArea.classList.add('hidden');
      return;
    }
    sumArea.classList.remove('hidden');

    if (currentMode === 'bp') {
      const totalWorkMinutes = data.reduce((sum, d) => {
        const w = calcWorkMinutes(d);
        return sum + (w !== null ? w : 0);
      }, 0);
      sumArea.innerHTML = `<div class="summary-item"><span class="summary-label">総作業時間:</span><span class="summary-value">${formatHoursMinutes(totalWorkMinutes)}</span></div>`;
      return;
    }

    const workDays  = data.filter(d => d.作業開始 && d.作業終了);
    const offDays   = data.filter(d => OFF_STATUSES.includes(d.勤務実績));
    let totalWorkMinutes = 0;
    let offCount = offDays.length;
    workDays.forEach(d => {
      const w = calcWorkMinutes(d);
      if (w !== null) totalWorkMinutes += w;
    });
    let roundDiffTotalMin = 0;
    const roundDiffs = JSON.parse(localStorage.getItem(ROUND_DIFFS_KEY) || '[]');
    if (roundDiffs.length) {
      roundDiffTotalMin = roundDiffs.reduce((s, r) => s + r.diffMinutes, 0);
    }
    const overtimeMin = calculateOvertime(groupByWeek(workDays));
    const html = `
      <div class="summary-item"><span class="summary-label">総作業時間:</span><span class="summary-value">${formatHoursMinutes(totalWorkMinutes)}</span></div>
      <div class="summary-item"><span class="summary-label">残業時間:</span><span class="summary-value">${formatHoursMinutes(overtimeMin)}</span></div>
      <div class="summary-item"><span class="summary-label">休日取得:</span><span class="summary-value">${offCount}日</span></div>
      <div class="summary-item summary-item-wide"><span class="summary-label">15分調整差分:</span><span class="summary-value">${formatHoursMinutes(roundDiffTotalMin)} <button class="btn-clear-diffs" onclick="clearRoundDiffs()">クリア</button></span></div>
    `;
    sumArea.innerHTML = html;
  }

  // ============================================================
  // データCRUD操作
  // ============================================================
  function validateWorkItem(prefix = '') {
    const dateVal    = getFormEl(prefix, 'date').value;
    const contentVal = getFormEl(prefix, 'content').value.trim();
    const startEl    = getFormEl(prefix, 'start');
    const endEl      = getFormEl(prefix, 'end');

    if (!dateVal || !contentVal) { showToast('日付と内容は必須です', 'warning'); return false; }
    if (!startEl.disabled && (!startEl.value || !endEl.value)) {
      showToast('開始・終了時間を入力してください', 'warning'); return false;
    }
    if (currentMode === 'bp') return true;

    const statusVal  = getFormEl(prefix, 'status').value;
    const subVal     = getFormEl(prefix, 'substitute').value;
    if (SUBSTITUTE_VISIBLE_STATUSES.includes(statusVal) && !subVal) {
      showToast('振替代休対象日を入力してください', 'warning'); return false;
    }
    const noReverseCheck = statusVal === '変則勤務' || statusVal === '振替出勤日';
    if (!startEl.disabled && !noReverseCheck && startEl.value && endEl.value) {
      if (timeToMinutes(endEl.value) < timeToMinutes(startEl.value)) {
        showToast('開始時刻が終了時刻より後になっています。\n正しい時刻を入力してください。', 'error'); return false;
      }
    }
    return true;
  }

  function buildWorkItem(prefix = '') {
    const p = prefix ? `${prefix}-` : '';
    const base = {
      日付:     document.getElementById(`${p}date`).value,
      作業開始: document.getElementById(`${p}start`).value,
      作業終了: document.getElementById(`${p}end`).value,
      作業内容: document.getElementById(`${p}content`).value.trim(),
    };
    if (currentMode === 'bp') return base;
    return {
      ...base,
      勤務実績:       document.getElementById(`${p}status`).value,
      '18時以降休憩': document.getElementById(`${p}break`).value,
      遅刻早退:       document.getElementById(`${p}late`).value,
      振替代休対象日: document.getElementById(`${p}substitute`).value,
    };
  }

  async function addData() {
    if (!validateWorkItem()) return;
    const item = buildWorkItem();
    const idx  = data.findIndex(d => d.日付 === item.日付);
    if (idx !== -1) {
      if (!await showConfirm('同じ日付のデータが存在します。\nこの内容で更新しますか？')) return;
      data[idx] = item;
    } else {
      data.push(item);
    }
    sortData(); save(); render(); clearForm();
    showToast('登録が完了しました', 'success');
  }

  function editRow(i) {
    setEditIndex(i);
    const d = data[i];
    document.getElementById('edit-date').value        = d.日付;
    document.getElementById('edit-status').value      = d.勤務実績      || '';
    document.getElementById('edit-start').value       = d.作業開始;
    document.getElementById('edit-end').value         = d.作業終了;
    document.getElementById('edit-break').value       = d['18時以降休憩'] || '';
    document.getElementById('edit-late').value        = d.遅刻早退       || '';
    document.getElementById('edit-substitute').value  = d.振替代休対象日  || '';
    document.getElementById('edit-content').value     = d.作業内容;
    document.getElementById('edit-weekday').textContent           = getWeekdayLabel(d.日付);
    document.getElementById('edit-substitute-weekday').textContent = getWeekdayLabel(d.振替代休対象日 || '');

    controlTime('edit'); controlBreakDisplay('edit'); updateSubstituteVisibility('edit');
    document.getElementById('editModal').classList.remove('hidden');
    document.getElementById('overlay').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function saveEditData() {
    if (!validateWorkItem('edit')) return;
    if (editIndex === null) return;
    data[editIndex] = buildWorkItem('edit');
    sortData(); save(); render();
    closeEditModal();
    showToast('編集内容を更新しました', 'success');
  }

  function closeEditModal() {
    document.getElementById('editModal').classList.add('hidden');
    setEditIndex(null);
    if (document.getElementById('copyModal').classList.contains('hidden')) {
      document.getElementById('overlay').classList.add('hidden');
    }
  }

  async function del(i) {
    if (!await showConfirm('このデータを削除しますか？', { danger: true })) return;
    data.splice(i, 1);
    save(); render();
    showToast('削除しました', 'success');
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
    setEditIndex(null);
    updateSubstituteVisibility(); controlBreakDisplay();
  }

  async function clearAll() {
    if (!await showConfirm('全データを削除しますか？\nこの操作は取り消せません。', { title: '全削除', danger: true })) return;
    const key = currentMode === 'bp' ? 'workData_bp' : 'workData';
    localStorage.removeItem(key);
    if (currentMode === 'employee') localStorage.removeItem('roundDiffs');
    data.length = 0;
    render();
    showToast('全データを削除しました', 'success');
  }

  function clearRoundDiffs() {
    localStorage.removeItem('roundDiffs');
    render();
    showToast('調整差分をクリアしました', 'success');
  }

  async function importEventsToContents() {
    if (!eventData?.length) { showToast('イベントデータがありません', 'warning'); return; }
    if (!await showConfirm('各日付にイベント内容を反映しますか？\n既存の内容は上書きされません。')) return;
    let count = 0;
    data.forEach(d => {
      if (!d.日付) return;
      const matched = eventData.filter(ev => {
        const st = ev.startDate || ev.date || null;
        const ed = ev.endDate   || ev.date || null;
        const exc = ev.excludeDates ? ev.excludeDates.split(',').map(s => s.trim()).filter(Boolean) : [];
        if (exc.includes(d.日付)) return false;
        if (st && d.日付 < st) return false;
        if (ed && d.日付 > ed) return false;
        return true;
      }).map(ev => ev.content);
      if (!matched.length) return;
      const existing = d.作業内容 ? d.作業内容.split(',').map(s => s.trim()) : [];
      let added = false;
      matched.forEach(c => { if (!existing.includes(c)) { existing.push(c); added = true; } });
      if (added) {
        d.作業内容 = existing.join(',').slice(0, 27);
        count++;
      }
    });
    if (count > 0) {
      save(); render();
      showToast(`${count}件にイベント内容を反映しました`, 'success');
    } else {
      showToast('反映する内容がありませんでした', 'info');
    }
  }

  function formatTimes() {
    let count = 0;
    data.forEach(d => {
      if (d.作業開始 && d.作業開始.length === 4 && !d.作業開始.includes(':')) {
        d.作業開始 = d.作業開始.slice(0, 2) + ':' + d.作業開始.slice(2);
        count++;
      }
      if (d.作業終了 && d.作業終了.length === 4 && !d.作業終了.includes(':')) {
        d.作業終了 = d.作業終了.slice(0, 2) + ':' + d.作業終了.slice(2);
        count++;
      }
    });
    if (count > 0) {
      save(); render();
      showToast(`${count}件の時間フォーマットを修正しました`, 'success');
    } else {
      showToast('修正が必要な項目はありませんでした', 'info');
    }
  }

  // ============================================================
  // イベントデータ管理
  // ============================================================
  function setEventModeUI(mode) {
    setEventMode(mode);
    const isSingle = mode === 'single';
    document.getElementById('event-field-single-date').classList.toggle('hidden', !isSingle);
    document.getElementById('event-field-start-date').classList.toggle('hidden', isSingle);
    document.getElementById('event-field-end-date').classList.toggle('hidden', isSingle);
    document.getElementById('event-field-exclude').classList.toggle('hidden', isSingle);
    const contentField = document.getElementById('event-field-content');
    if (isSingle) {
      contentField.classList.remove('grid-col-span-2');
    } else {
      contentField.classList.add('grid-col-span-2');
    }
    document.getElementById('event-mode-single').style.opacity = isSingle ? '1' : '0.5';
    document.getElementById('event-mode-range').style.opacity  = isSingle ? '0.5' : '1';
  }

  function addEvent() {
    const content = document.getElementById('event-content').value.trim();
    if (!content) { showToast('内容は必須です', 'warning'); return; }

    let startDate = '', endDate = '', excludeDates = '';
    if (eventMode === 'single') {
      const singleDate = document.getElementById('event-single-date').value;
      if (!singleDate) { showToast('日付を入力してください', 'warning'); return; }
      startDate = singleDate;
      endDate   = singleDate;
    } else {
      startDate    = document.getElementById('event-start-date').value;
      endDate      = document.getElementById('event-end-date').value;
      excludeDates = document.getElementById('event-exclude-dates').value.trim();
      if (startDate && endDate && startDate > endDate) {
        showToast('開始日が終了日より後になっています', 'warning'); return;
      }
    }

    if (eventData.some(ev =>
      (ev.startDate || ev.date || '') === startDate &&
      (ev.endDate   || ev.date || '') === endDate   &&
      ev.content === content
    )) {
      showToast('同じ内容のイベントが既に存在します', 'warning'); return;
    }
    const ev = { content };
    if (startDate)    ev.startDate    = startDate;
    if (endDate)      ev.endDate      = endDate;
    if (excludeDates) ev.excludeDates = excludeDates;
    eventData.push(ev);
    eventData.sort((a, b) => (a.startDate || a.date || '').localeCompare(b.startDate || b.date || ''));
    saveEventData(); renderEventTable(); clearEventForm();
    showToast('イベントを追加しました', 'success');
  }

  function deleteEvent(i) {
    eventData.splice(i, 1); saveEventData(); renderEventTable();
    showToast('削除しました', 'success');
  }

  function clearEventForm() {
    document.getElementById('event-single-date').value   = '';
    document.getElementById('event-start-date').value    = '';
    document.getElementById('event-end-date').value      = '';
    document.getElementById('event-content').value       = '';
    document.getElementById('event-exclude-dates').value = '';
  }

  function renderEventTable() {
    const tbody = document.getElementById('event-tbody');
    tbody.innerHTML = '';
    const frag = document.createDocumentFragment();
    eventData.forEach((ev, i) => {
      const tr    = document.createElement('tr');
      const start = ev.startDate || ev.date || '';
      const end   = ev.endDate   || ev.date || '';
      [start, end, ev.excludeDates || '', ev.content].forEach((text, ci) => {
        const td = document.createElement('td');
        td.textContent = text;
        if (ci === 2 && text) {
          td.style.whiteSpace = 'normal';
          td.style.maxWidth   = '160px';
          td.style.fontSize   = '.82em';
          td.style.color      = 'var(--text-muted)';
        }
        tr.appendChild(td);
      });
      const tdOp = document.createElement('td');
      tdOp.className = 'td-ops';
      const editBtn = document.createElement('button');
      editBtn.textContent = '✏ 編集';
      editBtn.className = 'btn-secondary btn-sm';
      editBtn.addEventListener('click', () => openEditEventModal(i));
      const btn  = document.createElement('button');
      btn.textContent = '🗑 削除'; btn.className = 'btn-danger btn-sm';
      btn.addEventListener('click', () => deleteEvent(i));
      tdOp.appendChild(editBtn);
      tdOp.appendChild(btn);
      tr.appendChild(tdOp);
      frag.appendChild(tr);
    });
    tbody.appendChild(frag);
  }

  function openEditEventModal(i) {
    setEditEventIndex(i);
    const ev = eventData[i];
    const start = ev.startDate || ev.date || '';
    const end   = ev.endDate   || ev.date || '';
    document.getElementById('event-edit-single-date').value = (start === end) ? start : '';
    document.getElementById('event-edit-start-date').value  = (start !== end) ? start : '';
    document.getElementById('event-edit-end-date').value    = (start !== end) ? end   : '';
    document.getElementById('event-edit-content').value     = ev.content || '';
    document.getElementById('event-edit-exclude-dates').value = ev.excludeDates || '';
    if (start === end) {
      switchEditEventMode('single');
      document.getElementById('event-edit-single-date').value = start;
    } else {
      switchEditEventMode('range');
      document.getElementById('event-edit-start-date').value = start;
      document.getElementById('event-edit-end-date').value = end;
    }
    document.getElementById('overlay').classList.remove('hidden');
    document.getElementById('eventEditModal').classList.remove('hidden');
    document.getElementById('editModal').classList.add('hidden');
    document.getElementById('copyModal').classList.add('hidden');
  }

  function closeEditEventModal() {
    document.getElementById('eventEditModal').classList.add('hidden');
    setEditEventIndex(null);
    if (
      document.getElementById('editModal').classList.contains('hidden') &&
      document.getElementById('copyModal').classList.contains('hidden')
    ) {
      document.getElementById('overlay').classList.add('hidden');
    }
  }

  function saveEditEvent() {
    if (editEventIndex === null) return;
    const isSingle = !document.getElementById('event-edit-field-single-date').classList.contains('hidden');
    let startDate = '', endDate = '', excludeDates = '';
    if (isSingle) {
      startDate = document.getElementById('event-edit-single-date').value;
      endDate   = startDate;
    } else {
      startDate    = document.getElementById('event-edit-start-date').value;
      endDate      = document.getElementById('event-edit-end-date').value;
      excludeDates = document.getElementById('event-edit-exclude-dates').value.trim();
      if (startDate && endDate && startDate > endDate) {
        showToast('開始日が終了日より後になっています', 'warning'); return;
      }
    }
    const content = document.getElementById('event-edit-content').value.trim();
    if (!content) { showToast('内容は必須です', 'warning'); return; }
    if (eventData.some((ev, idx) =>
      idx !== editEventIndex &&
      (ev.startDate || ev.date || '') === startDate &&
      (ev.endDate   || ev.date || '') === endDate &&
      ev.content === content
    )) {
      showToast('同じ内容のイベントが既に存在します', 'warning'); return;
    }
    const ev = { content };
    if (startDate)    ev.startDate    = startDate;
    if (endDate)      ev.endDate      = endDate;
    if (excludeDates) ev.excludeDates = excludeDates;
    eventData[editEventIndex] = ev;
    eventData.sort((a, b) => (a.startDate || a.date || '').localeCompare(b.startDate || b.date || ''));
    saveEventData(); renderEventTable();
    closeEditEventModal();
    showToast('イベントを更新しました', 'success');
  }

  async function clearAllEvents() {
    if (!await showConfirm('全イベントデータを削除しますか？\nこの操作は取り消せません。', { title: '全削除', danger: true })) return;
    eventData.length = 0; saveEventData(); renderEventTable();
    showToast('全イベントを削除しました', 'success');
  }

  function switchEditEventMode(mode) {
    const singleBtn = document.getElementById('event-edit-mode-single');
    const rangeBtn  = document.getElementById('event-edit-mode-range');
    if (mode === 'single') {
      document.getElementById('event-edit-field-single-date').classList.remove('hidden');
      document.getElementById('event-edit-field-start-date').classList.add('hidden');
      document.getElementById('event-edit-field-end-date').classList.add('hidden');
      document.getElementById('event-edit-field-exclude').classList.add('hidden');
      singleBtn.classList.add('active');
      rangeBtn.classList.remove('active');
      const v = document.getElementById('event-edit-start-date').value || document.getElementById('event-edit-single-date').value;
      document.getElementById('event-edit-single-date').value = v;
      document.getElementById('event-edit-end-date').value = v;
    } else {
      document.getElementById('event-edit-field-single-date').classList.add('hidden');
      document.getElementById('event-edit-field-start-date').classList.remove('hidden');
      document.getElementById('event-edit-field-end-date').classList.remove('hidden');
      document.getElementById('event-edit-field-exclude').classList.remove('hidden');
      singleBtn.classList.remove('active');
      rangeBtn.classList.add('active');
      const v = document.getElementById('event-edit-single-date').value || document.getElementById('event-edit-start-date').value;
      document.getElementById('event-edit-start-date').value = v;
      document.getElementById('event-edit-end-date').value = v;
    }
  }

  // ============================================================
  // 簡易チェックイン/チェックアウト
  // ============================================================
  function updateCheckinUI() {
    const info = JSON.parse(localStorage.getItem(CHECKIN_KEY) || 'null');
    const statusEl = document.getElementById('checkin-status');
    const inTimeEl = document.getElementById('simple_in_time');
    const outTimeEl = document.getElementById('simple_out_time');
    
    if (!info || !info.status) {
      if (statusEl) statusEl.textContent = '未出社';
      if (inTimeEl) inTimeEl.textContent = '';
      if (outTimeEl) outTimeEl.textContent = '';
      return;
    }
    
    if (statusEl) statusEl.textContent = '出社中';
    if (inTimeEl) inTimeEl.textContent = `出社: ${info.startTime || '---'}`;
    if (outTimeEl) outTimeEl.textContent = '';
  }

  function simpleCheckIn() {
    const info = JSON.parse(localStorage.getItem(CHECKIN_KEY) || 'null');
    if (!info || !info.status) { doCheckIn(); return; }
    doCheckOut();
  }

  function doCheckIn() {
    const now = nowTimeStr();
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
    
    localStorage.setItem(CHECKIN_KEY, JSON.stringify({
      status: 'in', startTime: now, date: today, content: matchedContent,
    }));
    
    // simple_contentに内容を反映
    const contentEl = document.getElementById('simple_content');
    if (contentEl && matchedContent) {
      contentEl.value = matchedContent.slice(0, 27);
    }
    
    updateCheckinUI();
    showToast(`出社しました (${now})\n内容: ${matchedContent || '(なし)'}`, 'success', 4000);
  }

  function doCheckOut() {
    const info = JSON.parse(localStorage.getItem(CHECKIN_KEY) || 'null');
    if (!info || !info.status) { showToast('出社していません', 'warning'); return; }
    
    // simple_contentから内容を取得
    const simpleContentEl = document.getElementById('simple_content');
    const content = simpleContentEl ? simpleContentEl.value.trim() : (info.content || '');
    
    // 内容が空の場合は退勤させない
    if (!content) {
      showToast('作業内容を入力してから退勤してください', 'warning', 4000);
      return;
    }
    
    const now = nowTimeStr();
    const started = info.startTime || '???';
    const dateStr = info.date || getTodayJST();
    
    document.getElementById('date').value     = dateStr;
    document.getElementById('start').value    = started;
    document.getElementById('end').value      = now;
    document.getElementById('content').value  = content.slice(0, 27);
    
    // チェックイン情報をクリア
    localStorage.removeItem(CHECKIN_KEY);
    if (simpleContentEl) simpleContentEl.value = '';
    updateCheckinUI();
    
    // データを自動登録
    addData();
    
    // タブを作業表一覧に切り替え
    const listTabBtn = document.querySelector('.tab-btn[data-tab="list-tab"]');
    if (listTabBtn) {
      listTabBtn.click();
      window.scrollTo({ top: 600, behavior: 'smooth' });
    }
  }

  function simpleCheckOut() {
    doCheckOut();
  }

  function applyEventsToCheckin() {
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
    if (contentEl) {
      contentEl.value = matched.join(',').slice(0, 27);
      showToast(`イベントを反映しました`, 'success', 2500);
    }
  }

  // ============================================================
  // JSON Import/Export
  // ============================================================
  function exportJSON() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'workData.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('JSONをエクスポートしました', 'success');
  }

  function importJSON() {
    const input = document.createElement('input');
    input.type  = 'file';
    input.accept = 'application/json';
    input.onchange = e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const imported = JSON.parse(ev.target.result);
          if (!Array.isArray(imported)) {
            showToast('無効なJSONフォーマットです', 'error'); return;
          }
          data.length = 0;
          data.push(...imported);
          sortData(); save(); render();
          showToast('JSONをインポートしました', 'success');
        } catch {
          showToast('JSONのパースに失敗しました', 'error');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  function exportEventJSON() {
    const blob = new Blob([JSON.stringify(eventData, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'eventData.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('イベントJSONをエクスポートしました', 'success');
  }

  function importEventJSON() {
    const input = document.createElement('input');
    input.type  = 'file';
    input.accept = 'application/json';
    input.onchange = e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const imported = JSON.parse(ev.target.result);
          if (!Array.isArray(imported)) {
            showToast('無効なJSONフォーマットです', 'error'); return;
          }
          eventData.length = 0;
          eventData.push(...imported);
          saveEventData(); renderEventTable();
          showToast('イベントJSONをインポートしました', 'success');
        } catch {
          showToast('JSONのパースに失敗しました', 'error');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  // ============================================================
  // カレンダーコピー機能
  // ============================================================
  function openCopy(i) {
    setCopyBase(data[i]);
    document.getElementById('copyModal').classList.remove('hidden');
    document.getElementById('overlay').classList.remove('hidden');
    buildCalendar();
  }

  function closeModal() {
    document.getElementById('copyModal').classList.add('hidden');
    setCopyBase(null);
    if (document.getElementById('editModal').classList.contains('hidden') &&
        document.getElementById('eventEditModal').classList.contains('hidden')) {
      document.getElementById('overlay').classList.add('hidden');
    }
  }

  function selectAll() {
    document.querySelectorAll('#copyCalendar input[type="checkbox"]').forEach(cb => cb.checked = true);
  }

  function clearChecks() {
    document.querySelectorAll('#copyCalendar input[type="checkbox"]').forEach(cb => cb.checked = false);
  }

  function selectWeekdays() {
    document.querySelectorAll('#copyCalendar input[type="checkbox"]').forEach(cb => {
      const dateStr = cb.value;
      const dow = new Date(dateStr).getDay();
      cb.checked = dow >= 1 && dow <= 5;
    });
  }

  async function executeCopy() {
    if (!copyBase) { showToast('コピー元がありません', 'warning'); return; }
    const checked = Array.from(document.querySelectorAll('#copyCalendar input[type="checkbox"]:checked')).map(cb => cb.value);
    if (!checked.length) { showToast('コピー先を選択してください', 'warning'); return; }
    if (!await showConfirm(`${checked.length}日分をコピーしますか？`)) return;
    const dup = data.filter(d => checked.includes(d.日付)).map(d => d.日付);
    let msg = '';
    checked.forEach(dateStr => {
      const alreadyExists = dup.includes(dateStr);
      const newItem = { ...copyBase, 日付: dateStr };
      if (alreadyExists) {
        const idx = data.findIndex(d => d.日付 === dateStr);
        if (idx !== -1) data[idx] = newItem;
      } else {
        data.push(newItem);
      }
    });
    if (dup.length) msg = `(${dup.length}件は上書き更新されました)`;
    sortData(); save(); render();
    closeModal();
    showToast(`${checked.length}日分のコピーが完了しました ${msg}`, 'success');
  }

  function buildCalendar() {
    if (!copyBase) return;
    const cal = document.getElementById('copyCalendar');
    cal.innerHTML = '';
    const now = new Date();
    const y   = now.getFullYear();
    const m   = now.getMonth();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const firstDow    = new Date(y, m, 1).getDay();
    const monthStr    = `${y}年${m + 1}月`;
    const title = document.createElement('div');
    title.className = 'copy-calendar-title';
    title.textContent = `コピー先カレンダー: ${monthStr}`;
    cal.appendChild(title);
    const grid = document.createElement('div');
    grid.className = 'copy-calendar-grid';
    WEEKDAYS.forEach(wd => {
      const th = document.createElement('div');
      th.className = 'copy-calendar-th';
      th.textContent = wd;
      grid.appendChild(th);
    });
    for (let i = 0; i < firstDow; i++) {
      const empty = document.createElement('div');
      empty.className = 'copy-calendar-empty';
      grid.appendChild(empty);
    }
    const existingSet = new Set(data.map(d => d.日付));
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dow     = new Date(y, m, day).getDay();
      const box = document.createElement('div');
      box.className = 'copy-calendar-box';
      const label   = document.createElement('label');
      label.className = 'copy-calendar-label';
      const cb = document.createElement('input');
      cb.type  = 'checkbox'; cb.value = dateStr;
      const spanDay = document.createElement('span');
      spanDay.textContent = day;
      const badge = existingSet.has(dateStr) ? ' 📝' : '';
      const badgeNode = document.createElement('span');
      badgeNode.textContent = badge;
      label.appendChild(cb);
      label.appendChild(spanDay);
      label.appendChild(badgeNode);
      box.appendChild(label);
      if (dow === 0)      box.classList.add('copy-day-sun');
      else if (dow === 6) box.classList.add('copy-day-sat');
      grid.appendChild(box);
    }
    cal.appendChild(grid);
  }

  // ============================================================
  // クリップボード関連
  // ============================================================
  function copyTextToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => showToast('クリップボードにコピーしました', 'success'))
        .catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.left = '-9999px';
    document.body.appendChild(area);
    area.select();
    try {
      document.execCommand('copy');
      showToast('クリップボードにコピーしました', 'success');
    } catch {
      showToast('コピーに失敗しました', 'error');
    }
    document.body.removeChild(area);
  }

  function buildMonthLines(forBP = false) {
    if (!data.length) { showToast('データがありません', 'warning'); return null; }
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
    const sortedMonths = Object.keys(monthMap).sort();
    sortedMonths.forEach(monthKey => {
      lines.push(`【${monthKey}】`);
      const items = monthMap[monthKey];
      items.sort((a, b) => new Date(a.日付) - new Date(b.日付));
      items.forEach(d => {
        const dateStr = d.日付;
        const content = d.作業内容;
        const workMin = calcWorkMinutes(d);
        const workDisplay = (forBP && workMin !== null)
          ? minutesToBpTime(workMin)
          : (workMin !== null ? minutesToTime(workMin) : '---');
        lines.push(`${dateStr} ${content} ${workDisplay}`);
      });
      lines.push('');
    });
    return lines.join('\n');
  }

  function copyStartEnd() {
    if (!data.length) { showToast('データがありません', 'warning'); return; }
    const lines = data.map(d => {
      const dateStr = d.日付;
      const start   = d.作業開始 || '---';
      const end     = d.作業終了 || '---';
      const content = d.作業内容;
      return `${dateStr} ${start}-${end} ${content}`;
    });
    const text = lines.join('\n');
    copyTextToClipboard(text);
  }

  function copyContents() {
    const monthLines = buildMonthLines();
    if (!monthLines) return;
    copyTextToClipboard(monthLines);
  }

  // ============================================================
  // 初期化処理
  // ============================================================
  function switchMode(mode) {
    setCurrentMode(mode);
    localStorage.setItem(MODE_KEY, mode);
    load(); render();

    document.getElementById('mode-employee').classList.toggle('active', mode === 'employee');
    document.getElementById('mode-bp').classList.toggle('active', mode === 'bp');

    const empEls  = document.querySelectorAll('.mode-employee-only');
    const bpEls   = document.querySelectorAll('.mode-bp-only');
    empEls.forEach(el => el.classList.toggle('hidden', mode !== 'employee'));
    bpEls.forEach(el  => el.classList.toggle('hidden', mode !== 'bp'));

    controlTime(); controlBreakDisplay(); updateSubstituteVisibility();
    controlTime('edit'); controlBreakDisplay('edit'); updateSubstituteVisibility('edit');
  }

  function init() {
    const saved = localStorage.getItem(MODE_KEY);
    if (saved) setCurrentMode(saved);
    switchMode(saved || 'employee');
    loadEventData(); renderEventTable();
    load(); render();
    initTabs(); initInputForm(); initEditModalListeners();
    controlTime(); controlBreakDisplay(); updateSubstituteVisibility();
    updateCheckinUI();
    setEventModeUI('single');
  }

  // ============================================================
  // Window関数公開
  // ============================================================
  window.addData = addData;
  window.editRow = editRow;
  window.saveEditData = saveEditData;
  window.closeEditModal = closeEditModal;
  window.del = del;
  window.clearForm = clearForm;
  window.clearAll = clearAll;
  window.clearRoundDiffs = clearRoundDiffs;
  window.importEventsToContents = importEventsToContents;
  window.formatTimes = formatTimes;
  window.setEventMode = setEventModeUI;
  window.addEvent = addEvent;
  window.clearEventForm = clearEventForm;
  window.closeEditEventModal = closeEditEventModal;
  window.saveEditEvent = saveEditEvent;
  window.clearAllEvents = clearAllEvents;
  window.switchEditEventMode = switchEditEventMode;
  window.simpleCheckIn = simpleCheckIn;
  window.simpleCheckOut = simpleCheckOut;
  window.applyEventsToCheckin = applyEventsToCheckin;
  window.exportJSON = exportJSON;
  window.importJSON = importJSON;
  window.exportEventJSON = exportEventJSON;
  window.importEventJSON = importEventJSON;
  window.openCopy = openCopy;
  window.closeModal = closeModal;
  window.selectAll = selectAll;
  window.clearChecks = clearChecks;
  window.selectWeekdays = selectWeekdays;
  window.executeCopy = executeCopy;
  window.copyStartEnd = copyStartEnd;
  window.copyContents = copyContents;
  window.switchMode = switchMode;

  // ============================================================
  // DOMContentLoaded
  // ============================================================
  document.addEventListener('DOMContentLoaded', init);

})();
