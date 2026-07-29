// 月次集計のテスト
// 期待値は 2026年度_個人作業確認表_Ver29.xlsm のVBA「summary計算」の集計手順から算出している。
//
// 実行: node --test tests/

const test = require('node:test');
const assert = require('node:assert');
const { loadScripts } = require('./helpers/load');

const ctx = loadScripts(['constants.js', 'utils.js', 'calc.js']);
const { calcMonthlySummary, buildWeekRanges } = ctx;

// 2026年8月: 1日=土, 2日=日, 3日=月 … 31日=月
const MONTH = '2026-08';

function day(date, overrides = {}) {
  return { 日付: date, 作業開始: '', 作業終了: '', 勤務実績: '', 作業内容: 'test', ...overrides };
}

// 平日9:00-18:00（作業8時間）を指定日分作る
function weekdays(dates, overrides = {}) {
  return dates.map(date => day(date, { 作業開始: '09:00', 作業終了: '18:00', ...overrides }));
}

function closeTo(actual, expected, msg) {
  assert.ok(Math.abs(actual - expected) < 1e-9,
    `${msg || ''} expected ${expected}, got ${actual}`);
}

// vm 内で生成された配列・オブジェクトは別realm由来のため、
// deepStrictEqual で比較する前にホスト側の値へ変換する
const plain = value => JSON.parse(JSON.stringify(value));

test('週区切り — 月初はその週の土曜まで、以降は日曜〜土曜', () => {
  // 2026年8月1日は土曜なので最初の週は1日だけ
  assert.deepStrictEqual(plain(buildWeekRanges(2026, 8)), [
    { start: 1,  end: 1  }, { start: 2,  end: 8  }, { start: 9,  end: 15 },
    { start: 16, end: 22 }, { start: 23, end: 29 }, { start: 30, end: 31 },
  ]);
});

test('週区切り — 月初が水曜なら最初の週は4日まで', () => {
  // 2026年7月1日は水曜
  assert.deepStrictEqual(plain(buildWeekRanges(2026, 7)), [
    { start: 1,  end: 4  }, { start: 5,  end: 11 }, { start: 12, end: 18 },
    { start: 19, end: 25 }, { start: 26, end: 31 },
  ]);
});

test('法定時間外 — 日8時間超が週40時間超を上回る場合は日単位の合計を採る', () => {
  // 月〜金に9時間ずつ勤務。週45時間・日法定外5時間 → 大きい方の5時間
  const data = weekdays(['2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07'],
    { 作業終了: '19:00' });
  const s = calcMonthlySummary(data, MONTH);
  closeTo(s.実総作業時間, 45);
  closeTo(s.法定時間外労働時間, 5);
  closeTo(s.労働日数, 5);
});

test('法定時間外 — 週40時間ちょうどなら発生しない', () => {
  const data = weekdays(['2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07']);
  const s = calcMonthlySummary(data, MONTH);
  closeTo(s.実総作業時間, 40);
  closeTo(s.法定時間外労働時間, 0);
});

test('法定時間外 — 日曜の休日出勤は週40時間の判定から除く', () => {
  const data = [
    ...weekdays(['2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07']),
    day('2026-08-02', { 作業開始: '09:00', 作業終了: '18:00', 勤務実績: '休日出勤' }),
  ];
  const s = calcMonthlySummary(data, MONTH);
  closeTo(s.実総作業時間, 48);
  closeTo(s.法定時間外労働時間, 0);   // 週計は平日40時間のみ
  closeTo(s.法定休日労働時間, 8);
  assert.strictEqual(s.法定休日出勤日数, 1);
});

test('法定時間外 — 日曜でも休日出勤以外は週40時間の判定に含める', () => {
  const data = [
    ...weekdays(['2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07']),
    day('2026-08-02', { 作業開始: '09:00', 作業終了: '18:00', 勤務実績: '振替出勤日' }),
  ];
  const s = calcMonthlySummary(data, MONTH);
  closeTo(s.実総作業時間, 48);
  closeTo(s.法定時間外労働時間, 8);
  closeTo(s.法定休日労働時間, 0);
});

test('法定時間外 — 週をまたぐと別々に判定する', () => {
  // 第2週(2-8)に45時間、第3週(9-15)に35時間
  const data = [
    ...weekdays(['2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07'],
      { 作業終了: '19:00' }),
    ...weekdays(['2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13']),
  ];
  const s = calcMonthlySummary(data, MONTH);
  closeTo(s.法定時間外労働時間, 5);   // 第3週は32時間で超過なし
});

