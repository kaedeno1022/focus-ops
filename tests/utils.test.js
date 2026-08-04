// ユーティリティ関数のテスト
// 日付・時刻の扱いは日本時間（JST）に統一されていることを含めて検証する。
//
// 実行: node --test tests/*.test.js

const test = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { loadScripts } = require('./helpers/load');

const ctx = loadScripts(['constants.js', 'utils.js']);
const {
  parseDate, toDateString, getWeekday, getWeekdayLabel,
  formatMonthLabel, formatDateLabel, formatHoursMinutes,
  timeToMinutes, minutesToTime, roundToQuarter, isTimeReversed,
  matchesEventDate, getDatedEventsForDay,
} = ctx;

// ============================================================
// 日付
// ============================================================
test('parseDate — YYYY-MM-DD を暦日として解釈する', () => {
  const d = parseDate('2026-08-03');
  assert.strictEqual(d.getFullYear(), 2026);
  assert.strictEqual(d.getMonth(), 7);
  assert.strictEqual(d.getDate(), 3);
});

test('parseDate — 空文字や不正な値は null', () => {
  assert.strictEqual(parseDate(''), null);
  assert.strictEqual(parseDate(undefined), null);
  assert.strictEqual(parseDate('2026-08'), null);
});

test('toDateString — Date を YYYY-MM-DD に戻す', () => {
  assert.strictEqual(toDateString(new Date(2026, 0, 5)), '2026-01-05');
  assert.strictEqual(toDateString(new Date(2026, 11, 31)), '2026-12-31');
});

test('getWeekday — 2026年8月1日は土曜', () => {
  assert.strictEqual(getWeekday('2026-08-01'), '土');
  assert.strictEqual(getWeekday('2026-08-02'), '日');
  assert.strictEqual(getWeekday('2026-08-03'), '月');
});

test('getWeekday — 日付がなければ空文字', () => {
  assert.strictEqual(getWeekday(''), '');
  assert.strictEqual(getWeekdayLabel(''), '');
  assert.strictEqual(getWeekdayLabel('2026-08-01'), '(土)');
});

test('formatMonthLabel — YYYY-MM を和暦表記に整形する', () => {
  assert.strictEqual(formatMonthLabel('2026-07'), '2026年7月');
  assert.strictEqual(formatMonthLabel('2026-12'), '2026年12月');
  assert.strictEqual(formatMonthLabel(''), '');
});

test('formatDateLabel — 曜日付きの表記にする', () => {
  assert.strictEqual(formatDateLabel('2026-08-01'), '8月1日(土)');
  assert.strictEqual(formatDateLabel(''), '');
});

// ============================================================
// 時刻
// ============================================================
test('timeToMinutes / minutesToTime — 相互に変換できる', () => {
  assert.strictEqual(timeToMinutes('09:30'), 570);
  assert.strictEqual(timeToMinutes(''), 0);
  assert.strictEqual(minutesToTime(570), '09:30');
  assert.strictEqual(minutesToTime(0), '00:00');
});

test('roundToQuarter — 15分単位に丸める', () => {
  assert.strictEqual(roundToQuarter('09:07'), '09:00');
  assert.strictEqual(roundToQuarter('09:08'), '09:15');
  assert.strictEqual(roundToQuarter('09:07', 'up'), '09:15');
  assert.strictEqual(roundToQuarter('09:08', 'down'), '09:00');
  assert.strictEqual(roundToQuarter(''), '');
});

test('isTimeReversed — 開始 >= 終了 を日マタギとみなす', () => {
  assert.strictEqual(isTimeReversed('22:00', '05:00'), true);
  assert.strictEqual(isTimeReversed('09:00', '09:00'), true);
  assert.strictEqual(isTimeReversed('09:00', '18:00'), false);
  assert.strictEqual(isTimeReversed('', '18:00'), false);
});

test('formatHoursMinutes — 時間と分の表記にする', () => {
  assert.strictEqual(formatHoursMinutes(0), '0分');
  assert.strictEqual(formatHoursMinutes(45), '45分');
  assert.strictEqual(formatHoursMinutes(60), '1時間');
  assert.strictEqual(formatHoursMinutes(90), '1時間30分');
  assert.strictEqual(formatHoursMinutes(-30), '-30分');
});

// ============================================================
// イベントの日付マッチ
// ============================================================
test('matchesEventDate — 指定した日付だけ該当する', () => {
  const ev = { dates: ['2026-08-03', '2026-08-05'] };
  assert.strictEqual(matchesEventDate(ev, '2026-08-03'), true);
  assert.strictEqual(matchesEventDate(ev, '2026-08-04'), false);
});

test('matchesEventDate — 日付未選択なら全日程に該当する', () => {
  const ev = { dates: [], alwaysShow: false };
  assert.strictEqual(matchesEventDate(ev, '2026-08-03'), true);
  assert.strictEqual(matchesEventDate(ev, '2027-01-01'), true);
});

test('matchesEventDate — 常時表示は除外日以外に該当する', () => {
  const ev = { alwaysShow: true, dates: ['2026-08-04'] };
  assert.strictEqual(matchesEventDate(ev, '2026-08-03'), true);
  assert.strictEqual(matchesEventDate(ev, '2026-08-04'), false);
});

