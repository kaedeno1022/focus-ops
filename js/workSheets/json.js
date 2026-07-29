// ============================================================
// JSON Import/Export
// ============================================================

function exportJSON() {
  const exportData = selectedMonth
    ? data.filter(d => d.日付 && d.日付.startsWith(selectedMonth))
    : data;
  const filename  = selectedMonth ? `workData_${selectedMonth}.json` : 'workData.json';
  const countText = selectedMonth ? `${selectedMonth}月 ${exportData.length}件` : `${exportData.length}件`;
  downloadJSON(exportData, filename);
  showToast(`JSONをエクスポートしました (${countText})`, 'success');
}

function importJSON() {
  pickJSONFile(parsed => {
    const imported = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.勤務データ) ? parsed.勤務データ : null;
    if (!imported) { showToast('無効なJSONフォーマットです', 'error'); return; }

    // インポートデータに含まれる月だけを既存データから除去し、その他の月は温存する
    const importedMonths = new Set(
      imported.filter(d => d.日付).map(d => d.日付.slice(0, 7))
    );
    const kept = data.filter(d => !(d.日付 && importedMonths.has(d.日付.slice(0, 7))));

    data.length = 0;
    data.push(...kept, ...imported);
    sortData(); save(); render();
    showToast('JSONをインポートしました', 'success');
  });
}

// イベントが属する月（YYYY-MM）を全て列挙する。日付が期間指定の場合は月またぎも考慮する
function eventMonths(ev) {
  if (ev.dates) return [...new Set(ev.dates.map(d => d.slice(0, 7)))];
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

function exportEventJSON() {
  let exportData = eventData;
  let filename   = 'eventData.json';
  let countText  = `${eventData.length}件`;

  if (selectedEventMonth) {
    exportData = eventData.filter(ev => eventMonths(ev).includes(selectedEventMonth));
    filename  = `eventData_${selectedEventMonth}.json`;
    countText = `${selectedEventMonth}月 ${exportData.length}件`;
  }

  downloadJSON(exportData, filename);
  showToast(`イベントJSONをエクスポートしました (${countText})`, 'success');
}

function importEventJSON() {
  pickJSONFile(imported => {
    if (!Array.isArray(imported)) { showToast('無効なJSONフォーマットです', 'error'); return; }

    // インポートデータが属する月だけを既存イベントから除去し、その他の月は温存する
    const importedMonths = new Set(imported.flatMap(eventMonths));
    const kept = eventData.filter(ev => !eventMonths(ev).some(m => importedMonths.has(m)));

    eventData.length = 0;
    eventData.push(...kept, ...imported);
    saveEventData(); renderEventTable();
    showToast('イベントJSONをインポートしました', 'success');
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

