// ============================================================
// localStorage管理
//
// 読み書きは readJSON / writeJSON を経由する。
// 容量超過やプライベートブラウジングで setItem が例外を投げても
// 呼び出し側の処理が止まらないよう、ここで捕まえて false を返す。
// ============================================================

// 退避済みのキー。描画のたびに読む値もあるため、1回のページ表示で何度も退避しないようにする
const quarantinedKeys = new Set();
// 壊れた生データを退避できなかったキー。上書きすると復旧手段がなくなるため書き込みを止める
const unwritableKeys = new Set();

// isValid を満たさない値もパース失敗と同じく壊れたデータとして扱う
function readJSON(key, fallback, errorMsg, isValid = () => true) {
  let raw;
  try {
    raw = localStorage.getItem(key);
  } catch {
    return fallback;
  }
  if (raw === null) return fallback;
  try {
    const parsed = JSON.parse(raw);
    if (isValid(parsed)) return parsed;
  } catch {
    // 下で退避する
  }
  quarantineRaw(key, raw);
  if (errorMsg) showToast(errorMsg, 'error', 8000);
  return fallback;
}

// 読めなかった生データを別キーへ退避する。次の保存で元のキーが上書きされても手で復旧できるようにするため
function quarantineRaw(key, raw) {
  if (quarantinedKeys.has(key)) return;
  quarantinedKeys.add(key);
  const backupKey = `${key}_corrupt_${getTodayJST()}_${nowTimeStr()}`;
  try {
    localStorage.setItem(backupKey, raw);
  } catch {
    unwritableKeys.add(key);
  }
}

function writeJSON(key, value) {
  if (unwritableKeys.has(key)) {
    showToast('保存データが壊れていて退避もできなかったため、上書きを止めています。\n開発者ツールで元データを確認してください。', 'error', 8000);
    return false;
  }
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    showToast('データの保存に失敗しました。\nブラウザの保存容量を確認してください。', 'error', 6000);
    return false;
  }
}

function removeStored(key) {
  if (unwritableKeys.has(key)) return;
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
  setData(readJSON(dataKey(), [], '保存データの読み込みに失敗しました。\n元のデータは別キーに退避しました。', Array.isArray));
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
  setEventData(readJSON(EVENT_STORAGE_KEY, [], 'イベントデータの読み込みに失敗しました。\n元のデータは別キーに退避しました。', Array.isArray));
}

// ---- 15分調整差分 ----
// 社員用とBP用で別キーに保存する（同じキーだと集計が混ざる）
function roundDiffsKey() {
  return currentMode === 'bp' ? BP_ROUND_DIFFS_KEY : ROUND_DIFFS_KEY;
}

function loadRoundDiffs() {
  return readJSON(roundDiffsKey(), [], null, Array.isArray);
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

// ---- 入力漏れの候補から外した日付 ----
function loadMissingDismissed() {
  return readJSON(MISSING_DISMISSED_KEY, [], null, Array.isArray);
}

function saveMissingDismissed(dates) {
  return writeJSON(MISSING_DISMISSED_KEY, dates);
}
