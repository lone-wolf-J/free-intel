import { AIProvider, GenerateOptions, QuotaStatus } from "./ai-providers.js";
import { GroqProvider } from "./providers/groq.js";
import { GeminiProvider } from "./providers/gemini.js";
import { FallbackProvider } from "./providers/fallback.js";

export class AIRegistry {
  private providers: AIProvider[] = [];
  private primaryOrder: string[] = ["groq", "gemini", "fallback"];
  private lastUsedProvider: string | null = null;

  constructor() {
    this.providers = [
      new GroqProvider(),
      new GeminiProvider(),
      new FallbackProvider(),
    ];
  }

  getProvider(name: string): AIProvider | undefined {
    return this.providers.find(p => p.name === name);
  }

  getAvailableProviders(): AIProvider[] {
    return this.providers.filter(p => p.isAvailable());
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<{ text: string; provider: string }> {
    const available = this.getAvailableProviders();
    console.log("[AI Registry] Available providers:", available.map(p => p.name).join(", "));
    
    // Sort by priority order
    available.sort((a, b) => this.primaryOrder.indexOf(a.name) - this.primaryOrder.indexOf(b.name));
    
    let lastError: Error | null = null;
    
    for (const provider of available) {
      try {
        console.log(`[AI Registry] Trying ${provider.name}...`);
        const text = await provider.generate(prompt, options);
        this.lastUsedProvider = provider.name;
        return { text, provider: provider.name };
      } catch (e: any) {
        console.warn(`[AI Registry] ${provider.name} failed: ${e.message}`);
        if (e.message === "QUOTA_EXCEEDED") {
          // Quota exceeded - mark as unavailable for this session
        }
        continue;
      }
    }
    
    throw new Error("All AI providers exhausted");
  }

  async generateJSON<T>(prompt: string, options?: GenerateOptions): Promise<{ result: T; provider: string }> {
    const { text, provider } = await this.generate(prompt, options);
    console.log("[AI Registry] Raw response (first 500 chars):", text.substring(0, 500));
    
    // Try to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    let raw = jsonMatch ? jsonMatch[1].trim() : text.trim();
    
    // If still not valid JSON, try to find the first { and last }
    if (!raw.startsWith('{')) {
      const firstBrace = raw.indexOf('{');
      const lastBrace = raw.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        raw = raw.substring(firstBrace, lastBrace + 1);
      }
    }
    
    // Clean common JSON issues
    raw = raw
      .replace(/,\s*}/g, '}')  // Remove trailing commas before }
      .replace(/,\s*]/g, ']')  // Remove trailing commas before ]
      .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3'); // Quote unquoted property names
    
    console.log("[AI Registry] Parsed JSON (first 200 chars):", raw.substring(0, 200));
    
    try {
      return { result: JSON.parse(raw), provider };
    } catch (e: any) {
      console.error("[AI Registry] JSON parse failed:", e.message);
      console.error("[AI Registry] Raw text (last 500 chars):", text.slice(-500));
      throw new Error(`JSON parse failed: ${e.message}`);
    }
  }

  async getAllStatus(): Promise<Record<string, any>> {
    const status: Record<string, any> = {};
    for (const provider of this.providers) {
      const quota = await provider.getQuotaStatus();
      status[provider.name] = {
        ...provider.getStatus(),
        quota,
      };
    }
    return status;
  }

  setPriorityOrder(order: string[]): void {
    this.primaryOrder = order;
  }

  getLastUsed(): string | null {
    return this.lastUsedProvider;
  }
}

// Singleton instance
export const aiRegistry = new AIRegistry();