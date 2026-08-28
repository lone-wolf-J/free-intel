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
    const available = this.getAvailableProviders().sort((a, b) => this.primaryOrder.indexOf(a.name) - this.primaryOrder.indexOf(b.name));
    let lastErr: any = null;
    for (const provider of available) {
      try {
        console.log(`[AI Registry] Trying ${provider.name} for JSON...`);
        const text = await provider.generate(prompt, options);
        console.log("[AI Registry] Raw response (first 500 chars):", text.substring(0, 500));
        let parsed = this.parseJsonRobust<T>(text);
        if (parsed) {
          this.lastUsedProvider = provider.name;
          // record success is inside provider
          return { result: parsed, provider: provider.name };
        }
        console.warn(`[AI Registry] ${provider.name} JSON parse failed, trying repair...`);
        try {
          const repairPrompt = `Fix this broken JSON and return ONLY valid JSON (no markdown, no explanation). Ensure all strings are properly escaped, no trailing commas, no unescaped newlines:\n\n${text.slice(0, 6000)}`;
          // Use same provider for repair if possible, else fallback
          const repairText = await provider.generate(repairPrompt, { temperature: 0, maxTokens: 4000 }).catch(() => text);
          const repairedParsed = this.parseJsonRobust<T>(repairText);
          if (repairedParsed) {
            console.log(`[AI Registry] ${provider.name} repair succeeded`);
            this.lastUsedProvider = provider.name;
            return { result: repairedParsed, provider: provider.name };
          }
        } catch (e: any) { console.warn(`[AI Registry] ${provider.name} repair failed:`, e.message); }
        lastErr = new Error(`${provider.name} JSON parse failed`);
        continue;
      } catch (e: any) {
        console.warn(`[AI Registry] ${provider.name} generate failed:`, e.message);
        lastErr = e;
        if (e.message === "QUOTA_EXCEEDED") continue;
        // For other errors, still try next provider
        continue;
      }
    }
    throw lastErr || new Error("All AI providers exhausted for JSON");
  }

  private parseJsonRobust<T>(text: string): T | null {
    // Extract from code blocks first
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    let raw = jsonMatch ? jsonMatch[1].trim() : text.trim();
    if (!raw.startsWith('{')) {
      const firstBrace = raw.indexOf('{');
      const lastBrace = raw.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        raw = raw.substring(firstBrace, lastBrace + 1);
      }
    }
    // Try direct parse
    try { return JSON.parse(raw) as T; } catch {}
    // Try with common fixes
    const fixes = [
      (s: string) => s.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']'),
      (s: string) => s.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3'),
      (s: string) => s.replace(/[\u0000-\u001F]+/g, " ").replace(/\n/g, "\\n").replace(/\r/g, ""),
      (s: string) => s.replace(/\\n/g, " ").replace(/\t/g, " "),
      (s: string) => {
        // Fix unescaped quotes inside values: replace "value with "unescaped" quote" patterns
        // Simple heuristic: balance quotes
        return s;
      },
    ];
    for (const fix of fixes) {
      try {
        const fixed = fix(raw);
        return JSON.parse(fixed) as T;
      } catch {}
    }
    // Try fallback extraction with line/column repair: remove problematic char at error position
    try {
      // Attempt to sanitize by removing control chars and fixing trailing
      let sanitized = raw.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
      // Fix common LLM mistake: single quotes around keys/values
      sanitized = sanitized.replace(/'/g, '"');
      return JSON.parse(sanitized) as T;
    } catch {}
    // Last resort: extract via fallback patterns
    return this.extractJSONFallback<T>(text);
  }

  private extractJSONFallback<T>(text: string): T | null {
    const patterns = [
      /\{[\s\S]*"person"[\s\S]*\}/,
      /\{[\s\S]*"sections"[\s\S]*\}/,
      /\{[\s\S]*"confidenceScore"[\s\S]*\}/,
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        try {
          let raw = match[0];
          raw = raw.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']').replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');
          raw = raw.replace(/[\u0000-\u001F]+/g, " ");
          return JSON.parse(raw) as T;
        } catch { continue; }
      }
    }
    return null;
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