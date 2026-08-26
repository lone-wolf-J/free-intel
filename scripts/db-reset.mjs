import fs from "node:fs";
import path from "node:path";

const dir = path.resolve(".wrangler/state/v3/d1");
if (fs.existsSync(dir)) {
  fs.rmSync(dir, { recursive: true, force: true });
  console.log("Local D1 state cleared:", dir);
} else {
  console.log("No local D1 state found at", dir);
}
console.log("The worker will re-create schema + demo seed on next API request.");
