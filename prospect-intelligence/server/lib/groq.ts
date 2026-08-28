import { Groq } from "groq-sdk";

const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

const MODEL = "llama-3.1-8b-instant";

export async function groqGenerate(
  prompt: string,
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  if (!groq) throw new Error("GROQ_API_KEY not set");
  const res = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: options?.temperature ?? 0.3,
    max_tokens: options?.maxTokens ?? 8192,
  });
  const text = res.choices[0]?.message?.content;
  if (!text) throw new Error("Groq returned empty content");
  return text;
}

export async function groqGenerateJSON<T = any>(
  prompt: string,
  options?: { temperature?: number; maxTokens?: number }
): Promise<T> {
  if (!groq) throw new Error("GROQ_API_KEY not set");
  const text = await groqGenerate(prompt, options);
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = jsonMatch ? jsonMatch[1].trim() : text.trim();
  return JSON.parse(raw);
}