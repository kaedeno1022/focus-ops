// ブラウザで <script> が順次ロードされる状況を再現し、
// 各ファイルが定義したグローバル関数を取り出すためのヘルパー。
//
// このプロジェクトはモジュールシステムを持たないため、
// vm で共通コンテキストを作って複数ファイルを順に評価している。
// 取り出せるのは function 宣言のみ（const / let はレキシカルスコープに入るため
// コンテキストのプロパティにはならない）。定数を参照したい場合は evalIn() を使う。

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SCRIPT_DIR = path.join(__dirname, '..', '..', 'js', 'workSheets');

function loadScripts(files) {
  const context = vm.createContext({ console });
  files.forEach(file => {
    const code = fs.readFileSync(path.join(SCRIPT_DIR, file), 'utf8');
    vm.runInContext(code, context, { filename: file });
  });
  return context;
}

function evalIn(context, expression) {
  return vm.runInContext(expression, context);
}

// vm コンテキスト内で作られた配列・オブジェクトは、テスト側とは別のプロトタイプを持つため
// assert.deepStrictEqual が「中身は同じなのに不一致」になる。比較前にこれで詰め直す。
function toPlain(value) {
  return JSON.parse(JSON.stringify(value));
}

module.exports = { loadScripts, evalIn, toPlain };
