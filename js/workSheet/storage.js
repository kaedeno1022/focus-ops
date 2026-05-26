// ============================================================
// localStorage管理
// ============================================================
import { STORAGE_KEY, BP_STORAGE_KEY, EVENT_STORAGE_KEY } from './constants.js';
import { data, eventData, currentMode, setData, setEventData } from './state.js';

export function save() {
  const key = currentMode === 'bp' ? BP_STORAGE_KEY : STORAGE_KEY;
  localStorage.setItem(key, JSON.stringify(data));
}

export function load() {
  const key = currentMode === 'bp' ? BP_STORAGE_KEY : STORAGE_KEY;
  const s = localStorage.getItem(key);
  setData(s ? JSON.parse(s) : []);
}

export function sortData() {
  data.sort((a, b) => new Date(a.日付) - new Date(b.日付));
}

export function saveEventData() {
  localStorage.setItem(EVENT_STORAGE_KEY, JSON.stringify(eventData));
}

export function loadEventData() {
  const s = localStorage.getItem(EVENT_STORAGE_KEY);
  if (s) setEventData(JSON.parse(s));
}
