// 入力チェックのテスト
// 期待値は 2026年度_個人作業確認表_Ver29.xlsm のVBA「関連チェック」「作業時間チェック」に対応する。
//
// 実行: node --test tests/

const test = require('node:test');
const assert = require('node:assert');
const { loadScripts } = require('./helpers/load');

const ctx = loadScripts(['constants.js', 'utils.js', 'calc.js']);
const { validateDailyEntry, calcMonthlySummary } = ctx;

const MONTH = '2026-08';  // 1日=土, 2日=日, 3日=月 … 31日=月

function day(date, overrides = {}) {
  return { 日付: date, 作業開始: '', 作業終了: '', 勤務実績: '', 作業内容: 'test', ...overrides };
}

function work(date, overrides = {}) {
  return day(date, { 作業開始: '09:00', 作業終了: '18:00', ...overrides });
}

// --- 18:00以降休憩 -----------------------------------------------------------

test('18時以降休憩 — 休憩を取り切れる終了時刻なら通る', () => {
  const item = work('2026-08-03', { 作業終了: '19:00', '18時以降休憩': '1.0' });
  assert.strictEqual(validateDailyEntry(item, [item]), '');
});

test('18時以降休憩 — 終了が早くて取り切れない場合は弾く', () => {
  const item = work('2026-08-03', { 作業終了: '18:20', '18時以降休憩': '0.5' });
  assert.match(validateDailyEntry(item, [item]), /18:00以降の休憩は取得できません/);
});

test('18時以降休憩 — 日マタギなら取得できる', () => {
  const item = work('2026-08-03', { 作業開始: '13:00', 作業終了: '02:00', '18時以降休憩': '2.0' });
  assert.strictEqual(validateDailyEntry(item, [item]), '');
});

test('18時以降休憩 — 時刻未入力では選択できない', () => {
  const item = day('2026-08-03', { '18時以降休憩': '0.5' });
  assert.match(validateDailyEntry(item, [item]), /未入力のため/);
});

// --- 半休の時間帯 ------------------------------------------------------------

test('午前半休 — 14:00以降の開始なら通る', () => {
  const item = work('2026-08-03', { 作業開始: '14:00', 勤務実績: '午前半休' });
  assert.strictEqual(validateDailyEntry(item, [item]), '');
});

test('午前半休 — 14:00より前に始業していたら弾く', () => {
  const item = work('2026-08-03', { 作業開始: '13:00', 勤務実績: '午前半休' });
  assert.match(validateDailyEntry(item, [item]), /午前半休は、9:00～14:00/);
});

test('午後半休 — 14:00までの終了なら通る', () => {
  const item = work('2026-08-03', { 作業開始: '09:00', 作業終了: '14:00', 勤務実績: '午後半休' });
  assert.strictEqual(validateDailyEntry(item, [item]), '');
});

test('午後半休 — 14:00を過ぎて終業していたら弾く', () => {
  const item = work('2026-08-03', { 作業開始: '09:00', 作業終了: '15:00', 勤務実績: '午後半休（計画）' });
  assert.match(validateDailyEntry(item, [item]), /午後半休は、14:00～18:00/);
});

// --- 振替出勤日 --------------------------------------------------------------

test('振替出勤日 — 8時間勤務なら通る', () => {
  const item = work('2026-08-01', { 勤務実績: '振替出勤日' });
  assert.strictEqual(validateDailyEntry(item, [item]), '');
});

test('振替出勤日 — 8時間未満は弾く', () => {
  const item = work('2026-08-01', { 作業終了: '17:00', 勤務実績: '振替出勤日' });
  assert.match(validateDailyEntry(item, [item]), /8時間勤務が必要です/);
});

// --- 有休 --------------------------------------------------------------------

test('有休 — 前日が通常勤務なら通る', () => {
  const data = [work('2026-08-03'), day('2026-08-04', { 勤務実績: '有休' })];
  assert.strictEqual(validateDailyEntry(data[1], data), '');
});

test('有休 — 前日の作業が0:00を越えていたら弾く', () => {
  const data = [
    work('2026-08-03', { 作業開始: '13:00', 作業終了: '02:00' }),
    day('2026-08-04', { 勤務実績: '有休' }),
  ];
  assert.match(validateDailyEntry(data[1], data), /前日作業が0:00を超えると/);
});

// --- 振替休日 ----------------------------------------------------------------

test('振替休日 — 対象日が同月の振替出勤日なら通る', () => {
  const data = [
    work('2026-08-01', { 勤務実績: '振替出勤日' }),
    day('2026-08-03', { 勤務実績: '振替休日', 振替代休対象日: '2026-08-01' }),
  ];
  assert.strictEqual(validateDailyEntry(data[1], data), '');
});

test('振替休日 — 対象日が未入力なら弾く', () => {
  const item = day('2026-08-03', { 勤務実績: '振替休日' });
  assert.match(validateDailyEntry(item, [item]), /対象日＞が未入力/);
});

test('振替休日 — 対象日が別の月なら弾く', () => {
  const data = [
    work('2026-07-25', { 勤務実績: '振替出勤日' }),
    day('2026-08-03', { 勤務実績: '振替休日', 振替代休対象日: '2026-07-25' }),
  ];
  assert.match(validateDailyEntry(data[1], data), /同週内/);
});

