import { parseFeed } from "../server/lib/feed.ts";
import { classifyText } from "../server/lib/classify.ts";

async function main() {
  const xml = await (await fetch("https://hnrss.org/frontpage")).text();
  const items = parseFeed(xml);
  console.log("parsed items:", items.length);
  let rel = 0;
  for (const it of items.slice(0, 30)) {
    const c = classifyText(`${it.title} ${it.summary}`);
    if (c.relevant) {
      rel++;
      console.log("RELEVANT:", it.title.slice(0, 60), "| score", c.score, "|", c.guessedCategory, "|", c.guessedFreeType);
    }
  }
  console.log("relevant:", rel);
}
main();
