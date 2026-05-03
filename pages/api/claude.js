export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { image, query } = req.body;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: query || "Analyze this PCB board and identify all components" },
            ...(image ? [{ inline_data: { mime_type: "image/jpeg", data: image } }] : [])
          ]
        }]
      })
    }
  );

  const data = a
