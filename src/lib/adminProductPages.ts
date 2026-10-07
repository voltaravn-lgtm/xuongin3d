import { collection, doc, documentId, getCountFromServer, getDoc, getDocs, limit, onSnapshot, orderBy, query, startAfter, where } from 'firebase/firestore';
import { auth, db } from './firebase';
import type { Product } from '../types';

export const ADMIN_PRODUCT_CACHE_MS = 5 * 60 * 1000;
export const ADMIN_PRODUCT_CACHE_EVENT = 'admin-product-pages-invalidated';
const prefix = 'in3d-admin-product-pages-v2:';
export type AdminProductCursor = { id: string; createdAt?: string };
const pending = new Map<string, Promise<any>>();
let generation = 0;
function key(name: string) { return `${prefix}${auth.currentUser?.uid || 'admin'}:${name}`; }
async function cached<T>(name: string, fetcher: () => Promise<T>): Promise<T> {
  const storageKey = key(name);
  try {
    const entry = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
    if (entry && entry.expiresAt > Date.now()) return entry.value as T;
  } catch { /* Storage unavailable: bounded server queries still work. */ }
  if (pending.has(storageKey)) return pending.get(storageKey)!;
  const version = generation;
  const request = fetcher().then(value => {
    if (version === generation) {
      try { sessionStorage.setItem(storageKey, JSON.stringify({ expiresAt: Date.now() + ADMIN_PRODUCT_CACHE_MS, value })); } catch { /* Quota is optional. */ }
    }
    return value;
  }).finally(() => { if (pending.get(storageKey) === request) pending.delete(storageKey); });
  pending.set(storageKey, request);
  return request;
}
export function invalidateAdminProductPages() {
  generation++; pending.clear();
  try { Object.keys(sessionStorage).filter(item => item.startsWith(prefix)).forEach(item => sessionStorage.removeItem(item)); } catch { /* Optional cache. */ }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(ADMIN_PRODUCT_CACHE_EVENT));
}
export function adminProductPageQuery(pageSize: number, cursor?: AdminProductCursor, legacy = false) {
  if (![12, 24, 48].includes(pageSize)) throw new Error('Số sản phẩm mỗi trang không hợp lệ.');
  return query(collection(db, 'products'),
    ...(legacy ? [] : [orderBy('createdAt', 'desc')]), orderBy(documentId(), 'desc'),
    ...(cursor ? [legacy ? startAfter(cursor.id) : startAfter(cursor.createdAt, cursor.id)] : []), limit(pageSize));
}
/** Legacy link discovery is bounded to the visible page, never the whole catalog. */
export async function loadAdminPrintFileStatuses(products: Product[]) {
  const statuses: Record<string, boolean> = {};
  const missing = products.filter(p => typeof p.hasPrintFile !== 'boolean').map(p => p.id).sort();
  products.forEach(p => { if (typeof p.hasPrintFile === 'boolean') statuses[p.id] = p.hasPrintFile; });
  for (let i = 0; i < missing.length; i += 30) {
    const ids = missing.slice(i, i + 30);
    Object.assign(statuses, await cached(`print-status:${JSON.stringify(ids)}`, async () => {
      const snapshot = await getDocs(query(collection(db, 'productPrintFiles'), where(documentId(), 'in', ids)));
      const flags: Record<string, boolean> = Object.fromEntries(ids.map(id => [id, false]));
      snapshot.docs.forEach(item => { flags[item.id] = Boolean(String(item.data().url || '').trim()); });
      return flags;
    }));
  }
  return statuses;
}
export function cacheAdminPrintFileStatus(id: string, hasPrintFile: boolean) {
  try {
    for (const storageKey of Object.keys(sessionStorage).filter(item => item.startsWith(key('')))) {
      const entry = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
      if (!entry) continue;
      if (storageKey.startsWith(key('print-status:')) && id in entry.value) entry.value[id] = hasPrintFile;
      const products = Array.isArray(entry.value) ? entry.value : entry.value?.products;
      if (Array.isArray(products)) products.forEach(product => { if (product.id === id) product.hasPrintFile = hasPrintFile; });
      sessionStorage.setItem(storageKey, JSON.stringify(entry));
    }
  } catch { /* Optional cache. */ }
}
export async function loadAdminProductPage(pageSize: number, cursor?: AdminProductCursor, legacy = false) {
  return cached(`page:${legacy ? 'id' : 'newest'}:${pageSize}:${JSON.stringify(cursor || null)}`, async () => {
    const snapshot = await getDocs(adminProductPageQuery(pageSize, cursor, legacy));
    const last = snapshot.docs.at(-1);
    return { products: snapshot.docs.map(item => ({ ...item.data(), id: item.id } as Product)), cursor: last ? { id: last.id, ...(legacy ? {} : { createdAt: last.data().createdAt as string }) } : undefined };
  });
}
export async function loadAdminDatedProductTotal() {
  return cached('dated-count', async () => (await getCountFromServer(query(collection(db, 'products'), orderBy('createdAt', 'desc')))).data().count);
}
/** One-document listener catches new products, including creations in another tab. */
export function subscribeAdminNewestProduct(onError?: (error: Error) => void) {
  const markerKey = `in3d-admin-product-head:${auth.currentUser?.uid || 'admin'}`;
  let previous: string | null = null;
  try { previous = sessionStorage.getItem(markerKey); } catch { /* Optional storage. */ }
  return onSnapshot(query(collection(db, 'products'), orderBy('createdAt', 'desc'), orderBy(documentId(), 'desc'), limit(1)), snapshot => {
    const first = snapshot.docs[0];
    const marker = JSON.stringify(first ? [first.id, first.data().createdAt] : []);
    if (previous !== null && marker !== previous) invalidateAdminProductPages();
    previous = marker;
    try { sessionStorage.setItem(markerKey, marker); } catch { /* Optional storage. */ }
  }, onError);
}
export async function loadAdminProductTotal() {
  return cached('count', async () => (await getCountFromServer(collection(db, 'products'))).data().count);
}
/** Deliberate full-catalog actions only: name/price filters, Excel, bulk tools. */
export async function loadAdminProductCatalogue() {
  return cached('catalogue', async () => {
    const snapshot = await getDocs(collection(db, 'products'));
    return snapshot.docs.map(item => ({ ...item.data(), id: item.id } as Product));
  });
}
export async function findAdminProductCode(code: string) {
  const normalized = code.trim().toUpperCase();
  return cached(`code:${normalized}`, async () => {
    const [direct, matches] = await Promise.all([
      getDoc(doc(db, 'products', normalized)),
      getDocs(query(collection(db, 'products'), where('sku', '==', normalized), limit(12))),
    ]);
    const results = matches.docs.map(item => ({ ...item.data(), id: item.id } as Product));
    if (direct.exists() && !results.some(item => item.id === direct.id)) results.unshift({ ...direct.data(), id: direct.id } as Product);
    return results;
  });
}
