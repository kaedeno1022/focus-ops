// ============================================================
// クリップボード関連
// ============================================================
import { data } from './state.js';
import { minutesToTime, minutesToBpTime, calcWorkMinutes } from './utils.js';
import { showToast } from './ui.js';

export function copyTextToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => showToast('クリップボードにコピーしました', 'success'))
      .catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

export function fallbackCopy(text) {
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

export function buildMonthLines(forBP = false) {
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

export function copyStartEnd() {
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

export function copyContents() {
  const monthLines = buildMonthLines();
  if (!monthLines) return;
  copyTextToClipboard(monthLines);
}

window.copyStartEnd = copyStartEnd;
window.copyContents = copyContents;
