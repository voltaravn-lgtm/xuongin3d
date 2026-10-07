/** Private admin link; never store this on publicly readable product documents. */
export function normalizePrintFileUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  let parsed: URL;
  try { parsed = new URL(trimmed); }
  catch { throw new Error('Vui lòng nhập link đầy đủ bắt đầu bằng https:// hoặc http://.'); }
  if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw new Error('Chỉ dùng link http/https, không dùng đường dẫn file máy tính hoặc link chứa mật khẩu.');
  }
  return parsed.href;
}
