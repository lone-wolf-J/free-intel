const STRONG_SIGNALS: Array<[RegExp, number]> = [
  [/\bfree tier\b/i, 30],
  [/\bfree\b/i, 18],
  [/\bopen[- ]source\b/i, 22],
  [/\bopen[- ]?sourced\b/i, 20],
  [/\bmcp\b|model context protocol/i, 32],
  [/\bai agent|\bagentic\b/i, 18],
  [/\bcredits?\b/i, 18],
  [/\bgives? away\b|\bfree credits?\b/i, 22],
  [/\bpromotion|\bpromo\b|\blimited time\b/i, 14],
  [/\bself[- ]host/i, 18],
  [/\balternative to\b|\breplaces?\b/i, 12],
  [/\bno credit card\b/i, 20],
  [/\bpermanently free\b|\bfree forever\b/i, 24],
  [/\bnow free\b|\bgoes free\b|\bmade free\b/i, 26],
  [/\bpricing (change|update)|\bcut prices\b|\bslashes? prices?\b/i, 24],
  [/\bbeta (access|program)|\bearly access\b/i, 8]
];

const NOISE = [
  /\bhiring\b/i,
  /\bsalary\b/i,
  /\bnft\b/i,
  /\bcrypto(?!graphy)\b/i,
  /\bgiveaway winners\b/i
];

export interface Classification {
  relevant: boolean;
  score: number;
  matched: string[];
  guessedCategory: string | null;
  guessedFreeType: string | null;
}

function guessCategory(text: string): string | null {
  if (/\bmcp\b|model context protocol/i.test(text)) return "MCP";
  if (/ocr|speech|image generation|video generation|\bllm\b|\bmodel\b/i.test(text)) return "AI";
  if (/database|postgres|sqlite|vector/i.test(text)) return "Databases";
  if (/hosting|deploy|serverless|edge/i.test(text)) return "Hosting";
  if (/automat|workflow|zapier/i.test(text)) return "Automation";
  if (/monitor|observab/i.test(text)) return "Infrastructure";
  if (/hr|recruit|hiring pipeline/i.test(text)) return "HR";
  if (/design|figma|canva/i.test(text)) return "Design";
  return "Developer tools";
}

function guessFreeType(text: string): string | null {
  if (/limited time|promotion|promo code|expires/i.test(text)) return "limited_promotion";
  if (/credits?\b/i.test(text)) return "free_credits";
  if (/open[- ]source/i.test(text)) return "open_source";
  if (/free tier|free plan/i.test(text)) return "free_tier";
  if (/\bfree\b/i.test(text)) return "free_tier";
  return null;
}

export function classifyText(text: string): Classification {
  const hay = text.slice(0, 3000);
  let score = 0;
  const matched: string[] = [];
  for (const [re, pts] of STRONG_SIGNALS) {
    if (re.test(hay)) {
      score += pts;
      matched.push(re.source.replace(/\\b/g, "").slice(0, 30));
    }
  }
  for (const re of NOISE) {
    if (re.test(hay)) score -= 25;
  }
  return {
    relevant: score >= 30,
    score,
    matched,
    guessedCategory: guessCategory(hay),
    guessedFreeType: guessFreeType(hay)
  };
}

export function slugFromUrl(url: string, fallbackTitle: string): string {
  try {
    const u = new URL(url);
    const pathPart = u.pathname.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 50);
    const host = u.hostname.replace(/^www\./, "").split(".")[0];
    const base = pathPart || fallbackTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50);
    return `${host}-${base}`.replace(/-+/g, "-").slice(0, 90);
  } catch {
    return fallbackTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60);
  }
}
