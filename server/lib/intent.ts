const INTENT_RULES: Array<{
  key: string;
  capability?: string;
  categories?: string[];
  patterns: RegExp[];
}> = [
  {
    key: "recruiter",
    capability: "build-ai-recruitment-agent",
    categories: ["AI", "OCR"],
    patterns: [/recruit/i, /resume|cv\b/i, /candidate/i, /hiring/i, /applicant/i]
  },
  {
    key: "zapier",
    capability: "replace-zapier",
    categories: ["Automation"],
    patterns: [/zapier/i, /\bmake\.com\b/i, /workflow/i, /automat/i, /integrat/i]
  },
  {
    key: "hosting",
    capability: "host-a-site-for-free",
    categories: ["Hosting"],
    patterns: [/host/i, /deploy/i, /website|web ?site|landing/i, /static/i, /\bcdn\b/i]
  },
  {
    key: "ocr",
    capability: "add-ocr-capability",
    categories: ["AI"],
    patterns: [/ocr/i, /scan(ned)?/i, /text recognition/i, /extract text/i, /pdf.*text/i]
  },
  {
    key: "mcp",
    capability: "build-an-mcp-server",
    categories: ["MCP"],
    patterns: [/\bmcp\b/i, /model context protocol/i, /tool.?call/i]
  },
  {
    key: "agents",
    categories: ["AI"],
    patterns: [/agent/i, /crew|multi.?agent/i, /langchain/i]
  },
  {
    key: "llm",
    categories: ["AI"],
    patterns: [/\bllm\b/i, /gpt|openai|claude|llama|mistral|model/i, /inference/i, /chatbot|chat bot/i]
  },
  {
    key: "database",
    categories: ["Databases"],
    patterns: [/database|\bdbs?\b/i, /postgres|sqlite|mysql|mongo|firebase|supabase/i, /auth(entication)?|storage/i]
  },
  {
    key: "monitoring",
    categories: ["Infrastructure"],
    patterns: [/monitor|uptime/i, /observab|datadog|grafana/i, /status.?page/i]
  },
  {
    key: "replace",
    categories: [],
    patterns: [/replace|alternative|instead of|switch from|cheaper/i]
  }
];

export interface Intent {
  capabilities: string[];
  categories: string[];
  keywords: string[];
}

export function parseIntent(q: string): Intent {
  const out: Intent = { capabilities: [], categories: [], keywords: [] };
  if (!q) return out;
  for (const rule of INTENT_RULES) {
    const hit = rule.patterns.some((p) => p.test(q));
    if (!hit) continue;
    out.keywords.push(rule.key);
    if (rule.capability && !out.capabilities.includes(rule.capability))
      out.capabilities.push(rule.capability);
    for (const c of rule.categories || [])
      if (!out.categories.includes(c)) out.categories.push(c);
  }
  return out;
}
