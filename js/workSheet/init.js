// ============================================================
// 初期化処理
// ============================================================
import { MODE_KEY } from './constants.js';
import { setCurrentMode } from './state.js';
import { load, loadEventData } from './storage.js';
import { render } from './render.js';
import { renderEventTable, setEventModeUI } from './events.js';
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
  switchMode(saved || 'employee');
  loadEventData(); renderEventTable();
  load(); render();
  initTabs(); initInputForm(); initEditModalListeners();
  controlTime(); controlBreakDisplay(); updateSubstituteVisibility();
  updateCheckinUI();
  setEventModeUI('single');
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
