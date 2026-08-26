import type { Env } from "./util";

const GEMINI_MODEL_CANDIDATES = ["gemini-flash-latest", "gemini-3.5-flash-lite", "gemini-2.5-flash-lite"];
let resolvedModel: string | null = null;

export function llmAvailable(env: Env): boolean {
  return !!env.GEMINI_API_KEY;
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await Promise.race([p, new Promise<never>((_, rj) => setTimeout(() => rj(new Error("timeout")), ms))]);
  } finally {
    clearTimeout(t);
    void ctrl;
  }
}

export async function llmJson(env: Env, prompt: string, maxOutput = 1024): Promise<any | null> {
  if (!env.GEMINI_API_KEY) return null;
  const models = resolvedModel ? [resolvedModel] : GEMINI_MODEL_CANDIDATES;
  for (const model of models) {
    try {
      const res = await withTimeout(
        fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": env.GEMINI_API_KEY
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json", maxOutputTokens: maxOutput, temperature: 0.1 }
          })
        }),
        20000
      );
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        console.error(`[llm] ${model} -> ${res.status}: ${t.slice(0, 120)}`);
        continue;
      }
      const data: any = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) continue;
      resolvedModel = model;
      return JSON.parse(text);
    } catch (e) {
      console.error(`[llm] ${model} request failed:`, String((e as Error)?.message || e).slice(0, 100));
    }
  }
  return null;
}

export interface UrlCandidate {
  site?: string;
  pricing?: string;
}

export async function suggestProductUrls(env: Env, productName: string): Promise<UrlCandidate[]> {
  const out = await llmJson(
    env,
    `You are helping a free-resource intelligence platform resolve a product. For "${productName}", list up to 3 candidate official URLs to try, most likely first. Respond ONLY with JSON: {"candidates":[{"site":"https://...","pricing":"https://.../pricing"}]}. Use official domains only; null for unknown fields.`,
    400
  );
  if (!out || !Array.isArray(out.candidates)) return [];
  const clean = (u: unknown) => (typeof u === "string" && /^https:\/\/[^\s"]+$/.test(u) ? u : undefined);
  return out.candidates
    .map((c: any) => ({ site: clean(c?.site), pricing: clean(c?.pricing) }))
    .filter((c: UrlCandidate) => c.site || c.pricing)
    .slice(0, 3);
}

export async function extractPricingFromText(env: Env, pageText: string): Promise<any | null> {
  const trimmed = pageText.slice(0, 9000);
  return llmJson(
    env,
    `Below is text scraped from a vendor's pricing page. Extract ONLY what is literally present. Respond ONLY with JSON: {"plans":[{"name":string,"price_month":number|null,"currency":"USD"|string|null,"billing":string|null,"has_free_tier":boolean}],"free_allowance":string|null,"card_required":"yes"|"no"|"unknown","confidence":0-100,"quotes":[exact_verbatim_snippets_supporting_claims]}. Never invent numbers.\n\nPAGE TEXT:\n${trimmed}`,
    1600
  );
}

export async function extractCapabilities(env: Env, name: string, description: string, taxonomy: string[]): Promise<string[] | null> {
  const out = await llmJson(
    env,
    `Classify this tool into 1-3 capabilities from the fixed list. Respond ONLY with JSON {"capabilities":[...]}\nLIST: ${taxonomy.join(", ")}\nTOOL: ${name} — ${String(description).slice(0, 500)}`,
    120
  );
  if (!out?.capabilities || !Array.isArray(out.capabilities)) return null;
  const valid = out.capabilities.filter((c: unknown) => typeof c === "string" && taxonomy.includes(c)).slice(0, 3);
  return valid.length ? valid : null;
}
