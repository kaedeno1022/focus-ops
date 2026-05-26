// ============================================================
// レンダリング（テーブル表示）
// ============================================================
import { ROUND_DIFFS_KEY, OFF_STATUSES, WEEKDAYS } from './constants.js';
import { data, currentMode } from './state.js';
import { calcWorkMinutes, formatHoursMinutes, groupByWeek, calculateOvertime } from './utils.js';

export function render() {
  // ヘッダー更新
  const thead = document.getElementById('list-thead-tr');
  if (currentMode === 'bp') {
    thead.innerHTML = '<th>日付</th><th>曜</th><th>開始</th><th>終了</th><th>内容</th><th>操作</th>';
  } else {
    thead.innerHTML = '<th>日付</th><th>曜</th><th>実績</th><th>開始</th><th>終了</th><th>18時以降休憩</th><th>遅刻</th><th>振替</th><th>内容</th><th>操作</th>';
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

export function updateWorkSummary() {
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
