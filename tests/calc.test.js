// 日次勤怠計算のテスト
// 期待値は 2026年度_個人作業確認表_Ver29.xlsm のVBA「作業票集計」の計算手順から算出している。
//
// 実行: node --test tests/

const test = require('node:test');
const assert = require('node:assert');
const { loadScripts } = require('./helpers/load');

const ctx = loadScripts(['constants.js', 'utils.js', 'calc.js']);
const { calcDaily, calcWorkMinutes } = ctx;

// 2026年8月の曜日: 1日=土, 2日=日, 3日=月 …
const 平日 = '2026-08-03';  // 月曜
const 土曜 = '2026-08-01';
const 日曜 = '2026-08-02';

function day(overrides) {
  return { 日付: 平日, 作業開始: '', 作業終了: '', 勤務実績: '', 作業内容: 'test', ...overrides };
}

function closeTo(actual, expected, msg) {
  assert.ok(Math.abs(actual - expected) < 1e-9,
    `${msg || ''} expected ${expected}, got ${actual}`);
}

test('作業時間 — 通常勤務は昼休憩1時間を差し引く', () => {
  const r = calcDaily(day({ 作業開始: '09:00', 作業終了: '18:00' }));
  closeTo(r.昼休憩時間, 1);
  closeTo(r.休憩時間計, 1);
  closeTo(r.作業時間, 8);
});

test('作業時間 — 昼をまたがなくても拘束6時間超なら法定休憩45分を引く', () => {
  const r = calcDaily(day({ 作業開始: '13:00', 作業終了: '20:00' }));
  closeTo(r.昼休憩時間, 0);
  closeTo(r.休憩時間計, 0.75);
  closeTo(r.作業時間, 6.25);
});

test('作業時間 — 拘束6時間以下なら法定休憩は発生しない', () => {
  const r = calcDaily(day({ 作業開始: '13:00', 作業終了: '19:00' }));
  closeTo(r.休憩時間計, 0);
  closeTo(r.作業時間, 6);
});

test('昼休憩 — 12:00ちょうど開始でも昼休憩を差し引く', () => {
  const r = calcDaily(day({ 作業開始: '12:00', 作業終了: '21:00' }));
  closeTo(r.昼休憩時間, 1);
  closeTo(r.作業時間, 8);
});

test('昼休憩 — 13:00ちょうど終了でも昼休憩を差し引く', () => {
  const r = calcDaily(day({ 作業開始: '09:00', 作業終了: '13:00' }));
  closeTo(r.昼休憩時間, 1);
  closeTo(r.作業時間, 3);
});

test('昼休憩 — 12:01開始では昼休憩を差し引かない', () => {
  const r = calcDaily(day({ 作業開始: '12:01', 作業終了: '21:00' }));
  closeTo(r.昼休憩時間, 0);
  closeTo(r.休憩時間計, 1);   // 拘束8時間59分 → 法定休憩60分
  closeTo(r.作業時間, 7.99);  // (539分 - 60分) / 60 = 7.9833… → 7.99
});

test('作業時間 — 小数第3位を切り上げる', () => {
  const r = calcDaily(day({ 作業開始: '09:00', 作業終了: '17:50' }));
  closeTo(r.作業時間, 7.84);  // (530分 - 60分) / 60 = 7.8333… → 7.84
});

test('18時以降休憩 — 昼休憩と合算する', () => {
  const r = calcDaily(day({ 作業開始: '09:00', 作業終了: '20:00', '18時以降休憩': '1.0' }));
  closeTo(r.休憩時間計, 2);
  closeTo(r.作業時間, 9);
  closeTo(r.日法定外時間, 1);
});

test('深夜労働 — 22:00から翌2:00は4時間', () => {
  const r = calcDaily(day({ 日付: '2026-08-07', 作業開始: '22:00', 作業終了: '02:00' }));  // 金曜
  closeTo(r.作業時間, 4);
  closeTo(r.深夜労働時間, 4);
  closeTo(r.法定休日労働時間, 0);
});

