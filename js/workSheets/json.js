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

// 取り込む勤務データを選り分ける。日付の形式が崩れていると別の月として扱われ、既存の月を差し替えずに二重登録になるため除外する。
// ファイル内で日付が重複していれば先に出てきた行を残す
function pickImportableWorkItems(list) {
  const objects = pickObjects(list);
  const seen = new Set();
  const items = [];
  let invalid = list.length - objects.length;
  let duplicate = 0;
  objects.forEach(d => {
    if (typeof d.日付 !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d.日付)) { invalid++; return; }
    if (seen.has(d.日付)) { duplicate++; return; }
    seen.add(d.日付);
    items.push(d);
  });
  return { items, invalid, duplicate };
}

// 差し替える月ごとの件数（既存 → 取り込み後）
function summarizeMonthReplacement(existing, imported) {
  const months = [...new Set(imported.map(d => d.日付.slice(0, 7)))].sort();
  return months.map(month => ({
    month,
    before: existing.filter(d => d.日付 && d.日付.startsWith(month)).length,
    after:  imported.filter(d => d.日付.startsWith(month)).length,
  }));
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
  showToast(`JSONをエクスポートしました (${countText})`, 'success');
}

function importJSON() {
  pickJSONFile(async parsed => {
    const raw = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.勤務データ) ? parsed.勤務データ : null;
    if (!raw) { showToast('無効なJSONフォーマットです', 'error'); return; }

    const { items: imported, invalid, duplicate } = pickImportableWorkItems(raw);
    if (imported.length === 0) { showToast('取り込めるデータがありませんでした', 'warning'); return; }

    const lines = summarizeMonthReplacement(data, imported)
      .map(r => `${formatMonthLabel(r.month)}: ${r.before}件 → ${r.after}件`);
    if (invalid > 0)   lines.push(`日付の形式が不正な${invalid}件は除外します`);
    if (duplicate > 0) lines.push(`日付が重複する${duplicate}件は除外します`);
    // BP用の出力には勤務実績の列がないため、モードの取り違えを疑う
    const modeLabel = currentMode === 'bp' ? 'BP用' : '社員用';
    const looksBp = imported.every(d => !('勤務実績' in d));
    if ((currentMode === 'bp') !== looksBp) {
      lines.push(`⚠ ${modeLabel}以外のモードで出力したデータの可能性があります`);
    }
    const msg = `${modeLabel}のデータに次の月を差し替えます。\n${lines.join('\n')}`;
    if (!await showConfirm(msg, { title: 'インポート確認', okLabel: '取り込む' })) return;

    takeUndoSnapshot();
    const merged = mergeByMonth(data, imported, workItemMonths);
    data.length = 0;
    data.push(...merged);
    sortData(); save(); render();

    showToast(`JSONをインポートしました (${imported.length}件)`, 'success', 8000, undoAction());
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

// ---- 全体バックアップ ----
// 勤務データ（社員用・BP用）・イベント・15分調整差分・休暇残日数の基準値をまとめて出す。
// 月単位のJSON出力では調整差分や基準値が戻らないため、端末移行やデータ消失からの復旧はこちらを使う
function buildFullBackup() {
  const values = {};
  BACKUP_KEYS.forEach(key => {
    const value = readJSON(key, null);
    if (value !== null) values[key] = value;
  });
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: `${getTodayJST()} ${nowTimeStr()}`, values };
}

function exportFullBackup() {
  downloadJSON(buildFullBackup(), `focus-ops-backup_${getTodayJST()}.json`);
  // バックアップ案内は全体バックアップを取ったときだけ消す（月単位の出力では全データが守られないため）
  writeString(LAST_EXPORT_KEY, getTodayJST());
  removeStored(BACKUP_SNOOZE_KEY);
  updateBackupNotice();
  showToast('全体バックアップを出力しました', 'success');
}

// 復元できるバックアップなら values を返し、そうでなければ null を返す。
// 一部のキーだけ書き込んで止まると整合が崩れるため、1つでも形が合わなければ全体を拒否する
function validateBackup(parsed) {
  if (parsed?.format !== BACKUP_FORMAT || parsed.version !== BACKUP_VERSION) return null;
  const values = parsed.values;
  if (!values || typeof values !== 'object' || Array.isArray(values)) return null;
  const valid = Object.entries(values).every(([key, value]) => {
    if (!BACKUP_KEYS.includes(key)) return false;
    if (key === LEAVE_BASELINE_KEY) return value && typeof value === 'object' && !Array.isArray(value);
    return Array.isArray(value);
  });
  return valid ? values : null;
}

function restoreFullBackup() {
  pickJSONFile(async parsed => {
    const values = validateBackup(parsed);
    if (!values) { showToast('全体バックアップの形式ではありません', 'error'); return; }

    const count = key => (Array.isArray(values[key]) ? values[key].length : 0);
    const msg = `${parsed.exportedAt || '日時不明'} のバックアップで、現在のデータをすべて置き換えます。\n`
      + `社員用 ${count(STORAGE_KEY)}件 / BP用 ${count(BP_STORAGE_KEY)}件 / イベント ${count(EVENT_STORAGE_KEY)}件\n`
      + '置き換える前に、現在のデータを全体バックアップとしてダウンロードします。';
    if (!await showConfirm(msg, { title: '復元確認', danger: true, okLabel: '復元する' })) return;

    downloadJSON(buildFullBackup(), `focus-ops-backup_before-restore_${getTodayJST()}.json`);
    // バックアップに含まれないキーは、バックアップ時点で空だったものとして消す
    const failed = BACKUP_KEYS.filter(key => {
      if (!(key in values)) { removeStored(key); return false; }
      return !writeJSON(key, values[key]);
    });

    setUndoSnapshot(null);
    load();
    loadEventData();
    render();
    renderEventTable();
    renderEventCalendar();
    if (failed.length === 0) showToast('全体バックアップから復元しました', 'success');
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
