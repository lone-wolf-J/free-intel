# Prospect Intelligence — Build Plan

## Overview
A 3-page AI-native web application for prospect research, pipeline management, and outreach — built with $0 cost, full immersive futuristic UI.

---

## Tech Stack (Fresh Project)

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | React 18 + TypeScript + Vite | Fast, modern, great DX |
| Styling | Tailwind CSS + custom glassmorphism | Existing design DNA, infinite customization |
| Animation | Framer Motion + CSS keyframes | Motion graphics, page transitions, micro-interactions |
| Backend | Hono (Node.js) | Lightweight, edge-ready, already familiar |
| Database | Neon PostgreSQL (free tier: 0.5GB) | Structured data, relational queries for pipeline |
| AI | Google Gemini API free tier (15 RPM) | Analysis, summarization, entity extraction |
| Search | Web scraping (Google, Bing, company sites) | Free raw data collection |
| Deploy | Vercel (frontend) + Vercel/serverless (API) | $0 hosting |

---

## Architecture

```
prospect-intelligence/
├── src/
│   ├── components/
│   │   ├── fx/           # BackgroundFX, ParticleField, GlowRing, ScanLine
│   │   ├── layout/       # Nav, Footer, PageTransition
│   │   ├── ui/           # GlassCard, NeonButton, HoloPanel, Chip, Badge, Input
│   │   ├── prospect/     # ProspectCard, CaseView, PipelineColumn, PitchEditor
│   │   └── charts/       # MiniSparkline, ConnectionWeb
│   ├── pages/
│   │   ├── FindThem.tsx       # Page 1: Search & Intelligence Gathering
│   │   ├── IntelligenceDeck.tsx # Page 2: Cases, Pipeline, Analytics
│   │   └── ActionCenter.tsx   # Page 3: Pitch Builder & Outreach
│   ├── lib/
│   │   ├── api.ts          # API client
│   │   ├── gemini.ts       # Gemini API integration helpers
│   │   ├── scraper.ts      # Web scraping utilities
│   │   ├── db.ts           # Neon DB client
│   │   └── sound.ts        # Sound effects
│   ├── hooks/
│   │   ├── useSearch.ts    # Debounced search + AI analysis
│   │   ├── usePipeline.ts  # Pipeline CRUD + stage transitions
│   │   └── usePitch.ts     # Pitch generation + editing
│   ├── styles/
│   │   └── index.css       # Global styles, glassmorphism, animations
│   ├── App.tsx
│   └── main.tsx
├── server/
│   ├── index.ts
│   ├── routes/
│   │   ├── search.ts       # POST /api/search — orchestrates scraping + AI
│   │   ├── cases.ts        # CRUD /api/cases
│   │   ├── pipeline.ts     # PATCH /api/pipeline — stage transitions
│   │   └── pitch.ts        # POST /api/pitch — AI pitch generation
│   └── lib/
│       ├── gemini.ts       # Server-side Gemini calls
│       ├── scraper.ts      # Server-side web scraping
│       └── db.ts           # Neon DB queries
├── db/
│   └── schema.sql          # Database schema
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── .env
```

---

## Page 1: "Find Them" — Intelligence Gathering

### UI Design
- **Hero section**: Full-screen with animated particle field, glowing search bar center-stage
- **Search input**: Large glassmorphic input with holographic border glow, supports:
  - Person name / full name
  - Company name + role
  - LinkedIn URL
  - Any freeform details
- **Search button**: Animated neon button with pulse effect on click
- **Results panel**: Slides up from bottom with Framer Motion, shows intelligence case being built in real-time

### AI Workflow
1. User enters search query
2. **Backend orchestrates**:
   a. **Web scraping** (parallel): Google search, Bing search, LinkedIn public pages, company websites, news sites
   b. **Gemini analysis**: Takes raw scraped data → extracts structured intel:
      - Full name, title, company
      - LinkedIn profile (if found)
      - Company details (size, revenue range, industry, HQ location)
      - Recent news/press releases
      - Social media presence
      - Tech stack (if tech company)
      - Key interests, pain points (inferred)
      - Decision-making signals
   c. **Cross-reference**: Compare findings across sources, flag confidence levels
