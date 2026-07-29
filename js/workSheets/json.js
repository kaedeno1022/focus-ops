// ============================================================
// JSON Import/Export
// ============================================================

// ---- 月単位のマージ ----
// インポートデータに含まれる月だけを既存データから除去し、その他の月は温存する。
// monthsOf が空配列を返す要素（日付未設定・全日程イベント）はどの月にも属さないため常に温存する
function mergeByMonth(existing, imported, monthsOf) {
  const importedMonths = new Set(imported.flatMap(monthsOf));
  const kept = existing.filter(item => {
    const months = monthsOf(item);
    return !months.some(m => importedMonths.has(m));
  });
  return [...kept, ...imported];
}

function workItemMonths(d) {
  return d && d.日付 ? [d.日付.slice(0, 7)] : [];
}

// イベントが属する月（YYYY-MM）を全て列挙する。日付が期間指定の場合は月またぎも考慮する
function eventMonths(ev) {
  if (Array.isArray(ev.dates)) return [...new Set(ev.dates.map(d => d.slice(0, 7)))];
  const start = ev.startDate || ev.date || '';
  const end   = ev.endDate   || ev.date || '';
  if (!start || !end) return [];
  const months = [];
  let [y, m] = start.slice(0, 7).split('-').map(Number);
  const [endY, endM] = end.slice(0, 7).split('-').map(Number);
  while (y < endY || (y === endY && m <= endM)) {
    months.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return months;
}

// 配列の中からオブジェクトだけを取り出す。壊れたJSONを取り込んで描画が崩れるのを防ぐ
function pickObjects(list) {
  return list.filter(item => item && typeof item === 'object' && !Array.isArray(item));
}

// ---- 勤務データ ----
function exportJSON() {
  const exportData = selectedMonth
    ? data.filter(d => d.日付 && d.日付.startsWith(selectedMonth))
    : data;
  const filename  = selectedMonth ? `workData_${selectedMonth}.json` : 'workData.json';
  const countText = selectedMonth
    ? `${formatMonthLabel(selectedMonth)} ${exportData.length}件`
    : `${exportData.length}件`;
  downloadJSON(exportData, filename);
  // バックアップ案内の判定に使う
  writeString(LAST_EXPORT_KEY, getTodayJST());
  removeStored(BACKUP_SNOOZE_KEY);
  updateBackupNotice();
  showToast(`JSONをエクスポートしました (${countText})`, 'success');
}

function importJSON() {
  pickJSONFile(parsed => {
    const raw = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.勤務データ) ? parsed.勤務データ : null;
    if (!raw) { showToast('無効なJSONフォーマットです', 'error'); return; }

    const imported = pickObjects(raw);
    if (imported.length === 0) { showToast('取り込めるデータがありませんでした', 'warning'); return; }

    takeUndoSnapshot();
    const merged = mergeByMonth(data, imported, workItemMonths);
    data.length = 0;
    data.push(...merged);
    sortData(); save(); render();

    const skipped = raw.length - imported.length;
    const note = skipped > 0 ? `\n（形式が不正な${skipped}件は除外しました）` : '';
    showToast(`JSONをインポートしました (${imported.length}件)${note}`, 'success', 8000, undoAction());
  });
}

// ---- イベントデータ ----
function exportEventJSON() {
  let exportData = eventData;
  let filename   = 'eventData.json';
  let countText  = `${eventData.length}件`;

  if (selectedEventMonth) {
    exportData = eventData.filter(ev => eventMonths(ev).includes(selectedEventMonth));
    filename  = `eventData_${selectedEventMonth}.json`;
    countText = `${formatMonthLabel(selectedEventMonth)} ${exportData.length}件`;
  }

  downloadJSON(exportData, filename);
  showToast(`イベントJSONをエクスポートしました (${countText})`, 'success');
}

function importEventJSON() {
  pickJSONFile(parsed => {
    if (!Array.isArray(parsed)) { showToast('無効なJSONフォーマットです', 'error'); return; }

    const imported = pickObjects(parsed);
    if (imported.length === 0) { showToast('取り込めるイベントがありませんでした', 'warning'); return; }

    takeEventUndoSnapshot();
    const merged = mergeByMonth(eventData, imported, eventMonths);
    eventData.length = 0;
    eventData.push(...merged);
    sortEventData();
    saveEventData(); renderEventTable();

    const skipped = parsed.length - imported.length;
    const note = skipped > 0 ? `\n（形式が不正な${skipped}件は除外しました）` : '';
    showToast(`イベントJSONをインポートしました (${imported.length}件)${note}`, 'success', 8000, undoAction());
  });
}

// ---- helpers ----
function downloadJSON(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function pickJSONFile(onParsed) {
  const input = document.createElement('input');
  input.type   = 'file';
  input.accept = 'application/json';
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        onParsed(JSON.parse(ev.target.result));
      } catch {
        showToast('JSONのパースに失敗しました', 'error');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}
