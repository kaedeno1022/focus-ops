// ============================================================
// イベントデータ管理
// ============================================================
import { eventData, eventMode, editEventIndex, setEventMode, setEditEventIndex } from './state.js';
import { saveEventData } from './storage.js';
import { showToast, showConfirm } from './ui.js';

export function setEventModeUI(mode) {
  setEventMode(mode);
  const isSingle = mode === 'single';
  document.getElementById('event-field-single-date').classList.toggle('hidden', !isSingle);
  document.getElementById('event-field-start-date').classList.toggle('hidden', isSingle);
  document.getElementById('event-field-end-date').classList.toggle('hidden', isSingle);
  document.getElementById('event-field-exclude').classList.toggle('hidden', isSingle);
  const contentField = document.getElementById('event-field-content');
  if (isSingle) {
    contentField.classList.remove('grid-col-span-2');
  } else {
    contentField.classList.add('grid-col-span-2');
  }
  document.getElementById('event-mode-single').style.opacity = isSingle ? '1' : '0.5';
  document.getElementById('event-mode-range').style.opacity  = isSingle ? '0.5' : '1';
}

export function addEvent() {
  const content = document.getElementById('event-content').value.trim();
  if (!content) { showToast('内容は必須です', 'warning'); return; }

  let startDate = '', endDate = '', excludeDates = '';
  if (eventMode === 'single') {
    const singleDate = document.getElementById('event-single-date').value;
    if (!singleDate) { showToast('日付を入力してください', 'warning'); return; }
    startDate = singleDate;
    endDate   = singleDate;
  } else {
    startDate    = document.getElementById('event-start-date').value;
    endDate      = document.getElementById('event-end-date').value;
    excludeDates = document.getElementById('event-exclude-dates').value.trim();
    if (startDate && endDate && startDate > endDate) {
      showToast('開始日が終了日より後になっています', 'warning'); return;
    }
  }

  if (eventData.some(ev =>
    (ev.startDate || ev.date || '') === startDate &&
    (ev.endDate   || ev.date || '') === endDate   &&
    ev.content === content
  )) {
    showToast('同じ内容のイベントが既に存在します', 'warning'); return;
  }
  const ev = { content };
  if (startDate)    ev.startDate    = startDate;
  if (endDate)      ev.endDate      = endDate;
  if (excludeDates) ev.excludeDates = excludeDates;
  eventData.push(ev);
  eventData.sort((a, b) => (a.startDate || a.date || '').localeCompare(b.startDate || b.date || ''));
  saveEventData(); renderEventTable(); clearEventForm();
  showToast('イベントを追加しました', 'success');
}

export function deleteEvent(i) {
  eventData.splice(i, 1); saveEventData(); renderEventTable();
  showToast('削除しました', 'success');
}

export function clearEventForm() {
  document.getElementById('event-single-date').value   = '';
  document.getElementById('event-start-date').value    = '';
  document.getElementById('event-end-date').value      = '';
  document.getElementById('event-content').value       = '';
  document.getElementById('event-exclude-dates').value = '';
}

export function renderEventTable() {
  const tbody = document.getElementById('event-tbody');
  tbody.innerHTML = '';
  const frag = document.createDocumentFragment();
  eventData.forEach((ev, i) => {
    const tr    = document.createElement('tr');
    const start = ev.startDate || ev.date || '';
    const end   = ev.endDate   || ev.date || '';
    [start, end, ev.excludeDates || '', ev.content].forEach((text, ci) => {
      const td = document.createElement('td');
      td.textContent = text;
      if (ci === 2 && text) {
        td.style.whiteSpace = 'normal';
        td.style.maxWidth   = '160px';
        td.style.fontSize   = '.82em';
        td.style.color      = 'var(--text-muted)';
      }
      tr.appendChild(td);
    });
    const tdOp = document.createElement('td');
    tdOp.className = 'td-ops';
    const editBtn = document.createElement('button');
    editBtn.textContent = '✏ 編集';
    editBtn.className = 'btn-secondary btn-sm';
    editBtn.addEventListener('click', () => openEditEventModal(i));
    const btn  = document.createElement('button');
    btn.textContent = '🗑 削除'; btn.className = 'btn-danger btn-sm';
    btn.addEventListener('click', () => deleteEvent(i));
    tdOp.appendChild(editBtn);
    tdOp.appendChild(btn);
    tr.appendChild(tdOp);
    frag.appendChild(tr);
  });
  tbody.appendChild(frag);
}

