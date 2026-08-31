export const PIPELINE: string[] = [
  "DISCOVERED", "ANALYZING", "CLASSIFIED", "VERIFIED", "PUBLISHED", "MONITORED"
];

export interface Evidence {
  id: number;
  claim: string;
  source_url: string | null;
  evidence_text: string | null;
  retrieved_at: string;
  method: string;
  confidence: number;
}

export interface Plan {
  name: string;
  price_month: number | null;
  billing?: string | null;
  has_free_tier?: boolean;
}

export interface Resource {
  id: number;
  slug: string;
  name: string;
  description: string;
  provider: string | null;
  capability: string | null;
  category: string | null;
  subcategory: string | null;
  tags: string[];
  capabilities: string[];
  url: string | null;
  docs_url: string | null;
  pricing_url: string | null;
  github_url: string | null;
  resource_type: string;
  free_types: string[];
  free_allowance: string | null;
  free_limits: string | null;
  personal_use: string;
  commercial_use: string;
  license: string | null;
  card_required: string;
  self_hostable: string;
  infrastructure_note: string | null;
  infra_cost_month: number | null;
  alt_of: string | null;
  alt_kind: string | null;
  expires_at: string | null;
  price_last_checked: string | null;
  first_discovered: string | null;
  last_verified: string | null;
  verification_status: string;
  free_score: number;
  free_score_components: Record<string, number>;
  confidence_score: number;
  popularity: number | null;
  forks: number | null;
  github_last_push: string | null;
  security_notes: string | null;
  difficulty: string;
  origin: string;
}

export interface RadarEvent {
  id: number;
  type: string;
  title: string;
  detail: string | null;
  resource_id: number | null;
  severity: string;
  created_at: string;
  resource_slug?: string | null;
  resource_name?: string | null;
}

export interface Scan {
  id: number;
  kind: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  discovered: number;
  notes: string | null;
}

export interface RadarStatus {
  last_scan: Scan | null;
  resources: {
    total: number; verified: number; unverified: number;
    github: number; open_source: number; expiring: number; alternatives: number;
  } | null;
  active_sources: number;
  events_24h: number;
  crawl_queue: { status: string; n: number }[];
  server_time: string;
}

export interface StackPlan {
  goal: string;
  project_name?: string;
  description?: string;
  matched_layers?: string[];
  tool_replacements?: Array<{
    replacing: string;
    alternatives: Array<{ name: string; slug: string; url?: string; description?: string; score: number; efficiency: number; source: string; reasoning?: string; key_differences?: string[] }>;
    note?: string;
  }>;
  layers: Record<string, Resource[]> | Array<{
    layer: string;
    capability: string;
    purpose: string;
    tools: Array<{
      name: string; slug?: string; url: string; description?: string; score: number;
      source: string; free?: boolean; open_source?: boolean; self_hostable?: boolean;
      reasoning?: string; stars?: number; license?: string; note?: string;
    }>;
  }>;
  estimated_monthly_cost?: string;
  setup_complexity?: string;
  notes?: string;
  total_tools?: number;
  note?: string;
  integrity_note?: string;
}

export interface CostAnalysisLine {
  tool: string;
  resolved: boolean;
  status: string;
  current_cost?: number;
  cost_basis?: string;
  possible_cost?: number;
  monthly_saving?: number;
  annual_saving?: number;
  message?: string;
  replacement?: {
    slug: string; name: string; description?: string; score?: number; efficiency?: number;
    relationship: string; free_score?: number; license?: string | null;
    caveats?: string | null; notes?: string | null; url?: string;
    reasoning?: string; key_differences?: string[];
  };
  also_considered?: Array<{ name: string; slug: string; description?: string; score?: number; efficiency?: number; relationship?: string; url?: string; reasoning?: string }>;
  alternatives?: Array<{ name: string; slug: string; description?: string; score?: number; efficiency?: number; kind?: string; url?: string; reasoning?: string; key_differences?: string[] }>;
  recommendation?: string;
}

export interface CostAnalysis {
  total_monthly_spend_entered: number;
  estimated_monthly_saving: number;
  estimated_annual_saving: number;
  lines_analyzed: number;
  lines_awaiting_input: number;
  confidence_note: string;
  analyses: CostAnalysisLine[];
}

