// ============================================================
// 初期化処理
// ============================================================
import { MODE_KEY } from './constants.js';
import { setCurrentMode, setSelectedMonth, setSelectedEventMonth } from './state.js';
import { load, loadEventData } from './storage.js';
import { render } from './render.js';
import { renderEventTable, setEventModeUI, renderEventCalendar } from './events.js';
import { updateCheckinUI } from './checkin.js';
import { initInputForm, initEditModalListeners, controlTime, controlBreakDisplay, updateSubstituteVisibility } from './forms.js';
import { initTabs } from './ui.js';
import './data.js';
import './events.js';
import './checkin.js';
import './json.js';
import './copy.js';
import './clipboard.js';

export function init() {
  const saved = localStorage.getItem(MODE_KEY);
  if (saved) setCurrentMode(saved);
  
  // loadEventData()を先に呼ぶ
  loadEventData();
  
  // switchMode()内でload()とrender()が呼ばれる
  switchMode(saved || 'employee');
  
  // 初期化処理
  initTabs(); initInputForm(); initEditModalListeners();
  controlTime(); controlBreakDisplay(); updateSubstituteVisibility();
  updateCheckinUI();
  
  // 月フィルタを初期化（イベントリスナー設定含む）
  initMonthFilters();
  
  // イベントモードを設定（カレンダー初期化含む）
  setEventModeUI('single');
  
  // 最終的な描画
  renderEventTable();
}

function switchMode(mode) {
  setCurrentMode(mode);
  localStorage.setItem(MODE_KEY, mode);
  load(); render();

  document.getElementById('mode-employee').classList.toggle('active', mode === 'employee');
  document.getElementById('mode-bp').classList.toggle('active', mode === 'bp');

  const empEls  = document.querySelectorAll('.mode-employee-only');
  const bpEls   = document.querySelectorAll('.mode-bp-only');
  empEls.forEach(el => el.classList.toggle('hidden', mode !== 'employee'));
  bpEls.forEach(el  => el.classList.toggle('hidden', mode !== 'bp'));

  controlTime(); controlBreakDisplay(); updateSubstituteVisibility();
  controlTime('edit'); controlBreakDisplay('edit'); updateSubstituteVisibility('edit');
}

window.switchMode = switchMode;

// ============================================================
// 月選択フィルタ初期化
// ============================================================
function initMonthFilters() {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  // データ一覧の月選択初期化
  const dataMonthFilter = document.getElementById('data-month-filter');
  if (dataMonthFilter) {
    populateMonthOptions(dataMonthFilter);
    dataMonthFilter.value = currentMonth;
    setSelectedMonth(currentMonth);
    // イベントリスナー追加
    dataMonthFilter.addEventListener('change', filterDataByMonth);
  } else {
    console.error('data-month-filter 要素が見つかりません');
  }
  
  // イベント一覧の月選択初期化
  const eventMonthFilter = document.getElementById('event-month-filter');
  if (eventMonthFilter) {
    populateMonthOptions(eventMonthFilter);
    eventMonthFilter.value = currentMonth;
    setSelectedEventMonth(currentMonth);
    // イベントリスナー追加
    eventMonthFilter.addEventListener('change', filterEventsByMonth);
  } else {
    console.error('event-month-filter 要素が見つかりません');
  }
}

function populateMonthOptions(selectElement) {
  const now = new Date();
  const currentYear = now.getFullYear();
  
  // 「全期間」オプションの有無を確認
  const hasAllOption = selectElement.querySelector('option[value=""]') !== null;
  
  // 既存オプションをクリア
  selectElement.innerHTML = '';
  
  // 「全期間」オプションを再追加
  if (hasAllOption) {
    const allOption = document.createElement('option');
    allOption.value = '';
    allOption.textContent = '全期間';
    selectElement.appendChild(allOption);
  }
  
  // 過去1年分と未来1年分の月を生成
  for (let yearOffset = -1; yearOffset <= 1; yearOffset++) {
    const year = currentYear + yearOffset;
    for (let month = 1; month <= 12; month++) {
      const value = `${year}-${String(month).padStart(2, '0')}`;
      const option = document.createElement('option');
      option.value = value;
      option.textContent = `${year}年${month}月`;
      selectElement.appendChild(option);
    }
  }
}

function filterDataByMonth() {
  const selected = document.getElementById('data-month-filter').value;
  setSelectedMonth(selected);
  render();
}

function filterEventsByMonth() {
  const selected = document.getElementById('event-month-filter').value;
  setSelectedEventMonth(selected);
  renderEventTable();
  renderEventCalendar();
}

// 念のためwindowにも公開（互換性のため）
window.filterDataByMonth = filterDataByMonth;
window.filterEventsByMonth = filterEventsByMonth;