test('matchesEventDate — 常時表示で除外日がなければ常に該当する', () => {
  assert.strictEqual(matchesEventDate({ alwaysShow: true, dates: [] }, '2026-08-03'), true);
  assert.strictEqual(matchesEventDate({ alwaysShow: true }, '2026-08-03'), true);
});

test('matchesEventDate — 旧形式（期間指定）も判定できる', () => {
  const ev = { startDate: '2026-08-03', endDate: '2026-08-05' };
  assert.strictEqual(matchesEventDate(ev, '2026-08-02'), false);
  assert.strictEqual(matchesEventDate(ev, '2026-08-04'), true);
  assert.strictEqual(matchesEventDate(ev, '2026-08-06'), false);
});

test('matchesEventDate — 旧形式の除外日は該当しない', () => {
  const ev = { startDate: '2026-08-03', endDate: '2026-08-05', excludeDates: '2026-08-04' };
  assert.strictEqual(matchesEventDate(ev, '2026-08-04'), false);
});

// ============================================================
// カレンダービュー表示用のイベント抽出
// ============================================================
test('getDatedEventsForDay — 日付を指定したイベントのうち該当日のものだけ返す', () => {
  const events = [
    { content: 'A', dates: ['2026-08-03'] },
    { content: 'B', dates: ['2026-08-04'] },
  ];
  assert.deepStrictEqual(getDatedEventsForDay(events, '2026-08-03'), [events[0]]);
});

test('getDatedEventsForDay — 同日に複数該当する場合は全件返す', () => {
  const events = [
    { content: 'A', dates: ['2026-08-03'] },
    { content: 'B', dates: ['2026-08-03', '2026-08-04'] },
  ];
  assert.deepStrictEqual(getDatedEventsForDay(events, '2026-08-03'), events);
});

test('getDatedEventsForDay — 常時表示のイベントは含めない', () => {
  const events = [{ content: 'A', alwaysShow: true, dates: [] }];
  assert.deepStrictEqual(getDatedEventsForDay(events, '2026-08-03'), []);
});

test('getDatedEventsForDay — 日付未指定（dates が空配列）のイベントは含めない', () => {
  const events = [{ content: 'A', dates: [] }];
  assert.deepStrictEqual(getDatedEventsForDay(events, '2026-08-03'), []);
});

test('getDatedEventsForDay — 旧形式（dates を持たない）のイベントは含めない', () => {
  const events = [{ content: 'A', startDate: '2026-08-01', endDate: '2026-08-31' }];
  assert.deepStrictEqual(getDatedEventsForDay(events, '2026-08-03'), []);
});

// ============================================================
// タイムゾーン非依存（日本時間で統一されていること）
// ============================================================
// 端末のタイムゾーンが違っても同じ日付・時刻になることを、
// TZ を変えた別プロセスで確認する
function evalInTimezone(tz, expression) {
  const scriptDir = path.join(__dirname, '..', 'js', 'workSheets');
  const script = `
    const fs = require('fs'), vm = require('vm'), path = require('path');
    const ctx = vm.createContext({});
    for (const f of ['constants.js', 'utils.js']) {
      vm.runInContext(fs.readFileSync(path.join(${JSON.stringify(scriptDir)}, f), 'utf8'), ctx);
    }
    process.stdout.write(String(vm.runInContext(${JSON.stringify(expression)}, ctx)));
  `;
  return execFileSync(process.execPath, ['-e', script], {
    env: { ...process.env, TZ: tz },
    encoding: 'utf8',
  });
}

const TIMEZONES = ['Asia/Tokyo', 'UTC', 'America/New_York', 'Australia/Sydney'];

test('getTodayJST — 端末のタイムゾーンに関係なく同じ日付を返す', () => {
  const results = TIMEZONES.map(tz => evalInTimezone(tz, 'getTodayJST()'));
  assert.match(results[0], /^\d{4}-\d{2}-\d{2}$/);
  results.forEach((r, i) => {
    assert.strictEqual(r, results[0], `${TIMEZONES[i]} で結果が異なる`);
  });
});

test('nowTimeStr — 端末のタイムゾーンに関係なく同じ時刻を返す', () => {
  const results = TIMEZONES.map(tz => evalInTimezone(tz, 'nowTimeStr()'));
  assert.match(results[0], /^\d{2}:\d{2}$/);
  results.forEach((r, i) => {
    assert.strictEqual(r, results[0], `${TIMEZONES[i]} で結果が異なる`);
  });
});

test('getCurrentMonthValue — 端末のタイムゾーンに関係なく同じ月を返す', () => {
  const results = TIMEZONES.map(tz => evalInTimezone(tz, 'getCurrentMonthValue()'));
  assert.match(results[0], /^\d{4}-\d{2}$/);
  results.forEach((r, i) => {
    assert.strictEqual(r, results[0], `${TIMEZONES[i]} で結果が異なる`);
  });
});

test('getWeekday — 端末のタイムゾーンに関係なく同じ曜日を返す', () => {
  const results = TIMEZONES.map(tz => evalInTimezone(tz, "getWeekday('2026-08-01')"));
  results.forEach((r, i) => {
    assert.strictEqual(r, '土', `${TIMEZONES[i]} で結果が異なる`);
  });
});
