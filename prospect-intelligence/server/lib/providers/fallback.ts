import { BaseProvider, AIProvider, GenerateOptions, QuotaStatus } from "../ai-providers.js";

export class FallbackProvider extends BaseProvider implements AIProvider {
  name = "fallback";
  private requestCount = 0;

  async generate(prompt: string): Promise<string> {
    if (!this.isAvailable()) throw new Error("Fallback unavailable");
    
    this.requestCount++;
    if (this.requestCount > 1000) {
      this.available = false;
      throw new Error("Fallback limit reached");
    }

    // Generate structured fallback based on prompt keywords
    const lowerPrompt = prompt.toLowerCase();
    
    // Extract entity from prompt
    const nameMatch = prompt.match(/(?:for|analyze|research)\s*[:"]?\s*["']?([^"'\n]+)/i);
    const entityName = nameMatch?.[1]?.trim() || "the subject";

    // Determine if it's a person or company
    const isPerson = /(director|vp|ceo|cto|founder|manager|engineer|analyst|officer|president)/i.test(prompt);
    const isCompany = /(company|inc|corp|llc|ltd|startup|enterprise)/i.test(prompt);

    // Generate structured JSON response
    const response = this.buildFallbackResponse(entityName, isPerson, isCompany, prompt);
    
    this.recordSuccess();
    return JSON.stringify(response, null, 2);
  }

  private buildFallbackResponse(entityName: string, isPerson: boolean, isCompany: boolean, prompt: string) {
    const now = new Date().toISOString().split('T')[0];
    
    if (isPerson) {
      return {
        person: {
          name: entityName,
          title: "Title unknown — AI quota exhausted",
          company: "Company unknown",
          location: "Location unknown",
          email: null,
          linkedin: null
        },
        company: {
          name: "Company unknown",
          industry: "Industry unknown",
          size: "Unknown",
          revenue: null,
          founded: null,
          headquarters: null,
          website: null,
          description: "AI quota exhausted — using fallback mode"
        },
        sections: [
          { title: "Executive Summary", items: [{ label: "Overview", value: `AI quota exhausted. Using deterministic fallback for ${entityName}. All AI providers (Groq, Gemini) have exhausted their free tier quotas. Manual research recommended.` }] },
          { title: "Executive Profile", items: [
            { label: "Name", value: entityName },
            { label: "Current Title", value: "Title unknown — AI quota exhausted" },
            { label: "Organization", value: "Unknown" },
            { label: "Industry", value: "Unknown" },
            { label: "Location", value: "Unknown" }
          ]},
          { title: "Career Progression", items: [{ label: "History", value: "AI quota exhausted — manual research required" }] },
          { title: "Current Role & Responsibilities", items: [{ label: "Scope", value: "AI quota exhausted — manual research required" }] },
          { title: "Organization Intelligence", items: [{ label: "Company", value: "AI quota exhausted — manual research required" }] },
          { title: "Recent Public Activity", items: [{ label: "Activity", value: "AI quota exhausted — manual research required" }] },
          { title: "Thought Leadership Analysis", items: [{ label: "Analysis", value: "AI quota exhausted — manual research required" }] },
          { title: "Professional Interests", items: [{ label: "Interests", value: "AI quota exhausted — manual research required" }] },
          { title: "Technology Landscape", items: [{ label: "Stack", value: "AI quota exhausted — manual research required" }] },
          { title: "Business Priorities", items: [{ label: "Priority", value: "AI quota exhausted — manual research required" }] },
          { title: "Buying Signal Analysis", items: [{ label: "Signal", value: "AI quota exhausted — manual research required" }] },
          { title: "Business Challenges", items: [{ label: "Challenge", value: "AI quota exhausted — manual research required" }] },
          { title: "Stakeholder & Influence Assessment", items: [{ label: "Assessment", value: "AI quota exhausted — manual research required" }] },
          { title: "Relationship Indicators", items: [{ label: "Indicator", value: "AI quota exhausted — manual research required" }] },
          { title: "Strategic Sales Assessment", items: [{ label: "Opportunity", value: "AI quota exhausted — manual research required" }] },
          { title: "Personalized Conversation Starters", items: [{ label: "Opener", value: "AI quota exhausted — manual research required" }] },
          { title: "Discovery Questions", items: [{ label: "Question", value: "AI quota exhausted — manual research required" }] },
          { title: "Recommended Outreach Strategy", items: [{ label: "Strategy", value: "AI quota exhausted — manual research required" }] },
          { title: "Risks & Unknowns", items: [{ label: "Risk", value: "All AI providers exhausted. Results are deterministic fallback only." }] },
          { title: "Confidence Assessment", items: [{ label: "Assessment", value: "0% confidence — all AI providers exhausted, using deterministic fallback" }] }
        ],
        aiInsights: [
          "INSIGHT 1: All AI providers (Groq, Gemini) have exhausted free tier quotas. Cannot perform live intelligence gathering.",
          "INSIGHT 2: Results above are deterministic fallback templates. All fields marked 'unknown' or 'AI quota exhausted'.",
          "INSIGHT 3: To restore AI intelligence, either wait for quota reset (24h for Gemini, higher limits on Groq), add API keys, or enable billing."
        ],
        confidenceScore: 0
      };
    }

    // Company fallback
    return {
      person: { name: entityName, title: "", company: entityName, location: "", email: null, linkedin: null },
      company: { name: entityName, industry: "Unknown", size: "Unknown", revenue: null, founded: null, headquarters: "", website: "", description: "AI quota exhausted" },
      sections: [
        { title: "Executive Summary", items: [{ label: "Overview", value: `AI quota exhausted. Using deterministic fallback for ${entityName}.` }] },
        { title: "Executive Profile", items: [{ label: "Name", value: entityName }, { label: "Current Title", value: "N/A" }, { label: "Organization", value: entityName }, { label: "Industry", value: "Unknown" }, { label: "Location", value: "Unknown" }] },
        { title: "Career Progression", items: [{ label: "History", value: "AI quota exhausted" }] },
        { title: "Current Role & Responsibilities", items: [{ label: "Scope", value: "AI quota exhausted" }] },
        { title: "Organization Intelligence", items: [{ label: "Company", value: "AI quota exhausted" }] },
        { title: "Recent Public Activity", items: [{ label: "Activity", value: "AI quota exhausted" }] },
        { title: "Thought Leadership Analysis", items: [{ label: "Analysis", value: "AI quota exhausted" }] },
        { title: "Professional Interests", items: [{ label: "Interests", value: "AI quota exhausted" }] },
        { title: "Technology Landscape", items: [{ label: "Stack", value: "AI quota exhausted" }] },
        { title: "Business Priorities", items: [{ label: "Priority", value: "AI quota exhausted" }] },
        { title: "Buying Signal Analysis", items: [{ label: "Signal", value: "AI quota exhausted" }] },
        { title: "Business Challenges", items: [{ label: "Challenge", value: "AI quota exhausted" }] },
        { title: "Stakeholder & Influence Assessment", items: [{ label: "Assessment", value: "AI quota exhausted" }] },
        { title: "Relationship Indicators", items: [{ label: "Indicator", value: "AI quota exhausted" }] },
        { title: "Strategic Sales Assessment", items: [{ label: "Opportunity", value: "AI quota exhausted" }] },
        { title: "Personalized Conversation Starters", items: [{ label: "Opener", value: "AI quota exhausted" }] },
        { title: "Discovery Questions", items: [{ label: "Question", value: "AI quota exhausted" }] },
        { title: "Recommended Outreach Strategy", items: [{ label: "Strategy", value: "AI quota exhausted" }] },
        { title: "Risks & Unknowns", items: [{ label: "Risk", value: "All AI providers exhausted" }] },
        { title: "Confidence Assessment", items: [{ label: "Assessment", value: "0% confidence — all AI providers exhausted" }] }
      ],
      aiInsights: [
        "All AI providers exhausted. Using deterministic fallback.",
        "Add API keys or enable billing to restore live AI intelligence.",
        "Cached results from previous successful queries will still work."
      ],
      confidenceScore: 0
    };
  }

  async getQuotaStatus(): Promise<QuotaStatus> {
    return { available: this.isAvailable(), remaining: Math.max(0, 1000 - this.requestCount) };
  }
}