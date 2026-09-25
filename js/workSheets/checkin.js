// ============================================================
// 簡易チェックイン/チェックアウト
// ============================================================

function getCheckinInfo() {
  const info = readJSON(CHECKIN_KEY, null);
  return info && info.status ? info : null;
}

function updateCheckinUI() {
  const info      = getCheckinInfo();
  const statusEl  = document.getElementById('checkin-status');
  const inTimeEl  = document.getElementById('simple_in_time');
  const outTimeEl = document.getElementById('simple_out_time');
  const warnEl    = document.getElementById('checkin-warning');
  const cancelBtn = document.getElementById('checkin-cancel-btn');
  const editBtn   = document.getElementById('checkin-edit-btn');

  if (!info) {
    if (statusEl) {
      statusEl.textContent = '未出社';
      statusEl.classList.remove('in');
    }
    if (inTimeEl)  inTimeEl.textContent  = '';
    if (outTimeEl) outTimeEl.textContent = '';
    if (warnEl)    warnEl.classList.add('hidden');
    if (cancelBtn) cancelBtn.classList.add('hidden');
    if (editBtn)   editBtn.classList.add('hidden');
    return;
  }

  if (statusEl) {
    statusEl.textContent = '出社中';
    statusEl.classList.add('in');
  }
  if (inTimeEl)  inTimeEl.textContent  = `出社: ${info.startTime || '---'}`;
  if (outTimeEl) outTimeEl.textContent = '';
  if (cancelBtn) cancelBtn.classList.remove('hidden');
  if (editBtn)   editBtn.classList.remove('hidden');

  // 日付が変わっているのに出社中のままなら、退勤の記録漏れとして知らせる
  if (warnEl) {
    if (info.date && info.date !== getTodayJST()) {
      warnEl.textContent =
        `⚠ ${formatDateLabel(info.date)} の出社（${info.startTime || '---'}）が退勤されていません。` +
        '退勤ボタンを押すと、その日の勤務として登録できます。';
      warnEl.classList.remove('hidden');
    } else {
      warnEl.classList.add('hidden');
    }
  }
}

// 出社中に書いた作業内容がリロードやタブを閉じても消えないよう、入力のたびに保存する
function initCheckinDraft() {
  const contentEl = document.getElementById('simple_content');
  if (!contentEl) return;
  contentEl.value = readString(CHECKIN_DRAFT_KEY);
  contentEl.addEventListener('input', saveCheckinDraft);
}

function saveCheckinDraft() {
  const contentEl = document.getElementById('simple_content');
  if (contentEl) writeString(CHECKIN_DRAFT_KEY, contentEl.value);
}

function getTodayEventContents() {
  const today = getTodayJST();
  if (!eventData?.length) return [];
  return eventData.filter(ev => matchesEventDate(ev, today)).map(ev => ev.content);
}

async function simpleCheckIn() {
  if (!getCheckinInfo()) { doCheckIn(); return; }
  await doCheckOut();
}

function doCheckIn() {
  const now   = nowTimeStr();
  const today = getTodayJST();

  if (!writeJSON(CHECKIN_KEY, { status: 'in', startTime: now, date: today })) return;

  updateCheckinUI();
  showToast(`出社しました (${now})`, 'success', 4000);
}

async function cancelCheckIn() {
  const info = getCheckinInfo();
  if (!info) { showToast('出社記録がありません', 'info'); return; }
  if (!await showConfirm(
    `出社記録（${formatDateLabel(info.date)} ${info.startTime || '---'}）を取り消しますか？`,
    { danger: true, okLabel: '取り消す' })) return;
  removeStored(CHECKIN_KEY);
  updateCheckinUI();
  showToast('出社記録を取り消しました', 'success');
}

