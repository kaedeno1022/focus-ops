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

async function clearAll() {
  const confirmMsg = selectedMonth
    ? `${selectedMonth}月のデータを削除しますか？\nこの操作は取り消せません。`
    : '全データを削除しますか？\nこの操作は取り消せません。';

  if (!await showConfirm(confirmMsg, { title: '削除確認', danger: true })) return;

  if (selectedMonth) {
    const beforeCount = data.length;
    data.splice(0, data.length, ...data.filter(d => !d.日付 || !d.日付.startsWith(selectedMonth)));
    const deletedCount = beforeCount - data.length;
    const key = currentMode === 'bp' ? 'workData_bp' : 'workData';
    localStorage.setItem(key, JSON.stringify(data));
    render();
    showToast(`${selectedMonth}月のデータ ${deletedCount}件を削除しました`, 'success');
  } else {
    const key = currentMode === 'bp' ? 'workData_bp' : 'workData';
    localStorage.removeItem(key);
    if (currentMode === 'employee') localStorage.removeItem('roundDiffs');
    data.length = 0;
    render();
    showToast('全データを削除しました', 'success');
  }
}

function clearRoundDiffs() {
  localStorage.removeItem('roundDiffs');
  render();
  showToast('調整差分をクリアしました', 'success');
}

async function importEventsToContents(eventData) {
  if (!eventData?.length) { showToast('イベントデータがありません', 'warning'); return; }
  if (!await showConfirm('各日付にイベント内容を反映しますか？\n既存の内容は上書きされません。')) return;
  let count = 0;
  data.forEach(d => {
    if (!d.日付) return;
    const matched = eventData.filter(ev => matchesEventDate(ev, d.日付)).map(ev => ev.content);
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
  const targetData = selectedMonth
    ? data.filter(d => d.日付 && d.日付.startsWith(selectedMonth))
    : data;

  const roundDiffs = JSON.parse(localStorage.getItem(ROUND_DIFFS_KEY) || '[]');
  let formatCount = 0;
  let roundCount = 0;

  targetData.forEach(d => {
    if (d.作業開始 && /^\d{4}$/.test(d.作業開始)) {
      d.作業開始 = d.作業開始.slice(0, 2) + ':' + d.作業開始.slice(2);
      formatCount++;
    }
    if (d.作業終了 && /^\d{4}$/.test(d.作業終了)) {
      d.作業終了 = d.作業終了.slice(0, 2) + ':' + d.作業終了.slice(2);
      formatCount++;
    }

    if (d.作業開始 && d.作業終了) {
      const originalWorkMin = calcWorkMinutes(d);
      if (originalWorkMin !== null) {
        const roundedStart = roundToQuarter(d.作業開始, 'nearest');
        const roundedEnd   = roundToQuarter(d.作業終了, 'nearest');

        if (roundedStart !== d.作業開始 || roundedEnd !== d.作業終了) {
          d.作業開始 = roundedStart;
          d.作業終了 = roundedEnd;

          const roundedWorkMin = calcWorkMinutes(d);
          const diffMin = originalWorkMin - roundedWorkMin;

          const existingIdx = roundDiffs.findIndex(r => r.date === d.日付);
          if (existingIdx >= 0) {
            roundDiffs[existingIdx].diffMinutes += diffMin;
          } else {
            roundDiffs.push({ date: d.日付, diffMinutes: diffMin });
          }
          roundCount++;
        }
      }
    }
  });

  const totalCount = formatCount + roundCount;
  if (totalCount > 0) {
    localStorage.setItem(ROUND_DIFFS_KEY, JSON.stringify(roundDiffs));
    save(); render();
    const monthText = selectedMonth ? `${selectedMonth}月の` : '';
    const messages = [];
    if (formatCount > 0) messages.push(`フォーマット修正${formatCount}件`);
    if (roundCount > 0) messages.push(`15分単位丸め${roundCount}件`);
    showToast(`${monthText}${messages.join('、')}を実行しました`, 'success');
  } else {
    const monthText = selectedMonth ? `${selectedMonth}月は` : '';
    showToast(`${monthText}修正が必要な項目はありませんでした`, 'info');
  }
}