export interface Alternative {
  name: string;
  slug: string;
  url?: string;
  description?: string;
  score?: number;
  efficiency?: number;
  savings_pct?: number;
  kind?: string;
  relationship?: string;
  free_score?: number;
  reasoning?: string;
  key_differences?: string[];
  notes?: string;
  source?: string;
}

export interface ProductResolution {
  resolved: boolean;
  resolved_via?: string;
  message?: string;
  current_price?: number | null;
  alternatives?: Alternative[];
  product?: {
    slug: string; name: string; provider: string | null; category: string | null;
    description: string; website: string | null; pricing_url: string | null;
    pricing_last_checked: string | null; plans: Plan[]; free_types: string[];
  };
  pricing_status?: string;
  evidence?: Evidence[];
}

export interface AlternativeSearchResult {
  tool: string;
  in_seed_database: boolean;
  results: Alternative[];
  sources_checked: string[];
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...init
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const b: any = await res.json();
      if (b?.message) msg = b.message;
      else if (b?.error) msg = b.error;
    } catch { /* default */ }
    throw new Error(msg);
  }
  return res.json();
}

export const api = {
  resources: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return req<{ count: number; items: Resource[] }>(`/resources${qs ? `?${qs}` : ""}`);
  },
  aiSearch: (q: string) =>
    req<{ count: number; items: Resource[]; query: string; expanded_terms: string[] }>(
      `/resources/ai-search`, { method: "POST", body: JSON.stringify({ q }) }
    ),
  facets: () =>
    req<{ categories: { category: string; n: number }[]; types: { t: string; n: number }[] }>("/resources/facets"),
  capabilities: () => req<{ capabilities: { cap: string; n: number }[] }>("/capabilities"),
  resource: (slug: string) =>
    req<{ resource: Resource; evidence: Evidence[]; alternatives: Resource[] }>(`/resources/${slug}`),
  radarEvents: (limit = 30) => req<{ events: RadarEvent[] }>(`/radar/events?limit=${limit}`),
  radarStatus: () => req<RadarStatus>(`/radar/status`),
  githubScan: (query: string) =>
    req<{ ok: boolean; message: string; discovered: number; errors: string[] }>(
      `/radar/github-scan`, { method: "POST", body: JSON.stringify({ query }) }
    ),
  scanRun: (action: string = "batch") =>
    req<{ ok: boolean; processed: number; discovered: number; verified: number; expired: number; errors: string[]; message: string }>(
      `/scans/run`, { method: "POST", body: JSON.stringify({ action }) }
    ),
  daily: () =>
    req<{
      event_counts: { type: string; n: number }[];
      new_resources: Resource[];
      expiring_soon: { name: string; slug: string; expires_at: string }[];
    }>(`/daily`),
  resolveProduct: (name: string) =>
    req<ProductResolution>(`/products/resolve`, { method: "POST", body: JSON.stringify({ name }) }),
  generateStack: (goal: string) =>
    req<StackPlan>(`/stacks/generate`, { method: "POST", body: JSON.stringify({ goal }) }),
  analyzeCosts: (tools: { name: string; monthly_cost?: number | null; use_estimate?: boolean }[]) =>
    req<CostAnalysis>(`/cost/analyze`, { method: "POST", body: JSON.stringify({ tools }) }),
  submit: (payload: { url: string; name?: string; description?: string; why_useful?: string }) =>
    req<{ ok: boolean; message: string }>(`/submissions`, { method: "POST", body: JSON.stringify(payload) }),
  searchAlternatives: (tool: string) =>
    req<AlternativeSearchResult>(`/products/search-alternatives`, { method: "POST", body: JSON.stringify({ tool }) }),
  adminOverview: () => req<any>(`/admin/overview`),
  adminSubmissionAction: (id: number, action: string) =>
    req<any>(`/admin/submissions/${id}`, { method: "POST", body: JSON.stringify({ action }) }),
  adminResourceAction: (slug: string, action: string) =>
    req<any>(`/admin/resources/${slug}`, { method: "POST", body: JSON.stringify({ action }) })
};