// 出社ボタンを押し遅れたときに、取り消さずに出社時刻だけを直す
async function editCheckInTime() {
  const info = getCheckinInfo();
  if (!info) { showToast('出社記録がありません', 'info'); return; }
  const result = await showStartTimeEditDialog(info);
  if (!result) return;
  // ダイアログ表示中に別タブで退勤・取り消しされていれば、出社状態を復活させない
  const latest = getCheckinInfo();
  if (!latest) { updateCheckinUI(); showToast('出社記録がなくなっているため修正しませんでした', 'warning'); return; }
  if (!writeJSON(CHECKIN_KEY, { ...latest, startTime: result.startTime })) return;
  updateCheckinUI();
  showToast(`出社時刻を ${result.startTime} に修正しました`, 'success');
}

// ============================================================
// ダイアログ
// ============================================================

// ダイアログの外枠を作る。中身は呼び出し側が body に足す
function buildDialogShell({ icon, title, message }) {
  const overlay = document.createElement('div');
  overlay.className = 'confirm-overlay';

  const dialog = document.createElement('div');
  dialog.className = 'confirm-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');

  const iconEl = document.createElement('div');
  iconEl.className = 'confirm-icon';
  iconEl.textContent = icon;

  const titleEl = document.createElement('div');
  titleEl.className = 'confirm-title';
  titleEl.textContent = title;

  const msgEl = document.createElement('div');
  msgEl.className = 'confirm-msg';
  setMultilineText(msgEl, message);

  const body = document.createElement('div');
  body.className = 'dialog-body';

  dialog.append(iconEl, titleEl, msgEl, body);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  return { overlay, dialog, body };
}

// ダイアログの閉じる処理・キー操作・ボタン配置をまとめる
function wireDialog(overlay, dialog, resolve) {
  const previouslyFocused = document.activeElement;

  const onKeyDown = e => {
    if (e.key === 'Escape') { e.preventDefault(); close(null); }
    else trapTabKey(e, dialog);
  };

  function close(result) {
    document.removeEventListener('keydown', onKeyDown, true);
    overlay.remove();
    if (previouslyFocused && typeof previouslyFocused.focus === 'function') previouslyFocused.focus();
    resolve(result);
  }

  document.addEventListener('keydown', onKeyDown, true);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(null); });

  function addButtons(okLabel, onOk) {
    const btns = document.createElement('div');
    btns.className = 'confirm-btns';
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'confirm-cancel';
    cancelBtn.textContent = 'キャンセル';
    cancelBtn.addEventListener('click', () => close(null));
    const okBtn = document.createElement('button');
    okBtn.type = 'button';
    okBtn.textContent = okLabel;
    okBtn.addEventListener('click', onOk);
    btns.append(cancelBtn, okBtn);
    dialog.appendChild(btns);
  }

  return { close, addButtons };
}

// 出社記録がないまま退勤したときに、出社時刻と作業内容を入力させる
function showCheckinTimeDialog() {
  return new Promise(resolve => {
    const existingContentEl = document.getElementById('simple_content');
    const existingContent = existingContentEl ? existingContentEl.value.trim() : '';

    const { overlay, dialog, body } = buildDialogShell({
      icon: '🏢',
      title: '出社時間を入力',
      message: '出社履歴がありません。\n出社時間と作業内容を入力してください。',
    });

    const timeInput = document.createElement('input');
    timeInput.type = 'time';
    timeInput.className = 'dialog-time-input';
    timeInput.value = '09:00';

    const contentRow = document.createElement('div');
    contentRow.className = 'dialog-content-row';
    const contentInput = document.createElement('input');
    contentInput.type = 'text';
    contentInput.maxLength = CONTENT_MAX_LENGTH;
    contentInput.placeholder = `作業内容（最大${CONTENT_MAX_LENGTH}文字）`;
    contentInput.value = existingContent;
    const eventBtn = document.createElement('button');
    eventBtn.type = 'button';
    eventBtn.className = 'btn-secondary btn-sm';
    eventBtn.title = '今日のイベントを内容に反映';
    eventBtn.textContent = '📅';
    contentRow.append(contentInput, eventBtn);

    body.append(timeInput, contentRow);

    const { close, addButtons } = wireDialog(overlay, dialog, resolve);

    eventBtn.addEventListener('click', () => {
      const matched = getTodayEventContents();
      if (!matched.length) { showToast('今日のイベントはありません', 'info'); return; }
      contentInput.value = matched.join(',').slice(0, CONTENT_MAX_LENGTH);
      showToast('イベントを反映しました', 'success', 2500);
    });

    addButtons('退勤する', () => {
      const contentVal = contentInput.value.trim();
      if (!contentVal) { showToast('作業内容を入力してください', 'warning', 2500); return; }
      close({ startTime: timeInput.value || null, content: contentVal });
    });

    timeInput.focus();
  });
}

