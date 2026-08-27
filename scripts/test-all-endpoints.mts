const base = 'https://free-intel.vercel.app';
async function t(label: string, url: string, opts?: any) {
  try {
    const r = await fetch(url, opts);
    const ok = r.ok;
    const body = ok ? await r.json() : await r.text();
    console.log(`${ok ? "OK" : "FAIL"} ${r.status} ${label}`);
    if (!ok) console.log(`  ${String(body).slice(0, 200)}`);
  } catch (e: any) { console.log(`ERR ${label}: ${e.message}`); }
}

await t("health", `${base}/api/health`);
await t("resources", `${base}/api/resources?limit=2`);
await t("resource detail", `${base}/api/resources/ollama-ollama`);
await t("ai-search", `${base}/api/resources/ai-search`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({q:"free AI"}) });
await t("facets", `${base}/api/resources/facets`);
await t("capabilities", `${base}/api/capabilities`);
await t("deals", `${base}/api/deals`);
await t("radar status", `${base}/api/radar/status`);
await t("radar events", `${base}/api/radar/events?limit=3`);
await t("daily", `${base}/api/daily`);
await t("github-scan", `${base}/api/radar/github-scan`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({query:"free mcp server"}) });
await t("scan run", `${base}/api/scans/run`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({action:"batch"}) });
await t("products resolve", `${base}/api/products/resolve`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({name:"Notion"}) });
await t("search-alternatives", `${base}/api/products/search-alternatives`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({tool:"Notion"}) });
await t("cost analyze", `${base}/api/cost/analyze`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({tools:[{name:"Notion",monthly_cost:10}]}) });
await t("submissions", `${base}/api/submissions`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({url:"https://github.com/test/test",name:"Test"}) });
await t("admin overview", `${base}/api/admin/overview`);
