// ============================================================
// localStorage管理
//
// 読み書きは readJSON / writeJSON を経由する。
// 容量超過やプライベートブラウジングで setItem が例外を投げても
// 呼び出し側の処理が止まらないよう、ここで捕まえて false を返す。
// ============================================================

function readJSON(key, fallback, errorMsg) {
  let raw;
  try {
    raw = localStorage.getItem(key);
  } catch {
    return fallback;
  }
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    if (errorMsg) showToast(errorMsg, 'error');
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    showToast('データの保存に失敗しました。\nブラウザの保存容量を確認してください。', 'error', 6000);
    return false;
  }
}

function removeStored(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // 削除できなくても処理は続行する
  }
}

// JSONではない素の文字列を扱うキー（モード・日付など）
function readString(key, fallback = '') {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeString(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

// ---- 勤務データ ----
function dataKey() {
  return currentMode === 'bp' ? BP_STORAGE_KEY : STORAGE_KEY;
}

function save() {
  return writeJSON(dataKey(), data);
}

function load() {
  const loaded = readJSON(dataKey(), [], '保存データの読み込みに失敗しました');
  setData(Array.isArray(loaded) ? loaded : []);
}

function sortData() {
  // 'YYYY-MM-DD' は辞書順が日付順と一致するため文字列比較で並べる
  data.sort((a, b) => String(a.日付 || '').localeCompare(String(b.日付 || '')));
}

// ---- イベントデータ ----
function saveEventData() {
  return writeJSON(EVENT_STORAGE_KEY, eventData);
}

function loadEventData() {
  const loaded = readJSON(EVENT_STORAGE_KEY, [], 'イベントデータの読み込みに失敗しました');
  setEventData(Array.isArray(loaded) ? loaded : []);
}

// ---- 15分調整差分 ----
// 社員用とBP用で別キーに保存する（同じキーだと集計が混ざる）
function roundDiffsKey() {
  return currentMode === 'bp' ? BP_ROUND_DIFFS_KEY : ROUND_DIFFS_KEY;
}

function loadRoundDiffs() {
  const loaded = readJSON(roundDiffsKey(), []);
  return Array.isArray(loaded) ? loaded : [];
}

function saveRoundDiffs(diffs) {
  return writeJSON(roundDiffsKey(), diffs);
}

// ---- 休暇残日数の基準値（有休・プロジェクト休暇） ----
function loadLeaveBaselines() {
  return readJSON(LEAVE_BASELINE_KEY, {});
}

function saveLeaveBaselines(baselines) {
  return writeJSON(LEAVE_BASELINE_KEY, baselines);
}
