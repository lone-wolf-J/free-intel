# FREE//INTEL

**Live Free Resource Intelligence platform. Real data only.**

Every resource in the database was discovered by live crawls (GitHub API, RSS/Atom
feeds, official pricing pages). If the database is empty, the site shows empty.
No demo mode. No seeded data. No fabricated activity, savings, or statistics.

## Run locally

```bash
npm install
npm run dev          # API :8787 · Web :5173
```

The database starts **empty**. Populate it with real discovery:

```bash
npm run bootstrap    # wipes local DB, then crawls real sources
```

## Secrets (all free, none required to boot)

| Variable         | Effect when set                                                        |
|------------------|------------------------------------------------------------------------|
| `GITHUB_TOKEN`   | 5,000 req/hr GitHub discovery instead of 60. Strongly recommended.     |
| `GEMINI_API_KEY` | Enables LLM-assisted pricing extraction, product resolution, capability tagging. Without it everything falls back to deterministic heuristics and stays honestly labeled UNVERIFIED. |
| `CRON_SECRET`    | Protects `POST /api/scans/run` in production.                          |

Set them for the Node dev server via your shell or `.env`-style export before
`npm run dev`. For Workers, use `.dev.vars` locally and
`wrangler secret put <NAME>` in production.

## Continuous discovery ($0)

- **Local**: re-run `npm run bootstrap` anytime; it resumes from the persisted queue.
- **Production (Cloudflare Workers free)**: `wrangler.jsonc` registers an hourly cron
  trigger that calls the crawler batch runner (~25 fetches/run, budget-capped).
  Optionally enable `.github/workflows/crawl.yml` as a second path by setting repo
  secrets `INTEL_API_URL` + `CRON_SECRET`.

## How truth is enforced

- Every resource row carries an origin (`crawler`, `resolver`, `user`) and evidence
  rows with claim + verbatim snippet + source URL + method + confidence.
- Verification pipeline: DISCOVERED → ANALYZING → CLASSIFIED → VERIFIED → PUBLISHED
  → MONITORED. Failures become UNVERIFIED/SUSPENDED/EXPIRED — never deleted silently.
- Pricing pages are hash-monitored: any change downgrades stored pricing to
  UNVERIFIED until re-extraction.
- Save Money never treats unknown spend as $0. You enter your actual cost, or opt in
  to an explicitly-labeled ESTIMATED FROM PUBLIC PRICING figure.
- Replacement recommendations require a declared relationship
  (`alternative to X` evidence) — unrelated components are never suggested.

## Stack

React 18 · TypeScript · Vite · Tailwind · Framer Motion · Hono · Cloudflare D1 ·
GitHub API · RSS · optional Gemini free tier.
