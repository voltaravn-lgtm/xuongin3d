import { useEffect, useRef, useState } from 'react';
import { auth } from '../../lib/firebase';
import { catalogueSession, snapshotCatalogueSession } from '../../lib/catalogueSession';

// File/Blob data is structured-cloned by IndexedDB, never placed in localStorage.
export default function useCatalogueSession<T>(mode: string, snapshot: () => T, restore: (value: T) => void, changes: unknown[]) {
  const [ready, setReady] = useState(false), [status, setStatus] = useState('Đang kiểm tra phiên lưu tạm…');
  const latest = useRef(snapshot); latest.current = snapshot;
  const restoring = useRef(restore); restoring.current = restore;
  const key = useRef(''), enabled = useRef(false), writes = useRef(Promise.resolve());
  useEffect(() => {
    let alive = true;
    const uid = auth.currentUser?.uid;
    if (!uid) { setStatus('Chưa đăng nhập: chưa bật lưu tạm.'); setReady(true); return; }
    key.current = `${uid}:${mode}:v1`;
    void catalogueSession<T>(key.current, 'read').then(value => {
      if (!alive) return;
      if (value) restoring.current(value);
      enabled.current = true;
      setStatus(value ? 'Đã khôi phục phiên lưu tạm. Kiểm tra trước khi tiếp tục.' : 'Lưu tạm tự động trên trình duyệt này.');
    }).catch(() => { if (alive) setStatus('Không mở được kho lưu tạm. Không tải lại trang khi đang làm.'); })
      .finally(() => { if (alive) setReady(true); });
    return () => { alive = false; enabled.current = false; };
  }, [mode]);
  function persist() {
    if (!enabled.current) return Promise.resolve();
    let value: unknown;
    try { value = snapshotCatalogueSession(latest.current()); }
    catch { setStatus('Không lưu được dữ liệu phiên này. Không tải lại trang khi đang làm.'); return Promise.resolve(); }
    writes.current = writes.current.then(() => catalogueSession(key.current, 'write', value)).then(() => {
      setStatus('Đã lưu tạm trên máy · ' + new Date().toLocaleTimeString('vi-VN'));
    }).catch(() => { setStatus('Lưu tạm thất bại (có thể hết dung lượng). Không tải lại trang; hãy đăng hoặc giảm số ảnh.'); });
    return writes.current;
  }
  // Save state changes, including edited drafts, without a debounce window on refresh.
  useEffect(() => { if (ready) void persist(); }, [ready, ...changes]);
  return { ready, status, persist };
}
