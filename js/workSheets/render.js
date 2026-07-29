// ============================================================
// レンダリング（テーブル表示・サマリー）
// ============================================================

// 一覧の列構成。CSSは data-label で列を指定しているため、順序を変えても崩れない
const LIST_COLUMNS = {
  employee: ['日付', '曜', '実績', '開始', '終了', '作業時間', '18時以降休憩', '遅刻', '振替', '内容'],
  bp:       ['日付', '曜', '開始', '終了', '作業時間', '内容'],
};

function listCellText(label, d) {
  switch (label) {
    case '日付':         return d.日付 || '';
    case '曜':           return getWeekday(d.日付);
    case '実績':         return d.勤務実績 || '';
    case '開始':         return d.作業開始 || '';
    case '終了':         return d.作業終了 || '';
    case '作業時間': {
      const min = calcWorkMinutes(d);
      return min === null ? '' : formatHoursMinutes(min);
    }
    case '18時以降休憩': return d['18時以降休憩'] || '';
    case '遅刻':         return d.遅刻早退 || '';
    case '振替':         return d.振替代休対象日 || '';
    case '内容':         return d.作業内容 || '';
    default:             return '';
  }
}

function render() {
  const columns = currentMode === 'bp' ? LIST_COLUMNS.bp : LIST_COLUMNS.employee;

  const thead = document.getElementById('list-thead-tr');
  const table = thead.closest('table');
  thead.textContent = '';
  [...columns, '操作'].forEach(label => {
    const th = document.createElement('th');
    th.textContent = label;
    thead.appendChild(th);
  });
  if (table) {
    table.classList.toggle('mode-bp', currentMode === 'bp');
    table.classList.toggle('mode-employee', currentMode !== 'bp');
  }

  const tbody = document.getElementById('tbody');
  tbody.textContent = '';
  const frag = document.createDocumentFragment();

  const filteredData = selectedMonth
    ? data.filter(d => d.日付 && d.日付.startsWith(selectedMonth))
    : data;

  const today = getTodayJST();

  filteredData.forEach(d => {
    const actualIndex = data.indexOf(d);
    const tr = document.createElement('tr');
    if (d.日付 === today) tr.classList.add('is-today');

    columns.forEach(label => {
      const td = document.createElement('td');
      td.dataset.label = label;
      td.textContent = listCellText(label, d);
      tr.appendChild(td);
    });

    const tdOp = document.createElement('td');
    tdOp.className = 'td-ops';
    tdOp.dataset.label = '操作';
    [
      ['✏ 編集',   'btn-secondary btn-sm', () => window.editRow(actualIndex)],
      ['📅 コピー', 'btn-secondary btn-sm', () => window.openCopy(actualIndex)],
      ['🗑 削除',   'btn-danger btn-sm',    () => window.del(actualIndex)],
    ].forEach(([label, className, handler]) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = label;
      btn.className = className;
      btn.addEventListener('click', handler);
      tdOp.appendChild(btn);
    });
    tr.appendChild(tdOp);
    frag.appendChild(tr);
  });
  tbody.appendChild(frag);

  updateWorkSummary();
  updateContentHistory();
  updateBackupNotice();
  if (document.getElementById('calendar-tab')?.classList.contains('active')) renderCalendarView();
}

// ============================================================
// 月次サマリー
// ============================================================

// サマリー1項目分のHTML。Excelの集計欄と突き合わせられるよう時間は小数2桁で表示する。
// ここに流し込む値は集計結果（数値・固定ラベル）だけで、ユーザー入力は含まれない
function summaryItem(label, value, wide = false) {
  return `<div class="summary-item${wide ? ' summary-item-wide' : ''}">` +
         `<span class="summary-label">${label}:</span>` +
         `<span class="summary-value">${value}</span></div>`;
}

function summarySection(title, items) {
  const body = items.filter(Boolean).join('');
  return body ? `<div class="summary-section"><div class="summary-section-title">${title}</div>` +
                `<div class="summary-grid">${body}</div></div>` : '';
}

