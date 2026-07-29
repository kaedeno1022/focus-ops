// ============================================================
// レンダリング（テーブル表示・サマリー）
// ============================================================

function render() {
  const thead = document.getElementById('list-thead-tr');
  const table = thead.closest('table');
  if (currentMode === 'bp') {
    thead.innerHTML = '<th>日付</th><th>曜</th><th>開始</th><th>終了</th><th>内容</th><th>操作</th>';
    if (table) { table.classList.add('mode-bp'); table.classList.remove('mode-employee'); }
  } else {
    thead.innerHTML = '<th>日付</th><th>曜</th><th>実績</th><th>開始</th><th>終了</th><th>18時以降休憩</th><th>遅刻</th><th>振替</th><th>内容</th><th>操作</th>';
    if (table) { table.classList.add('mode-employee'); table.classList.remove('mode-bp'); }
  }

  const tbody = document.getElementById('tbody');
  tbody.innerHTML = '';
  const frag = document.createDocumentFragment();

  const filteredData = selectedMonth
    ? data.filter(d => d.日付 && d.日付.startsWith(selectedMonth))
    : data;

  filteredData.forEach(d => {
    const actualIndex = data.indexOf(d);
    const tr = document.createElement('tr');
    const weekday = WEEKDAYS[new Date(d.日付).getDay()];

    if (currentMode === 'bp') {
      [
        ['日付', d.日付],
        ['曜', weekday],
        ['開始', d.作業開始],
        ['終了', d.作業終了],
        ['内容', d.作業内容],
      ].forEach(([label, text]) => {
        const td = document.createElement('td');
        td.dataset.label = label;
        td.textContent = text || '';
        tr.appendChild(td);
      });
    } else {
      [
        ['日付', d.日付],
        ['曜', weekday],
        ['実績', d.勤務実績],
        ['開始', d.作業開始],
        ['終了', d.作業終了],
        ['18時以降休憩', d['18時以降休憩'] || ''],
        ['遅刻', d.遅刻早退],
        ['振替', d.振替代休対象日],
        ['内容', d.作業内容],
      ].forEach(([label, text]) => {
        const td = document.createElement('td');
        td.dataset.label = label;
        td.textContent = text || '';
        tr.appendChild(td);
      });
    }

    const tdOp = document.createElement('td');
    tdOp.className = 'td-ops';
    const editBtn = document.createElement('button');
    editBtn.textContent = '✏ 編集'; editBtn.className = 'btn-secondary btn-sm';
    editBtn.onclick = () => window.editRow(actualIndex);
    const copyBtn = document.createElement('button');
    copyBtn.textContent = '📅 コピー'; copyBtn.className = 'btn-secondary btn-sm';
    copyBtn.onclick = () => window.openCopy(actualIndex);
    const delBtn = document.createElement('button');
    delBtn.textContent = '🗑 削除'; delBtn.className = 'btn-danger btn-sm';
    delBtn.onclick = () => window.del(actualIndex);
    tdOp.appendChild(editBtn); tdOp.appendChild(copyBtn); tdOp.appendChild(delBtn);
    tr.appendChild(tdOp);
    frag.appendChild(tr);
  });
  tbody.appendChild(frag);
  updateWorkSummary();
}

// サマリー1項目分のHTML。Excelの集計欄と突き合わせられるよう時間は小数2桁で表示する
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
  const roundDiffs = JSON.parse(localStorage.getItem(ROUND_DIFFS_KEY) || '[]');
  const target = selectedMonth
    ? roundDiffs.filter(r => r.date && r.date.startsWith(selectedMonth))
    : roundDiffs;
  const totalMin = target.reduce((s, r) => s + r.diffMinutes, 0);
  return summaryItem('15分調整差分',
    `${formatHoursMinutes(totalMin)} <button class="btn-clear-diffs" onclick="clearRoundDiffs()">クリア</button>`,
    true);
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

  const totalWorkHours = filteredData.reduce((sum, d) => {
    const w = calcWorkMinutes(d);
    return sum + (w !== null ? w / 60 : 0);
  }, 0);

  if (currentMode === 'bp') {
    sumArea.innerHTML = summaryItem('総作業時間', `${totalWorkHours.toFixed(2)} h`);
    return;
  }

  // 週の区切りが月に依存するため、月を選んでいないときは総作業時間のみ表示する
  if (!selectedMonth) {
    sumArea.innerHTML = summarySection('時間集計', [
      summaryItem('総作業時間', `${totalWorkHours.toFixed(2)} h`),
      roundDiffItem(),
    ]);
    return;
  }

  const s = calcMonthlySummary(filteredData, selectedMonth);
  const h = v => `${v.toFixed(2)} h`;
  const d = v => `${v}日`;

  const timeItems = [
    summaryItem('実総作業時間',     h(s.実総作業時間)),
    summaryItem('法定時間外労働',   h(s.法定時間外労働時間)),
    s.法定休日労働時間   ? summaryItem('法定休日労働',     h(s.法定休日労働時間))   : '',
    s.深夜労働時間       ? summaryItem('深夜労働',         h(s.深夜労働時間))       : '',
    s.不就労控除時間     ? summaryItem('不就労控除',       h(s.不就労控除時間))     : '',
    s.所定外労働割増なし ? summaryItem('所定外労働(割増なし)', h(s.所定外労働割増なし)) : '',
    s.所定外労働割増あり ? summaryItem('所定外労働(割増あり)', h(s.所定外労働割増あり)) : '',
    roundDiffItem(),
  ];

  const dayItems = [
    summaryItem('労働日数', d(s.労働日数)),
    summaryItem('有休日数', d(s.有休日数)),
    s.計画年休日数     ? summaryItem('うち計画年休',   d(s.計画年休日数))     : '',
    s.法定休日出勤日数 ? summaryItem('法定休日出勤',   d(s.法定休日出勤日数)) : '',
    s.振替休日取得日数 ? summaryItem('振替休日取得',   d(s.振替休日取得日数)) : '',
    s.代休取得日数     ? summaryItem('代休取得',       d(s.代休取得日数))     : '',
    s.欠勤回数         ? summaryItem('欠勤回数',       `${s.欠勤回数}回`)     : '',
    s.生理休暇日数     ? summaryItem('生理休暇',       d(s.生理休暇日数))     : '',
    s.遅刻回数         ? summaryItem('遅刻回数',       `${s.遅刻回数}回`)     : '',
    s.早退回数         ? summaryItem('早退回数',       `${s.早退回数}回`)     : '',
    s.休業日数         ? summaryItem('休業日数',       d(s.休業日数))         : '',
    s.休業研修日数     ? summaryItem('休業(研修)日数', d(s.休業研修日数))     : '',
    s.休職期間.length  ? summaryItem('休職期間', s.休職期間.join(', '))       : '',
    s.入社日           ? summaryItem('入社日', `${s.入社日}日`)               : '',
    s.退社日           ? summaryItem('退社日', `${s.退社日}日`)               : '',
  ];

  const warnings = s.警告.map(w => `<div class="summary-warning">⚠ ${w}</div>`).join('');

  sumArea.innerHTML = summarySection('時間集計', timeItems) +
                      summarySection('日数集計', dayItems) +
                      warnings;
}

