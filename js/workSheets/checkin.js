// ============================================================
// 簡易チェックイン/チェックアウト
// ============================================================

function updateCheckinUI() {
  const info = JSON.parse(localStorage.getItem(CHECKIN_KEY) || 'null');
  const statusEl  = document.getElementById('checkin-status');
  const inTimeEl  = document.getElementById('simple_in_time');
  const outTimeEl = document.getElementById('simple_out_time');

  if (!info || !info.status) {
    if (statusEl)  statusEl.textContent  = '未出社';
    if (inTimeEl)  inTimeEl.textContent  = '';
    if (outTimeEl) outTimeEl.textContent = '';
    return;
  }
  if (statusEl)  statusEl.textContent  = '出社中';
  if (inTimeEl)  inTimeEl.textContent  = `出社: ${info.startTime || '---'}`;
  if (outTimeEl) outTimeEl.textContent = '';
}

async function simpleCheckIn() {
  const info = JSON.parse(localStorage.getItem(CHECKIN_KEY) || 'null');
  if (!info || !info.status) { doCheckIn(); return; }
  await doCheckOut();
}

function doCheckIn() {
  const now   = nowTimeStr();
  const today = getTodayJST();
  let matchedContent = '';
  if (eventData?.length) {
    const matched = eventData.filter(ev => {
      const st  = ev.startDate || ev.date || null;
      const ed  = ev.endDate   || ev.date || null;
      const exc = ev.excludeDates ? ev.excludeDates.split(',').map(s => s.trim()).filter(Boolean) : [];
      if (exc.includes(today)) return false;
      if (st && today < st) return false;
      if (ed && today > ed) return false;
      return true;
    });
    if (matched.length) matchedContent = matched.map(ev => ev.content).join(',');
  }

  localStorage.setItem(CHECKIN_KEY, JSON.stringify({
    status: 'in', startTime: now, date: today, content: matchedContent,
  }));

  const contentEl = document.getElementById('simple_content');
  if (contentEl && matchedContent) contentEl.value = matchedContent.slice(0, 27);

  updateCheckinUI();
  showToast(`出社しました (${now})\n内容: ${matchedContent || '(なし)'}`, 'success', 4000);
}

function showCheckinTimeDialog() {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
      <div class="confirm-dialog">
        <div class="confirm-icon">🏢</div>
        <div class="confirm-title">出社時間を入力</div>
        <div class="confirm-msg">出社履歴がありません。<br>出社時間を入力してください。</div>
        <input type="time" id="_manual_start_time" value="09:00"
          style="display:block;margin:16px auto 8px;padding:8px 12px;font-size:1.1rem;border:1px solid #cbd5e1;border-radius:8px;text-align:center;width:140px;">
        <div class="confirm-btns">
          <button class="confirm-cancel" id="_cfm_no">キャンセル</button>
          <button id="_cfm_yes">退勤する</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const close = result => { overlay.remove(); resolve(result); };
    overlay.querySelector('#_cfm_yes').addEventListener('click', () => {
      const timeVal = overlay.querySelector('#_manual_start_time').value;
      close(timeVal || null);
    });
    overlay.querySelector('#_cfm_no').addEventListener('click', () => close(null));
    overlay.addEventListener('click', e => { if (e.target === overlay) close(null); });
  });
}

async function doCheckOut() {
  let info = JSON.parse(localStorage.getItem(CHECKIN_KEY) || 'null');
  if (!info || !info.status) {
    const manualStartTime = await showCheckinTimeDialog();
    if (!manualStartTime) return;
    const today = getTodayJST();
    info = { startTime: manualStartTime, date: today, content: '' };
  }

  const simpleContentEl = document.getElementById('simple_content');
  const content = simpleContentEl ? simpleContentEl.value.trim() : (info.content || '');
  if (!content) {
    showToast('作業内容を入力してから退勤してください', 'warning', 4000);
    return;
  }

  const now     = nowTimeStr();
  const started = info.startTime || '???';
  const dateStr = info.date || getTodayJST();

  document.getElementById('date').value    = dateStr;
  document.getElementById('start').value   = started;
  document.getElementById('end').value     = now;
  document.getElementById('content').value = content.slice(0, 27);

  localStorage.removeItem(CHECKIN_KEY);
  if (simpleContentEl) simpleContentEl.value = '';
  updateCheckinUI();
  addData();

  const listTabBtn = document.querySelector('.tab-btn[data-tab="list-tab"]');
  if (listTabBtn) {
    listTabBtn.click();
    window.scrollTo({ top: 600, behavior: 'smooth' });
  }
}

async function simpleCheckOut() {
  await doCheckOut();
}

function applyEventsToCheckin() {
  const today = getTodayJST();
  if (!eventData?.length) { showToast('イベントデータがありません', 'info'); return; }
  const matched = eventData.filter(ev => {
    if (ev.alwaysShow) return !ev.dates || !ev.dates.includes(today);
    if (ev.dates) return ev.dates.includes(today);
    const st  = ev.startDate || ev.date || null;
    const ed  = ev.endDate   || ev.date || null;
    const exc = ev.excludeDates ? ev.excludeDates.split(',').map(s => s.trim()).filter(Boolean) : [];
    if (exc.includes(today)) return false;
    if (st && today < st)   return false;
    if (ed && today > ed)   return false;
    return true;
  }).map(ev => ev.content);
  if (!matched.length) { showToast('今日のイベントはありません', 'info'); return; }
  const contentEl = document.getElementById('simple_content');
  if (contentEl) {
    contentEl.value = matched.join(',').slice(0, 27);
    showToast(`イベントを反映しました`, 'success', 2500);
  }
}