// 前日以前の出社が残っているときに、その日の退勤時刻を確認する
function showEndTimeDialog(info) {
  return new Promise(resolve => {
    const { overlay, dialog, body } = buildDialogShell({
      icon: '⚠️',
      title: '未退勤の記録があります',
      message: `${formatDateLabel(info.date)} の出社（${info.startTime || '---'}）が退勤されていません。\n` +
               'この日の退勤時刻を入力してください。',
    });

    const timeInput = document.createElement('input');
    timeInput.type = 'time';
    timeInput.className = 'dialog-time-input';
    timeInput.value = '18:00';
    body.appendChild(timeInput);

    const { close, addButtons } = wireDialog(overlay, dialog, resolve);
    addButtons('この日で登録', () => {
      if (!timeInput.value) { showToast('退勤時刻を入力してください', 'warning', 2500); return; }
      close({ endTime: timeInput.value });
    });

    timeInput.focus();
  });
}

function showStartTimeEditDialog(info) {
  return new Promise(resolve => {
    const { overlay, dialog, body } = buildDialogShell({
      icon: '🕘',
      title: '出社時刻を修正',
      message: `${formatDateLabel(info.date)} の出社時刻を入力してください。`,
    });

    const timeInput = document.createElement('input');
    timeInput.type = 'time';
    timeInput.className = 'dialog-time-input';
    timeInput.value = info.startTime || '09:00';
    body.appendChild(timeInput);

    const { close, addButtons } = wireDialog(overlay, dialog, resolve);
    addButtons('修正する', () => {
      if (!timeInput.value) { showToast('出社時刻を入力してください', 'warning', 2500); return; }
      if (info.date === getTodayJST() && timeInput.value > nowTimeStr()) {
        showToast('現在時刻より後の時刻は指定できません', 'warning', 2500);
        return;
      }
      close({ startTime: timeInput.value });
    });

    timeInput.focus();
  });
}

// 残業した日・定時から外れた日だけ、18時以降休憩と遅刻/早退を退勤前に選ばせる。
// 退勤は勤務時間だけで登録されるため、ここで聞かないと休憩なしで時間外労働が過大に集計される。
// breakOptions は入力フォームの選択肢（updateBreakOptions で勤務時間から作ったもの）をそのまま使う
function askCheckoutExtras(startTime, endTime, breakOptions) {
  const offSchedule = startTime > WORK_START_TIME ||
    (!isTimeReversed(startTime, endTime) && endTime < '18:00');
  if (breakOptions.length === 0 && !offSchedule) return Promise.resolve({ break: '', late: '' });

  return new Promise(resolve => {
    const { overlay, dialog, body } = buildDialogShell({
      icon: '🏠',
      title: '退勤の確認',
      message: `${startTime} 〜 ${endTime} で登録します。\n該当するものがあれば選んでください。`,
    });

    const buildSelectRow = (labelText, values) => {
      const row = document.createElement('label');
      row.className = 'dialog-select-row';
      const select = document.createElement('select');
      ['', ...values].forEach(v => {
        const opt = document.createElement('option');
        opt.value = v;
        opt.textContent = v || 'なし';
        select.appendChild(opt);
      });
      row.append(labelText, select);
      body.appendChild(row);
      return select;
    };

    const breakSel = breakOptions.length ? buildSelectRow('18時以降休憩', breakOptions) : null;
    const lateSel  = offSchedule ? buildSelectRow('遅刻 / 早退', ['遅刻', '早退', '遅刻/早退']) : null;

    const { close, addButtons } = wireDialog(overlay, dialog, resolve);
    addButtons('退勤する', () => close({
      break: breakSel ? breakSel.value : '',
      late:  lateSel ? lateSel.value : '',
    }));

    (breakSel || lateSel).focus();
  });
}

