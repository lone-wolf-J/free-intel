import { BaseProvider, AIProvider, GenerateOptions, QuotaStatus } from "../ai-providers.js";

let GroqClass: any = null;

async function loadGroq() {
  if (!GroqClass) {
    const mod = await import("groq-sdk");
    GroqClass = mod.Groq || mod.default?.Groq || mod.default;
  }
  return GroqClass;
}

export class GroqProvider extends BaseProvider implements AIProvider {
  name = "groq";
  private client: any = null;
  private model = "openai/gpt-oss-20b";

  private async getClient(): Promise<any> {
    if (!this.client) {
      const key = process.env.GROQ_API_KEY;
      if (!key) throw new Error("GROQ_API_KEY not set");
      const Groq = await loadGroq();
      this.client = new Groq({ apiKey: key });
      console.log("[GroqProvider] Client created on first use");
    }
    return this.client;
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    if (!this.isAvailable()) throw new Error("Groq unavailable");
    
    try {
      console.log("[GroqProvider] Prompt length:", prompt.length);
      console.log("[GroqProvider] Generating with model:", this.model);
      const client = await this.getClient();
      const res = await client.chat.completions.create({
        model: this.model,
        messages: [{ role: "user", content: prompt }],
        temperature: options?.temperature ?? 0.3,
        max_tokens: options?.maxTokens ?? 8192,
      });
      const text = res.choices[0]?.message?.content;
      if (!text) throw new Error("Empty response");
      this.recordSuccess();
      console.log("[GroqProvider] Generation successful, usage:", res.usage);
      return text;
    } catch (e: any) {
      this.recordFailure(e.message);
      console.warn("[GroqProvider] Generation failed:", e.message);
      throw e;
    }
  }

  async getQuotaStatus(): Promise<QuotaStatus> {
    try {
      await this.getClient();
      return { available: this.isAvailable() };
    } catch {
      return { available: false, error: "GROQ_API_KEY not set" };
    }
  }
}