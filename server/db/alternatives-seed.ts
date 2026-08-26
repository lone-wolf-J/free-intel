export interface AltAlternative {
  name: string;
  slug: string;
  url: string;
  description: string;
  score: number;
  efficiency: number;
  savings_pct: number;
  relationship: "free_tier" | "open_source" | "cheaper" | "self_hosted";
  free_tier: boolean;
  self_hostable: boolean;
  reasoning: string;
  key_differences: string[];
  notes: string;
}

export interface AltProduct {
  name: string;
  aliases: string[];
  category: string;
  website: string;
  price_month: number;
  alternatives: AltAlternative[];
}

export const ALTERNATIVES_DB: AltProduct[] = [
  // ── FREE LLMs (THE MOST IMPORTANT CATEGORY) ──
  {
    name: "Claude Pro",
    aliases: ["claude", "claude pro", "claude.ai", "anthropic"],
    category: "LLM / AI Assistant",
    website: "https://claude.ai",
    price_month: 20,
    alternatives: [
      { name: "Google Gemini Free", slug: "gemini", url: "https://gemini.google.com", description: "Google's flagship AI with 1M token context window — free tier available", score: 85, efficiency: 90, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Gemini 2.5 Flash on free tier handles most tasks Claude Pro does. 1M context window exceeds Claude's 200K. Multi-modal (images, video, audio) included free. Google ecosystem integration.", key_differences: ["1M context vs 200K", "Multi-modal free", "No code execution on free tier", "Google ecosystem lock-in"], notes: "Free tier includes Gemini 2.5 Flash. Pro plan $19.99/mo but free tier is sufficient for most tasks." },
      { name: "Mimo v2.5 Free", slug: "mimo", url: "https://huggingface.co/Xiaomi/MiMo-7B-RL", description: "Xiaomi's open reasoning model — competitive with Claude on math and code", score: 82, efficiency: 85, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "MiMo-7B-RL matches Claude Sonnet on MATH-500 (95.8%) and AIME 2024 (56.6%). Fully open weights, runs locally via Ollama. No API costs.", key_differences: ["7B params vs Claude's massive model", "Excellent at math/reasoning", "Limited general knowledge", "Requires local hardware"], notes: "Open weights on HuggingFace. Run via Ollama: ollama run mimo. Best for math, code, and reasoning tasks." },
      { name: "DeepSeek Chat", slug: "deepseek", url: "https://chat.deepseek.com", description: "Chinese AI lab offering competitive models at fraction of cost", score: 80, efficiency: 85, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: true, reasoning: "DeepSeek-V3 rivals GPT-4o and Claude Sonnet on benchmarks. Free chat interface. API pricing ~10x cheaper than Claude. Open weights available for self-hosting.", key_differences: ["R1 reasoning model available", "10x cheaper API", "Some Chinese content moderation", "Open weights"], notes: "Free chat interface. API pricing is ~10x cheaper than Claude. Self-hostable open weights." },
      { name: "BigPickle", slug: "bigpickle", url: "https://bigpickle.ai", description: "Free LLM playground with multiple models", score: 75, efficiency: 78, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Provides free access to multiple LLM models including some that rival Claude on specific tasks. No subscription required.", key_differences: ["Multiple models in one interface", "No subscription", "Rate limited", "Less consistent than Claude"], notes: "Free tier available. Good for experimentation and specific use cases." },
      { name: "Hy3", slug: "hy3", url: "https://hy3.ai", description: "Free AI assistant with web search and code execution", score: 73, efficiency: 75, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free AI chat with web search and code execution capabilities. Handles many tasks Claude Pro does without the subscription.", key_differences: ["Built-in web search", "Code execution", "Less sophisticated reasoning", "Smaller context window"], notes: "Free tier available. Good for research and coding tasks." },
      { name: "Ollama + Llama 3.3", slug: "ollama", url: "https://ollama.com", description: "Run open-source LLMs locally on your machine", score: 72, efficiency: 80, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "100% free, runs locally. Llama 3.3 70B rivals Claude Sonnet on many benchmarks. No API costs, no rate limits, complete privacy.", key_differences: ["Complete privacy", "No rate limits", "Requires 8GB+ RAM", "No cloud features"], notes: "100% free, runs locally. Requires decent hardware (8GB+ RAM). Llama 3.3 70B rivals GPT-4." },
      { name: "ChatGPT Free", slug: "chatgpt-free", url: "https://chat.openai.com", description: "OpenAI's free tier with GPT-4o mini access", score: 70, efficiency: 72, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free tier provides GPT-4o mini for everyday tasks. Good for quick questions and drafting.", key_differences: ["GPT-4o mini only", "Limited usage", "No advanced features", "Widely known"], notes: "Free tier limited to GPT-4o mini. Plus is $20/mo." }
    ]
  },
  {
    name: "ChatGPT Plus",
    aliases: ["chatgpt plus", "chatgpt+", "openai plus"],
    category: "LLM / AI Assistant",
    website: "https://chat.openai.com",
    price_month: 20,
    alternatives: [
      { name: "Google Gemini Free", slug: "gemini", url: "https://gemini.google.com", description: "Google's AI with 1M context — free tier is generous", score: 85, efficiency: 90, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free Gemini 2.5 Flash available. Handles most tasks ChatGPT Plus does. Multi-modal capabilities included.", key_differences: ["1M context window", "Multi-modal free", "No DALL-E on free tier", "Google ecosystem"], notes: "Free Gemini 2.5 Flash available. Gemini Advanced is $19.99/mo but free tier covers most use cases." },
      { name: "DeepSeek Chat", slug: "deepseek", url: "https://chat.deepseek.com", description: "Free AI chat with competitive reasoning capabilities", score: 80, efficiency: 85, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: true, reasoning: "DeepSeek-V3 and R1 models rival GPT-4o. Free chat and API. R1 reasoning model is particularly strong.", key_differences: ["R1 reasoning model", "10x cheaper API", "Open weights", "Chinese company"], notes: "Free chat and API. DeepSeek-V3 rivals GPT-4o at a fraction of the cost." },
      { name: "Mimo v2.5 Free", slug: "mimo", url: "https://huggingface.co/Xiaomi/MiMo-7B-RL", description: "Open reasoning model — excellent at math and code", score: 78, efficiency: 82, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Matches GPT-4o on math benchmarks. Fully open, runs locally. Best for code and math tasks.", key_differences: ["Math/code specialist", "Open weights", "Limited general knowledge", "Requires hardware"], notes: "Run via Ollama. Best for math, code, and reasoning." },
      { name: "Ollama + Open Source", slug: "ollama", url: "https://ollama.com", description: "Run Llama, Mistral, Qwen locally for free", score: 72, efficiency: 80, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "No subscription. Install Ollama, pull any model. Llama 3.3 70B is competitive with GPT-4o.", key_differences: ["No subscription", "Full model control", "Requires local compute", "No cloud sync"], notes: "No subscription. Install Ollama, pull any model. Requires local compute." },
      { name: "Mistral Le Chat", slug: "mistral", url: "https://chat.mistral.ai", description: "Free AI chat from European lab", score: 75, efficiency: 78, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free tier with Mistral Large access. Good for coding and reasoning. European company with strong privacy focus.", key_differences: ["European privacy", "Strong coding", "Less general knowledge", "Growing ecosystem"], notes: "Free tier with Mistral Large access. Good for coding and reasoning." }
    ]
  },
  {
    name: "Claude API",
    aliases: ["claude api", "anthropic api"],
    category: "LLM API",
    website: "https://console.anthropic.com",
    price_month: 50,
    alternatives: [
      { name: "DeepSeek API", slug: "deepseek-api", url: "https://platform.deepseek.com", description: "~10x cheaper than Claude with competitive quality", score: 85, efficiency: 88, savings_pct: 90, relationship: "cheaper", free_tier: true, self_hostable: true, reasoning: "Free credits for new accounts. Pricing is ~$0.14/1M input tokens vs Claude's ~$3/1M. DeepSeek-V3 quality rivals Claude Sonnet.", key_differences: ["10x cheaper", "Free credits", "Open weights", "Some quality trade-offs"], notes: "Free credits for new accounts. Pricing is ~$0.14/1M input tokens vs Claude's ~$3/1M." },
      { name: "Google Gemini API", slug: "gemini-api", url: "https://aistudio.google.com", description: "Free tier with generous rate limits", score: 80, efficiency: 85, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free tier: 15 RPM, 1M tokens/day for Gemini Flash. Paid tier is very affordable. Multi-modal support.", key_differences: ["1M tokens/day free", "Multi-modal", "Rate limited", "Google ecosystem"], notes: "Free tier: 15 RPM, 1M tokens/day for Gemini Flash. Paid tier is very affordable." },
      { name: "Groq Cloud", slug: "groq", url: "https://console.groq.com", description: "Ultra-fast inference with free tier for open models", score: 78, efficiency: 82, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free tier with Llama 3.3 and Mixtral. Fastest inference speeds available. Sub-100ms latency.", key_differences: ["Fastest inference", "Free tier", "Open models only", "Rate limited"], notes: "Free tier with Llama 3.3 and Mixtral. Fastest inference speeds available." },
      { name: "Together AI", slug: "together", url: "https://api.together.xyz", description: "Open model hosting with free credits", score: 75, efficiency: 80, savings_pct: 85, relationship: "cheaper", free_tier: true, self_hostable: false, reasoning: "$5 free credits for new accounts. Wide selection of open models at low cost.", key_differences: ["$5 free credits", "Wide model selection", "Open models only", "Pay-per-use"], notes: "$5 free credits for new accounts. Wide selection of open models at low cost." },
      { name: "Ollama Local", slug: "ollama", url: "https://ollama.com", description: "Run models locally — zero API costs", score: 70, efficiency: 78, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "No API costs. OpenAI-compatible API endpoint. Full control over models.", key_differences: ["Zero cost", "Full control", "Requires hardware", "No cloud features"], notes: "No API costs. Requires local GPU/RAM. OpenAI-compatible API endpoint." }
    ]
  },
  {
    name: "OpenAI API",
    aliases: ["openai api", "gpt api"],
    category: "LLM API",
    website: "https://platform.openai.com",
    price_month: 50,
    alternatives: [
      { name: "DeepSeek API", slug: "deepseek-api", url: "https://platform.deepseek.com", description: "20x cheaper with competitive GPT-4 class models", score: 85, efficiency: 88, savings_pct: 90, relationship: "cheaper", free_tier: true, self_hostable: true, reasoning: "Free credits for new accounts. Most cost-effective API for production use. DeepSeek-V3 quality rivals GPT-4o.", key_differences: ["20x cheaper", "Free credits", "Open weights", "Some quality differences"], notes: "Free credits for new accounts. Most cost-effective API for production use." },
      { name: "Groq Cloud", slug: "groq", url: "https://console.groq.com", description: "Free tier with blazing fast inference", score: 80, efficiency: 85, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free tier for Llama/Mixtral. Sub-100ms latency. Best for high-throughput applications.", key_differences: ["Fastest inference", "Free tier", "Open models", "Rate limited"], notes: "Free tier for Llama/Mixtral. Sub-100ms latency. Rate limited but usable." },
      { name: "Google Gemini API", slug: "gemini-api", url: "https://aistudio.google.com", description: "Generous free tier for Gemini models", score: 78, efficiency: 82, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free tier includes 15 RPM and 1M tokens/day. Pro/Flash available.", key_differences: ["1M tokens/day free", "Multi-modal", "Rate limited", "Google ecosystem"], notes: "Free tier includes 15 RPM and 1M tokens/day. Pro/Flash available." },
      { name: "Ollama Local", slug: "ollama", url: "https://ollama.com", description: "Zero-cost local inference", score: 70, efficiency: 78, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "No API costs. OpenAI-compatible endpoint. Requires local hardware.", key_differences: ["Zero cost", "Full control", "Requires hardware", "No cloud"], notes: "No API costs. OpenAI-compatible endpoint. Requires local hardware." }
    ]
  },

  // ── CODE ASSISTANTS ──
  {
    name: "GitHub Copilot",
    aliases: ["copilot", "github copilot", "copilot pro"],
    category: "Code Assistant",
    website: "https://github.com/features/copilot",
    price_month: 10,
    alternatives: [
      { name: "Cline", slug: "cline", url: "https://github.com/cline/cline", description: "VS Code extension using any LLM API for code assistance", score: 85, efficiency: 88, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Free (pay only for API calls). Uses Claude/GPT/Gemini APIs directly. Very capable with multi-file editing.", key_differences: ["Uses your own API keys", "Multi-file editing", "No subscription", "Requires API setup"], notes: "Free (pay only for API calls). Uses Claude/GPT/Gemini APIs directly. Very capable." },
      { name: "Continue", slug: "continue", url: "https://github.com/continuedev/continue", description: "Open-source AI code assistant for VS Code and JetBrains", score: 82, efficiency: 85, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Free. Supports Ollama, OpenAI, Anthropic, any API. Tab completion + chat.", key_differences: ["Multi-IDE support", "Tab completion", "Any API", "No subscription"], notes: "Free. Supports Ollama, OpenAI, Anthropic, any API. Tab completion + chat." },
      { name: "Codeium / Windsurf", slug: "codeium", url: "https://codeium.com", description: "Free AI code completion with generous limits", score: 80, efficiency: 82, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free tier with unlimited tab completions and 50 premium requests/month.", key_differences: ["Unlimited completions", "50 premium requests/mo", "No subscription", "Proprietary"], notes: "Free tier with unlimited tab completions and 50 premium requests/month." },
      { name: "Tabnine", slug: "tabnine", url: "https://www.tabnine.com", description: "AI code assistant with free tier", score: 75, efficiency: 78, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free tier: basic completions. Pro is $12/mo.", key_differences: ["Basic completions free", "Privacy focus", "Limited free tier", "Proprietary"], notes: "Free tier: basic completions. Pro is $12/mo." },
      { name: "Aider", slug: "aider", url: "https://github.com/paul-gauthier/aider", description: "AI pair programming in your terminal", score: 78, efficiency: 82, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Free. Uses any LLM API. Excellent for multi-file edits. Git-aware.", key_differences: ["Terminal-based", "Git-aware", "Any API", "No IDE integration"], notes: "Free. Uses any LLM API. Excellent for multi-file edits. Git-aware." }
    ]
  },
  {
    name: "Cursor",
    aliases: ["cursor", "cursor pro", "cursor ide"],
    category: "Code Editor / AI",
    website: "https://cursor.com",
    price_month: 20,
    alternatives: [
      { name: "VS Code + Cline", slug: "vscode-cline", url: "https://github.com/cline/cline", description: "VS Code with Cline extension — same AI capabilities, free", score: 88, efficiency: 90, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Free VS Code + free Cline extension. Uses your own API keys. Nearly identical feature set to Cursor.", key_differences: ["Free", "Same AI features", "Uses own API keys", "No Cursor-specific features"], notes: "Free VS Code + free Cline extension. Uses your own API keys. Nearly identical feature set." },
      { name: "VS Code + Continue", slug: "continue", url: "https://github.com/continuedev/continue", description: "Open-source AI code assistant", score: 82, efficiency: 85, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Free. Tab completion, chat, edit. Supports all major LLM providers.", key_differences: ["Tab completion", "Multi-provider", "No subscription", "Less polished"], notes: "Free. Tab completion, chat, edit. Supports all major LLM providers." },
      { name: "Windsurf (Codeium)", slug: "windsurf", url: "https://codeium.com/windsurf", description: "Free AI-native code editor", score: 78, efficiency: 80, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free tier with AI autocomplete and chat. Pro features available.", key_differences: ["Free tier", "AI-native", "Less mature", "Proprietary"], notes: "Free tier with AI autocomplete and chat. Pro features available." },
      { name: "Zed AI", slug: "zed", url: "https://zed.dev", description: "Fast code editor with built-in AI", score: 72, efficiency: 75, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free editor with AI features. Requires your own API keys for AI.", key_differences: ["Fast editor", "AI features", "Requires API keys", "Newer"], notes: "Free editor with AI features. Requires your own API keys for AI." }
    ]
  },

  // ── DESIGN ──
  {
    name: "Adobe Acrobat",
    aliases: ["acrobat", "adobe acrobat", "pdf editor", "adobe pdf"],
    category: "PDF Tools",
    website: "https://acrobat.adobe.com",
    price_month: 23,
    alternatives: [
      { name: "PDF.js", slug: "pdfjs", url: "https://mozilla.github.io/pdf.js", description: "Open-source PDF viewer by Mozilla — embeddable in web apps", score: 80, efficiency: 75, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "100% free. Open source. Renders PDFs in browser. No editing but excellent viewing.", key_differences: ["View only (no editing)", "Open source", "Embeddable", "Mozilla-backed"], notes: "100% free. Open source. Renders PDFs in browser. No editing but excellent viewing." },
      { name: "LibreOffice Draw", slug: "libreoffice-draw", url: "https://www.libreoffice.org/discover/draw", description: "Free PDF editing in LibreOffice suite", score: 78, efficiency: 80, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Free. Can edit PDFs directly. Part of LibreOffice suite. Good for simple edits.", key_differences: ["PDF editing", "Free", "Part of suite", "Not specialized"], notes: "Free. Can edit PDFs directly. Part of LibreOffice suite. Good for simple edits." },
      { name: "Stirling PDF", slug: "stirling-pdf", url: "https://github.com/Stirling-Tools/Stirling-PDF", description: "Self-hosted web app for all PDF operations", score: 82, efficiency: 85, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Self-hosted. Merge, split, convert, compress, OCR PDFs. Docker deploy. No limits.", key_differences: ["Self-hosted", "All PDF operations", "No limits", "Docker required"], notes: "Self-hosted. Merge, split, convert, compress, OCR PDFs. Docker deploy. No limits." },
      { name: "PDF24", slug: "pdf24", url: "https://tools.pdf24.org", description: "Free online PDF tools — no limits", score: 75, efficiency: 78, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free online. No limits. Merge, split, compress, convert. Desktop app also available.", key_differences: ["No limits", "Online + desktop", "Free", "Privacy concern"], notes: "Free online. No limits. Merge, split, compress, convert. Desktop app also available." },
      { name: "Sejda PDF", slug: "sejda", url: "https://www.sejda.com", description: "Free online PDF editor with 3 tasks/day", score: 70, efficiency: 72, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free tier: 3 tasks/day, 50MB limit. Edit, merge, split, sign. Desktop app available.", key_differences: ["3 tasks/day limit", "Edit + sign", "Desktop app", "Task limits"], notes: "Free tier: 3 tasks/day, 50MB limit. Edit, merge, split, sign. Desktop app available." }
    ]
  },
  {
    name: "Figma",
    aliases: ["figma", "figma pro"],
    category: "Design",
    website: "https://figma.com",
    price_month: 15,
    alternatives: [
      { name: "Penpot", slug: "penpot", url: "https://penpot.app", description: "Open-source design tool — Figma alternative", score: 80, efficiency: 82, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "100% free and open source. Self-hostable. SVG native. Growing community.", key_differences: ["Fully open source", "Self-hostable", "SVG native", "Smaller community"], notes: "100% free and open source. Self-hostable. SVG native. Growing community." },
      { name: "Figma Free", slug: "figma-free", url: "https://figma.com", description: "Figma's own free tier for up to 3 projects", score: 75, efficiency: 75, savings_pct: 50, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free tier supports 3 projects. For many designers this is sufficient.", key_differences: ["3 projects", "Full Figma features", "Limited projects", "No advanced features"], notes: "Free tier supports 3 projects. For many designers this is sufficient." },
      { name: "Excalidraw", slug: "excalidraw", url: "https://excalidraw.com", description: "Free whiteboard and wireframing tool", score: 65, efficiency: 68, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: true, reasoning: "Great for wireframes and diagrams. Not a full Figma replacement but covers prototyping.", key_differences: ["Great for wireframes", "Not full design tool", "Simple", "Collaborative"], notes: "Great for wireframes and diagrams. Not a full Figma replacement but covers prototyping." }
    ]
  },
  {
    name: "Adobe Creative Cloud",
    aliases: ["adobe", "adobe creative cloud", "photoshop", "illustrator", "premiere"],
    category: "Design / Creative",
    website: "https://adobe.com",
    price_month: 55,
    alternatives: [
      { name: "GIMP", slug: "gimp", url: "https://gimp.org", description: "Free Photoshop alternative", score: 75, efficiency: 78, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Free and open source. Full-featured photo editing. Steep learning curve.", key_differences: ["Full-featured", "Steep learning curve", "No subscription", "Plugin ecosystem"], notes: "Free and open source. Full-featured photo editing. Steep learning curve." },
      { name: "Inkscape", slug: "inkscape", url: "https://inkscape.org", description: "Free vector graphics editor (Illustrator alternative)", score: 75, efficiency: 78, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Free and open source. Professional vector editing. SVG native.", key_differences: ["SVG native", "Professional editing", "Steep learning curve", "No subscription"], notes: "Free and open source. Professional vector editing. SVG native." },
      { name: "DaVinci Resolve", slug: "davinci-resolve", url: "https://blackmagicdesign.com/products/davinciresolve", description: "Free professional video editing", score: 85, efficiency: 88, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free tier is incredibly capable. Used in Hollywood. Replaces Premiere + After Effects.", key_differences: ["Hollywood-grade", "Free tier powerful", "Steep learning curve", "Large download"], notes: "Free tier is incredibly capable. Used in Hollywood. Replaces Premiere + After Effects." },
      { name: "Krita", slug: "krita", url: "https://krita.org", description: "Free digital painting tool", score: 72, efficiency: 75, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Free and open source. Professional digital painting and illustration.", key_differences: ["Digital painting focus", "Free", "Less general than Photoshop", "Active development"], notes: "Free and open source. Professional digital painting and illustration." },
      { name: "Canva Free", slug: "canva", url: "https://canva.com", description: "Free graphic design tool with templates", score: 70, efficiency: 72, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free tier with thousands of templates. Good for social media and presentations.", key_differences: ["Templates", "Easy to use", "Limited features", "Proprietary"], notes: "Free tier with thousands of templates. Good for social media and presentations." }
    ]
  },

  // ── PRODUCTIVITY / COLLABORATION ──
  {
    name: "Notion",
    aliases: ["notion", "notion pro", "notion team"],
    category: "Productivity",
    website: "https://notion.so",
    price_month: 10,
    alternatives: [
      { name: "Outline", slug: "outline", url: "https://github.com/outline/outline", description: "Open-source team knowledge base and wiki", score: 82, efficiency: 85, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Self-hostable. Beautiful UI. Real-time collaboration. Markdown-native.", key_differences: ["Self-hostable", "Real-time collab", "Markdown-native", "No Notion databases"], notes: "Self-hostable. Beautiful UI. Real-time collaboration. Markdown-native." },
      { name: "AppFlowy", slug: "appflowy", url: "https://github.com/AppFlowy-IO/AppFlowy", description: "Open-source Notion alternative with offline support", score: 78, efficiency: 80, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Flutter-based. Works offline. Growing fast. No vendor lock-in.", key_differences: ["Offline support", "Flutter-based", "Growing fast", "Less mature"], notes: "Flutter-based. Works offline. Growing fast. No vendor lock-in." },
      { name: "AnyType", slug: "anytype", url: "https://anytype.io", description: "P2P knowledge graph — Notion alternative with local-first data", score: 75, efficiency: 78, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free. Local-first, P2P sync. Strong privacy. Different paradigm from Notion.", key_differences: ["Local-first", "P2P sync", "Strong privacy", "Different paradigm"], notes: "Free. Local-first, P2P sync. Strong privacy. Different paradigm from Notion." },
      { name: "Notion Free", slug: "notion-free", url: "https://notion.so", description: "Free tier for personal use", score: 65, efficiency: 65, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free for individuals. Limited blocks for teams. Good enough for solo use.", key_differences: ["Free for individuals", "Limited blocks", "Full features", "No team features"], notes: "Free for individuals. Limited blocks for teams. Good enough for solo use." }
    ]
  },
  {
    name: "Slack",
    aliases: ["slack", "slack pro", "slack business+"],
    category: "Communication",
    website: "https://slack.com",
    price_month: 8,
    alternatives: [
      { name: "Mattermost", slug: "mattermost", url: "https://mattermost.com", description: "Open-source Slack alternative — self-hosted", score: 82, efficiency: 85, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Self-hostable. Full Slack alternative with channels, threads, integrations.", key_differences: ["Self-hostable", "Full Slack features", "Enterprise-ready", "Requires maintenance"], notes: "Self-hostable. Full Slack alternative with channels, threads, integrations." },
      { name: "Rocket.Chat", slug: "rocketchat", url: "https://rocket.chat", description: "Open-source team communication platform", score: 78, efficiency: 80, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Self-hostable. End-to-end encryption. Omnichannel (support + team chat).", key_differences: ["E2E encryption", "Omnichannel", "Self-hostable", "Complex setup"], notes: "Self-hostable. End-to-end encryption. Omnichannel (support + team chat)." },
      { name: "Zulip", slug: "zulip", url: "https://zulip.com", description: "Threaded team chat with unique topic model", score: 76, efficiency: 78, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Free cloud tier. Self-hostable. Unique threading model (topics within channels).", key_differences: ["Topic-based threading", "Free cloud", "Self-hostable", "Different paradigm"], notes: "Free cloud tier. Self-hostable. Unique threading model (topics within channels)." },
      { name: "Slack Free", slug: "slack-free", url: "https://slack.com", description: "Free tier with 90-day message history", score: 55, efficiency: 55, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free tier limits: 90-day history, 1:1 calls only. Heavily limited.", key_differences: ["90-day history", "1:1 calls only", "Heavily limited", "Familiar UI"], notes: "Free tier limits: 90-day history, 1:1 calls only. Heavily limited." }
    ]
  },
  {
    name: "Microsoft Teams",
    aliases: ["teams", "ms teams", "microsoft teams"],
    category: "Communication",
    website: "https://teams.microsoft.com",
    price_month: 4,
    alternatives: [
      { name: "Mattermost", slug: "mattermost", url: "https://mattermost.com", description: "Open-source Slack/Teams alternative — self-hosted", score: 82, efficiency: 85, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Self-hostable. Full Teams alternative with channels, threads, integrations, voice/video calls.", key_differences: ["Self-hostable", "Full Teams features", "Enterprise-ready", "Requires maintenance"], notes: "Self-hostable. Full Teams alternative with channels, threads, integrations." },
      { name: "Rocket.Chat", slug: "rocketchat", url: "https://rocket.chat", description: "Open-source team communication platform", score: 78, efficiency: 80, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Self-hostable. End-to-end encryption. Omnichannel (support + team chat).", key_differences: ["E2E encryption", "Omnichannel", "Self-hostable", "Complex setup"], notes: "Self-hostable. End-to-end encryption. Omnichannel (support + team chat)." },
      { name: "Zulip", slug: "zulip", url: "https://zulip.com", description: "Threaded team chat with unique topic model", score: 76, efficiency: 78, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Free cloud tier. Self-hostable. Unique threading model (topics within channels).", key_differences: ["Topic-based threading", "Free cloud", "Self-hostable", "Different paradigm"], notes: "Free cloud tier. Self-hostable. Unique threading model (topics within channels)." },
      { name: "Google Chat (Free)", slug: "google-chat", url: "https://chat.google.com", description: "Free with Google account — basic team messaging", score: 65, efficiency: 68, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free with Google account. Basic messaging, spaces, integrations with Google Workspace.", key_differences: ["Free with Google", "Basic features", "Google ecosystem", "Limited customization"], notes: "Free with Google account. Basic messaging, spaces, integrations with Google Workspace." },
      { name: "Element (Matrix)", slug: "element", url: "https://element.io", description: "Decentralized team chat built on Matrix protocol", score: 72, efficiency: 75, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Self-hostable. End-to-end encrypted. Federation (talk across servers). Growing adoption.", key_differences: ["Decentralized", "E2E encrypted", "Federation", "Growing adoption"], notes: "Self-hostable. End-to-end encrypted. Federation (talk across servers)." }
    ]
  },
  {
    name: "Microsoft Outlook",
    aliases: ["outlook", "outlook email", "ms outlook"],
    category: "Email",
    website: "https://outlook.live.com",
    price_month: 4,
    alternatives: [
      { name: "Thunderbird", slug: "thunderbird", url: "https://thunderbird.net", description: "Free, open-source email client from Mozilla", score: 80, efficiency: 82, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "100% free. Open source. Supports IMAP/POP3/SMTP. Calendar, contacts, built-in PGP encryption.", key_differences: ["100% free", "Open source", "IMAP/POP3 support", "Desktop app only"], notes: "100% free. Open source. Supports IMAP/POP3/SMTP. Calendar, contacts, built-in PGP encryption." },
      { name: "ProtonMail", slug: "protonmail", url: "https://proton.me/mail", description: "Free encrypted email with 1GB storage", score: 78, efficiency: 80, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free tier: 1GB storage, 150 messages/day. End-to-end encrypted. Swiss privacy laws.", key_differences: ["E2E encrypted", "Swiss privacy", "1GB free storage", "Limited daily messages"], notes: "Free tier: 1GB storage, 150 messages/day. End-to-end encrypted. Swiss privacy laws." },
      { name: "Mailbox.org", slug: "mailboxorg", url: "https://mailbox.org", description: "Privacy-focused email with free 2GB tier", score: 72, efficiency: 75, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free 2GB tier. Privacy-focused. CalDAV/CardDAV. PGP support. German servers.", key_differences: ["2GB free", "Privacy-focused", "CalDAV support", "German servers"], notes: "Free 2GB tier. Privacy-focused. CalDAV/CardDAV. PGP support. German servers." },
      { name: "Gmail", slug: "gmail", url: "https://gmail.com", description: "Free 15GB email from Google", score: 70, efficiency: 72, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free 15GB storage. Excellent spam filtering. Google ecosystem integration.", key_differences: ["15GB free", "Great spam filter", "Google ecosystem", "Privacy concerns"], notes: "Free 15GB storage. Excellent spam filtering. Google ecosystem integration." },
      { name: "Roundcube", slug: "roundcube", url: "https://roundcube.net", description: "Free webmail client — self-hosted", score: 68, efficiency: 70, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "100% free, open source. Self-hosted webmail. IMAP support. Plugin system.", key_differences: ["Self-hosted webmail", "Open source", "IMAP only", "Requires server"], notes: "100% free, open source. Self-hosted webmail. IMAP support. Plugin system." }
    ]
  },
  {
    name: "Microsoft Teams",
    aliases: ["microsoft teams", "ms teams", "teams"],
    category: "Communication",
    website: "https://microsoft.com/microsoft-teams",
    price_month: 4,
    alternatives: [
      { name: "Mattermost", slug: "mattermost", url: "https://mattermost.com", description: "Self-hosted team communication", score: 80, efficiency: 82, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Full Slack/Teams alternative. Self-host for complete control.", key_differences: ["Self-hosted", "Full features", "No vendor lock-in", "Requires maintenance"], notes: "Full Slack/Teams alternative. Self-host for complete control." },
      { name: "Rocket.Chat", slug: "rocketchat", url: "https://rocket.chat", description: "Open-source comms with video/audio", score: 76, efficiency: 78, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Includes video/audio calls, screen sharing. Self-hostable.", key_differences: ["Video/audio", "Screen sharing", "Self-hostable", "Complex setup"], notes: "Includes video/audio calls, screen sharing. Self-hostable." },
      { name: "Google Chat (Free)", slug: "google-chat", url: "https://chat.google.com", description: "Free with any Google account", score: 65, efficiency: 68, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free with Google account. Limited integrations vs Teams.", key_differences: ["Free", "Google ecosystem", "Limited integrations", "Basic features"], notes: "Free with Google account. Limited integrations vs Teams." }
    ]
  },
  {
    name: "Zoom",
    aliases: ["zoom", "zoom pro", "zoom meetings"],
    category: "Video Conferencing",
    website: "https://zoom.us",
    price_month: 13,
    alternatives: [
      { name: "Jitsi Meet", slug: "jitsi", url: "https://jitsi.org", description: "Free open-source video conferencing", score: 80, efficiency: 82, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Free. No account needed. Self-hostable. End-to-end encryption available.", key_differences: ["No account needed", "Self-hostable", "E2E encryption", "Less polished"], notes: "Free. No account needed. Self-hostable. End-to-end encryption available." },
      { name: "Google Meet", slug: "google-meet", url: "https://meet.google.com", description: "Free 1-hour meetings with Google account", score: 72, efficiency: 75, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free with Google account. 60-min limit on group calls.", key_differences: ["Free", "Google integration", "60-min limit", "Basic features"], notes: "Free with Google account. 60-min limit on group calls." },
      { name: "Zoom Free", slug: "zoom-free", url: "https://zoom.us", description: "40-min limit on group meetings", score: 55, efficiency: 55, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free tier: 40-min group limit, 100 participants. Sufficient for small teams.", key_differences: ["40-min limit", "100 participants", "Familiar", "Heavily limited"], notes: "Free tier: 40-min group limit, 100 participants. Sufficient for small teams." }
    ]
  },
  {
    name: "Trello",
    aliases: ["trello", "trello pro"],
    category: "Project Management",
    website: "https://trello.com",
    price_month: 5,
    alternatives: [
      { name: "Plane", slug: "plane", url: "https://github.com/makeplane/plane", description: "Open-source project tracking (Jira/Linear alternative)", score: 80, efficiency: 82, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Self-hostable. Issues, cycles, modules. Modern UI. Growing fast.", key_differences: ["Self-hostable", "Modern UI", "Growing fast", "Less mature"], notes: "Self-hostable. Issues, cycles, modules. Modern UI. Growing fast." },
      { name: "Focalboard", slug: "focalboard", url: "https://www.focalboard.com", description: "Open-source alternative to Trello, Notion, Asana", score: 75, efficiency: 78, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Self-hostable. Kanban, table, gallery views. Built by Mattermost team.", key_differences: ["Multiple views", "Self-hostable", "Mattermost integration", "Less active"], notes: "Self-hostable. Kanban, table, gallery views. Built by Mattermost team." },
      { name: "Kanboard", slug: "kanboard", url: "https://kanboard.org", description: "Minimal open-source Kanban board", score: 65, efficiency: 68, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Very lightweight. Single PHP file. No frills, just Kanban.", key_differences: ["Minimal", "Single file", "PHP", "No frills"], notes: "Very lightweight. Single PHP file. No frills, just Kanban." },
      { name: "Trello Free", slug: "trello-free", url: "https://trello.com", description: "Free tier with 10 boards per workspace", score: 60, efficiency: 60, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free tier: 10 boards, limited automation. Enough for small projects.", key_differences: ["10 boards", "Limited automation", "Familiar", "Heavily limited"], notes: "Free tier: 10 boards, limited automation. Enough for small projects." }
    ]
  },
  {
    name: "Asana",
    aliases: ["asana", "asana premium", "asana business"],
    category: "Project Management",
    website: "https://asana.com",
    price_month: 11,
    alternatives: [
      { name: "Plane", slug: "plane", url: "https://github.com/makeplane/plane", description: "Open-source Jira/Linear alternative with modern UI", score: 80, efficiency: 82, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Self-hostable. Sprints, cycles, analytics. Teams up to 10 free on cloud.", key_differences: ["Self-hostable", "Sprints/cycles", "Analytics", "Growing fast"], notes: "Self-hostable. Sprints, cycles, analytics. Teams up to 10 free on cloud." },
      { name: "Taiga", slug: "taiga", url: "https://taiga.io", description: "Open-source agile project management", score: 72, efficiency: 75, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Free cloud tier. Self-hostable. Scrum and Kanban support.", key_differences: ["Free cloud", "Self-hostable", "Scrum/Kanban", "Less modern"], notes: "Free cloud tier. Self-hostable. Scrum and Kanban support." },
      { name: "Notion Free", slug: "notion-free", url: "https://notion.so", description: "Free personal project management", score: 68, efficiency: 70, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free tier with unlimited pages for individuals.", key_differences: ["Unlimited pages", "Individual use", "Full features", "No team features"], notes: "Free tier with unlimited pages for individuals." }
    ]
  },
  {
    name: "Linear",
    aliases: ["linear", "linear pro"],
    category: "Project Management",
    website: "https://linear.app",
    price_month: 8,
    alternatives: [
      { name: "Plane", slug: "plane", url: "https://github.com/makeplane/plane", description: "Open-source Linear alternative with modern UI", score: 82, efficiency: 85, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Closest open-source alternative to Linear. Self-hostable. Free cloud tier.", key_differences: ["Closest to Linear", "Self-hostable", "Free cloud", "Growing fast"], notes: "Closest open-source alternative to Linear. Self-hostable. Free cloud tier." },
      { name: "GitHub Projects", slug: "github-projects", url: "https://github.com/features/projects", description: "Free project boards for GitHub users", score: 75, efficiency: 78, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free with GitHub. Kanban, table, roadmap views. Integrates with issues.", key_differences: ["Free with GitHub", "Issue integration", "Limited views", "GitHub lock-in"], notes: "Free with GitHub. Kanban, table, roadmap views. Integrates with issues." },
      { name: "Gitea + Actions", slug: "gitea", url: "https://gitea.com", description: "Self-hosted GitHub alternative with project boards", score: 70, efficiency: 72, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Self-hosted GitHub alternative with issues and project boards.", key_differences: ["Self-hosted", "Full control", "Less features", "Requires maintenance"], notes: "Self-hosted GitHub alternative with issues and project boards." }
    ]
  },
  {
    name: "Jira",
    aliases: ["jira", "jira software", "jira cloud"],
    category: "Project Management",
    website: "https://atlassian.com/software/jira",
    price_month: 8,
    alternatives: [
      { name: "Plane", slug: "plane", url: "https://github.com/makeplane/plane", description: "Open-source project tracking with modern UI", score: 80, efficiency: 82, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Self-hostable. Sprints, cycles, modules. Growing fast.", key_differences: ["Self-hostable", "Modern UI", "Growing fast", "Less mature"], notes: "Self-hostable. Sprints, cycles, modules. Growing fast." },
      { name: "Taiga", slug: "taiga", url: "https://taiga.io", description: "Open-source agile project management", score: 72, efficiency: 75, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Self-hostable. Scrum and Kanban boards. Sprint planning.", key_differences: ["Scrum/Kanban", "Self-hostable", "Free cloud", "Less modern"], notes: "Self-hostable. Scrum and Kanban boards. Sprint planning." },
      { name: "GitLab Issues", slug: "gitlab", url: "https://gitlab.com", description: "Free issue tracking with GitLab repos", score: 68, efficiency: 70, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: true, reasoning: "Free tier: 400 CI/CD minutes/month, unlimited repos and issues.", key_differences: ["Free CI/CD", "Unlimited repos", "GitLab lock-in", "Less project features"], notes: "Free tier: 400 CI/CD minutes/month, unlimited repos and issues." }
    ]
  },

  // ── CRM ──
  {
    name: "Salesforce",
    aliases: ["salesforce", "sales cloud", "salesforce crm"],
    category: "CRM",
    website: "https://salesforce.com",
    price_month: 25,
    alternatives: [
      { name: "Twenty CRM", slug: "twenty", url: "https://github.com/twentyhq/twenty", description: "Open-source CRM built for modern teams", score: 75, efficiency: 78, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Self-hostable. Modern UI. Gmail/Outlook integration. API-first.", key_differences: ["Modern UI", "API-first", "Gmail/Outlook", "Less mature"], notes: "Self-hostable. Modern UI. Gmail/Outlook integration. API-first." },
      { name: "HubSpot Free CRM", slug: "hubspot", url: "https://hubspot.com/products/crm", description: "Free CRM from HubSpot", score: 72, efficiency: 75, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free tier: 1M contacts, email tracking, meeting scheduler. Limited automation.", key_differences: ["1M contacts", "Email tracking", "Limited automation", "Proprietary"], notes: "Free tier: 1M contacts, email tracking, meeting scheduler. Limited automation." },
      { name: "ERPNext CRM", slug: "erpnext", url: "https://erpnext.com", description: "Free open-source CRM module in ERPNext", score: 70, efficiency: 72, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Self-hostable. Lead management, opportunities, quotations. Part of full ERP.", key_differences: ["Full ERP", "Self-hostable", "Heavier", "More features"], notes: "Self-hostable. Lead management, opportunities, quotations. Part of full ERP." },
      { name: "SuiteCRM", slug: "suitecrm", url: "https://suitecrm.com", description: "Open-source enterprise CRM", score: 68, efficiency: 70, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Self-hostable. Full-featured. Fork of SugarCRM.", key_differences: ["Full-featured", "SugarCRM fork", "Self-hostable", "Complex"], notes: "Self-hostable. Full-featured. Fork of SugarCRM." }
    ]
  },

  // ── DATABASE / STORAGE ──
  {
    name: "Supabase Pro",
    aliases: ["supabase pro", "supabase"],
    category: "Database / Backend",
    website: "https://supabase.com",
    price_month: 25,
    alternatives: [
      { name: "Supabase Free", slug: "supabase-free", url: "https://supabase.com", description: "500MB database, 1GB storage, 50K monthly active users", score: 85, efficiency: 85, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free tier is excellent: 500MB DB, 1GB file storage, 50K MAUs, 500MB bandwidth.", key_differences: ["500MB DB", "1GB storage", "50K MAUs", "Full features"], notes: "Free tier is excellent: 500MB DB, 1GB file storage, 50K MAUs, 500MB bandwidth." },
      { name: "Firebase Free", slug: "firebase", url: "https://firebase.google.com", description: "Google's free backend-as-a-service", score: 78, efficiency: 80, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Spark plan: 1GB Firestore, 10GB hosting, 50K reads/day. Generous for small projects.", key_differences: ["1GB Firestore", "10GB hosting", "50K reads/day", "Google ecosystem"], notes: "Spark plan: 1GB Firestore, 10GB hosting, 50K reads/day. Generous for small projects." },
      { name: "Neon Free", slug: "neon", url: "https://neon.tech", description: "Serverless Postgres with free tier", score: 80, efficiency: 82, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free: 512MB storage, 24/7 compute (0.25GB). Branching. Postgres-native.", key_differences: ["512MB storage", "24/7 compute", "Branching", "Postgres-native"], notes: "Free: 512MB storage, 24/7 compute (0.25GB). Branching. Postgres-native." },
      { name: "PostgreSQL Self-Hosted", slug: "postgresql", url: "https://postgresql.org", description: "World's most advanced open-source database", score: 75, efficiency: 78, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Free. Self-host on any VPS. Battle-tested for 30+ years.", key_differences: ["Battle-tested", "Self-hosted", "Requires maintenance", "No managed service"], notes: "Free. Self-host on any VPS. Battle-tested for 30+ years." }
    ]
  },
  {
    name: "PlanetScale",
    aliases: ["planetscale"],
    category: "Database",
    website: "https://planetscale.com",
    price_month: 30,
    alternatives: [
      { name: "Neon Free", slug: "neon", url: "https://neon.tech", description: "Serverless Postgres — free tier with branching", score: 82, efficiency: 85, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free: 512MB, 24/7 compute. Postgres instead of MySQL but very capable.", key_differences: ["512MB free", "Branching", "Postgres", "Serverless"], notes: "Free: 512MB, 24/7 compute. Postgres instead of MySQL but very capable." },
      { name: "Turso", slug: "turso", url: "https://turso.tech", description: "SQLite at the edge — free tier", score: 78, efficiency: 80, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: true, reasoning: "Free: 500 databases, 9GB storage, 1B row reads. Edge-first SQLite.", key_differences: ["500 databases", "9GB storage", "1B reads", "Edge-first"], notes: "Free: 500 databases, 9GB storage, 1B row reads. Edge-first SQLite." },
      { name: "Supabase Free", slug: "supabase-free", url: "https://supabase.com", description: "500MB Postgres with real-time", score: 80, efficiency: 82, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free: 500MB database, real-time subscriptions, auth, storage.", key_differences: ["500MB DB", "Real-time", "Auth included", "Storage included"], notes: "Free: 500MB database, real-time subscriptions, auth, storage." },
      { name: "Self-hosted MySQL/Postgres", slug: "postgresql", url: "https://postgresql.org", description: "Run your own database on a VPS", score: 70, efficiency: 72, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Free software. $5/mo VPS can run a production database.", key_differences: ["Free software", "$5 VPS", "Full control", "Requires maintenance"], notes: "Free software. $5/mo VPS can run a production database." }
    ]
  },

  // ── EMAIL / MARKETING ──
  {
    name: "Mailchimp",
    aliases: ["mailchimp", "mailchimp standard", "mailchimp essentials"],
    category: "Email Marketing",
    website: "https://mailchimp.com",
    price_month: 13,
    alternatives: [
      { name: "Brevo (Sendinblue)", slug: "brevo", url: "https://brevo.com", description: "Free 300 emails/day with marketing automation", score: 82, efficiency: 85, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free: 300 emails/day, unlimited contacts, email templates, basic automation.", key_differences: ["300 emails/day", "Unlimited contacts", "Automation", "Proprietary"], notes: "Free: 300 emails/day, unlimited contacts, email templates, basic automation." },
      { name: "Listmonk", slug: "listmonk", url: "https://github.com/knadh/listmonk", description: "Self-hosted newsletter and email marketing", score: 80, efficiency: 82, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Self-hostable. Unlimited lists and subscribers. High performance.", key_differences: ["Unlimited lists", "High performance", "Self-hosted", "Requires setup"], notes: "Self-hostable. Unlimited lists and subscribers. High performance." },
      { name: "MailerLite Free", slug: "mailerlite", url: "https://mailerlite.com", description: "1,000 subscribers, 12K emails/month free", score: 75, efficiency: 78, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free: 1K subscribers, 12K emails, drag-and-drop editor, pop-ups.", key_differences: ["1K subscribers", "12K emails", "Drag-and-drop", "Proprietary"], notes: "Free: 1K subscribers, 12K emails, drag-and-drop editor, pop-ups." },
      { name: "Mailchimp Free", slug: "mailchimp-free", url: "https://mailchimp.com", description: "500 contacts, 500 emails/month", score: 55, efficiency: 55, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free tier: 500 contacts, 500 emails. Very limited. Brevo is better.", key_differences: ["500 contacts", "500 emails", "Very limited", "Familiar"], notes: "Free tier: 500 contacts, 500 emails. Very limited. Brevo is better." }
    ]
  },

  // ── MONITORING ──
  {
    name: "Datadog",
    aliases: ["datadog", "datadog pro"],
    category: "Monitoring",
    website: "https://datadoghq.com",
    price_month: 23,
    alternatives: [
      { name: "Grafana + Prometheus", slug: "grafana", url: "https://grafana.com", description: "Open-source monitoring stack", score: 85, efficiency: 88, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Self-hostable. Industry standard. Dashboards, alerts, Prometheus metrics.", key_differences: ["Industry standard", "Self-hostable", "Steep learning curve", "Requires setup"], notes: "Self-hostable. Industry standard. Dashboards, alerts, Prometheus metrics." },
      { name: "Uptime Kuma", slug: "uptime-kuma", url: "https://github.com/louislam/uptime-kuma", description: "Self-hosted uptime monitoring (Upptime alternative)", score: 82, efficiency: 85, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Self-hostable. Beautiful UI. HTTP/TCP/DNS/Docker monitoring. Notifications.", key_differences: ["Beautiful UI", "Multiple protocols", "Self-hosted", "Notifications"], notes: "Self-hostable. Beautiful UI. HTTP/TCP/DNS/Docker monitoring. Notifications." },
      { name: "Gatus", slug: "gatus", url: "https://github.com/TwiN/gatus", description: "Developer-oriented health dashboard", score: 78, efficiency: 80, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Self-hostable. YAML config. HTTP, TCP, ICMP, DNS conditions. Alerting.", key_differences: ["YAML config", "Multiple conditions", "Self-hosted", "Developer-focused"], notes: "Self-hostable. YAML config. HTTP, TCP, ICMP, DNS conditions. Alerting." },
      { name: "Better Uptime Free", slug: "better-uptime", url: "https://betterstack.com", description: "Free tier: 10 monitors, 3-min checks", score: 65, efficiency: 68, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free: 10 monitors, 3-minute intervals. Status pages included.", key_differences: ["10 monitors", "3-min intervals", "Status pages", "Proprietary"], notes: "Free: 10 monitors, 3-minute intervals. Status pages included." }
    ]
  },
  {
    name: "New Relic",
    aliases: ["new relic", "newrelic"],
    category: "Monitoring / APM",
    website: "https://newrelic.com",
    price_month: 49,
    alternatives: [
      { name: "Grafana Stack", slug: "grafana", url: "https://grafana.com", description: "Open-source observability — metrics, logs, traces", score: 85, efficiency: 88, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Grafana + Prometheus + Loki + Tempo = full observability stack. All free.", key_differences: ["Full stack", "All free", "Self-hosted", "Complex setup"], notes: "Grafana + Prometheus + Loki + Tempo = full observability stack. All free." },
      { name: "SigNoz", slug: "signoz", url: "https://github.com/SigNoz/signoz", description: "Open-source APM — traces, metrics, logs", score: 80, efficiency: 82, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Self-hostable. Full APM. OpenTelemetry native. Alternative to New Relic/Datadog.", key_differences: ["Full APM", "OpenTelemetry", "Self-hosted", "Growing fast"], notes: "Self-hostable. Full APM. OpenTelemetry native. Alternative to New Relic/Datadog." },
      { name: "New Relic Free", slug: "newrelic-free", url: "https://newrelic.com/pricing", description: "Free tier: 100GB/month ingested", score: 72, efficiency: 72, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free: 100GB/month, 1 full-access user. Limited but usable for small teams.", key_differences: ["100GB/month", "1 user", "Limited", "Proprietary"], notes: "Free: 100GB/month, 1 full-access user. Limited but usable for small teams." }
    ]
  },

  // ── FORMS / SURVEYS ──
  {
    name: "Typeform",
    aliases: ["typeform", "typeform pro"],
    category: "Forms / Surveys",
    website: "https://typeform.com",
    price_month: 25,
    alternatives: [
      { name: "Tally", slug: "tally", url: "https://tally.so", description: "Free form builder with unlimited forms and submissions", score: 85, efficiency: 88, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free: unlimited forms, unlimited submissions, custom domains, payments.", key_differences: ["Unlimited everything", "Custom domains", "Payments", "Proprietary"], notes: "Free: unlimited forms, unlimited submissions, custom domains, payments." },
      { name: "Google Forms", slug: "google-forms", url: "https://forms.google.com", description: "Free forms with Google Sheets integration", score: 75, efficiency: 78, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free with Google account. Unlimited forms and responses. Basic design.", key_differences: ["Unlimited", "Sheets integration", "Basic design", "Google ecosystem"], notes: "Free with Google account. Unlimited forms and responses. Basic design." },
      { name: "Formbricks", slug: "formbricks", url: "https://github.com/formbricks/formbricks", description: "Open-source form builder and survey tool", score: 72, efficiency: 75, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Self-hostable. In-app surveys, forms, NPS. Typeform-quality UI.", key_differences: ["In-app surveys", "NPS", "Self-hosted", "Typeform-quality"], notes: "Self-hostable. In-app surveys, forms, NPS. Typeform-quality UI." }
    ]
  },

  // ── VIDEO / MEDIA ──
  {
    name: "Loom Pro",
    aliases: ["loom", "loom pro", "loom business"],
    category: "Video / Screen Recording",
    website: "https://loom.com",
    price_month: 13,
    alternatives: [
      { name: "OBS Studio", slug: "obs", url: "https://obsproject.com", description: "Free professional screen recording and streaming", score: 85, efficiency: 88, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Free and open source. Professional-grade recording. No time limits.", key_differences: ["Professional-grade", "No time limits", "Steep learning curve", "No cloud sharing"], notes: "Free and open source. Professional-grade recording. No time limits." },
      { name: "Loom Free", slug: "loom-free", url: "https://loom.com", description: "25 videos, 5 min each", score: 50, efficiency: 50, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free: 25 videos, 5-min limit per video. Heavily limited.", key_differences: ["25 videos", "5-min limit", "Cloud sharing", "Heavily limited"], notes: "Free: 25 videos, 5-min limit per video. Heavily limited." }
    ]
  },

  // ── ACCOUNTING / INVOICING ──
  {
    name: "QuickBooks",
    aliases: ["quickbooks", "quickbooks online", "quickbooks pro"],
    category: "Accounting",
    website: "https://quickbooks.intuit.com",
    price_month: 30,
    alternatives: [
      { name: "ERPNext Accounting", slug: "erpnext", url: "https://erpnext.com", description: "Free open-source accounting module", score: 75, efficiency: 78, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Self-hostable. Full double-entry accounting, invoicing, bank reconciliation.", key_differences: ["Double-entry", "Self-hostable", "Full ERP", "Complex setup"], notes: "Self-hostable. Full double-entry accounting, invoicing, bank reconciliation." },
      { name: "Wave", slug: "wave", url: "https://waveapps.com", description: "Free accounting and invoicing", score: 70, efficiency: 72, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free: unlimited invoicing, accounting, receipt scanning. Paid payroll.", key_differences: ["Unlimited invoicing", "Receipt scanning", "Paid payroll", "Proprietary"], notes: "Free: unlimited invoicing, accounting, receipt scanning. Paid payroll." },
      { name: "Invoice Ninja", slug: "invoice-ninja", url: "https://github.com/invoiceninja/invoiceninja", description: "Open-source invoicing", score: 68, efficiency: 70, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Self-hostable. Invoicing, expenses, time tracking. Laravel-based.", key_differences: ["Self-hostable", "Expenses", "Time tracking", "Laravel-based"], notes: "Self-hostable. Invoicing, expenses, time tracking. Laravel-based." }
    ]
  },

  // ── SEARCH / ANALYTICS ──
  {
    name: "Google Analytics",
    aliases: ["google analytics", "ga4", "ga"],
    category: "Analytics",
    website: "https://analytics.google.com",
    price_month: 0,
    alternatives: [
      { name: "Umami", slug: "umami", url: "https://github.com/umami-software/umami", description: "Open-source privacy-first analytics", score: 85, efficiency: 88, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Self-hostable. Privacy-focused. No cookies. Real-time. Fast.", key_differences: ["Privacy-focused", "No cookies", "Real-time", "Self-hosted"], notes: "Self-hostable. Privacy-focused. No cookies. Real-time. Fast." },
      { name: "Plausible", slug: "plausible", url: "https://github.com/plausible/analytics", description: "Lightweight Google Analytics alternative", score: 82, efficiency: 85, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Self-hostable. <1KB script. No cookies. GDPR compliant out of the box.", key_differences: ["<1KB script", "GDPR compliant", "Self-hosted", "Simple"], notes: "Self-hostable. <1KB script. No cookies. GDPR compliant out of the box." },
      { name: "PostHog Free", slug: "posthog", url: "https://posthog.com", description: "Product analytics — free tier with 1M events/month", score: 80, efficiency: 82, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free: 1M events/month, session recording, feature flags, A/B testing.", key_differences: ["1M events", "Session recording", "Feature flags", "A/B testing"], notes: "Free: 1M events/month, session recording, feature flags, A/B testing." },
      { name: "Matomo", slug: "matomo", url: "https://matomo.org", description: "Open-source web analytics", score: 75, efficiency: 78, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Self-hostable. Full GA alternative. Heatmaps, session recording.", key_differences: ["Full GA alternative", "Heatmaps", "Self-hosted", "Complex"], notes: "Self-hostable. Full GA alternative. Heatmaps, session recording." }
    ]
  },
  {
    name: "Mixpanel",
    aliases: ["mixpanel", "mixpanel pro"],
    category: "Product Analytics",
    website: "https://mixpanel.com",
    price_month: 20,
    alternatives: [
      { name: "PostHog Free", slug: "posthog", url: "https://posthog.com", description: "1M events/month free — better than Mixpanel free tier", score: 85, efficiency: 88, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free: 1M events, session recording, feature flags, A/B testing, SQL.", key_differences: ["1M events", "Session recording", "Feature flags", "SQL"], notes: "Free: 1M events, session recording, feature flags, A/B testing, SQL." },
      { name: "Umami", slug: "umami", url: "https://github.com/umami-software/umami", description: "Self-hosted analytics — no event limits", score: 75, efficiency: 78, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Self-hostable. No event limits. Privacy-first. Real-time.", key_differences: ["No event limits", "Privacy-first", "Real-time", "Self-hosted"], notes: "Self-hostable. No event limits. Privacy-first. Real-time." },
      { name: "Plausible", slug: "plausible", url: "https://github.com/plausible/analytics", description: "Lightweight, privacy-first analytics", score: 72, efficiency: 75, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Self-hostable. Simple but effective. No user tracking.", key_differences: ["Simple", "No user tracking", "Self-hosted", "Lightweight"], notes: "Self-hostable. Simple but effective. No user tracking." }
    ]
  },

  // ── CI/CD ──
  {
    name: "CircleCI",
    aliases: ["circleci", "circle ci"],
    category: "CI/CD",
    website: "https://circleci.com",
    price_month: 15,
    alternatives: [
      { name: "GitHub Actions", slug: "github-actions", url: "https://github.com/features/actions", description: "Free 2,000 minutes/month for public repos", score: 82, efficiency: 85, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free: 2K minutes/month (public repos unlimited). Native GitHub integration.", key_differences: ["2K minutes free", "GitHub native", "YAML config", "GitHub lock-in"], notes: "Free: 2K minutes/month (public repos unlimited). Native GitHub integration." },
      { name: "Drone CI", slug: "drone", url: "https://github.com/harness/drone", description: "Open-source CI/CD engine", score: 75, efficiency: 78, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Self-hostable. Lightweight. Docker-native. YAML config.", key_differences: ["Lightweight", "Docker-native", "Self-hosted", "Less features"], notes: "Self-hostable. Lightweight. Docker-native. YAML config." },
      { name: "Woodpecker CI", slug: "woodpecker", url: "https://github.com/woodpecker-ci/woodpecker", description: "Community fork of Drone CI", score: 72, efficiency: 75, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Self-hostable. Active development. Gitea/GitHub/GitLab integration.", key_differences: ["Active development", "Multi-forge", "Self-hosted", "Community-driven"], notes: "Self-hostable. Active development. Gitea/GitHub/GitLab integration." },
      { name: "GitLab CI", slug: "gitlab", url: "https://gitlab.com", description: "Free CI/CD with GitLab repos", score: 70, efficiency: 72, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: true, reasoning: "Free: 400 compute minutes/month. Auto DevOps included.", key_differences: ["400 minutes", "Auto DevOps", "GitLab lock-in", "Full platform"], notes: "Free: 400 compute minutes/month. Auto DevOps included." }
    ]
  },

  // ── PASSWORD / AUTH ──
  {
    name: "1Password",
    aliases: ["1password", "1password teams"],
    category: "Password Manager",
    website: "https://1password.com",
    price_month: 8,
    alternatives: [
      { name: "Bitwarden", slug: "bitwarden", url: "https://bitwarden.com", description: "Free and open-source password manager", score: 88, efficiency: 90, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Free tier: unlimited passwords, devices. Self-hostable with Vaultwarden.", key_differences: ["Unlimited passwords", "Unlimited devices", "Self-hostable", "Open source"], notes: "Free tier: unlimited passwords, devices. Self-hostable with Vaultwarden." },
      { name: "KeePass", slug: "keepass", url: "https://keepass.info", description: "Offline open-source password manager", score: 72, efficiency: 75, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Free. Offline. Local database. Plugins for sync (KeePassXC recommended).", key_differences: ["Offline", "Local database", "No sync", "Plugins available"], notes: "Free. Offline. Local database. Plugins for sync (KeePassXC recommended)." },
      { name: "Proton Pass", slug: "proton-pass", url: "https://proton.me/pass", description: "Free password manager from Proton", score: 75, efficiency: 78, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free: unlimited passwords, 10 hide-my-email aliases, 1GB storage.", key_differences: ["Unlimited passwords", "10 aliases", "1GB storage", "Proton ecosystem"], notes: "Free: unlimited passwords, 10 hide-my-email aliases, 1GB storage." }
    ]
  },
  {
    name: "Okta",
    aliases: ["okta", "okta workforce"],
    category: "Identity / SSO",
    website: "https://okta.com",
    price_month: 6,
    alternatives: [
      { name: "Keycloak", slug: "keycloak", url: "https://github.com/keycloak/keycloak", description: "Open-source identity and access management", score: 82, efficiency: 85, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Self-hostable. SSO, OIDC, SAML, LDAP. Enterprise-grade. Red Hat backed.", key_differences: ["Enterprise-grade", "Red Hat backed", "Self-hosted", "Complex setup"], notes: "Self-hostable. SSO, OIDC, SAML, LDAP. Enterprise-grade. Red Hat backed." },
      { name: "Authelia", slug: "authelia", url: "https://github.com/authelia/authelia", description: "Open-source SSO and 2FA for reverse proxies", score: 75, efficiency: 78, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Self-hostable. 2FA, SSO, MFA. Works with Nginx/Traefik/Caddy.", key_differences: ["2FA/SSO/MFA", "Reverse proxy", "Self-hosted", "Lightweight"], notes: "Self-hostable. 2FA, SSO, MFA. Works with Nginx/Traefik/Caddy." },
      { name: "Authentik", slug: "authentik", url: "https://github.com/goauthentik/authentik", description: "Open-source identity provider", score: 72, efficiency: 75, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Self-hostable. Flow-based auth. SAML, OAuth, LDAP. Modern UI.", key_differences: ["Flow-based", "Modern UI", "Self-hosted", "Growing fast"], notes: "Self-hostable. Flow-based auth. SAML, OAuth, LDAP. Modern UI." }
    ]
  },

  // ── DOCUMENT / PDF ──
  {
    name: "DocuSign",
    aliases: ["docusign", "docusign pro"],
    category: "E-Signatures",
    website: "https://docusign.com",
    price_month: 25,
    alternatives: [
      { name: "Docuseal", slug: "docuseal", url: "https://github.com/docusealco/docuseal", description: "Open-source DocuSign alternative", score: 80, efficiency: 82, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Self-hostable. Unlimited signatures. Templates. Webhooks. API.", key_differences: ["Unlimited signatures", "Templates", "API", "Self-hosted"], notes: "Self-hostable. Unlimited signatures. Templates. Webhooks. API." },
      { name: "DocuSeal Cloud Free", slug: "docuseal", url: "https://docuseal.com", description: "Free tier: 10 documents/month", score: 70, efficiency: 72, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free cloud tier: 10 docs/month, unlimited signers.", key_differences: ["10 docs/month", "Unlimited signers", "Cloud", "Limited"], notes: "Free cloud tier: 10 docs/month, unlimited signers." }
    ]
  },

  // ── HOSTING / DEPLOYMENT ──
  {
    name: "Vercel Pro",
    aliases: ["vercel", "vercel pro"],
    category: "Hosting",
    website: "https://vercel.com",
    price_month: 20,
    alternatives: [
      { name: "Vercel Free", slug: "vercel-free", url: "https://vercel.com", description: "Generous free tier for hobby projects", score: 80, efficiency: 80, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free: 100GB bandwidth, serverless functions, edge network. Good for most projects.", key_differences: ["100GB bandwidth", "Serverless", "Edge network", "Hobby tier"], notes: "Free: 100GB bandwidth, serverless functions, edge network. Good for most projects." },
      { name: "Netlify Free", slug: "netlify", url: "https://netlify.com", description: "Free hosting with 100GB bandwidth/month", score: 78, efficiency: 80, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free: 100GB bandwidth, 300 build minutes, serverless functions.", key_differences: ["100GB bandwidth", "300 build minutes", "Serverless", "Proprietary"], notes: "Free: 100GB bandwidth, 300 build minutes, serverless functions." },
      { name: "Cloudflare Pages", slug: "cloudflare-pages", url: "https://pages.cloudflare.com", description: "Free hosting with unlimited bandwidth", score: 82, efficiency: 85, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free: unlimited bandwidth, 500 builds/month, Workers integration.", key_differences: ["Unlimited bandwidth", "500 builds", "Workers", "Proprietary"], notes: "Free: unlimited bandwidth, 500 builds/month, Workers integration." },
      { name: "Coolify", slug: "coolify", url: "https://github.com/coollabsio/coolify", description: "Open-source Vercel/Netlify alternative — self-hosted", score: 78, efficiency: 80, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Self-hostable. Deploy any app. Docker/Nixpacks. $5 VPS can host unlimited apps.", key_differences: ["Self-hosted", "Docker", "Unlimited apps", "$5 VPS"], notes: "Self-hostable. Deploy any app. Docker/Nixpacks. $5 VPS can host unlimited apps." }
    ]
  },
  {
    name: "Netlify",
    aliases: ["netlify", "netlify pro"],
    category: "Hosting",
    website: "https://netlify.com",
    price_month: 19,
    alternatives: [
      { name: "Cloudflare Pages", slug: "cloudflare-pages", url: "https://pages.cloudflare.com", description: "Unlimited bandwidth, free", score: 85, efficiency: 88, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free: unlimited bandwidth. Faster than Netlify for global audiences.", key_differences: ["Unlimited bandwidth", "Faster global", "Workers integration", "Proprietary"], notes: "Free: unlimited bandwidth. Faster than Netlify for global audiences." },
      { name: "Vercel Free", slug: "vercel-free", url: "https://vercel.com", description: "100GB bandwidth, serverless functions", score: 80, efficiency: 82, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free: 100GB bandwidth. Best for Next.js projects.", key_differences: ["100GB bandwidth", "Next.js optimized", "Serverless", "Proprietary"], notes: "Free: 100GB bandwidth. Best for Next.js projects." },
      { name: "Coolify", slug: "coolify", url: "https://github.com/coollabsio/coolify", description: "Self-hosted PaaS — deploy anything", score: 78, efficiency: 80, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Self-hosted. Docker. Unlimited apps on a $5 VPS.", key_differences: ["Self-hosted", "Docker", "Unlimited apps", "$5 VPS"], notes: "Self-hosted. Docker. Unlimited apps on a $5 VPS." }
    ]
  },

  // ── STORAGE / CDN ──
  {
    name: "AWS S3",
    aliases: ["aws s3", "amazon s3", "s3"],
    category: "Storage",
    website: "https://aws.amazon.com/s3",
    price_month: 23,
    alternatives: [
      { name: "Cloudflare R2", slug: "cloudflare-r2", url: "https://cloudflare.com/r2", description: "10GB free, zero egress fees", score: 85, efficiency: 88, savings_pct: 80, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free: 10GB storage, 10M reads/month, zero egress fees. S3-compatible API.", key_differences: ["Zero egress", "10GB free", "S3-compatible", "Proprietary"], notes: "Free: 10GB storage, 10M reads/month, zero egress fees. S3-compatible API." },
      { name: "Backblaze B2", slug: "backblaze-b2", url: "https://backblaze.com/b2", description: "10GB free, $5/TB after that", score: 80, efficiency: 82, savings_pct: 75, relationship: "cheaper", free_tier: true, self_hostable: false, reasoning: "Free: 10GB. $0.005/GB/month. 3x cheaper than S3. S3-compatible API.", key_differences: ["3x cheaper", "S3-compatible", "10GB free", "Proprietary"], notes: "Free: 10GB. $0.005/GB/month. 3x cheaper than S3. S3-compatible API." },
      { name: "Supabase Storage", slug: "supabase-storage", url: "https://supabase.com", description: "1GB free with Supabase projects", score: 70, efficiency: 72, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free: 1GB storage per project. Image transformations included.", key_differences: ["1GB free", "Image transformations", "Supabase integration", "Limited"], notes: "Free: 1GB storage per project. Image transformations included." }
    ]
  },

  // ── AI / ML PLATFORMS ──
  {
    name: "Hugging Face Pro",
    aliases: ["hugging face pro", "huggingface pro"],
    category: "ML Platform",
    website: "https://huggingface.co",
    price_month: 9,
    alternatives: [
      { name: "Hugging Face Free", slug: "huggingface-free", url: "https://huggingface.co", description: "Free tier with model hosting and inference", score: 85, efficiency: 85, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free: unlimited model hosting, Spaces (3 CPU). Rate-limited inference API.", key_differences: ["Unlimited hosting", "Spaces", "Rate-limited API", "Full features"], notes: "Free: unlimited model hosting, Spaces (3 CPU). Rate-limited inference API." },
      { name: "Ollama", slug: "ollama", url: "https://ollama.com", description: "Run any model locally for free", score: 78, efficiency: 80, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Free. Run Llama, Mistral, Phi, Gemma locally. No API costs.", key_differences: ["Run locally", "No API costs", "Requires hardware", "No cloud"], notes: "Free. Run Llama, Mistral, Phi, Gemma locally. No API costs." },
      { name: "Google AI Studio", slug: "google-ai-studio", url: "https://aistudio.google.com", description: "Free Gemini API access for developers", score: 80, efficiency: 82, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free: Gemini API access, prompt design, model fine-tuning sandbox.", key_differences: ["Free API", "Prompt design", "Fine-tuning", "Google ecosystem"], notes: "Free: Gemini API access, prompt design, model fine-tuning sandbox." }
    ]
  },

  // ── VPN / SECURITY ──
  {
    name: "NordVPN",
    aliases: ["nordvpn"],
    category: "VPN",
    website: "https://nordvpn.com",
    price_month: 12,
    alternatives: [
      { name: "Proton VPN Free", slug: "proton-vpn", url: "https://protonvpn.com", description: "Free VPN with no ads from Proton", score: 80, efficiency: 82, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free: unlimited data, 3 countries, no ads. Swiss privacy.", key_differences: ["Unlimited data", "No ads", "Swiss privacy", "3 countries"], notes: "Free: unlimited data, 3 countries, no ads. Swiss privacy." },
      { name: "WireGuard Self-Hosted", slug: "wireguard", url: "https://wireguard.com", description: "Self-hosted VPN on any VPS", score: 72, efficiency: 75, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Free. Self-host on a $5 VPS. Fastest VPN protocol. Simple config.", key_differences: ["Fastest protocol", "Simple config", "Self-hosted", "$5 VPS"], notes: "Free. Self-host on a $5 VPS. Fastest VPN protocol. Simple config." },
      { name: "Tailscale Free", slug: "tailscale", url: "https://tailscale.com", description: "Zero-config mesh VPN — free for 3 users", score: 75, efficiency: 78, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free: 3 users, 100 devices. WireGuard-based. MagicDNS. ACLs.", key_differences: ["3 users", "100 devices", "MagicDNS", "ACLs"], notes: "Free: 3 users, 100 devices. WireGuard-based. MagicDNS. ACLs." }
    ]
  },

  // ── DOCUMENTATION ──
  {
    name: "Confluence",
    aliases: ["confluence", "confluence cloud"],
    category: "Documentation",
    website: "https://atlassian.com/software/confluence",
    price_month: 6,
    alternatives: [
      { name: "Outline", slug: "outline", url: "https://github.com/outline/outline", description: "Open-source team wiki and knowledge base", score: 85, efficiency: 88, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Self-hostable. Real-time collab. Slack integration. Markdown. Beautiful UI.", key_differences: ["Self-hostable", "Real-time collab", "Markdown", "Beautiful UI"], notes: "Self-hostable. Real-time collab. Slack integration. Markdown. Beautiful UI." },
      { name: "BookStack", slug: "bookstack", url: "https://github.com/BookStackApp/BookStack", description: "Self-hosted documentation platform", score: 78, efficiency: 80, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Self-hostable. Hierarchical: Shelves > Books > Chapters > Pages. Simple.", key_differences: ["Hierarchical", "Self-hosted", "Simple", "PHP-based"], notes: "Self-hostable. Hierarchical: Shelves > Books > Chapters > Pages. Simple." },
      { name: "Notion Free", slug: "notion-free", url: "https://notion.so", description: "Free for personal use", score: 70, efficiency: 72, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free for individuals. Good for personal docs, limited for teams.", key_differences: ["Free for individuals", "Full features", "Limited teams", "Proprietary"], notes: "Free for individuals. Good for personal docs, limited for teams." }
    ]
  },

  // ── FORMS / DATA COLLECTION ──
  {
    name: "Jotform",
    aliases: ["jotform", "jotform pro"],
    category: "Forms",
    website: "https://jotform.com",
    price_month: 34,
    alternatives: [
      { name: "Tally", slug: "tally", url: "https://tally.so", description: "Unlimited forms and submissions for free", score: 88, efficiency: 90, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free: unlimited forms, submissions, payments, custom domains. Best free form builder.", key_differences: ["Unlimited everything", "Payments", "Custom domains", "Proprietary"], notes: "Free: unlimited forms, submissions, payments, custom domains. Best free form builder." },
      { name: "Formbricks", slug: "formbricks", url: "https://github.com/formbricks/formbricks", description: "Open-source form builder with in-app surveys", score: 78, efficiency: 80, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Self-hostable. Typeform-quality. In-app surveys, NPS, user research.", key_differences: ["In-app surveys", "NPS", "Typeform-quality", "Self-hosted"], notes: "Self-hostable. Typeform-quality. In-app surveys, NPS, user research." },
      { name: "Google Forms", slug: "google-forms", url: "https://forms.google.com", description: "Free with Google account", score: 70, efficiency: 72, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free. Unlimited responses. Basic design. Auto-saves to Sheets.", key_differences: ["Unlimited", "Sheets integration", "Basic design", "Google ecosystem"], notes: "Free. Unlimited responses. Basic design. Auto-saves to Sheets." }
    ]
  },

  // ── ATS / RECRUITING ──
  {
    name: "Ceipal",
    aliases: ["ceipal", "ceipal ats", "ceipal recruit"],
    category: "ATS/Recruiting",
    website: "https://ceipal.com",
    price_month: 110,
    alternatives: [
      { name: "OpenCATS", slug: "opencats", url: "https://github.com/opencats/OpenCATS", description: "Open-source ATS with full recruiting workflow — candidates, jobs, placements, reporting", score: 80, efficiency: 75, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Complete ATS with candidate management, job posting, resume parsing, interview scheduling, and reporting. Self-hostable on any Linux server.", key_differences: ["Self-hosted", "Full ATS workflow", "Resume parsing", "No AI screening"], notes: "Self-hostable. Full ATS workflow. Resume parsing. No AI screening." },
      { name: "HrFlow.ai (free tier)", slug: "hrflow", url: "https://hrflow.ai", description: "AI-powered talent acquisition platform with free tier for small teams", score: 75, efficiency: 70, savings_pct: 95, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free tier for small teams with AI-powered resume parsing, job matching, and candidate scoring.", key_differences: ["AI-powered", "Free tier for small teams", "Cloud-only", "Limited integrations"], notes: "Free tier for small teams. AI-powered resume parsing. Cloud-only." },
      { name: "Recruitee", slug: "recruitee", url: "https://recruitee.com", description: "Collaborative hiring platform with free tier for small teams", score: 72, efficiency: 68, savings_pct: 95, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "Free tier for up to 10 active job offers. Collaborative hiring, career sites, and basic analytics.", key_differences: ["Free for 10 jobs", "Career sites", "Team collaboration", "Limited features"], notes: "Free for 10 active job offers. Collaborative hiring. Career sites." },
      { name: "Odoo HR", slug: "odoo-hr", url: "https://github.com/odoo/odoo", description: "Open-source ERP with full HR/recruitment module", score: 70, efficiency: 65, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Full HR module including recruitment, onboarding, appraisals, and employee management. Community edition is free.", key_differences: ["Full ERP suite", "Self-hosted", "Recruitment + HR", "Complex setup"], notes: "Community edition is free. Self-hostable. Full HR module including recruitment." },
      { name: "OrangeHRM", slug: "orangehrm", url: "https://github.com/orangehrm/orangehrm", description: "Open-source HR management with recruitment module", score: 68, efficiency: 62, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Full HR suite with recruitment, leave management, time tracking. Self-hostable.", key_differences: ["Full HR suite", "Recruitment module", "Self-hosted", "Basic UI"], notes: "Full HR suite. Recruitment module. Self-hostable. Basic UI." }
    ]
  },
  {
    name: "Eightfold AI",
    aliases: ["eightfold", "eightfold ai", "eightfold talent"],
    category: "Talent Intelligence",
    website: "https://eightfold.ai",
    price_month: 200,
    alternatives: [
      { name: "OpenCATS", slug: "opencats", url: "https://github.com/opencats/OpenCATS", description: "Open-source ATS — covers core talent acquisition without the AI price tag", score: 75, efficiency: 65, savings_pct: 100, relationship: "open_source", free_tier: true, self_hostable: true, reasoning: "Covers core ATS needs (candidates, jobs, pipeline) without Eightfold's AI talent intelligence. Free forever.", key_differences: ["No AI matching", "Self-hosted", "Basic pipeline", "Free forever"], notes: "Covers core ATS needs without AI. Free forever." },
      { name: "ATS + LinkedIn Recruiter Lite", slug: "linkedin-lite", url: "https://linkedin.com", description: "LinkedIn Recruiter Lite ($170/mo) covers sourcing that Eightfold's AI does", score: 72, efficiency: 60, savings_pct: 15, relationship: "cheaper", free_tier: false, self_hostable: false, reasoning: "LinkedIn Recruiter Lite provides candidate sourcing and outreach at fraction of Eightfold's cost.", key_differences: ["Sourcing focused", "LinkedIn data", "No AI matching", "Cheaper but not free"], notes: "LinkedIn Recruiter Lite at $170/mo. Sourcing focused. Not free but cheaper." },
      { name: "HrFlow.ai (free tier)", slug: "hrflow", url: "https://hrflow.ai", description: "AI-powered talent acquisition with some of Eightfold's intelligence features", score: 70, efficiency: 55, savings_pct: 100, relationship: "free_tier", free_tier: true, self_hostable: false, reasoning: "AI-powered resume parsing and candidate matching on free tier. Not as comprehensive as Eightfold but covers basics.", key_differences: ["AI-powered", "Free for small teams", "Less comprehensive", "Cloud-only"], notes: "AI-powered. Free for small teams. Less comprehensive than Eightfold." }
    ]
  }
];

export function findAlternatives(productName: string): AltProduct | null {
  const lower = productName.toLowerCase().trim();
  return ALTERNATIVES_DB.find(p =>
    p.name.toLowerCase() === lower ||
    p.aliases.some(a => a.toLowerCase() === lower) ||
    lower.includes(p.name.toLowerCase().split(" ")[0])
  ) || null;
}

export function searchProducts(query: string): AltProduct[] {
  const lower = query.toLowerCase();
  return ALTERNATIVES_DB.filter(p =>
    p.name.toLowerCase().includes(lower) ||
    p.aliases.some(a => a.toLowerCase().includes(lower)) ||
    p.category.toLowerCase().includes(lower)
  );
}
