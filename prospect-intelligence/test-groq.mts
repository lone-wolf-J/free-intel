import "dotenv/config";
import { Groq } from "groq-sdk";

const key = process.env.GROQ_API_KEY;
const groq = new Groq({ apiKey: key });

async function main() {
  const prompt = `Analyze "Elon Musk Tesla" for sales intel. Return JSON with person, company, sections (18 titles), aiInsights[3], confidenceScore. Be concise.`;
  
  console.log("Prompt length (chars):", prompt.length);
  console.log("Prompt (chars):", prompt);
  
  const res = await groq.chat.completions.create({
    model: "openai/gpt-oss-20b",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 1000,
  });
  console.log("Response:", res.choices[0]?.message?.content);
  console.log("Usage:", res.usage);
}

main().catch(console.error);