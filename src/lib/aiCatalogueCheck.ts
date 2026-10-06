import { providerRequest, type CatalogueProvider } from './aiCatalogueProviders.ts';

export function hasCatalogueKey(value: string | undefined): boolean {
  return !!value?.trim() && !/^\.{3,}$/.test(value.trim());
}
export function catalogueCheckRequest(p: CatalogueProvider) {
  const body = providerRequest(p, 'Return only valid JSON: {"ok":true}.', 'Connection test. Return {"ok":true}.', []);
  return p.provider === 'gemini'
    ? { ...body, generationConfig: { ...(body as any).generationConfig, maxOutputTokens: 64 } }
    : { ...body, max_tokens: 64 };
}
export async function checkCatalogueProvider(p: CatalogueProvider, key: string, fetcher: typeof fetch = fetch) {
  const endpoint = p.provider === 'gemini' ? `https://generativelanguage.googleapis.com/v1beta/models/${p.model}:generateContent`
    : p.provider === 'deepseek' ? 'https://api.deepseek.com/chat/completions' : 'https://api.openai.com/v1/chat/completions';
  let r: Response;
  try {
    r = await fetcher(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(p.provider === 'gemini' ? { 'x-goog-api-key': key.trim() } : { Authorization: `Bearer ${key.trim()}` }) }, body: JSON.stringify(catalogueCheckRequest(p)), cache: 'no-store', signal: AbortSignal.timeout(25000) });
  } catch { throw new Error('Không kết nối được API hoặc quá thời gian 25 giây. Hãy thử lại sau.'); }
  if (!r.ok) {
    const explanation = r.status === 401 || r.status === 403 ? 'Key không hợp lệ hoặc không có quyền gọi model.'
      : r.status === 402 ? 'Tài khoản chưa đủ số dư.' : r.status === 429 ? 'Hết hạn mức/số dư hoặc đang bị giới hạn tốc độ.'
      : r.status === 404 ? 'Model không tồn tại hoặc tài khoản chưa được cấp quyền.' : 'Nhà cung cấp từ chối yêu cầu. Kiểm tra cấu hình server.';
    throw new Error(`HTTP ${r.status}: ${explanation}`);
  }
  let data: any;
  try { data = await r.json(); } catch { throw new Error('API trả dữ liệu không hợp lệ.'); }
  const thinking = p.provider === 'gemini' ? data.usageMetadata?.thoughtsTokenCount || 0 : data.usage?.completion_tokens_details?.reasoning_tokens || 0;
  if (thinking > 0 || data.choices?.[0]?.message?.reasoning_content?.trim()) throw new Error('API phát sinh thinking dù đã yêu cầu tắt. Kiểm tra lại nhà cung cấp.');
  const raw = p.provider === 'gemini' ? data.candidates?.[0]?.content?.parts?.map((part: any) => part.text || '').join('') : data.choices?.[0]?.message?.content;
  let parsed: any;
  try { parsed = JSON.parse(String(raw).replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')); } catch { throw new Error('API kết nối được nhưng chưa trả đúng JSON kiểm tra.'); }
  if (parsed?.ok !== true) throw new Error('API chưa trả đúng kết quả kiểm tra.');
  return { input: p.provider === 'gemini' ? data.usageMetadata?.promptTokenCount || 0 : data.usage?.prompt_tokens || 0,
    output: p.provider === 'gemini' ? data.usageMetadata?.candidatesTokenCount || 0 : data.usage?.completion_tokens || 0 };
}
