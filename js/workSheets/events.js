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

function addEvent() {
  const content = document.getElementById('event-content').value.trim();
  if (!content) { showToast('内容は必須です', 'warning'); return; }

  const alwaysShow = document.getElementById('event-no-date').checked;
  takeEventUndoSnapshot();
  eventData.push({ content, alwaysShow, dates: [...selectedDates] });
  sortEventData();
  saveEventData(); renderEventTable(); clearEventForm();
  showToast(
    selectedDates.length === 0 && !alwaysShow
      ? 'イベントを追加しました（日付未選択のため全日程に反映されます）'
      : 'イベントを追加しました',
    'success');
}

async function deleteEvent(i) {
  const ev = eventData[i];
  const content = ev?.content || 'このイベント';
  if (!await showConfirm(`「${content}」を削除しますか？`, { danger: true })) return;
  takeEventUndoSnapshot();
  eventData.splice(i, 1);
  saveEventData(); renderEventTable();
  showToast('削除しました', 'success', 8000, undoAction());
}

function clearEventForm() {
  setSelectedDates([]);
  document.getElementById('event-content').value = '';
  document.getElementById('event-no-date').checked = false;
  updateEventDateLabels('');
  renderEventCalendar();
}

// イベント1件の日付表示・件数表示を組み立てる
function eventDateSummary(ev) {
  const maxDisplay = 3;

  if (ev.alwaysShow) {
    return {
      dateText: '常時表示',
      countText: ev.dates && ev.dates.length > 0 ? `除外: ${ev.dates.length}日` : '除外なし',
      wrap: false,
    };
  }

  if (Array.isArray(ev.dates)) {
    if (ev.dates.length === 0) {
      return { dateText: '全日程', countText: '日付未指定', wrap: false };
    }
    if (ev.dates.length <= maxDisplay) {
      return { dateText: ev.dates.join(', '), countText: `${ev.dates.length}日`, wrap: false };
    }
    return {
      dateText: `${ev.dates.slice(0, maxDisplay).join(', ')}, ...`,
      countText: `${ev.dates.length}日`,
      wrap: true,
    };
  }

  const start = ev.startDate || ev.date || '';
  const end   = ev.endDate   || ev.date || '';
  const dateText = (start && end)
    ? (start === end ? start : `${start} 〜 ${end}`)
    : '';
  return { dateText, countText: '(旧形式)', wrap: false };
}

function renderEventTable() {
  const tbody = document.getElementById('event-tbody');
  tbody.textContent = '';
  const frag = document.createDocumentFragment();

  const filteredEventData = selectedEventMonth
    ? eventData.filter(ev => {
        if (ev.alwaysShow) return true;
        if (Array.isArray(ev.dates)) {
          // 日付未指定は全日程に反映されるため、どの月でも表示する
          return ev.dates.length === 0 || ev.dates.some(d => d.startsWith(selectedEventMonth));
        }
        const start = ev.startDate || ev.date || '';
        const end = ev.endDate || ev.date || '';
        return start.startsWith(selectedEventMonth) || end.startsWith(selectedEventMonth);
      })
    : eventData;

  filteredEventData.forEach(ev => {
    const actualIndex = eventData.indexOf(ev);
    const tr = document.createElement('tr');
    const { dateText, countText, wrap } = eventDateSummary(ev);

    [['日付', dateText], ['件数', countText], ['内容', ev.content]].forEach(([label, text], ci) => {
      const td = document.createElement('td');
      td.dataset.label = label;
      td.textContent = text || '';
      if (ci === 0 && wrap) td.classList.add('td-datelist');
      tr.appendChild(td);
    });

    const tdOp = document.createElement('td');
    tdOp.className = 'td-ops';
    tdOp.dataset.label = '操作';
    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.textContent = '✏ 編集';
    editBtn.className = 'btn-secondary btn-sm';
    editBtn.addEventListener('click', () => openEditEventModal(actualIndex));
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.textContent = '🗑 削除';
    delBtn.className = 'btn-danger btn-sm';
    delBtn.addEventListener('click', () => deleteEvent(actualIndex));
    tdOp.append(editBtn, delBtn);
    tr.appendChild(tdOp);
    frag.appendChild(tr);
  });
  tbody.appendChild(frag);
}

function openEditEventModal(i) {
  setEditEventIndex(i);
  const ev = eventData[i];

  document.getElementById('event-edit-content').value = ev.content || '';
  document.getElementById('event-edit-no-date').checked = !!ev.alwaysShow;

  if (Array.isArray(ev.dates)) {
    setSelectedDates([...ev.dates]);
  } else if (!ev.alwaysShow) {
    // 旧形式（開始日・終了日）はカレンダー選択に載せ替える
    const start = ev.startDate || ev.date || '';
    const end   = ev.endDate   || ev.date || '';
    const dates = [];
    if (start) dates.push(start);
    if (end && end !== start) dates.push(end);
    setSelectedDates(dates);
  } else {
    setSelectedDates([]);
  }

  updateEventDateLabels('edit');

  const primaryEventDate = ev.alwaysShow
    ? ''
    : (Array.isArray(ev.dates) && ev.dates.length > 0 ? ev.dates[0] : (ev.startDate || ev.date || ''));
  if (primaryEventDate) {
    setEditEventCalendarMonth(primaryEventDate.slice(0, 7));
  } else {
    setEditEventCalendarMonth(selectedEventMonth || getCurrentMonthValue());
  }

  renderEditEventCalendar();
  showModal('eventEditModal');
}

function closeEditEventModal() {
  setEditEventIndex(null);
  setSelectedDates([]);
  setEditEventCalendarMonth('');
  document.getElementById('event-edit-no-date').checked = false;
  updateEventDateLabels('edit');
  hideModal('eventEditModal');
}

function saveEditEvent() {
  if (editEventIndex === null) return;
  const content = document.getElementById('event-edit-content').value.trim();
  if (!content) { showToast('内容は必須です', 'warning'); return; }

  const alwaysShow = document.getElementById('event-edit-no-date').checked;
  takeEventUndoSnapshot();
  eventData[editEventIndex] = { content, alwaysShow, dates: [...selectedDates] };
  sortEventData();
  saveEventData(); renderEventTable();
  closeEditEventModal();
  showToast('イベントを更新しました', 'success', 8000, undoAction());
}

async function clearAllEvents() {
  const confirmMsg = selectedEventMonth
    ? `${formatMonthLabel(selectedEventMonth)}のイベントデータを削除しますか？`
    : '全イベントデータを削除しますか？';

  if (!await showConfirm(confirmMsg, { title: '削除確認', danger: true, okLabel: '削除する' })) return;

  takeEventUndoSnapshot();

  if (selectedEventMonth) {
    const beforeCount = eventData.length;
    const kept = eventData.filter(ev => !eventMonths(ev).includes(selectedEventMonth));
    eventData.length = 0;
    eventData.push(...kept);
    const deletedCount = beforeCount - eventData.length;
    saveEventData(); renderEventTable();
    showToast(`${formatMonthLabel(selectedEventMonth)}のイベント ${deletedCount}件を削除しました`,
      'success', 8000, undoAction());
  } else {
    eventData.length = 0;
    saveEventData(); renderEventTable();
    showToast('全イベントを削除しました', 'success', 8000, undoAction());
  }
}
