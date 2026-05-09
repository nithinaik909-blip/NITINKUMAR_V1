module.exports.config = {
  api: { bodyParser: { sizeLimit: "20mb" } },
};

function toGeminiParts(content) {
  if (typeof content === "string") return [{ text: content }];
  return content.map(block => {
    if (block.type === "text") return { text: block.text };
    if (block.type === "image") return {
      inline_data: {
        mime_type: block.source?.media_type || "image/jpeg",
        data: block.source?.data || "",
      },
    };
    return { text: "" };
  });
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY not set in Vercel env vars" });

  try {
    const { messages, max_tokens = 4096 } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0)
      return res.status(400).json({ error: "messages array required" });

    const contents = messages.map(msg => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: toGeminiParts(msg.content),
    }));

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          generationConfig: { maxOutputTokens: max_tokens, temperature: 0.1 },
        }),
      }
    );

    const geminiData = await geminiRes.json();
    if (!geminiRes.ok || geminiData.error)
      return res.status(geminiRes.status || 500).json({ error: geminiData.error?.message || "Gemini error" });

    const rawText = geminiData.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("") || "";

    // Return in Anthropic format — your JSX already understands this
    return res.status(200).json({ content: [{ type: "text", text: rawText }] });

  } catch (err) {
    return res.status(500).json({ error: "Server error: " + err.message });
  }
}