// 15分調整差分（focus-ops独自の丸め機能の記録。Excel側には対応する項目がない）
function roundDiffItem() {
  const roundDiffs = loadRoundDiffs();
  const target = selectedMonth
    ? roundDiffs.filter(r => r.date && r.date.startsWith(selectedMonth))
    : roundDiffs;
  const totalMin = target.reduce((s, r) => s + (r.diffMinutes || 0), 0);
  if (totalMin === 0 && target.length === 0) return '';
  return summaryItem('15分調整差分',
    `${formatHoursMinutes(totalMin)} <button class="btn-clear-diffs" onclick="clearRoundDiffs()">クリア</button>`,
    true);
}

function summaryToolbar() {
  return '<div class="summary-toolbar">' +
         '<button type="button" class="btn-secondary btn-sm" onclick="copySummary()">📋 集計をコピー</button>' +
         '</div>';
}

function updateWorkSummary() {
  const sumArea = document.getElementById('work-summary');
  sumArea.innerHTML = '';

  const filteredData = selectedMonth
    ? data.filter(d => d.日付 && d.日付.startsWith(selectedMonth))
    : data;

  if (!filteredData.length) {
    sumArea.classList.add('hidden');
    return;
  }
  sumArea.classList.remove('hidden');

  const rows = buildSummaryRows(filteredData);
  const titleText = selectedMonth
    ? `${formatMonthLabel(selectedMonth)}の集計`
    : '全期間の集計';

  const sections = rows.sections.map(sec => summarySection(sec.title, sec.items.map(
    it => summaryItem(it.label, it.value, it.wide)
  ).concat(sec.extra || []))).join('');

  const warnings = rows.警告
    .map(w => `<div class="summary-warning">⚠ ${escapeForSummary(w)}</div>`)
    .join('');

  sumArea.innerHTML = `<div class="summary-head">${titleText}</div>` +
                      summaryToolbar() + sections + warnings;
}

