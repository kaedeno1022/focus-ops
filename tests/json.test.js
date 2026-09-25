// JSONインポート時のマージロジックのテスト
// 「インポートに含まれる月だけを差し替え、他の月は温存する」挙動を固定する。
//
// 実行: node --test tests/*.test.js

const test = require('node:test');
const assert = require('node:assert');
const { loadScripts, toPlain } = require('./helpers/load');

const ctx = loadScripts(['constants.js', 'utils.js', 'json.js']);
const { mergeByMonth, workItemMonths, eventMonths, pickObjects, pickImportableWorkItems, summarizeMonthReplacement, validateBackup } = ctx;

// ============================================================
// 月の列挙
// ============================================================
test('workItemMonths — 勤務データの属する月を返す', () => {
  assert.deepStrictEqual(toPlain(workItemMonths({ 日付: '2026-08-03' })), ['2026-08']);
  assert.deepStrictEqual(toPlain(workItemMonths({})), []);
  assert.deepStrictEqual(toPlain(workItemMonths(null)), []);
});

test('eventMonths — 日付リストの月を重複なく返す', () => {
  assert.deepStrictEqual(
    toPlain(eventMonths({ dates: ['2026-08-03', '2026-08-05', '2026-09-01'] })),
    ['2026-08', '2026-09']);
});

test('eventMonths — 日付未指定のイベントはどの月にも属さない', () => {
  assert.deepStrictEqual(toPlain(eventMonths({ dates: [] })), []);
  assert.deepStrictEqual(toPlain(eventMonths({ alwaysShow: true, dates: [] })), []);
});

test('eventMonths — 旧形式は年をまたぐ期間も列挙する', () => {
  assert.deepStrictEqual(
    toPlain(eventMonths({ startDate: '2026-11-20', endDate: '2027-02-03' })),
    ['2026-11', '2026-12', '2027-01', '2027-02']);
});

test('eventMonths — 旧形式で日付が欠けていれば空', () => {
  assert.deepStrictEqual(toPlain(eventMonths({ startDate: '2026-11-20' })), []);
});

// ============================================================
// マージ
// ============================================================
test('mergeByMonth — インポートに含まれる月だけ差し替える', () => {
  const existing = [
    { 日付: '2026-07-01', 作業内容: '既存7月' },
    { 日付: '2026-08-01', 作業内容: '既存8月' },
  ];
  const imported = [{ 日付: '2026-08-10', 作業内容: '新8月' }];

  const merged = mergeByMonth(existing, imported, workItemMonths);

  assert.deepStrictEqual(toPlain(merged).map(d => d.作業内容), ['既存7月', '新8月']);
});

test('mergeByMonth — 該当月がなければ全て残る', () => {
  const existing = [{ 日付: '2026-07-01', 作業内容: '既存7月' }];
  const imported = [{ 日付: '2026-09-01', 作業内容: '新9月' }];

  const merged = mergeByMonth(existing, imported, workItemMonths);

  assert.strictEqual(merged.length, 2);
});

test('mergeByMonth — 日付を持たない既存データは常に温存する', () => {
  const existing = [{ 作業内容: '日付なし' }, { 日付: '2026-08-01', 作業内容: '既存8月' }];
  const imported = [{ 日付: '2026-08-10', 作業内容: '新8月' }];

  const merged = mergeByMonth(existing, imported, workItemMonths);

  assert.deepStrictEqual(toPlain(merged).map(d => d.作業内容), ['日付なし', '新8月']);
});

test('mergeByMonth — 空のインポートでは既存が変わらない', () => {
  const existing = [{ 日付: '2026-08-01', 作業内容: '既存8月' }];
  const merged = mergeByMonth(existing, [], workItemMonths);
  assert.deepStrictEqual(toPlain(merged), existing);
});

