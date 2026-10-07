import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
const module = { exports: {} as any };
const code = ts.transpileModule(readFileSync(new URL('../src/components/Admin/ProductPagination.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
}).outputText;
vm.runInNewContext(code, { exports: module.exports, module, require });
function render(total: number, page: number, pageSize: number) {
  return renderToStaticMarkup(React.createElement(module.exports.default, { total, page, pageSize, onPageChange: () => {}, onPageSizeChange: () => {} }));
}

test('pagination exposes 12/24/48 sizes and first/last page boundaries', () => {
  const first = render(71, 1, 12);
  [12, 24, 48].forEach(size => assert.match(first, new RegExp(`value="${size}"`)));
  assert.match(first, /1–12 \/ 71 SP · Trang 1\/6/);
  assert.match(first, /disabled=""[^>]*>Trước/);
  const last = render(71, 6, 12);
  assert.match(last, /61–71 \/ 71 SP · Trang 6\/6/);
  assert.match(last, /disabled=""[^>]*>Sau/);
  assert.match(last, /aria-current="page"[^>]*>6/);
});

test('larger pages, empty results and long pagination remain compact', () => {
  assert.match(render(71, 3, 24), /49–71 \/ 71 SP · Trang 3\/3/);
  assert.match(render(71, 2, 48), /49–71 \/ 71 SP · Trang 2\/2/);
  assert.match(render(0, 1, 12), /0–0 \/ 0 SP · Trang 1\/1/);
  const middle = render(12000, 500, 12);
  assert.equal((middle.match(/aria-label="Trang \d+"/g) || []).length, 5);
  assert.match(middle, /aria-current="page"[^>]*>500/);
  assert.match(middle, />1000<\/button>/);
});
