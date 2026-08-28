import "dotenv/config";
import fetch from "node-fetch";

async function main() {
  const key = process.env.GEMINI_API_KEY;
  console.log("Key:", key?.substring(0, 10));

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Say hi in 3 words" }] }],
        generationConfig: { maxOutputTokens: 50 },
      }),
    }
  );

  console.log("Status:", res.status);
  const data = await res.json() as any;
  console.log("Text:", data.candidates?.[0]?.content?.parts?.[0]?.text);
  if (data.error) console.log("Error:", JSON.stringify(data.error));
}

main();