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

function getTodayEventContents() {
  const today = getTodayJST();
  if (!eventData?.length) return [];
  return eventData.filter(ev => {
    if (ev.alwaysShow) return !ev.dates || !ev.dates.includes(today);
    if (ev.dates) return ev.dates.includes(today);
    const st  = ev.startDate || ev.date || null;
    const ed  = ev.endDate   || ev.date || null;
    const exc = ev.excludeDates ? ev.excludeDates.split(',').map(s => s.trim()).filter(Boolean) : [];
    if (exc.includes(today)) return false;
    if (st && today < st) return false;
    if (ed && today > ed) return false;
    return true;
  }).map(ev => ev.content);
}

async function simpleCheckIn() {
  const info = JSON.parse(localStorage.getItem(CHECKIN_KEY) || 'null');
  if (!info || !info.status) { doCheckIn(); return; }
  await doCheckOut();
}

function doCheckIn() {
  const now   = nowTimeStr();
  const today = getTodayJST();

  localStorage.setItem(CHECKIN_KEY, JSON.stringify({
    status: 'in', startTime: now, date: today,
  }));

  updateCheckinUI();
  showToast(`出社しました (${now})`, 'success', 4000);
}

function showCheckinTimeDialog() {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    const existingContentEl = document.getElementById('simple_content');
    const existingContent = existingContentEl ? existingContentEl.value.trim() : '';
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
      <div class="confirm-dialog">
        <div class="confirm-icon">🏢</div>
        <div class="confirm-title">出社時間を入力</div>
        <div class="confirm-msg">出社履歴がありません。<br>出社時間と作業内容を入力してください。</div>
        <input type="time" id="_manual_start_time" value="09:00"
          style="display:block;margin:16px auto 8px;padding:8px 12px;font-size:1.1rem;border:1px solid #cbd5e1;border-radius:8px;text-align:center;width:140px;">
        <div style="display:flex;align-items:center;gap:8px;justify-content:center;margin:8px auto 14px;max-width:320px;">
          <input type="text" id="_manual_content" maxlength="27" placeholder="作業内容（最大27文字）" value="${existingContent.replace(/"/g, '&quot;')}"
            style="display:block;padding:8px 12px;font-size:1rem;border:1px solid #cbd5e1;border-radius:8px;flex:1;min-width:0;">
          <button type="button" id="_manual_event_btn" class="btn-secondary btn-sm" title="今日のイベントを内容に反映">📅</button>
        </div>
        <div class="confirm-btns">
          <button class="confirm-cancel" id="_cfm_no">キャンセル</button>
          <button id="_cfm_yes">退勤する</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const manualContentEl = overlay.querySelector('#_manual_content');
    overlay.querySelector('#_manual_event_btn').addEventListener('click', () => {
      const matched = getTodayEventContents();
      if (!matched.length) {
        showToast('今日のイベントはありません', 'info');
        return;
      }
      manualContentEl.value = matched.join(',').slice(0, 27);
      showToast('イベントを反映しました', 'success', 2500);
    });
    const close = result => { overlay.remove(); resolve(result); };
    overlay.querySelector('#_cfm_yes').addEventListener('click', () => {
      const timeVal = overlay.querySelector('#_manual_start_time').value;
      const contentVal = manualContentEl.value.trim();
      if (!contentVal) {
        showToast('作業内容を入力してください', 'warning', 2500);
        return;
      }
      close({ startTime: timeVal || null, content: contentVal });
    });
    overlay.querySelector('#_cfm_no').addEventListener('click', () => close(null));
    overlay.addEventListener('click', e => { if (e.target === overlay) close(null); });
  });
}

async function doCheckOut() {
  let info = JSON.parse(localStorage.getItem(CHECKIN_KEY) || 'null');
  let manualContent = '';
  if (!info || !info.status) {
    const manualInput = await showCheckinTimeDialog();
    if (!manualInput || !manualInput.startTime) return;
    const today = getTodayJST();
    manualContent = manualInput.content || '';
    info = { startTime: manualInput.startTime, date: today, content: manualContent };
  }

  const simpleContentEl = document.getElementById('simple_content');
  const content = manualContent || (simpleContentEl ? simpleContentEl.value.trim() : (info.content || ''));
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
  const matched = getTodayEventContents();
  if (!matched.length) { showToast('今日のイベントはありません', 'info'); return; }
  const contentEl = document.getElementById('simple_content');
  if (contentEl) {
    contentEl.value = matched.join(',').slice(0, 27);
    showToast(`イベントを反映しました`, 'success', 2500);
  }
}