3. **Result**: A structured "Case" object displayed as a futuristic dossier

### Case Dossier UI
- Holographic card with tilt effect
- Sections: Identity, Company Intel, Digital Footprint, News & Signals, AI-Generated Insights
- Confidence meter (animated gauge)
- "Add to Pipeline" button → pushes to Page 2

---

## Page 2: "Intelligence Deck" — Pipeline & Analytics

### UI Design
- **Kanban-style pipeline** with 4 columns: New → Qualified → Engaged → Closed
- Each column has glassmorphic cards with prospect info
- **Drag-and-drop** between columns (react-beautiful-dnd or custom)
- **Filters sidebar**: Industry, Location, Company Size, Revenue, Expertise, Score
- **Connection Map**: Visual graph showing relationships between prospects (companies in same industry, people at same company, shared connections)
- **Stats bar**: Animated counters showing total prospects, conversion rates, pipeline value

### Intelligence Layer
- **Cross-prospect analysis**: When you have 10+ searches, the system finds:
  - Common industries/verticals
  - Overlapping company connections
  - Geographic clusters
  - Role/title patterns
  - Tech stack overlaps
- **Auto-categorization**: AI automatically tags and groups prospects
- **Smart suggestions**: "You have 5 prospects in FinTech — consider a vertical pitch"

