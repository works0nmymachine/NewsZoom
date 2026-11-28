// OpenAI via de officiële SDK: Responses API met de web_search tool.
import OpenAI from 'openai';

export async function vraagOpenAI({ model, systeem, prompt, maxUitvoer, maxZoek, apiKey = process.env.OPENAI_API_KEY }) {
  const client = new OpenAI({ apiKey, timeout: 15 * 60 * 1000, maxRetries: 2 });
  const r = await client.responses.create({
    model,
    instructions: systeem,
    input: prompt,
    tools: [{ type: 'web_search' }],
    max_tool_calls: maxZoek,
    max_output_tokens: maxUitvoer,
  });
  const u = r.usage ?? {};
  const cache = u.input_tokens_details?.cached_tokens ?? 0;
  const zoek = (r.output ?? []).filter((o) => o.type === 'web_search_call' && (!o.action || o.action.type === 'search')).length;
  const gevondenUrls = new Set();
  for (const o of r.output ?? []) {
    if (o.type === 'message') for (const c of o.content ?? []) for (const a of c.annotations ?? []) if (a.type === 'url_citation' && a.url) gevondenUrls.add(a.url);
    if (o.type === 'web_search_call') for (const s of o.action?.sources ?? []) if (s.url) gevondenUrls.add(s.url);
  }
  if (r.status === 'incomplete') throw new Error(`Antwoord onvolledig (${r.incomplete_details?.reason ?? 'onbekend'}).`);
  return {
    tekst: r.output_text ?? '',
    gebruik: { invoer: Math.max(0, (u.input_tokens ?? 0) - cache), cache_lees: cache, cache_schrijf: 0, uitvoer: u.output_tokens ?? 0, zoekopdrachten: zoek },
    gevondenUrls,
    model: r.model ?? model,
  };
}