test('有休日数 — 半休は0.5日として数える', () => {
  const data = [
    day('2026-08-03', { 勤務実績: '有休' }),
    day('2026-08-04', { 作業開始: '13:00', 作業終了: '18:00', 勤務実績: '午前半休' }),
    day('2026-08-05', { 勤務実績: '有休（計画）' }),
  ];
  const s = calcMonthlySummary(data, MONTH);
  closeTo(s.有休日数, 2.5);
  closeTo(s.計画年休日数, 1);
});

test('労働日数 — 実際に働いた日数を数え、半休は0.5日で計上する', () => {
  const data = [
    ...weekdays(['2026-08-03', '2026-08-04']),
    day('2026-08-05', { 作業開始: '13:00', 作業終了: '18:00', 勤務実績: '午前半休' }),
    day('2026-08-06', { 勤務実績: '有休' }),
  ];
  const s = calcMonthlySummary(data, MONTH);
  closeTo(s.労働日数, 2.5);
});

test('不就労控除 — 代休と欠勤は1日8時間を控除する', () => {
  const data = [
    day('2026-08-03', { 勤務実績: '代休', 振替代休対象日: '2026-08-01' }),
    day('2026-08-04', { 勤務実績: '欠勤' }),
  ];
  const s = calcMonthlySummary(data, MONTH);
  closeTo(s.不就労控除時間, 16);
  assert.strictEqual(s.代休取得日数, 1);
  assert.strictEqual(s.欠勤回数, 1);
});

test('遅刻早退 — 遅刻/早退は両方に計上する', () => {
  const data = [
    ...weekdays(['2026-08-03'], { 遅刻早退: '遅刻' }),
    ...weekdays(['2026-08-04'], { 遅刻早退: '遅刻/早退' }),
  ];
  const s = calcMonthlySummary(data, MONTH);
  assert.strictEqual(s.遅刻回数, 2);
  assert.strictEqual(s.早退回数, 1);
});

test('深夜労働 — 月内で合算する', () => {
  const data = [
    day('2026-08-03', { 作業開始: '22:00', 作業終了: '02:00' }),
    day('2026-08-04', { 作業開始: '22:00', 作業終了: '01:00' }),
  ];
  const s = calcMonthlySummary(data, MONTH);
  closeTo(s.深夜労働時間, 7);
});

test('休職期間 — 連続した休職日をまとめる', () => {
  const data = [
    day('2026-08-03', { 勤務実績: '休職' }),
    day('2026-08-04', { 勤務実績: '休職' }),
    day('2026-08-05', { 勤務実績: '休職' }),
  ];
  const s = calcMonthlySummary(data, MONTH);
  assert.deepStrictEqual(plain(s.休職期間), ['3-5']);
  assert.strictEqual(s.休職日数, 3);
});

test('入社日・退社日 — 勤務実績から日を拾う', () => {
  const data = [
    day('2026-08-03', { 作業開始: '09:00', 作業終了: '18:00', 勤務実績: '入社日' }),
    day('2026-08-28', { 作業開始: '09:00', 作業終了: '18:00', 勤務実績: '退社日' }),
  ];
  const s = calcMonthlySummary(data, MONTH);
  assert.strictEqual(s.入社日, '3');
  assert.strictEqual(s.退社日, '28');
});

test('4週4休 — 休日が4日以上あれば警告しない', () => {
  const data = weekdays(['2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07']);
  assert.deepStrictEqual(plain(calcMonthlySummary(data, MONTH).警告), []);
});

test('4週4休 — 休日が4日未満なら警告する', () => {
  const dates = Array.from({ length: 31 },
    (_, i) => `2026-08-${String(i + 1).padStart(2, '0')}`);
  const s = calcMonthlySummary(weekdays(dates), MONTH);
  assert.strictEqual(s.警告.length, 1);
  assert.match(s.警告[0], /4週4日/);
});

test('対象月以外のデータは集計に含めない', () => {
  const data = [
    ...weekdays(['2026-08-03']),
    ...weekdays(['2026-07-03']),
  ];
  closeTo(calcMonthlySummary(data, MONTH).実総作業時間, 8);
});
