// ============================================================
// Excel(.xlsm) 作業確認表への書き込み
// 対象セルの値だけをXMLレベルで書き換え、罫線・図形・VBA等は元のまま保持する。
// （SheetJSでワークブック全体を読み書きすると罫線スタイルが失われたため、
// 　JSZip + 生XML操作方式に変更）
// ============================================================
const EXCEL_SHEET_NAME = '作業確認表';
const JSZIP_CDN_URL = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';

const SPREADSHEET_NS   = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const RELATIONSHIPS_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

const EXCEL_LAYOUT = {
  employee: {
    baseRow: 7, startRow: 8, endRow: 38,
    yearCell: 'D6', monthCell: 'E6',
    fields: [
      { key: '勤務実績',       col: 4 },
      { key: '作業開始',       col: 5, time: true },
      { key: '作業終了',       col: 6, time: true },
      { key: '18時以降休憩',   col: 7 },
      { key: '遅刻早退',       col: 12 },
      { key: '振替代休対象日', col: 13 },
      { key: '作業内容',       col: 16 },
    ],
  },
  bp: {
    baseRow: 11, startRow: 12, endRow: 42,
    yearCell: 'C10', monthCell: 'D10',
    fields: [
      { key: '作業開始', col: 4, time: true },
      { key: '作業終了', col: 5, time: true },
      { key: '作業内容', col: 8 },
    ],
  },
};

function loadJSZipLibrary() {
  if (window.JSZip) return Promise.resolve();
  if (window._jszipLoadingPromise) return window._jszipLoadingPromise;
  window._jszipLoadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = JSZIP_CDN_URL;
    script.onload  = () => resolve();
    script.onerror = () => reject(new Error('JSZipライブラリの読み込みに失敗しました。ネットワーク接続を確認してください。'));
    document.head.appendChild(script);
  });
  return window._jszipLoadingPromise;
}

// VBA の NormalizeTimeStr と同じ挙動（"09:00" → "9:00"、分は2桁維持）
function normalizeTimeStrForExcel(timeStr) {
  const s = (timeStr || '').trim();
  if (!s) return '';
  const colonPos = s.indexOf(':');
  if (colonPos === -1) return s;
  const hourPart   = String(parseInt(s.slice(0, colonPos), 10) || 0);
  const minutePart = String(parseInt(s.slice(colonPos + 1), 10) || 0).padStart(2, '0');
  return `${hourPart}:${minutePart}`;
}

function pickExcelFile() {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsm';
    input.onchange = e => resolve(e.target.files[0] || null);
    input.click();
  });
}

// ---- セル参照ヘルパー ----
function colLettersToIndex(letters) {
  let idx = 0;
  for (const ch of letters) idx = idx * 26 + (ch.charCodeAt(0) - 64);
  return idx; // 1始まり (A=1)
}

function parseCellAddr(addr) {
  const m = addr.match(/^([A-Z]+)(\d+)$/);
  return { col: colLettersToIndex(m[1]), row: parseInt(m[2], 10), colLetters: m[1] };
}