// ============================================================
// 退勤処理
// ============================================================
async function doCheckOut() {
  let info = getCheckinInfo();
  let manualContent = '';
  let endTime = nowTimeStr();

  if (!info) {
    const manualInput = await showCheckinTimeDialog();
    if (!manualInput || !manualInput.startTime) return;
    manualContent = manualInput.content || '';
    info = { startTime: manualInput.startTime, date: getTodayJST(), content: manualContent };
  } else if (info.date && info.date !== getTodayJST()) {
    // 打刻し忘れた日の記録なので、退勤時刻は現在時刻ではなく入力させる
    const result = await showEndTimeDialog(info);
    if (!result) return;
    endTime = result.endTime;
  }

  const simpleContentEl = document.getElementById('simple_content');
  const content = manualContent || (simpleContentEl ? simpleContentEl.value.trim() : (info.content || ''));
  if (!content) {
    showToast('作業内容を入力してから退勤してください', 'warning', 4000);
    return;
  }

  const dateStr = info.date || getTodayJST();
  document.getElementById('date').value    = dateStr;
  document.getElementById('start').value   = info.startTime || '';
  document.getElementById('end').value     = endTime;
  document.getElementById('content').value = content.slice(0, CONTENT_MAX_LENGTH);
  document.getElementById('weekday').textContent = getWeekdayLabel(dateStr);
  controlBreakDisplay();
  updateContentCounters();

  if (currentMode !== 'bp') {
    // 休憩欄が非表示のときは選択肢が作り直されず前回の内容が残っているため使わない
    const breakSel = document.getElementById('break');
    const breakOptions = breakSel.closest('.form-item').classList.contains('hidden')
      ? []
      : [...breakSel.options].map(o => o.value).filter(Boolean);
    const extras = await askCheckoutExtras(info.startTime || WORK_START_TIME, endTime, breakOptions);
    if (!extras) return;
    document.getElementById('break').value = extras.break;
    document.getElementById('late').value  = extras.late;
  }

  // 登録が通ってから出社状態を消す。
  // 先に消すと、入力チェックで弾かれたときに出社時刻を失う
  const registered = await addData({ undoable: false });
  if (!registered) {
    showToast('登録できなかったため出社状態を維持しています。\n作業表入力タブで内容を修正してください。',
      'warning', 6000);
    activateTab('input-tab');
    return;
  }

  removeStored(CHECKIN_KEY);
  removeStored(CHECKIN_DRAFT_KEY);
  if (simpleContentEl) simpleContentEl.value = '';
  updateContentCounters();
  updateCheckinUI();

  activateTab('list-tab');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function simpleCheckOut() {
  await doCheckOut();
}

function applyEventsToCheckin() {
  const matched = getTodayEventContents();
  if (!matched.length) { showToast('今日のイベントはありません', 'info'); return; }
  const contentEl = document.getElementById('simple_content');
  if (!contentEl) return;

  const joined = matched.join(',');
  contentEl.value = joined.slice(0, CONTENT_MAX_LENGTH);
  saveCheckinDraft();
  updateContentCounters();
  const truncated = joined.length > CONTENT_MAX_LENGTH;
  showToast(
    truncated
      ? `イベントを反映しましたが、${CONTENT_MAX_LENGTH}文字を超えたため切り詰めました`
      : 'イベントを反映しました',
    truncated ? 'warning' : 'success', 2500);
}
