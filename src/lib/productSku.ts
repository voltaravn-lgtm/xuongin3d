export function shortProductSku(id: string) {
  const suffix = id.replace(/^IN3D-/, '');
  if (/^\d{4}$/.test(suffix)) return `IN3D-${suffix}`;
  if (!/^[A-F0-9]{12}$/i.test(suffix)) throw new Error('ID sản phẩm không hợp lệ.');
  return `IN3D-${(parseInt(suffix.slice(-8), 16) % 10000).toString().padStart(4, '0')}`;
}

export function availableProductSku(preferred: string, occupied: Iterable<string>, random = Math.random) {
  const used = new Set(occupied);
  if (/^IN3D-\d{4}$/.test(preferred) && !used.has(preferred)) return preferred;
  const available: string[] = [];
  for (let n = 0; n < 10000; n++) {
    const sku = `IN3D-${String(n).padStart(4, '0')}`;
    if (!used.has(sku)) available.push(sku);
  }
  if (!available.length) throw new Error('Đã hết 10.000 mã IN3D-4 số. Cần mở rộng mã trước khi đăng tiếp.');
  return available[Math.min(available.length - 1, Math.floor(random() * available.length))];
}
