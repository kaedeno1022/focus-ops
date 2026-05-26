// ============================================================
// データCRUD操作
// ============================================================
import { SUBSTITUTE_VISIBLE_STATUSES } from './constants.js';
import { data, editIndex, currentMode, eventData, setEditIndex } from './state.js';
import { getFormEl, controlTime, controlBreakDisplay, updateSubstituteVisibility } from './forms.js';
import { save, sortData } from './storage.js';
import { render } from './render.js';
import { showToast, showConfirm } from './ui.js';
import { getWeekdayLabel, timeToMinutes } from './utils.js';

export function validateWorkItem(prefix = '') {
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

export function buildWorkItem(prefix = '') {
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

export async function addData() {
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

export function editRow(i) {
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

export function saveEditData() {
  if (!validateWorkItem('edit')) return;
  if (editIndex === null) return;
  data[editIndex] = buildWorkItem('edit');
  sortData(); save(); render();
  closeEditModal();
  showToast('編集内容を更新しました', 'success');
}

export function closeEditModal() {
  document.getElementById('editModal').classList.add('hidden');
  setEditIndex(null);
  if (document.getElementById('copyModal').classList.contains('hidden')) {
    document.getElementById('overlay').classList.add('hidden');
  }
}

export async function del(i) {
  if (!await showConfirm('このデータを削除しますか？', { danger: true })) return;
  data.splice(i, 1);
  save(); render();
  showToast('削除しました', 'success');
}

export function clearForm() {
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

export async function clearAll() {
  if (!await showConfirm('全データを削除しますか？\nこの操作は取り消せません。', { title: '全削除', danger: true })) return;
  const key = currentMode === 'bp' ? 'workData_bp' : 'workData';
  localStorage.removeItem(key);
  if (currentMode === 'employee') localStorage.removeItem('roundDiffs');
  data.length = 0;
  render();
  showToast('全データを削除しました', 'success');
}

export function clearRoundDiffs() {
  localStorage.removeItem('roundDiffs');
  render();
  showToast('調整差分をクリアしました', 'success');
}

export async function importEventsToContents() {
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

export function formatTimes() {
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
