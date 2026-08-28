import fetch from "node-fetch";
import { BaseProvider, AIProvider, GenerateOptions, QuotaStatus } from "../ai-providers.js";

export class GeminiProvider extends BaseProvider implements AIProvider {
  name = "gemini";
  private baseUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent";

  async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    if (!this.isAvailable()) throw new Error("Gemini unavailable");

    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY not set");

    try {
      const res = await fetch(`${this.baseUrl}?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: options?.temperature ?? 0.3,
            maxOutputTokens: options?.maxTokens ?? 8192,
          },
        }),
      });

      const data = await res.json() as any;
      
      if (!res.ok) {
        if (res.status === 429 || data.error?.message?.includes("quota")) {
          throw new Error("QUOTA_EXCEEDED");
        }
        throw new Error(data.error?.message || `HTTP ${res.status}`);
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Empty response");
      
      this.recordSuccess();
      return text;
    } catch (e: any) {
      if (e.message === "QUOTA_EXCEEDED") {
        this.recordFailure("QUOTA_EXCEEDED");
        throw e;
      }
      this.recordFailure(e.message);
      throw e;
    }
  }

  async getQuotaStatus(): Promise<QuotaStatus> {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return { available: false, error: "GEMINI_API_KEY not set" };
    
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
      const available = res.ok && this.isAvailable();
      return { available };
    } catch {
      return { available: false, error: "Network error" };
    }
  }
}