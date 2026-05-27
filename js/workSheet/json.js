// ============================================================
// JSON Import/Export
// ============================================================
import { data, eventData } from './state.js';
import { save, sortData, saveEventData } from './storage.js';
import { render } from './render.js';
import { renderEventTable } from './events.js';
import { showToast } from './ui.js';

export function exportJSON() {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'workData.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('JSONをエクスポートしました', 'success');
}

export function importJSON() {
  const input = document.createElement('input');
  input.type  = 'file';
  input.accept = 'application/json';
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target.result);
        const imported = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed?.勤務データ) ? parsed.勤務データ : null;
        if (!imported) {
          showToast('無効なJSONフォーマットです', 'error'); return;
        }
        data.length = 0;
        data.push(...imported);
        sortData(); save(); render();
        showToast('JSONをインポートしました', 'success');
      } catch (err) {
        console.error('[importJSON] parse error:', err);
        showToast('JSONのパースに失敗しました', 'error');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

export function exportEventJSON() {
  const blob = new Blob([JSON.stringify(eventData, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'eventData.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('イベントJSONをエクスポートしました', 'success');
}

export function importEventJSON() {
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

window.exportJSON = exportJSON;
window.importJSON = importJSON;
window.exportEventJSON = exportEventJSON;
window.importEventJSON = importEventJSON;
