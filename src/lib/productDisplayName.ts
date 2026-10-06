/** Display-only sentence case; never changes the stored name or Excel data. */
export function productNameWithSku(name: string, sku?: string): string {
  const title = name.trim(), code = sku?.trim() || '';
  if (!title || !code) return title;
  if (title.toLocaleUpperCase('vi-VN').endsWith(code.toLocaleUpperCase('vi-VN'))) return title;
  return `${title} | ${code}`;
}

export function productDisplayName(name: string, sku?: string): string {
  const text = name.trim().toLocaleLowerCase("vi-VN")
    .replace(/\b(3d|pla|abs|petg|fdm|led|usb)\b/gi, (word) => word.toUpperCase());
  return productNameWithSku(text.charAt(0).toLocaleUpperCase("vi-VN") + text.slice(1), sku);
}
