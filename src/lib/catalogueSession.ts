const databaseName = 'in3d-catalogue-sessions';
const storeName = 'sessions';

function pack(value: unknown): unknown {
  if (typeof File !== 'undefined' && value instanceof File) return { __catalogueFile: true, blob: value, name: value.name, lastModified: value.lastModified };
  if (Array.isArray(value)) return value.map(pack);
  if (value && typeof value === 'object' && !(value instanceof Blob)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, pack(item)]));
  return value;
}
export const snapshotCatalogueSession = (value: unknown) => pack(value);
function unpack(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(unpack);
  if (value && typeof value === 'object' && !(value instanceof Blob)) {
    const record = value as Record<string, unknown>;
    if (record.__catalogueFile === true && record.blob instanceof Blob) return new File([record.blob], String(record.name), { type: record.blob.type, lastModified: Number(record.lastModified) });
    return Object.fromEntries(Object.entries(record).map(([key, item]) => [key, unpack(item)]));
  }
  return value;
}

export async function catalogueSession<T>(key: string, action: 'read' | 'write' | 'delete', value?: T): Promise<T | undefined> {
  if (typeof indexedDB === 'undefined') throw new Error('Trình duyệt không hỗ trợ IndexedDB.');
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Kho lưu tạm đang bị khóa bởi tab khác.'));
  });
  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const transaction = db.transaction(storeName, action === 'read' ? 'readonly' : 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = action === 'read' ? store.get(key) : action === 'delete' ? store.delete(key) : store.put(pack(value), key);
      transaction.oncomplete = () => resolve(action === 'read' ? unpack(request.result) as T | undefined : undefined);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error || new Error('Không lưu được phiên.'));
    });
  } finally { db.close(); }
}
