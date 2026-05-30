// ============================================================
// クリップボード
// ============================================================

function copyTextToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => showToast('クリップボードにコピーしました', 'success'))
      .catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
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

function buildMonthLines(forBP = false) {
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
  Object.keys(monthMap).sort().forEach(monthKey => {
    lines.push(`【${monthKey}】`);
    const items = monthMap[monthKey];
    items.sort((a, b) => new Date(a.日付) - new Date(b.日付));
    items.forEach(d => {
      const workMin = calcWorkMinutes(d);
      const workDisplay = (forBP && workMin !== null)
        ? minutesToBpTime(workMin)
        : (workMin !== null ? minutesToTime(workMin) : '---');
      lines.push(`${d.日付} ${d.作業内容} ${workDisplay}`);
    });
    lines.push('');
  });
  return lines.join('\n');
}

