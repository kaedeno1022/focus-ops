// ============================================================
// データCRUD操作
// ============================================================

function validateWorkItem(prefix = '') {
  const dateVal    = getFormEl(prefix, 'date').value;
  const contentVal = getFormEl(prefix, 'content').value.trim();
  const startEl    = getFormEl(prefix, 'start');
  const endEl      = getFormEl(prefix, 'end');

  if (!dateVal || !contentVal) { showToast('日付と内容は必須です', 'warning'); return false; }

  const statusVal = currentMode === 'bp' ? '' : getFormEl(prefix, 'status').value;
  // 休業（研修）系はVBA側も時刻の有無を検査していないため必須にしない
  const timeOptional = OPTIONAL_TIME_STATUSES.includes(statusVal);

  if (!startEl.disabled && !timeOptional && (!startEl.value || !endEl.value)) {
    showToast('開始・終了時間を入力してください', 'warning'); return false;
  }
  if (currentMode === 'bp') return true;

  const subVal = getFormEl(prefix, 'substitute').value;
  if (SUBSTITUTE_VISIBLE_STATUSES.includes(statusVal) && !subVal) {
    showToast('振替代休対象日を入力してください', 'warning'); return false;
  }

  // 日マタギ（開始 >= 終了）は終了が翌9:00までなら勤務実績を問わず許容する
  // VBA「関連チェック」の日マタギチェックに合わせる
  if (!startEl.disabled && startEl.value && endEl.value &&
      timeToMinutes(startEl.value) >= timeToMinutes(endEl.value) &&
      timeToMinutes(endEl.value) > timeToMinutes(WORK_START_TIME)) {
    showToast('作業終了時間が翌日の9:00以降の作業は、翌日の勤怠となります。', 'error');
    return false;
  }

  // 半休の時間帯・振替出勤の勤務時間・振替代休の対象日など、Excelマクロ側の関連チェック
  // 編集中は日付を変更している可能性があるため、編集対象の行を添字で取り除いてから渡す
  const others = (prefix === 'edit' && editIndex !== null)
    ? data.filter((_, i) => i !== editIndex)
    : data;
  const entryError = validateDailyEntry(buildWorkItem(prefix), others);
  if (entryError) { showToast(entryError, 'error'); return false; }

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

// ============================================================
// 取り消し（直前の破壊的操作を1回分だけ戻せるようにする）
// ============================================================
function takeUndoSnapshot() {
  setUndoSnapshot({ kind: 'data', mode: currentMode, payload: data.map(d => ({ ...d })) });
}

function takeEventUndoSnapshot() {
  setUndoSnapshot({
    kind: 'event',
    payload: eventData.map(ev => ({
      ...ev,
      dates: Array.isArray(ev.dates) ? [...ev.dates] : ev.dates,
    })),
  });
}

function undoLastChange() {
  if (!undoSnapshot) { showToast('元に戻せる操作がありません', 'info'); return; }

  if (undoSnapshot.kind === 'event') {
    eventData.length = 0;
    eventData.push(...undoSnapshot.payload);
    setUndoSnapshot(null);
    saveEventData(); renderEventTable(); render();
    showToast('操作を元に戻しました', 'success');
    return;
  }

  if (undoSnapshot.mode !== currentMode) {
    showToast('モードが切り替わっているため元に戻せません', 'warning');
    return;
  }
  data.length = 0;
  data.push(...undoSnapshot.payload);
  setUndoSnapshot(null);
  save(); render();
  showToast('操作を元に戻しました', 'success');
}

function undoAction() {
  return { label: '元に戻す', onClick: undoLastChange };
}

// ============================================================
// 登録・編集・削除
// ============================================================

// 登録できたかを返す。呼び出し側（チェックアウト）が成否で分岐するため
async function addData() {
  if (!validateWorkItem()) return false;
  const item = buildWorkItem();
  const idx  = data.findIndex(d => d.日付 === item.日付);
  if (idx !== -1) {
    if (!await showConfirm(`${formatDateLabel(item.日付)}のデータが既に存在します。\nこの内容で更新しますか？`)) return false;
    takeUndoSnapshot();
    data[idx] = item;
  } else {
    takeUndoSnapshot();
    data.push(item);
  }
  sortData();
  if (!save()) return false;
  render(); clearForm();
  showToast('登録が完了しました', 'success');
  return true;
}

function editRow(i) {
  setEditIndex(i);
  const d = data[i];
  document.getElementById('edit-date').value        = d.日付;
  document.getElementById('edit-status').value      = d.勤務実績      || '';
  document.getElementById('edit-start').value       = d.作業開始      || '';
  document.getElementById('edit-end').value         = d.作業終了      || '';
  document.getElementById('edit-break').value       = d['18時以降休憩'] || '';
  document.getElementById('edit-late').value        = d.遅刻早退       || '';
  document.getElementById('edit-substitute').value  = d.振替代休対象日  || '';
  document.getElementById('edit-content').value     = d.作業内容       || '';

  document.getElementById('edit-weekday').textContent            = getWeekdayLabel(d.日付);
  document.getElementById('edit-substitute-weekday').textContent = getWeekdayLabel(d.振替代休対象日 || '');

  controlTime('edit'); controlBreakDisplay('edit'); updateSubstituteVisibility('edit');
  updateContentCounters();
  showModal('editModal');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function saveEditData() {
  if (!validateWorkItem('edit')) return;
  if (editIndex === null) return;
  takeUndoSnapshot();
  data[editIndex] = buildWorkItem('edit');
  sortData();
  if (!save()) return;
  render();
  closeEditModal();
  showToast('編集内容を更新しました', 'success', 8000, undoAction());
}

function closeEditModal() {
  setEditIndex(null);
  hideModal('editModal');
}

async function del(i) {
  const target = data[i];
  if (!target) return;
  if (!await showConfirm(`${formatDateLabel(target.日付)}のデータを削除しますか？`, { danger: true })) return;
  takeUndoSnapshot();
  data.splice(i, 1);
  save(); render();
  showToast('削除しました', 'success', 8000, undoAction());
}

// 削除は月単位のみ。全期間の一括削除は用意しない
// （取り消しはメモリ上の1回分だけで、リロードすると全履歴が復旧不能になるため）
async function clearAll() {
  if (!selectedMonth) {
    showToast('削除する月を選択してください', 'warning');
    return;
  }

  const targets = data.filter(d => d.日付 && d.日付.startsWith(selectedMonth));
  const monthLabel = formatMonthLabel(selectedMonth);
  if (targets.length === 0) {
    showToast(`${monthLabel}のデータはありません`, 'info');
    return;
  }

  const range = `${targets[0].日付} 〜 ${targets[targets.length - 1].日付}`;
  const confirmMsg = `${monthLabel}のデータ ${targets.length}件（${range}）を削除します。\n`
    + '取り消せるのは直後の一度だけで、リロードすると戻せません。\n'
    + 'バックアップが必要ならキャンセルして先にJSON出力すること。';

  if (!await showConfirm(confirmMsg, { title: '削除確認', danger: true, okLabel: '削除する' })) return;

  takeUndoSnapshot();
  const kept = data.filter(d => !d.日付 || !d.日付.startsWith(selectedMonth));
  data.length = 0;
  data.push(...kept);
  // 消した月の15分調整差分が残るとサマリーに幽霊の差分が出るため、同時に落とす
  saveRoundDiffs(loadRoundDiffs().filter(r => !r.date || !r.date.startsWith(selectedMonth)));
  save(); render();
  showToast(`${monthLabel}のデータ ${targets.length}件を削除しました`, 'success', 8000, undoAction());
}

function clearRoundDiffs() {
  removeStored(roundDiffsKey());
  render();
  showToast('調整差分をクリアしました', 'success');
}

async function importEventsToContents(eventList = eventData) {
  if (!eventList?.length) { showToast('イベントデータがありません', 'warning'); return; }

  const targetData = selectedMonth
    ? data.filter(d => d.日付 && d.日付.startsWith(selectedMonth))
    : data;
  const monthText = selectedMonth ? `${formatMonthLabel(selectedMonth)}の` : '';

  if (!await showConfirm(`${monthText}各日付にイベント内容を反映しますか？\n既存の内容は上書きされません。`)) return;

  takeUndoSnapshot();
  let count = 0;
  let truncated = 0;
  targetData.forEach(d => {
    if (!d.日付) return;
    const matched = eventList.filter(ev => matchesEventDate(ev, d.日付)).map(ev => ev.content);
    if (!matched.length) return;
    const existing = d.作業内容 ? d.作業内容.split(',').map(s => s.trim()) : [];
    let added = false;
    matched.forEach(c => { if (!existing.includes(c)) { existing.push(c); added = true; } });
    if (!added) return;
    const joined = existing.join(',');
    if (joined.length > CONTENT_MAX_LENGTH) truncated++;
    d.作業内容 = joined.slice(0, CONTENT_MAX_LENGTH);
    count++;
  });

  if (count === 0) {
    setUndoSnapshot(null);
    showToast(`${monthText}反映する内容がありませんでした`, 'info');
    return;
  }

  save(); render();
  const note = truncated ? `\n（${truncated}件は${CONTENT_MAX_LENGTH}文字を超えたため切り詰めました）` : '';
  showToast(`${monthText}${count}件にイベント内容を反映しました${note}`, 'success', 8000, undoAction());
}

// ============================================================
// 時間フォーマット整理・15分丸め
// ============================================================
function formatTimes() {
  const targetData = selectedMonth
    ? data.filter(d => d.日付 && d.日付.startsWith(selectedMonth))
    : data;

  const roundDiffs = loadRoundDiffs();
  let formatCount = 0;
  let roundCount = 0;

  takeUndoSnapshot();

  targetData.forEach(d => {
    if (d.作業開始 && /^\d{4}$/.test(d.作業開始)) {
      d.作業開始 = d.作業開始.slice(0, 2) + ':' + d.作業開始.slice(2);
      formatCount++;
    }
    if (d.作業終了 && /^\d{4}$/.test(d.作業終了)) {
      d.作業終了 = d.作業終了.slice(0, 2) + ':' + d.作業終了.slice(2);
      formatCount++;
    }

    if (!d.作業開始 || !d.作業終了) return;

    const originalWorkMin = calcWorkMinutes(d);
    if (originalWorkMin === null) return;

    const roundedStart = roundToQuarter(d.作業開始, 'nearest');
    const roundedEnd   = roundToQuarter(d.作業終了, 'nearest');
    if (roundedStart === d.作業開始 && roundedEnd === d.作業終了) return;

    d.作業開始 = roundedStart;
    d.作業終了 = roundedEnd;

    const diffMin = originalWorkMin - calcWorkMinutes(d);
    const existingIdx = roundDiffs.findIndex(r => r.date === d.日付);
    if (existingIdx >= 0) {
      roundDiffs[existingIdx].diffMinutes += diffMin;
    } else {
      roundDiffs.push({ date: d.日付, diffMinutes: diffMin });
    }
    roundCount++;
  });

  const totalCount = formatCount + roundCount;
  if (totalCount === 0) {
    setUndoSnapshot(null);
    showToast(`${selectedMonth ? formatMonthLabel(selectedMonth) + 'は' : ''}修正が必要な項目はありませんでした`, 'info');
    return;
  }

  saveRoundDiffs(roundDiffs);
  save(); render();

  const messages = [];
  if (formatCount > 0) messages.push(`フォーマット修正${formatCount}件`);
  if (roundCount > 0)  messages.push(`15分単位丸め${roundCount}件`);
  const monthText = selectedMonth ? `${formatMonthLabel(selectedMonth)}の` : '';
  showToast(`${monthText}${messages.join('、')}を実行しました`, 'success', 8000, undoAction());
}
