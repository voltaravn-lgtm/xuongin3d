export function formatPriceInput(value: string): string {
  const trimmed = value.trim();
  // Preserve existing contact-only prices such as “Liên hệ”.
  if (!/^[\d\s.,]*(?:đ|₫|vnd)?$/i.test(trimmed)) return value;
  const digits = trimmed.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function priceInputSuggestions(value: string): string[] {
  if (!/^[\d\s.,]+$/.test(value)) return [];
  const digits = value.replace(/\D/g, '').replace(/^0+/, '');
  if (!digits || digits.length > 3) return [];
  const zeros = digits.length === 1 ? 4 : 3;
  return [zeros, zeros + 1, zeros + 2].map(count => formatPriceInput(digits + '0'.repeat(count)));
}