// 警告文は calc.js が組み立てた固定文＋日付のみだが、
// innerHTML に載せるため念のためエスケープする
function escapeForSummary(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// サマリーの表示内容を組み立てる。クリップボードコピーからも使う
function buildSummaryRows(filteredData) {
  const totalWorkHours = filteredData.reduce((sum, d) => {
    const w = calcWorkMinutes(d);
    return sum + (w !== null ? w / 60 : 0);
  }, 0);

  const h = v => `${v.toFixed(2)} h`;
  const d = v => `${v}日`;

  if (currentMode === 'bp') {
    return {
      sections: [{
        title: '時間集計',
        items: [{ label: '総作業時間', value: h(totalWorkHours) }],
        extra: [roundDiffItem()],
      }],
      警告: [],
    };
  }

  // 週の区切りが月に依存するため、月を選んでいないときは総作業時間のみ表示する
  if (!selectedMonth) {
    return {
      sections: [{
        title: '時間集計',
        items: [{ label: '総作業時間', value: h(totalWorkHours) }],
        extra: [roundDiffItem()],
      }],
      警告: [],
    };
  }

  const s = calcMonthlySummary(filteredData, selectedMonth);

  const timeItems = [
    { label: '実総作業時間',   value: h(s.実総作業時間) },
    { label: '法定時間外労働', value: h(s.法定時間外労働時間) },
    s.法定休日労働時間   && { label: '法定休日労働',         value: h(s.法定休日労働時間) },
    s.深夜労働時間       && { label: '深夜労働',             value: h(s.深夜労働時間) },
    s.不就労控除時間     && { label: '不就労控除',           value: h(s.不就労控除時間) },
    s.所定外労働割増なし && { label: '所定外労働(割増なし)', value: h(s.所定外労働割増なし) },
    s.所定外労働割増あり && { label: '所定外労働(割増あり)', value: h(s.所定外労働割増あり) },
  ].filter(Boolean);

  const dayItems = [
    { label: '労働日数', value: d(s.労働日数) },
    { label: '有休日数', value: d(s.有休日数) },
    s.計画年休日数     && { label: 'うち計画年休',   value: d(s.計画年休日数) },
    s.法定休日出勤日数 && { label: '法定休日出勤',   value: d(s.法定休日出勤日数) },
    s.振替休日取得日数 && { label: '振替休日取得',   value: d(s.振替休日取得日数) },
    s.代休取得日数     && { label: '代休取得',       value: d(s.代休取得日数) },
    s.欠勤回数         && { label: '欠勤回数',       value: `${s.欠勤回数}回` },
    s.生理休暇日数     && { label: '生理休暇',       value: d(s.生理休暇日数) },
    s.遅刻回数         && { label: '遅刻回数',       value: `${s.遅刻回数}回` },
    s.早退回数         && { label: '早退回数',       value: `${s.早退回数}回` },
    s.休業日数         && { label: '休業日数',       value: d(s.休業日数) },
    s.休業研修日数     && { label: '休業(研修)日数', value: d(s.休業研修日数) },
    s.休職期間.length  && { label: '休職期間',       value: s.休職期間.join(', ') },
    s.入社日           && { label: '入社日',         value: `${s.入社日}日` },
    s.退社日           && { label: '退社日',         value: `${s.退社日}日` },
  ].filter(Boolean);

  return {
    sections: [
      { title: '時間集計', items: timeItems, extra: [roundDiffItem()] },
      { title: '日数集計', items: dayItems },
    ],
    警告: s.警告,
  };
}

// Excelの集計欄と突き合わせやすいよう、ラベルと値をタブ区切りでコピーする
async function copySummary() {
  const filteredData = selectedMonth
    ? data.filter(d => d.日付 && d.日付.startsWith(selectedMonth))
    : data;
  if (!filteredData.length) { showToast('コピーする集計がありません', 'warning'); return; }

  const rows = buildSummaryRows(filteredData);
  const lines = [selectedMonth ? formatMonthLabel(selectedMonth) : '全期間'];
  rows.sections.forEach(sec => {
    lines.push('', `[${sec.title}]`);
    sec.items.forEach(it => lines.push(`${it.label}\t${it.value}`));
  });
  if (rows.警告.length) {
    lines.push('', '[警告]');
    rows.警告.forEach(w => lines.push(w));
  }

  const ok = await copyTextToClipboard(lines.join('\n'));
  showToast(ok ? '集計をクリップボードにコピーしました' : 'クリップボードにコピーできませんでした',
    ok ? 'success' : 'error');
}

// ============================================================
// バックアップの案内
// ============================================================
function updateBackupNotice() {
  const notice = document.getElementById('backup-notice');
  if (!notice) return;

  const textEl = document.getElementById('backup-notice-text');
  const today  = getTodayJST();

  if (data.length === 0) { notice.classList.add('hidden'); return; }

  const snoozeUntil = readString(BACKUP_SNOOZE_KEY);
  if (snoozeUntil && today < snoozeUntil) { notice.classList.add('hidden'); return; }

  const lastExport = readString(LAST_EXPORT_KEY);
  if (lastExport) {
    const limit = parseDate(lastExport);
    if (limit) {
      limit.setDate(limit.getDate() + BACKUP_REMIND_DAYS);
      if (today < toDateString(limit)) { notice.classList.add('hidden'); return; }
    }
  }

  if (textEl) {
    textEl.textContent = lastExport
      ? `最後にJSON出力したのは ${formatDateLabel(lastExport)} です。データはこのブラウザにしか保存されていないため、バックアップを取ることをおすすめします。`
      : 'データはこのブラウザにしか保存されていません。ブラウザのデータを消すと失われるため、JSON出力でバックアップを取ることをおすすめします。';
  }
  notice.classList.remove('hidden');
}

// 案内を一定期間出さないようにする
function snoozeBackupNotice() {
  const until = jstNow();
  until.setDate(until.getDate() + BACKUP_REMIND_DAYS);
  writeString(BACKUP_SNOOZE_KEY, toDateString(until));
  updateBackupNotice();
}
