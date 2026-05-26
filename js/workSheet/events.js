// ============================================================
// イベントデータ管理
// ============================================================
import { eventData, eventMode, editEventIndex, selectedDates, selectedEventMonth, setEventMode, setEditEventIndex, setSelectedDates, toggleSelectedDate } from './state.js';
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
    contentField.classList.add('grid-col-span-3');
  } else {
    contentField.classList.remove('grid-col-span-3');
    contentField.classList.add('grid-col-span-2');
  }
  document.getElementById('event-mode-single').style.opacity = isSingle ? '1' : '0.5';
  document.getElementById('event-mode-range').style.opacity  = isSingle ? '0.5' : '1';
  
  if (isSingle) {
    // DOMの準備ができてから実行
    setTimeout(() => renderEventCalendar(), 0);
  }
}

export function addEvent() {
  const content = document.getElementById('event-content').value.trim();
  if (!content) { showToast('内容は必須です', 'warning'); return; }

  let startDate = '', endDate = '', excludeDates = '', dates = [];
  if (eventMode === 'single') {
    // 複数日選択モード
    if (selectedDates.length === 0) {
      showToast('日付を選択してください', 'warning'); return;
    }
    dates = [...selectedDates];
  } else {
    // 期間指定モード
    startDate    = document.getElementById('event-start-date').value;
    endDate      = document.getElementById('event-end-date').value;
    excludeDates = document.getElementById('event-exclude-dates').value.trim();
    if (startDate && endDate && startDate > endDate) {
      showToast('開始日が終了日より後になっています', 'warning'); return;
    }
  }

  const ev = { content };
  if (dates.length > 0) {
    ev.dates = dates;
  } else {
    if (startDate) ev.startDate = startDate;
    if (endDate) ev.endDate = endDate;
    if (excludeDates) ev.excludeDates = excludeDates;
  }
  
  eventData.push(ev);
  eventData.sort((a, b) => {
    const aDate = a.dates ? a.dates[0] : (a.startDate || a.date || '');
    const bDate = b.dates ? b.dates[0] : (b.startDate || b.date || '');
    return aDate.localeCompare(bDate);
  });
  saveEventData(); renderEventTable(); clearEventForm();
  showToast('イベントを追加しました', 'success');
}

export function deleteEvent(i) {
  eventData.splice(i, 1); saveEventData(); renderEventTable();
  showToast('削除しました', 'success');
}

export function clearEventForm() {
  setSelectedDates([]);
  document.getElementById('event-start-date').value    = '';
  document.getElementById('event-end-date').value      = '';
  document.getElementById('event-content').value       = '';
  document.getElementById('event-exclude-dates').value = '';
  renderEventCalendar();
}

export function renderEventTable() {
  const tbody = document.getElementById('event-tbody');
  tbody.innerHTML = '';
  const frag = document.createDocumentFragment();
  
  // 月フィルタリング
  const filterMonth = selectedEventMonth;
  const filteredEvents = filterMonth 
    ? eventData.filter(ev => {
        if (ev.dates) {
          return ev.dates.some(d => d.startsWith(filterMonth));
        } else {
          const start = ev.startDate || ev.date || '';
          const end = ev.endDate || ev.date || '';
          return start.startsWith(filterMonth) || end.startsWith(filterMonth) || 
                 (start && end && start <= filterMonth + '-31' && end >= filterMonth + '-01');
        }
      })
    : eventData;
  
  filteredEvents.forEach((ev, i) => {
    const actualIndex = eventData.indexOf(ev);
    const tr = document.createElement('tr');
    
    if (ev.dates) {
      // 複数日選択の場合
      const datesStr = ev.dates.join(', ');
      [datesStr, '', '', ev.content].forEach((text, ci) => {
        const td = document.createElement('td');
        td.textContent = text;
        if (ci === 0) {
          td.style.whiteSpace = 'normal';
          td.style.fontSize = '.85em';
          td.colSpan = 3;
        }
        if (ci === 0 || ci === 3) tr.appendChild(td);
      });
    } else {
      // 期間指定の場合
      const start = ev.startDate || ev.date || '';
      const end = ev.endDate || ev.date || '';
      [start, end, ev.excludeDates || '', ev.content].forEach((text, ci) => {
        const td = document.createElement('td');
        td.textContent = text;
        if (ci === 2 && text) {
          td.style.whiteSpace = 'normal';
          td.style.maxWidth = '160px';
          td.style.fontSize = '.82em';
          td.style.color = 'var(--text-muted)';
        }
        tr.appendChild(td);
      });
    }
    
    const tdOp = document.createElement('td');
    tdOp.className = 'td-ops';
    const editBtn = document.createElement('button');
    editBtn.textContent = '✏ 編集';
    editBtn.className = 'btn-secondary btn-sm';
    editBtn.addEventListener('click', () => openEditEventModal(actualIndex));
    const btn = document.createElement('button');
    btn.textContent = '🗑 削除';
    btn.className = 'btn-danger btn-sm';
    btn.addEventListener('click', () => deleteEvent(actualIndex));
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
  
  // 複数日選択の場合は編集不可のメッセージを表示
  if (ev.dates && Array.isArray(ev.dates)) {
    showToast('複数日選択イベントの編集は未対応です。削除して再作成してください。', 'warning', 4000);
    return;
  }
  
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

// ============================================================
// カレンダーUI
// ============================================================
export function renderEventCalendar() {
  const monthInput = document.getElementById('event-calendar-month');
  const calendarDiv = document.getElementById('event-calendar');
  
  if (!monthInput || !calendarDiv) {
    console.warn('カレンダー要素が見つかりません');
    return;
  }
  
  if (!monthInput.value) {
    const now = new Date();
    monthInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
  
  const [year, month] = monthInput.value.split('-').map(Number);
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay();
  
  calendarDiv.innerHTML = '';
  
  // 曜日ヘッダー
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  weekdays.forEach(wd => {
    const dayHeader = document.createElement('div');
    dayHeader.className = 'calendar-day-header';
    dayHeader.textContent = wd;
    calendarDiv.appendChild(dayHeader);
  });
  
  // 空白セル
  for (let i = 0; i < startDayOfWeek; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'calendar-day empty';
    calendarDiv.appendChild(emptyCell);
  }
  
  // 日付セル
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayCell = document.createElement('div');
    dayCell.className = 'calendar-day';
    dayCell.textContent = day;
    
    if (selectedDates.includes(dateStr)) {
      dayCell.classList.add('selected');
    }
    
    dayCell.addEventListener('click', () => {
      toggleEventDate(dateStr);
    });
    
    calendarDiv.appendChild(dayCell);
  }
  
  updateSelectedDatesDisplay();
}

export function toggleEventDate(dateStr) {
  toggleSelectedDate(dateStr);
  renderEventCalendar();
}

export function updateSelectedDatesDisplay() {
  const display = document.getElementById('selected-dates-display');
  if (!display) return;
  
  if (selectedDates.length === 0) {
    display.textContent = 'なし';
  } else {
    display.textContent = `${selectedDates.length}日選択: ${selectedDates.join(', ')}`;
  }
}

window.renderEventCalendar = renderEventCalendar;
window.toggleEventDate = toggleEventDate;
