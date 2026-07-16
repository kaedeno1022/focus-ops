// ============================================================
// イベントデータ管理
// ============================================================

function sortEventData() {
  eventData.sort((a, b) => {
    if (a.alwaysShow && !b.alwaysShow) return -1;
    if (!a.alwaysShow && b.alwaysShow) return 1;
    const aDate = (a.dates && a.dates.length > 0) ? a.dates[0] : (a.startDate || a.date || '');
    const bDate = (b.dates && b.dates.length > 0) ? b.dates[0] : (b.startDate || b.date || '');
    if (!aDate && !bDate) return 0;
    if (!aDate) return 1;
    if (!bDate) return -1;
    return aDate.localeCompare(bDate);
  });
}

function setEventModeUI() {
  setTimeout(() => renderEventCalendar(), 0);
}

function addEvent() {
  const content = document.getElementById('event-content').value.trim();
  if (!content) { showToast('内容は必須です', 'warning'); return; }

  const alwaysShow = document.getElementById('event-no-date').checked;
  const ev = { content, alwaysShow, dates: [...selectedDates] };
  eventData.push(ev);
  sortEventData();
  saveEventData(); renderEventTable(); clearEventForm();
  showToast('イベントを追加しました', 'success');
}

async function deleteEvent(i) {
  const ev = eventData[i];
  const content = ev?.content || 'このイベント';
  if (!await showConfirm(`「${content}」を削除しますか？`)) return;
  eventData.splice(i, 1); saveEventData(); renderEventTable();
  showToast('削除しました', 'success');
}

function clearEventForm() {
  setSelectedDates([]);
  document.getElementById('event-content').value = '';
  document.getElementById('event-no-date').checked = false;
  document.getElementById('event-calendar-label').innerHTML = '日付選択 <span class="label-note">（カレンダーから複数日をクリック選択）</span>';
  document.getElementById('selected-dates-label').textContent = '選択中の日付:';
  renderEventCalendar();
}

function renderEventTable() {
  const tbody = document.getElementById('event-tbody');
  tbody.innerHTML = '';
  const frag = document.createDocumentFragment();

  const filteredEventData = selectedEventMonth
    ? eventData.filter(ev => {
        if (ev.alwaysShow) return true;
        if (ev.dates) {
          return ev.dates.some(d => d.startsWith(selectedEventMonth));
        }
        const start = ev.startDate || ev.date || '';
        const end = ev.endDate || ev.date || '';
        return start.startsWith(selectedEventMonth) || end.startsWith(selectedEventMonth);
      })
    : eventData;

  filteredEventData.forEach(ev => {
    const actualIndex = eventData.indexOf(ev);
    const tr = document.createElement('tr');

    const maxDisplay = 3;
    let dateDisplay = '';
    let countDisplay = '';

    if (ev.alwaysShow) {
      dateDisplay = '常時表示';
      countDisplay = ev.dates && ev.dates.length > 0 ? `除外: ${ev.dates.length}日` : '除外なし';
    } else if (ev.dates && Array.isArray(ev.dates)) {
      if (ev.dates.length === 0) {
        dateDisplay = '-'; countDisplay = '-';
      } else if (ev.dates.length <= maxDisplay) {
        dateDisplay = ev.dates.join(', ');
        countDisplay = `${ev.dates.length}日`;
      } else {
        dateDisplay = `${ev.dates.slice(0, maxDisplay).join(', ')}, ...`;
        countDisplay = `${ev.dates.length}日`;
      }
    } else {
      const start = ev.startDate || ev.date || '';
      const end   = ev.endDate   || ev.date || '';
      if (start && end) {
        dateDisplay = start === end ? start : `${start} 〜 ${end}`;
      }
      countDisplay = '(旧形式)';
    }

    [dateDisplay, countDisplay, ev.content].forEach((text, ci) => {
      const td = document.createElement('td');
      td.textContent = text || '';
      if (ci === 0 && ev.dates && ev.dates.length > maxDisplay) {
        td.style.whiteSpace = 'normal';
        td.style.maxWidth = '200px';
        td.style.fontSize = '.9em';
      }
      tr.appendChild(td);
    });

    const tdOp = document.createElement('td');
    tdOp.className = 'td-ops';
    const editBtn = document.createElement('button');
    editBtn.textContent = '✏ 編集'; editBtn.className = 'btn-secondary btn-sm';
    editBtn.addEventListener('click', () => openEditEventModal(actualIndex));
    const btn = document.createElement('button');
    btn.textContent = '🗑 削除'; btn.className = 'btn-danger btn-sm';
    btn.addEventListener('click', () => deleteEvent(actualIndex));
    tdOp.appendChild(editBtn); tdOp.appendChild(btn);
    tr.appendChild(tdOp);
    frag.appendChild(tr);
  });
  tbody.appendChild(frag);
}

