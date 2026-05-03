export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  try {
    const { messages, max_tokens } = req.body;
    
    // Convert Anthropic messages format to Gemini format
    const parts = messages.map(m => ({
      text: typeof m.content === "string" 
        ? m.content 
        : m.content.map(c => c.text || "").join(" ")
    }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts }] })
      }
    );

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response";
    
    // Return in Anthropic format so app works unchanged
    res.status(200).json({ 
      content: [{ text }] 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
