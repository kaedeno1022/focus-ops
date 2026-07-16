// ============================================================
// localStorage管理
// ============================================================

function save() {
  const key = currentMode === 'bp' ? BP_STORAGE_KEY : STORAGE_KEY;
  localStorage.setItem(key, JSON.stringify(data));
}

function load() {
  const key = currentMode === 'bp' ? BP_STORAGE_KEY : STORAGE_KEY;
  const s = localStorage.getItem(key);
  try {
    setData(s ? JSON.parse(s) : []);
  } catch {
    setData([]);
    showToast('保存データの読み込みに失敗しました', 'error');
  }
}

function sortData() {
  data.sort((a, b) => new Date(a.日付) - new Date(b.日付));
}

function saveEventData() {
  localStorage.setItem(EVENT_STORAGE_KEY, JSON.stringify(eventData));
}

function loadEventData() {
  const s = localStorage.getItem(EVENT_STORAGE_KEY);
  if (!s) return;
  try {
    setEventData(JSON.parse(s));
  } catch {
    setEventData([]);
    showToast('イベントデータの読み込みに失敗しました', 'error');
  }
}