test('mergeByMonth — イベントでも同じ月だけ差し替える', () => {
  const existing = [
    { content: '既存8月', dates: ['2026-08-03'] },
    { content: '既存9月', dates: ['2026-09-03'] },
    { content: '全日程',  dates: [] },
  ];
  const imported = [{ content: '新8月', dates: ['2026-08-20'] }];

  const merged = mergeByMonth(existing, imported, eventMonths);

  // 全日程イベントはどの月にも属さないため温存される
  assert.deepStrictEqual(toPlain(merged).map(e => e.content), ['既存9月', '全日程', '新8月']);
});

// ============================================================
// 不正データの除去
// ============================================================
test('pickObjects — オブジェクト以外を除外する', () => {
  const result = pickObjects([{ 日付: '2026-08-01' }, null, 'text', 42, [], undefined]);
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].日付, '2026-08-01');
});

// ============================================================
// インポート対象の選り分け
// ============================================================
test('pickImportableWorkItems — 日付が YYYY-MM-DD でない行とオブジェクト以外を除外する', () => {
  const { items, invalid, duplicate } = pickImportableWorkItems([
    { 日付: '2026-08-01' },
    { 日付: '2026/08/02' },
    { 日付: '' },
    { 作業内容: '日付なし' },
    { 日付: 20260803 },
    null,
  ]);
  assert.deepStrictEqual(toPlain(items).map(d => d.日付), ['2026-08-01']);
  assert.strictEqual(invalid, 5);
  assert.strictEqual(duplicate, 0);
});

test('pickImportableWorkItems — ファイル内で重複した日付は先の行を残す', () => {
  const { items, duplicate } = pickImportableWorkItems([
    { 日付: '2026-08-01', 作業内容: '先' },
    { 日付: '2026-08-01', 作業内容: '後' },
  ]);
  assert.deepStrictEqual(toPlain(items).map(d => d.作業内容), ['先']);
  assert.strictEqual(duplicate, 1);
});

test('summarizeMonthReplacement — 差し替える月ごとに既存件数と取り込み件数を返す', () => {
  const existing = [
    { 日付: '2026-07-01' },
    { 日付: '2026-08-01' }, { 日付: '2026-08-02' },
  ];
  const imported = [{ 日付: '2026-09-01' }, { 日付: '2026-08-10' }];
  assert.deepStrictEqual(toPlain(summarizeMonthReplacement(existing, imported)), [
    { month: '2026-08', before: 2, after: 1 },
    { month: '2026-09', before: 0, after: 1 },
  ]);
});

// ============================================================
// 全体バックアップの検証
// ============================================================
const backup = values => ({ format: 'focus-ops-backup', version: 1, exportedAt: '2026-09-25 10:00', values });

test('validateBackup — 正しい形式なら values を返す', () => {
  const values = {
    workData: [{ 日付: '2026-09-01' }], workData_bp: [], eventData: [],
    roundDiffs: [], roundDiffs_bp: [], leaveBaselines: { 有休: { date: '2026-04-01', days: 10 } },
  };
  assert.deepStrictEqual(toPlain(validateBackup(backup(values))), values);
});

test('validateBackup — 一部のキーだけでも受け付ける', () => {
  assert.ok(validateBackup(backup({ workData: [] })));
});

test('validateBackup — 形式名・バージョンが違えば拒否する', () => {
  assert.strictEqual(validateBackup({ ...backup({}), format: 'other' }), null);
  assert.strictEqual(validateBackup({ ...backup({}), version: 2 }), null);
  assert.strictEqual(validateBackup([{ 日付: '2026-09-01' }]), null);
  assert.strictEqual(validateBackup(null), null);
});

test('validateBackup — 未知のキーや形の合わない値が1つでもあれば全体を拒否する', () => {
  assert.strictEqual(validateBackup(backup({ workData: [], unknown: [] })), null);
  assert.strictEqual(validateBackup(backup({ workData: {} })), null);
  assert.strictEqual(validateBackup(backup({ leaveBaselines: [] })), null);
  assert.strictEqual(validateBackup(backup([])), null);
});