export function openEditEventModal(i) {
  setEditEventIndex(i);
  const ev = eventData[i];
  const start = ev.startDate || ev.date || '';
  const end   = ev.endDate   || ev.date || '';
  document.getElementById('event-edit-single-date').value = (start === end) ? start : '';
  document.getElementById('event-edit-start-date').value  = (start !== end) ? start : '';
  document.getElementById('event-edit-end-date').value    = (start !== end) ? end   : '';
  document.getElementById('event-edit-content').value     = ev.content || '';
  document.getElementById('event-edit-exclude-dates').value = ev.excludeDates || '';
  if (start === end) {
    switchEditEventMode('single');
    document.getElementById('event-edit-single-date').value = start;
  } else {
    switchEditEventMode('range');
    document.getElementById('event-edit-start-date').value = start;
    document.getElementById('event-edit-end-date').value = end;
  }
  document.getElementById('overlay').classList.remove('hidden');
  document.getElementById('eventEditModal').classList.remove('hidden');
  document.getElementById('editModal').classList.add('hidden');
  document.getElementById('copyModal').classList.add('hidden');
}

export function closeEditEventModal() {
  document.getElementById('eventEditModal').classList.add('hidden');
  setEditEventIndex(null);
  if (
    document.getElementById('editModal').classList.contains('hidden') &&
    document.getElementById('copyModal').classList.contains('hidden')
  ) {
    document.getElementById('overlay').classList.add('hidden');
  }
}

export function saveEditEvent() {
  if (editEventIndex === null) return;
  const isSingle = !document.getElementById('event-edit-field-single-date').classList.contains('hidden');
  let startDate = '', endDate = '', excludeDates = '';
  if (isSingle) {
    startDate = document.getElementById('event-edit-single-date').value;
    endDate   = startDate;
  } else {
    startDate    = document.getElementById('event-edit-start-date').value;
    endDate      = document.getElementById('event-edit-end-date').value;
    excludeDates = document.getElementById('event-edit-exclude-dates').value.trim();
    if (startDate && endDate && startDate > endDate) {
      showToast('開始日が終了日より後になっています', 'warning'); return;
    }
  }
  const content = document.getElementById('event-edit-content').value.trim();
  if (!content) { showToast('内容は必須です', 'warning'); return; }
  if (eventData.some((ev, idx) =>
    idx !== editEventIndex &&
    (ev.startDate || ev.date || '') === startDate &&
    (ev.endDate   || ev.date || '') === endDate &&
    ev.content === content
  )) {
    showToast('同じ内容のイベントが既に存在します', 'warning'); return;
  }
  const ev = { content };
  if (startDate)    ev.startDate    = startDate;
  if (endDate)      ev.endDate      = endDate;
  if (excludeDates) ev.excludeDates = excludeDates;
  eventData[editEventIndex] = ev;
  eventData.sort((a, b) => (a.startDate || a.date || '').localeCompare(b.startDate || b.date || ''));
  saveEventData(); renderEventTable();
  closeEditEventModal();
  showToast('イベントを更新しました', 'success');
}

export async function clearAllEvents() {
  if (!await showConfirm('全イベントデータを削除しますか？\nこの操作は取り消せません。', { title: '全削除', danger: true })) return;
  eventData.length = 0; saveEventData(); renderEventTable();
  showToast('全イベントを削除しました', 'success');
}

export function switchEditEventMode(mode) {
  const singleBtn = document.getElementById('event-edit-mode-single');
  const rangeBtn  = document.getElementById('event-edit-mode-range');
  if (mode === 'single') {
    document.getElementById('event-edit-field-single-date').classList.remove('hidden');
    document.getElementById('event-edit-field-start-date').classList.add('hidden');
    document.getElementById('event-edit-field-end-date').classList.add('hidden');
    document.getElementById('event-edit-field-exclude').classList.add('hidden');
    singleBtn.classList.add('active');
    rangeBtn.classList.remove('active');
    const v = document.getElementById('event-edit-start-date').value || document.getElementById('event-edit-single-date').value;
    document.getElementById('event-edit-single-date').value = v;
    document.getElementById('event-edit-end-date').value = v;
  } else {
    document.getElementById('event-edit-field-single-date').classList.add('hidden');
    document.getElementById('event-edit-field-start-date').classList.remove('hidden');
    document.getElementById('event-edit-field-end-date').classList.remove('hidden');
    document.getElementById('event-edit-field-exclude').classList.remove('hidden');
    singleBtn.classList.remove('active');
    rangeBtn.classList.add('active');
    const v = document.getElementById('event-edit-single-date').value || document.getElementById('event-edit-start-date').value;
    document.getElementById('event-edit-start-date').value = v;
    document.getElementById('event-edit-end-date').value = v;
  }
}

window.setEventMode = setEventModeUI;
window.addEvent = addEvent;
window.clearEventForm = clearEventForm;
window.closeEditEventModal = closeEditEventModal;
window.saveEditEvent = saveEditEvent;
window.clearAllEvents = clearAllEvents;
window.switchEditEventMode = switchEditEventMode;
