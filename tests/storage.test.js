// LocalStorage 読み書きのテスト
// 壊れた保存データを別キーへ退避し、退避できないときは上書きを止める挙動を固定する。
//
// 実行: node --test tests/*.test.js

const test = require('node:test');
const assert = require('node:assert');
const { loadScripts } = require('./helpers/load');

function fakeLocalStorage(initial = {}, { failKeyPattern = null } = {}) {
  const store = new Map(Object.entries(initial));
  return {
    store,
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => {
      if (failKeyPattern && failKeyPattern.test(k)) throw new Error('QuotaExceededError');
      store.set(k, String(v));
    },
    removeItem: k => store.delete(k),
  };
}

function setup(initial, opts) {
  const ctx = loadScripts(['constants.js', 'utils.js', 'storage.js']);
  ctx.localStorage = fakeLocalStorage(initial, opts);
  ctx.toasts = [];
  ctx.showToast = msg => ctx.toasts.push(msg);
  return ctx;
}

const corruptKeys = ctx => [...ctx.localStorage.store.keys()].filter(k => k.startsWith('workData_corrupt_'));

test('readJSON — 正しいデータはそのまま返し、退避しない', () => {
  const ctx = setup({ workData: '[{"日付":"2026-09-01"}]' });
  assert.strictEqual(ctx.readJSON('workData', [], null, Array.isArray).length, 1);
  assert.strictEqual(corruptKeys(ctx).length, 0);
});

test('readJSON — キーが無ければ fallback を返し、退避しない', () => {
  const ctx = setup({});
  assert.strictEqual(ctx.readJSON('workData', 'fb'), 'fb');
  assert.strictEqual(ctx.localStorage.store.size, 0);
});

test('readJSON — パースできない値は生データを別キーへ退避して fallback を返す', () => {
  const ctx = setup({ workData: '[{"日付":' });
  assert.strictEqual(ctx.readJSON('workData', 'fb', 'err'), 'fb');
  const keys = corruptKeys(ctx);
  assert.strictEqual(keys.length, 1);
  assert.strictEqual(ctx.localStorage.getItem(keys[0]), '[{"日付":');
  assert.deepStrictEqual(ctx.toasts, ['err']);
});

test('readJSON — isValid を満たさない値も退避する', () => {
  const ctx = setup({ workData: '{"a":1}' });
  assert.strictEqual(ctx.readJSON('workData', 'fb', null, Array.isArray), 'fb');
  assert.strictEqual(corruptKeys(ctx).length, 1);
});

test('readJSON — 同じページ表示中に何度読んでも退避は1回だけ', () => {
  const ctx = setup({ workData: 'broken' });
  ctx.readJSON('workData', []);
  ctx.readJSON('workData', []);
  assert.strictEqual(corruptKeys(ctx).length, 1);
});

test('退避後は元のキーへ普通に書き込める', () => {
  const ctx = setup({ workData: 'broken' });
  ctx.readJSON('workData', []);
  assert.strictEqual(ctx.writeJSON('workData', []), true);
  assert.strictEqual(ctx.localStorage.getItem('workData'), '[]');
});

test('退避に失敗したキーは上書きせず false を返す', () => {
  const ctx = setup({ workData: 'broken' }, { failKeyPattern: /_corrupt_/ });
  ctx.readJSON('workData', []);
  assert.strictEqual(ctx.writeJSON('workData', []), false);
  assert.strictEqual(ctx.localStorage.getItem('workData'), 'broken');
  // 他のキーは影響を受けない
  assert.strictEqual(ctx.writeJSON('eventData', []), true);
});