test('振替休日 — 対象日が振替出勤日でなければ弾く', () => {
  const data = [
    work('2026-08-01', { 勤務実績: '休日出勤' }),
    day('2026-08-03', { 勤務実績: '振替休日', 振替代休対象日: '2026-08-01' }),
  ];
  assert.match(validateDailyEntry(data[1], data), /<振替出勤日>でありません/);
});

test('振替休日 — 対象日が未登録なら弾く', () => {
  const item = day('2026-08-03', { 勤務実績: '振替休日', 振替代休対象日: '2026-08-01' });
  assert.match(validateDailyEntry(item, [item]), /<振替出勤日>でありません/);
});

test('振替休日 — 対象日の重複を弾く', () => {
  const data = [
    work('2026-08-01', { 勤務実績: '振替出勤日' }),
    day('2026-08-03', { 勤務実績: '振替休日', 振替代休対象日: '2026-08-01' }),
    day('2026-08-04', { 勤務実績: '振替休日', 振替代休対象日: '2026-08-01' }),
  ];
  assert.match(validateDailyEntry(data[2], data), /対象日が重複しています/);
});

// --- 代休 --------------------------------------------------------------------

test('代休 — 対象日が8時間以上の休日出勤なら通る', () => {
  const data = [
    work('2026-08-01', { 勤務実績: '休日出勤' }),
    day('2026-08-03', { 勤務実績: '代休', 振替代休対象日: '2026-08-01' }),
  ];
  assert.strictEqual(validateDailyEntry(data[1], data), '');
});

test('代休 — 対象日が休日出勤でなければ弾く', () => {
  const data = [
    work('2026-08-01'),
    day('2026-08-03', { 勤務実績: '代休', 振替代休対象日: '2026-08-01' }),
  ];
  assert.match(validateDailyEntry(data[1], data), /<休日出勤日>でありません/);
});

test('代休 — 対象日の休日出勤が8時間未満なら弾く', () => {
  const data = [
    work('2026-08-01', { 作業終了: '16:00', 勤務実績: '休日出勤' }),
    day('2026-08-03', { 勤務実績: '代休', 振替代休対象日: '2026-08-01' }),
  ];
  assert.match(validateDailyEntry(data[1], data), /作業時間が8時間未満/);
});

test('代休 — 対象日が前月なら内容は検証しない', () => {
  const item = day('2026-08-03', { 勤務実績: '代休', 振替代休対象日: '2026-07-26' });
  assert.strictEqual(validateDailyEntry(item, [item]), '');
});

// --- 月次の警告 --------------------------------------------------------------

test('振替の同週ペア — 同じ週に振替出勤日と振替休日が揃っていれば警告しない', () => {
  const data = [
    work('2026-08-08', { 勤務実績: '振替出勤日' }),   // 土（第2週 2-8）
    day('2026-08-07',  { 勤務実績: '振替休日', 振替代休対象日: '2026-08-08' }),
  ];
  const 振替警告 = calcMonthlySummary(data, MONTH).警告.filter(w => w.includes('振替'));
  assert.deepStrictEqual([...振替警告], []);
});

test('振替の同週ペア — 週をまたいで取得していたら警告する', () => {
  const data = [
    work('2026-08-08', { 勤務実績: '振替出勤日' }),   // 第2週（2-8）
    day('2026-08-10',  { 勤務実績: '振替休日', 振替代休対象日: '2026-08-08' }),  // 第3週（9-15）
  ];
  const 振替警告 = calcMonthlySummary(data, MONTH).警告.filter(w => w.includes('振替'));
  assert.strictEqual(振替警告.length, 2);   // 第2週と第3週の両方で不一致
});

test('入社日 — 複数の日に入力されていたら警告する', () => {
  const data = [
    work('2026-08-03', { 勤務実績: '入社日' }),
    work('2026-08-10', { 勤務実績: '入社日' }),
  ];
  const 警告 = calcMonthlySummary(data, MONTH).警告;
  assert.ok(警告.some(w => w.includes('入社日が複数')));
});

test('入社日 — 入社日より前に勤怠があれば警告する', () => {
  const data = [
    work('2026-08-03'),
    work('2026-08-10', { 勤務実績: '入社日' }),
  ];
  const 警告 = calcMonthlySummary(data, MONTH).警告;
  assert.ok(警告.some(w => w.includes('入社日より前')));
});

test('退社日 — 退社日より後に勤怠があれば警告する', () => {
  const data = [
    work('2026-08-10', { 勤務実績: '退社日' }),
    work('2026-08-17'),
  ];
  const 警告 = calcMonthlySummary(data, MONTH).警告;
  assert.ok(警告.some(w => w.includes('退社日より後')));
});

test('入退社日 — 入社日が退社日以降なら警告する', () => {
  const data = [
    work('2026-08-20', { 勤務実績: '入社日' }),
    work('2026-08-10', { 勤務実績: '退社日' }),
  ];
  const 警告 = calcMonthlySummary(data, MONTH).警告;
  assert.ok(警告.some(w => w.includes('入社日・退社日が不正')));
});
