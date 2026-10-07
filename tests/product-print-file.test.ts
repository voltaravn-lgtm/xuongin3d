import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePrintFileUrl } from '../src/lib/productPrintFile.ts';

test('accepts full web file links and preserves signed query parameters', () => {
  assert.equal(normalizePrintFileUrl(' https://drive.google.com/file/d/example/view?usp=sharing '), 'https://drive.google.com/file/d/example/view?usp=sharing');
  assert.equal(normalizePrintFileUrl('https://files.example/model.3mf?token=abc%2Fdef&expires=123'), 'https://files.example/model.3mf?token=abc%2Fdef&expires=123');
  assert.equal(normalizePrintFileUrl('  '), '');
});

test('rejects local paths, executable URLs and embedded credentials', () => {
  for (const link of ['G:\\models\\model.stl', 'file:///G:/models/model.stl', 'javascript:alert(1)', 'data:text/html,hi', 'https://user:password@example.com/file', 'not-a-link']) {
    assert.throws(() => normalizePrintFileUrl(link));
  }
});
