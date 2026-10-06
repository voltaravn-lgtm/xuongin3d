export type ProviderKind = 'openai' | 'deepseek' | 'gemini';
export type CatalogueProvider = { id: string; label: string; provider: ProviderKind; model: string; keyEnv: string };
const allowedModels: Record<ProviderKind, string[]> = {
  openai: ['gpt-4.1-mini', 'gpt-4.1', 'gpt-4o-mini'],
  deepseek: ['deepseek-flash'], gemini: ['gemini-2.5-flash', 'gemini-2.5-flash-lite'],
};
export function catalogueProviders(env: Record<string, string | undefined>): CatalogueProvider[] {
  const defaults: CatalogueProvider[] = [
    { id: 'deepseek', label: 'DeepSeek Flash', provider: 'deepseek', model: 'deepseek-flash', keyEnv: 'DEEPSEEK_API_KEY' },
    { id: 'openai', label: 'OpenAI GPT-4.1 mini', provider: 'openai', model: 'gpt-4.1-mini', keyEnv: 'OPENAI_API_KEY' },
    { id: 'gemini', label: 'Gemini 2.5 Flash', provider: 'gemini', model: 'gemini-2.5-flash', keyEnv: 'GEMINI_API_KEY' },
  ];
  let extra: unknown = [];
  try { extra = JSON.parse(env.AI_CATALOGUE_PROFILES || '[]'); } catch { throw new Error('AI_CATALOGUE_PROFILES không phải JSON hợp lệ.'); }
  if (!Array.isArray(extra) || extra.length > 12) throw new Error('Tối đa 12 profile API bổ sung.');
  const profiles = [...defaults];
  for (const p of extra) {
    if (!p || !/^[a-z0-9_-]{1,40}$/.test(p.id) || profiles.some(x => x.id === p.id) ||
      !Object.hasOwn(allowedModels, p.provider) || !allowedModels[p.provider as ProviderKind].includes(p.model) ||
      !/^[A-Z][A-Z0-9_]{1,80}$/.test(p.keyEnv) || p.keyEnv.startsWith('NEXT_PUBLIC_')) throw new Error('Profile AI không hợp lệ hoặc model không hỗ trợ tắt thinking.');
    profiles.push({ id: p.id, label: String(p.label || p.id).slice(0, 80), provider: p.provider, model: p.model, keyEnv: p.keyEnv });
  }
  return profiles;
}
export function providerRequest(p: CatalogueProvider, system: string, text: string, images: string[], maxOutputTokens = 3000) {
  if (!allowedModels[p.provider]?.includes(p.model)) throw new Error('Model chưa được kiểm tra chế độ không thinking.');
  if (p.provider === 'gemini') return {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text }, ...images.map(url => { const [header, data] = url.split(','); return { inlineData: { mimeType: header.slice(5).split(';')[0], data } }; })] }],
    generationConfig: { temperature: 0.2, maxOutputTokens, responseMimeType: 'application/json', thinkingConfig: { thinkingBudget: 0 } },
  };
  return { model: p.model, max_tokens: maxOutputTokens, temperature: 0.2, response_format: { type: 'json_object' },
    ...(p.provider === 'deepseek' ? { thinking: { type: 'disabled' } } : {}),
    messages: [{ role: 'system', content: system }, { role: 'user', content: [{ type: 'text', text }, ...images.map(url => ({ type: 'image_url', image_url: { url, detail: 'low' } }))] }],
  };
}
