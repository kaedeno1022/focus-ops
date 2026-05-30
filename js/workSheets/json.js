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
    data.length = 0;
    data.push(...imported);
    sortData(); save(); render();
    showToast('JSONをインポートしました', 'success');
  });
}

function exportEventJSON() {
  let exportData = eventData;
  let filename   = 'eventData.json';
  let countText  = `${eventData.length}件`;

  if (selectedEventMonth) {
    exportData = eventData.filter(ev => {
      if (ev.dates) return ev.dates.some(d => d.startsWith(selectedEventMonth));
      const start = ev.startDate || ev.date || '';
      const end   = ev.endDate   || ev.date || '';
      return start.startsWith(selectedEventMonth) || end.startsWith(selectedEventMonth) ||
             (start && end && start <= selectedEventMonth + '-31' && end >= selectedEventMonth + '-01');
    });
    filename  = `eventData_${selectedEventMonth}.json`;
    countText = `${selectedEventMonth}月 ${exportData.length}件`;
  }

  downloadJSON(exportData, filename);
  showToast(`イベントJSONをエクスポートしました (${countText})`, 'success');
}

function importEventJSON() {
  pickJSONFile(imported => {
    if (!Array.isArray(imported)) { showToast('無効なJSONフォーマットです', 'error'); return; }
    eventData.length = 0;
    eventData.push(...imported);
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