function colIndexToLetters(idx) {
  let s = '';
  let n = idx;
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

// ---- シート名 → XML パス解決 ----
async function resolveSheetXmlPath(zip, sheetName) {
  const workbookXml = await zip.file('xl/workbook.xml').async('string');
  const wbDoc = new DOMParser().parseFromString(workbookXml, 'application/xml');
  const sheets = wbDoc.getElementsByTagName('sheet');
  let rId = null;
  for (const sheet of sheets) {
    if (sheet.getAttribute('name') === sheetName) {
      rId = sheet.getAttribute('r:id') || sheet.getAttributeNS(RELATIONSHIPS_NS, 'id');
      break;
    }
  }
  if (!rId) return null;

  const relsXml = await zip.file('xl/_rels/workbook.xml.rels').async('string');
  const relsDoc = new DOMParser().parseFromString(relsXml, 'application/xml');
  const rels = relsDoc.getElementsByTagName('Relationship');
  for (const rel of rels) {
    if (rel.getAttribute('Id') === rId) {
      const target = rel.getAttribute('Target').replace(/^\/?/, '');
      return target.startsWith('xl/') ? target : `xl/${target}`;
    }
  }
  return null;
}

// ---- 行・セル要素の取得/生成（既存要素があれば再利用しスタイルを保持する） ----
function getOrCreateRow(doc, sheetData, rowNum) {
  const rows = Array.from(sheetData.getElementsByTagNameNS(SPREADSHEET_NS, 'row'));
  for (const row of rows) {
    if (parseInt(row.getAttribute('r'), 10) === rowNum) return row;
  }
  const newRow = doc.createElementNS(SPREADSHEET_NS, 'row');
  newRow.setAttribute('r', String(rowNum));
  const nextRow = rows.find(row => parseInt(row.getAttribute('r'), 10) > rowNum);
  sheetData.insertBefore(newRow, nextRow || null);
  return newRow;
}

function getOrCreateCell(doc, row, rowNum, colIdx, colLetters) {
  const cells = Array.from(row.getElementsByTagNameNS(SPREADSHEET_NS, 'c'));
  const addr = `${colLetters}${rowNum}`;
  for (const cell of cells) {
    if (cell.getAttribute('r') === addr) return cell;
  }
  const newCell = doc.createElementNS(SPREADSHEET_NS, 'c');
  newCell.setAttribute('r', addr);
  const nextCell = cells.find(cell => {
    const m = cell.getAttribute('r').match(/^([A-Z]+)\d+$/);
    return m && colLettersToIndex(m[1]) > colIdx;
  });
  row.insertBefore(newCell, nextCell || null);
  return newCell;
}

// 既存の値・数式子要素だけを消し、s(スタイル)属性はそのまま残す
function setCellValue(doc, cell, value) {
  Array.from(cell.childNodes).forEach(n => cell.removeChild(n));
  if (!value) {
    cell.removeAttribute('t');
    return;
  }
  cell.setAttribute('t', 'inlineStr');
  const is = doc.createElementNS(SPREADSHEET_NS, 'is');
  const t  = doc.createElementNS(SPREADSHEET_NS, 't');
  t.textContent = value;
  is.appendChild(t);
  cell.appendChild(is);
}

// 共有文字列テーブル(xl/sharedStrings.xml)を読み込む
async function loadSharedStrings(zip) {
  const file = zip.file('xl/sharedStrings.xml');
  if (!file) return [];
  const xmlText = await file.async('string');
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
  const sis = doc.getElementsByTagNameNS(SPREADSHEET_NS, 'si');
  return Array.from(sis).map(si =>
    Array.from(si.getElementsByTagNameNS(SPREADSHEET_NS, 't')).map(t => t.textContent).join('')
  );
}

// セルの表示文字列を取得する（共有文字列 t="s" / インライン文字列 t="inlineStr" / 数値・数式結果に対応）
function getCellText(sheetData, addr, sharedStrings) {
  const cells = sheetData.getElementsByTagNameNS(SPREADSHEET_NS, 'c');
  for (const cell of cells) {
    if (cell.getAttribute('r') !== addr) continue;
    const type = cell.getAttribute('t');
    if (type === 's') {
      const v = cell.getElementsByTagNameNS(SPREADSHEET_NS, 'v')[0];
      const idx = v ? parseInt(v.textContent, 10) : NaN;
      return Number.isInteger(idx) && sharedStrings[idx] !== undefined ? sharedStrings[idx].trim() : '';
    }
    if (type === 'inlineStr') {
      const t = cell.getElementsByTagNameNS(SPREADSHEET_NS, 't')[0];
      return t ? t.textContent.trim() : '';
    }
    const v = cell.getElementsByTagNameNS(SPREADSHEET_NS, 'v')[0];
    return v ? v.textContent.trim() : '';
  }
  return '';
}

async function writeToExcelSheet() {
  const file = await pickExcelFile();
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.xlsm')) {
    showToast('.xlsm 形式のファイルを選択してください', 'error');
    return;
  }

  try {
    await loadJSZipLibrary();

    const buf = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(buf);

    const sheetPath = await resolveSheetXmlPath(zip, EXCEL_SHEET_NAME);
    if (!sheetPath || !zip.file(sheetPath)) {
      showToast(`シート「${EXCEL_SHEET_NAME}」が見つかりません`, 'error');
      return;
    }

    const xmlText = await zip.file(sheetPath).async('string');
    const xmlDeclMatch = xmlText.match(/^<\?xml[^>]*\?>/);
    const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) {
      showToast('シートXMLの解析に失敗しました', 'error');
      return;
    }
    const sheetData = doc.getElementsByTagNameNS(SPREADSHEET_NS, 'sheetData')[0];
    const sharedStrings = await loadSharedStrings(zip);

    if (!selectedMonth) {
      showToast('書き込む対象月が選択されていません。画面上部の月フィルタで対象月を選択してください。', 'error');
      return;
    }

    const layout = EXCEL_LAYOUT[currentMode];
    const [yearVal, monthVal] = selectedMonth.split('-').map(v => parseInt(v, 10));
    if (!yearVal || !monthVal) {
      showToast('選択されている月の形式が不正です', 'error');
      return;
    }

    const currentYearStr  = getCellText(sheetData, layout.yearCell, sharedStrings).replace(/[年\s]/g, '');
    const currentMonthStr = getCellText(sheetData, layout.monthCell, sharedStrings).replace(/[月\s]/g, '');
    const currentSheetMonth = currentYearStr && currentMonthStr
      ? `${currentYearStr}-${String(parseInt(currentMonthStr, 10)).padStart(2, '0')}`
      : '(不明)';

    const targetMonth = selectedMonth;
    const modeName = currentMode === 'bp' ? 'BP用' : '社員用';
    const targetData = data.filter(d => d.日付 && d.日付.startsWith(targetMonth));

    const confirmed = await showConfirm(
      `シート上の現在の年月: ${currentSheetMonth} → 書込後: ${targetMonth}（${modeName}）\n` +
      `対象データ: ${targetData.length}件\n` +
      `年月ヘッダーと勤務データを上書きします。よろしいですか？`
    );
    if (!confirmed) return;

    // 年月ヘッダーセルを書込先の年月に合わせて更新する
    [layout.yearCell, layout.monthCell].forEach((addr, i) => {
      const { row, col, colLetters } = parseCellAddr(addr);
      const headerRow = getOrCreateRow(doc, sheetData, row);
      const headerCell = getOrCreateCell(doc, headerRow, row, col, colLetters);
      setCellValue(doc, headerCell, String(i === 0 ? yearVal : monthVal));
    });

    const daysInMonth = new Date(yearVal, monthVal, 0).getDate();
    let writtenCount = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const rowNum = layout.baseRow + day;
      if (rowNum < layout.startRow || rowNum > layout.endRow) continue;

      const bText = getCellText(sheetData, `B${rowNum}`, sharedStrings);
      if (!bText) continue; // シート側にその日の行が存在しない

      const dateStr = `${targetMonth}-${String(day).padStart(2, '0')}`;
      const item = targetData.find(d => d.日付 === dateStr);
      const row = getOrCreateRow(doc, sheetData, rowNum);

      layout.fields.forEach(field => {
        const colLetters = colIndexToLetters(field.col);
        const cell = getOrCreateCell(doc, row, rowNum, field.col, colLetters);
        let value = item ? (item[field.key] || '') : '';
        if (field.time) value = normalizeTimeStrForExcel(value);
        setCellValue(doc, cell, value);
      });

      if (item) writtenCount++;
    }

    let newXml = new XMLSerializer().serializeToString(doc);
    // ブラウザによっては serializeToString が XML宣言を含めて出力するため、
    // 一旦除去してから元の宣言（なければ既定値）を必ず1つだけ付け直す
    newXml = newXml.replace(/^<\?xml[^>]*\?>\s*/, '');
    newXml = (xmlDeclMatch ? xmlDeclMatch[0] : '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>') + newXml;
    zip.file(sheetPath, newXml);

    const outBlob = await zip.generateAsync({
      type: 'blob',
      mimeType: 'application/vnd.ms-excel.sheet.macroEnabled.12',
      compression: 'DEFLATE',
    });
    const url = URL.createObjectURL(outBlob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);

    showToast(`Excelへの書き込みが完了しました（${writtenCount}件）`, 'success');
  } catch (err) {
    showToast(`Excel書き込み中にエラーが発生しました: ${err.message}`, 'error');
  }
}
