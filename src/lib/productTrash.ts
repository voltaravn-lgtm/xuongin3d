import { doc, runTransaction, serverTimestamp, Timestamp, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import type { Product } from '../types';

export const PRODUCT_TRASH_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
export type TrashedProduct = { id: string; product: Product; deletedAt: Timestamp; expiresAt: Timestamp };
export function canRestoreProduct(expiresAt: { toMillis(): number } | undefined, now = Date.now()) {
  return !!expiresAt && Number.isFinite(expiresAt.toMillis()) && expiresAt.toMillis() > now;
}

// Only delete backups; never touch active products, photos or SKU reservations.
export async function permanentlyDeleteTrashedProducts(ids: string[]) {
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.some(id => !id || id.includes('/'))) throw new Error('ID bản lưu không hợp lệ.');
  const deletedIds: string[] = [], failedIds: string[] = [];
  let error = '';
  for (let start = 0; start < uniqueIds.length; start += 400) {
    const chunk = uniqueIds.slice(start, start + 400);
    const batch = writeBatch(db);
    chunk.forEach(id => batch.delete(doc(db, 'productTrash', id)));
    try { await batch.commit(); deletedIds.push(...chunk); }
    catch (e) { failedIds.push(...chunk); error = e instanceof Error ? e.message : 'Không thể xóa bản lưu.'; }
  }
  return { deletedIds, failedIds, error };
}

export async function trashProduct(product: Product) {
  const productRef = doc(db, 'products', product.id);
  const trashRef = doc(db, 'productTrash', product.id);
  await runTransaction(db, async transaction => {
    const saved = await transaction.get(productRef);
    const existingTrash = await transaction.get(trashRef);
    if (existingTrash.exists()) throw new Error('Sản phẩm đã nằm trong mục Đã xóa. Tải lại danh sách để kiểm tra.');
    const snapshot = saved.exists() ? saved.data() : JSON.parse(JSON.stringify(product));
    transaction.set(trashRef, { product: snapshot, deletedAt: serverTimestamp(), expiresAt: Timestamp.fromMillis(Date.now() + PRODUCT_TRASH_RETENTION_MS) });
    transaction.delete(productRef);
  });
}

export async function restoreTrashedProduct(id: string): Promise<Product> {
  return runTransaction(db, async transaction => {
    const trashRef = doc(db, 'productTrash', id), productRef = doc(db, 'products', id);
    const trash = await transaction.get(trashRef);
    const active = await transaction.get(productRef);
    if (!trash.exists()) throw new Error('Bản lưu đã được xóa hoặc khôi phục trước đó.');
    const data = trash.data() as Omit<TrashedProduct, 'id'>;
    if (!canRestoreProduct(data.expiresAt)) throw new Error('Đã quá 7 ngày, không thể khôi phục.');
    if (active.exists()) throw new Error('ID sản phẩm đang được sử dụng. Không ghi đè sản phẩm hiện có.');
    if (!data.product || data.product.id !== id) throw new Error('Bản lưu sản phẩm không hợp lệ.');
    transaction.set(productRef, data.product);
    transaction.delete(trashRef);
    return data.product;
  });
}
