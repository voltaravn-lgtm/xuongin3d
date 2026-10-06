import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogueProviders } from '../src/lib/aiCatalogueProviders.ts';
import { hasCatalogueKey, catalogueCheckRequest, checkCatalogueProvider } from '../src/lib/aiCatalogueCheck.ts';

test('key presence ignores empty/whitespace/ellipsis placeholders without exposing secrets', () => {
  for (const key of [undefined, '', '  ', '...', ' .... ']) assert.equal(hasCatalogueKey(key), false);
  assert.equal(hasCatalogueKey(' private-test-key '), true);
});
test('connection probe stays small, sends no images and disables thinking', () => {
  const profiles = catalogueProviders({});
  const ds = catalogueCheckRequest(profiles[0]) as any;
  assert.equal(ds.max_tokens, 64); assert.deepEqual(ds.thinking, { type: 'disabled' });
  assert.equal(ds.messages[1].content.length, 1);
  const gem = catalogueCheckRequest(profiles[2]) as any;
  assert.equal(gem.generationConfig.maxOutputTokens, 64);
  assert.equal(gem.generationConfig.thinkingConfig.thinkingBudget, 0);
  assert.equal(gem.contents[0].parts.length, 1);
});
test('successful OpenAI-compatible and Gemini probes return actual usage', async () => {
  const profiles = catalogueProviders({});
  for (const p of profiles) {
    const mock = (async (_url, options) => {
      const headers = options?.headers as Record<string, string>;
      assert.equal(p.provider === 'gemini' ? headers['x-goog-api-key'] : headers.Authorization, p.provider === 'gemini' ? 'secret' : 'Bearer secret');
      return Response.json(p.provider === 'gemini'
        ? { candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }], usageMetadata: { promptTokenCount: 20, candidatesTokenCount: 5, thoughtsTokenCount: 0 } }
        : { choices: [{ message: { content: '{"ok":true}' } }], usage: { prompt_tokens: 20, completion_tokens: 5 } });
    }) as typeof fetch;
    assert.deepEqual(await checkCatalogueProvider(p, ' secret ', mock), { input: 20, output: 5 });
  }
});
test('failure explains HTTP status without returning provider error bodies or keys', async () => {
  const p = catalogueProviders({})[0];
  for (const status of [401, 402, 403, 404, 429, 500]) {
    await assert.rejects(checkCatalogueProvider(p, 'SUPER-SECRET', (async () => new Response('SUPER-SECRET', { status })) as typeof fetch), (error: Error) => error.message.includes(`HTTP ${status}`) && !error.message.includes('SUPER-SECRET'));
  }
});
test('probe never reports success for malformed output or enabled thinking', async () => {
  const p = catalogueProviders({})[0];
  for (const data of [
    { choices: [{ message: { content: 'not JSON' } }] },
    { choices: [{ message: { content: '{"ok":false}' } }] },
    { choices: [{ message: { content: '{"ok":true}', reasoning_content: 'thought' } }] },
    { choices: [{ message: { content: '{"ok":true}' } }], usage: { completion_tokens_details: { reasoning_tokens: 2 } } },
  ]) await assert.rejects(checkCatalogueProvider(p, 'secret', (async () => Response.json(data)) as typeof fetch));
});
