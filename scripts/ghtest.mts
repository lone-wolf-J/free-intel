const q = encodeURIComponent("mcp server");
const url = `https://api.github.com/search/repositories?q=${q}&sort=stars&order=desc&per_page=15`;
const res = await fetch(url, {
  headers: {
    "User-Agent": "FreeIntelBot/1.0 (+https://free-intel.dev; discovery bot)",
    Accept: "application/vnd.github+json"
  }
});
console.log("status:", res.status);
console.log("ratelimit-remaining:", res.headers.get("x-ratelimit-remaining"));
console.log("retry-after:", res.headers.get("retry-after"));
const body = await res.text();
console.log("body head:", body.slice(0, 300));
