// Claude via de officiële SDK: Messages API met de server-side web search tool.
import Anthropic from '@anthropic-ai/sdk';

const MAX_VERVOLG = 5;

export async function vraagAnthropic({ model, systeem, prompt, maxUitvoer, maxZoek, apiKey = process.env.ANTHROPIC_API_KEY }) {
  const client = new Anthropic({ apiKey, timeout: 15 * 60 * 1000, maxRetries: 2 });
  const gebruik = { invoer: 0, cache_lees: 0, cache_schrijf: 0, uitvoer: 0, zoekopdrachten: 0 };
  const gevondenUrls = new Set();
  let messages = [{ role: 'user', content: prompt }];
  let laatste;
  for (let ronde = 0; ronde <= MAX_VERVOLG; ronde++) {
    const stream = client.beta.messages.stream({
      model,
      max_tokens: maxUitvoer,
      system: systeem,
      messages,
      tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: maxZoek }],
      output_config: { effort: 'medium' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    });
    laatste = await stream.finalMessage();
    const u = laatste.usage ?? {};
    gebruik.invoer += u.input_tokens ?? 0;
    gebruik.cache_lees += u.cache_read_input_tokens ?? 0;
    gebruik.cache_schrijf += u.cache_creation_input_tokens ?? 0;
    gebruik.uitvoer += u.output_tokens ?? 0;
    gebruik.zoekopdrachten += u.server_tool_use?.web_search_requests ?? 0;
    for (const blok of laatste.content) {
      if (blok.type === 'web_search_tool_result' && Array.isArray(blok.content)) {
        for (const r of blok.content) if (r.url) gevondenUrls.add(r.url);
      }
      if (blok.type === 'text') for (const c of blok.citations ?? []) if (c.url) gevondenUrls.add(c.url);
    }
    if (laatste.stop_reason !== 'pause_turn') break;
    messages = [{ role: 'user', content: prompt }, { role: 'assistant', content: laatste.content }];
  }
  if (laatste.stop_reason === 'refusal') throw new Error('Het model weigerde deze aanvraag.');
  if (laatste.stop_reason === 'max_tokens') throw new Error('Het antwoord was te lang en is afgebroken.');
  const tekst = laatste.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  return { tekst, gebruik, gevondenUrls, model: laatste.model ?? model };
}