function openEditEventModal(i) {
  setEditEventIndex(i);
  const ev = eventData[i];

  setSelectedDates([]);
  document.getElementById('event-edit-content').value = ev.content || '';

  if (ev.alwaysShow) {
    document.getElementById('event-edit-no-date').checked = true;
    document.getElementById('event-edit-calendar-label').innerHTML = '除外日選択 <span class="label-note">（除外する日付をクリック選択）</span>';
    document.getElementById('event-edit-selected-dates-label').textContent = '除外中の日付:';
    if (ev.dates && Array.isArray(ev.dates)) setSelectedDates([...ev.dates]);
  } else if (ev.dates && Array.isArray(ev.dates)) {
    document.getElementById('event-edit-no-date').checked = false;
    document.getElementById('event-edit-calendar-label').innerHTML = '日付選択 <span class="label-note">（カレンダーから複数日をクリック選択）</span>';
    document.getElementById('event-edit-selected-dates-label').textContent = '選択中の日付:';
    setSelectedDates([...ev.dates]);
  } else {
    document.getElementById('event-edit-no-date').checked = false;
    document.getElementById('event-edit-calendar-label').innerHTML = '日付選択 <span class="label-note">（カレンダーから複数日をクリック選択）</span>';
    document.getElementById('event-edit-selected-dates-label').textContent = '選択中の日付:';
    const start = ev.startDate || ev.date || '';
    const end   = ev.endDate   || ev.date || '';
    if (start && end) {
      const dates = [start];
      if (start !== end) dates.push(end);
      setSelectedDates(dates);
    }
  }

  const primaryEventDate = ev.alwaysShow
    ? ''
    : (Array.isArray(ev.dates) && ev.dates.length > 0 ? ev.dates[0] : (ev.startDate || ev.date || ''));
  if (primaryEventDate) {
    setEditEventCalendarMonth(primaryEventDate.slice(0, 7));
  } else if (selectedEventMonth) {
    setEditEventCalendarMonth(selectedEventMonth);
  } else {
    const now = new Date();
    setEditEventCalendarMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  }

  setTimeout(() => renderEditEventCalendar(), 0);
  document.getElementById('overlay').classList.remove('hidden');
  document.getElementById('eventEditModal').classList.remove('hidden');
  document.getElementById('editModal').classList.add('hidden');
  document.getElementById('copyModal').classList.add('hidden');
}

function closeEditEventModal() {
  document.getElementById('eventEditModal').classList.add('hidden');
  setEditEventIndex(null);
  setSelectedDates([]);
  setEditEventCalendarMonth('');
  document.getElementById('event-edit-no-date').checked = false;
  document.getElementById('event-edit-calendar-label').innerHTML = '日付選択 <span class="label-note">（カレンダーから複数日をクリック選択）</span>';
  document.getElementById('event-edit-selected-dates-label').textContent = '選択中の日付:';
  if (
    document.getElementById('editModal').classList.contains('hidden') &&
    document.getElementById('copyModal').classList.contains('hidden')
  ) {
    document.getElementById('overlay').classList.add('hidden');
  }
}

function saveEditEvent() {
  if (editEventIndex === null) return;
  const content = document.getElementById('event-edit-content').value.trim();
  if (!content) { showToast('内容は必須です', 'warning'); return; }

  const alwaysShow = document.getElementById('event-edit-no-date').checked;
  const ev = { content, alwaysShow, dates: [...selectedDates] };
  eventData[editEventIndex] = ev;
  sortEventData();
  saveEventData(); renderEventTable();
  closeEditEventModal();
  showToast('イベントを更新しました', 'success');
}

async function clearAllEvents() {
  const confirmMsg = selectedEventMonth
    ? `${selectedEventMonth}月のイベントデータを削除しますか？\nこの操作は取り消せません。`
    : '全イベントデータを削除しますか？\nこの操作は取り消せません。';

  if (!await showConfirm(confirmMsg, { title: '削除確認', danger: true })) return;

  if (selectedEventMonth) {
    const beforeCount = eventData.length;
    eventData.splice(0, eventData.length, ...eventData.filter(ev => {
      if (ev.dates) {
        return !ev.dates.some(d => d.startsWith(selectedEventMonth));
      } else {
        const start = ev.startDate || ev.date || '';
        const end   = ev.endDate   || ev.date || '';
        const matchesMonth = start.startsWith(selectedEventMonth) || end.startsWith(selectedEventMonth) ||
               (start && end && start <= selectedEventMonth + '-31' && end >= selectedEventMonth + '-01');
        return !matchesMonth;
      }
    }));
    const deletedCount = beforeCount - eventData.length;
    saveEventData(); renderEventTable();
    showToast(`${selectedEventMonth}月のイベント ${deletedCount}件を削除しました`, 'success');
  } else {
    eventData.length = 0;
    saveEventData(); renderEventTable();
    showToast('全イベントを削除しました', 'success');
  }
}

