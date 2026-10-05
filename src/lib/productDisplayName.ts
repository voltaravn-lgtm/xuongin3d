/** Display-only sentence case; never changes the stored name or Excel data. */
export function productDisplayName(name: string): string {
  const text = name.trim().toLocaleLowerCase("vi-VN")
    .replace(/\b(3d|pla|abs|petg|fdm|led|usb)\b/gi, (word) => word.toUpperCase());
  return text.charAt(0).toLocaleUpperCase("vi-VN") + text.slice(1);
}