test('深夜労働 — 5:00より前に始業した場合は前日22:00起点で判定する', () => {
  const r = calcDaily(day({ 作業開始: '00:00', 作業終了: '05:00' }));
  closeTo(r.作業時間, 5);
  closeTo(r.深夜労働時間, 5);
});

test('深夜労働 — 深夜帯にかからない勤務は0', () => {
  const r = calcDaily(day({ 作業開始: '09:00', 作業終了: '18:00' }));
  closeTo(r.深夜労働時間, 0);
});

test('法定休日労働 — 日曜の休日出勤は全時間が法定休日労働', () => {
  const r = calcDaily(day({ 日付: 日曜, 作業開始: '09:00', 作業終了: '18:00', 勤務実績: '休日出勤' }));
  closeTo(r.作業時間, 8);
  closeTo(r.法定休日労働時間, 8);
  closeTo(r.日法定外時間, 0);
  closeTo(r.日控除時間, 0);
});

test('法定休日労働 — 土曜から日曜への日マタギは0:00で分割する', () => {
  const r = calcDaily(day({ 日付: 土曜, 作業開始: '22:00', 作業終了: '06:00' }));
  closeTo(r.休憩時間計, 0.75);          // 拘束8時間 → 法定休憩45分
  closeTo(r.作業時間, 7.25);
  closeTo(r.法定休日労働時間, 6);       // 0:00〜6:00
  closeTo(r.日法定外時間, 0);           // 土曜分は 2h - 0.75h = 1.25h
  closeTo(r.深夜労働時間, 7);           // 22:00〜翌5:00
});

test('日法定外 — 8時間を超えた分だけ計上する', () => {
  const r = calcDaily(day({ 作業開始: '09:00', 作業終了: '19:00' }));
  closeTo(r.作業時間, 9);
  closeTo(r.日法定外時間, 1);
});

test('所定外労働割増あり — 平日の休日出勤は全時間が割増対象', () => {
  const r = calcDaily(day({ 日付: 土曜, 作業開始: '09:00', 作業終了: '18:00', 勤務実績: '休日出勤' }));
  closeTo(r.作業時間, 8);
  closeTo(r.所定外労働割増あり, 8);
  closeTo(r.日控除時間, 0);
});

test('所定外労働割増なし — 午前半休で4時間を超えた分', () => {
  const r = calcDaily(day({ 作業開始: '13:00', 作業終了: '18:00', 勤務実績: '午前半休' }));
  closeTo(r.作業時間, 5);
  closeTo(r.所定外労働割増なし, 1);
  closeTo(r.日控除時間, 0);
});

test('不就労控除 — 半休は4時間に満たない分', () => {
  const r = calcDaily(day({ 作業開始: '14:00', 作業終了: '17:00', 勤務実績: '午後半休' }));
  closeTo(r.作業時間, 3);
  closeTo(r.日控除時間, 1);
});

test('不就労控除 — 通常勤務は8時間に満たない分', () => {
  const r = calcDaily(day({ 作業開始: '09:00', 作業終了: '17:00' }));
  closeTo(r.作業時間, 7);
  closeTo(r.日控除時間, 1);
});

test('不就労控除 — 代休は時刻未入力でも8時間', () => {
  const r = calcDaily(day({ 勤務実績: '代休', 振替代休対象日: '2026-08-01' }));
  closeTo(r.作業時間, 0);
  closeTo(r.日控除時間, 8);
  assert.strictEqual(r.時刻入力あり, false);
});

test('不就労控除 — 欠勤・生理休暇は8時間', () => {
  closeTo(calcDaily(day({ 勤務実績: '欠勤' })).日控除時間, 8);
  closeTo(calcDaily(day({ 勤務実績: '欠勤（生理休暇）' })).日控除時間, 8);
});

test('不就労控除 — 有休は控除しない', () => {
  closeTo(calcDaily(day({ 勤務実績: '有休' })).日控除時間, 0);
});

test('calcWorkMinutes — 時刻未入力はnull', () => {
  assert.strictEqual(calcWorkMinutes(day({ 勤務実績: '有休' })), null);
});

test('calcWorkMinutes — 作業時間を分で返す', () => {
  closeTo(calcWorkMinutes(day({ 作業開始: '09:00', 作業終了: '18:00' })), 480);
});
