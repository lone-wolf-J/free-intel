import fetch from "node-fetch";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent";

export async function geminiGenerate(
  prompt: string,
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");

  const res = await fetch(`${GEMINI_BASE}?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: options?.temperature ?? 0.3,
        maxOutputTokens: options?.maxTokens ?? 4096,
      },
    }),
  });

  const data = await res.json() as any;
  if (!res.ok) {
    throw new Error(`Gemini ${res.status}: ${JSON.stringify(data.error || data)}`);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini returned empty content");
  }
  return text;
}

export async function geminiGenerateJSON<T = any>(
  prompt: string,
  options?: { temperature?: number; maxTokens?: number }
): Promise<T> {
  const text = await geminiGenerate(prompt, options);
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = jsonMatch ? jsonMatch[1].trim() : text.trim();
  return JSON.parse(raw);
}
