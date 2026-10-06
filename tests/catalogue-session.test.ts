import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogueSession, snapshotCatalogueSession } from '../src/lib/catalogueSession.ts';

test('IndexedDB restores original files, edited drafts and uploaded progress with account/mode isolation', async () => {
  const file = new File(['original image'], 'IN3D-0123.png', { type: 'image/png', lastModified: 1234 });
  const snapshot = { rows: [{ files: [file], name: 'Tên chỉnh sửa', coverIndex: 0 }], pending: [['row-1', { id: 'IN3D-ABCD12345678', draft: { description: 'Đoạn 1\n\nĐoạn 2' }, urls: ['https://cdn.example/1.webp'] }]] };
  await catalogueSession('user-1:batch', 'write', snapshot);
  const restored = await catalogueSession<typeof snapshot>('user-1:batch', 'read');
  assert.equal(restored!.rows[0].files[0].name, file.name);
  assert.equal(restored!.rows[0].files[0].type, file.type);
  assert.equal(restored!.rows[0].files[0].lastModified, 1234);
  assert.equal(await restored!.rows[0].files[0].text(), 'original image');
  assert.deepEqual(restored!.pending, snapshot.pending);
  assert.equal(await catalogueSession('user-2:batch', 'read'), undefined);
  assert.equal(await catalogueSession('user-1:quick', 'read'), undefined);
  await catalogueSession('user-1:batch', 'delete');
  assert.equal(await catalogueSession('user-1:batch', 'read'), undefined);
});

test('queued snapshots retain the old draft and file name despite later changes', async () => {
  const value = { draft: { name: 'Ban đầu' }, files: [new File(['a'], 'a.png', { type: 'image/png' })] };
  const snapshot = snapshotCatalogueSession(value);
  value.draft.name = 'Đã sửa';
  await catalogueSession('snapshot', 'write', snapshot);
  const restored = await catalogueSession<typeof value>('snapshot', 'read');
  assert.equal(restored!.draft.name, 'Ban đầu');
  assert.equal(restored!.files[0].name, 'a.png');
});
