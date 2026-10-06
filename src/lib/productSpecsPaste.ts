export type SpecRow = [string, string];

const clean = (text: string) => text.replace(/\s+/g, ' ').trim();
const label = (text: string) => clean(text).replace(/^(?:[•●▪◦*-]\s*|\d+[.)]\s*)/, '').replace(/[:：]\s*$/, '').trim();

/** Split only explicit pairs; retain colons inside values (URLs, times, etc.). */
export function parseSpecText(text: string): SpecRow[] {
  return text.split(/\r\n|\r|\n/).flatMap(line => {
    const trimmed = line.trim();
    const columns = trimmed.includes('\t') ? trimmed.split('\t') : trimmed.split(/\s{2,}/);
    let key = '', value = '';
    if (columns.length >= 2) {
      key = columns[0]; value = columns.slice(1).join(' ');
    } else {
      const colon = trimmed.search(/[:：]/);
      if (colon < 0 || /^\s*(?:https?|ftp):\/\//i.test(trimmed)) return [];
      key = trimmed.slice(0, colon); value = trimmed.slice(colon + 1);
    }
    key = label(key); value = clean(value);
    return key && value ? [[key, value] as SpecRow] : [];
  });
}

export function parseSpecsClipboard(text: string, html = ''): SpecRow[] {
  if (html && /<table[\s>]/i.test(html) && typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const rows: SpecRow[] = [];
    doc.querySelectorAll('tr').forEach(row => {
      const cells = Array.from(row.querySelectorAll('th,td')).map(cell => clean(cell.textContent || ''));
      const key = label(cells[0] || ''), value = clean(cells.slice(1).join(' '));
      if (key && value && !(key.toLowerCase().includes('thông số') && value.toLowerCase().includes('chi tiết'))) rows.push([key, value]);
    });
    if (rows.length) return rows;
  }
  return parseSpecText(text);
}

// Only the seller's confirmed technical field is merged, never their name/marketing description.
export function confirmedSpecText(text: string): Record<string, string> {
  return Object.fromEntries(parseSpecText(text).filter(([key, value]) => !/đề xuất|cần xác nhận|chưa xác nhận|chưa rõ|không xác định/i.test(`${key} ${value}`)));
}