### Data Model
```sql
-- Cases table
CREATE TABLE cases (
  id SERIAL PRIMARY KEY,
  query TEXT NOT NULL,
  person_name TEXT,
  person_title TEXT,
  person_linkedin TEXT,
  company_name TEXT,
  company_industry TEXT,
  company_size TEXT,
  company_revenue TEXT,
  company_location TEXT,
  ai_summary JSONB,        -- Full AI-generated dossier
  confidence_score FLOAT,
  tags TEXT[],
  stage TEXT DEFAULT 'new', -- new, qualified, engaged, closed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pitches table
CREATE TABLE pitches (
  id SERIAL PRIMARY KEY,
  case_id INTEGER REFERENCES cases(id),
  subject TEXT,
  body TEXT,
  tone TEXT,               -- professional, casual, urgent, etc.
  notes TEXT,
  custom_fields JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity log
CREATE TABLE activities (
  id SERIAL PRIMARY KEY,
  case_id INTEGER REFERENCES cases(id),
  action TEXT,             -- stage_change, pitch_created, note_added
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Page 3: "Action Center" — Pitch Builder & Outreach

### UI Design
- **Split view**: Left = Case details (read-only dossier), Right = Pitch editor
- **Pitch editor**: Rich text with AI assistance
  - "Generate Pitch" button → Gemini creates personalized pitch based on case intel
  - Tone selector: Professional, Friendly, Direct, Consultative
  - Length control: Short (2-3 sentences), Medium (paragraph), Long (full email)
- **Custom fields**: Add your own research findings, notes, talking points
- **Preview mode**: See the final pitch as the recipient would
- **Copy/Export**: One-click copy to clipboard, or export as text

### AI Pitch Generation
- Takes case dossier + tone + custom notes
- Gemini generates personalized outreach considering:
  - Prospect's recent activities/news
  - Company pain points (inferred from industry)
  - Role-specific angles (CTO vs VP Sales vs CEO)
  - Timing signals (funding rounds, expansions, etc.)

---

## Full Immersive UI System

### Glassmorphism Layers
```
Layer 0: Background (dark void + particle canvas + grid overlay)
Layer 1: Page content (glass panels with backdrop-blur)
Layer 2: Cards (elevated glass with holographic shimmer)
Layer 3: Modals/overlays (bright glass with cyan border glow)
Layer 4: Nav (fixed glass with scan-line animation)
```

### Animation Catalog
| Element | Animation |
|---------|-----------|
| Page load | Fade in + slide up with stagger |
| Card hover | Tilt 3D + holographic radial glow |
| Search processing | Pulsing ring scanner + data stream particles |
| Pipeline drag | Scale up + glow intensify |
| Stage transition | Card "teleports" with particle burst |
| Pitch generation | Typewriter effect + cursor glow |
| Background | Continuous particle network + grid pan + scanline |
| Navigation | Underline slides with cyan glow |
| Buttons | Hover: glow intensify + slight lift + border pulse |
| Counters | Number roll-up with easing |
| Alerts/notifications | Slide in from right with glass backdrop |

### Sound Design
- Subtle UI sounds: click, hover, success, stage change
- Optional (toggle in nav)
- Free to generate or use CC0 sounds

### Color System
- Primary: Cyan (#00f0ff) — actions, highlights, active states
- Secondary: Violet (#a855f7) — AI elements, secondary actions
- Accent: Lime (#a3ff12) — success, positive signals
- Warning: Amber (#ffb454) — caution, needs attention
- Danger: Red (#ff4d5e) — errors, negative signals
- Background: Void (#04060d) → Abyss (#070b16)
- Text: Slate scale (slate-100 to slate-500)

---

## Implementation Phases

### Phase 1: Foundation (Day 1)
- [ ] Initialize fresh Vite + React + TS project
- [ ] Install all dependencies
- [ ] Set up Tailwind with custom theme
- [ ] Create global CSS (glassmorphism, animations)
- [ ] Build BackgroundFX component (particles, grid, scanline)
- [ ] Build UI primitives (GlassCard, NeonButton, Input, etc.)
- [ ] Set up routing (3 pages)
- [ ] Create Nav with futuristic styling

### Phase 2: Backend & Database (Day 1-2)
- [ ] Set up Hono server
- [ ] Create Neon DB schema
- [ ] Implement web scraping routes (Google, Bing, company sites)
- [ ] Implement Gemini API integration
- [ ] Create search orchestration endpoint
- [ ] Create cases CRUD endpoints
- [ ] Create pipeline update endpoints
- [ ] Create pitch generation endpoint

### Phase 3: Page 1 — Find Them (Day 2)
- [ ] Build search interface with animated input
- [ ] Implement real-time search progress UI
- [ ] Build case dossier display component
- [ ] Add confidence meter and intel sections
- [ ] Connect to backend search API
- [ ] Add "Save to Pipeline" functionality

### Phase 4: Page 2 — Intelligence Deck (Day 2-3)
- [ ] Build Kanban pipeline view
- [ ] Implement drag-and-drop
- [ ] Build filter sidebar
- [ ] Create connection map visualization
- [ ] Add stats bar with animated counters
- [ ] Implement cross-prospect intelligence analysis

### Phase 5: Page 3 — Action Center (Day 3)
- [ ] Build split-view pitch editor
- [ ] Implement AI pitch generation
- [ ] Add tone/length controls
- [ ] Build preview mode
- [ ] Add copy/export functionality
- [ ] Implement custom fields and notes

### Phase 6: Polish & Deploy (Day 3-4)
- [ ] Add page transitions (Framer Motion)
- [ ] Add loading states and skeletons
- [ ] Add sound effects (optional)
- [ ] Mobile responsive pass
- [ ] Performance optimization
- [ ] Deploy to Vercel
- [ ] Set up Neon DB
- [ ] Configure environment variables

---

## Key Technical Decisions

1. **Web Scraping Strategy**: Use server-side fetch with rotating User-Agent strings. Target:
   - Google Search results (HTML parsing)
   - LinkedIn public profiles (limited, what's publicly visible)
   - Company websites (About pages, Press releases)
   - News aggregators (Google News)
   - Social profiles (Twitter/X public, GitHub)

2. **Gemini Free Tier Limits**: 15 RPM, 1M tokens/day. We'll:
   - Batch scraped data efficiently
   - Cache results in DB to avoid re-analysis
   - Use structured output (JSON) for consistent parsing

3. **No Synthetic Data**: Every case starts from a real search. The AI enriches real data, never fabricates.

4. **Zero Cost Guarantee**:
   - Vercel free tier: 100GB bandwidth/month
   - Neon free tier: 0.5GB storage
   - Gemini free tier: 15 RPM
   - No paid APIs, no paid scraping services
