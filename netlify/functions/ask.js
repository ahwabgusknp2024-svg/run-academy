// RUN AI doubt solver: Netlify serverless function that calls Groq.
// The API key is read from the GROQ_API_KEY environment variable (never put it in index.html).

const SYSTEM = `You are RUN AI, the friendly doubt-solving assistant of RUN Academy, an online coaching for CBSE students of Classes 9-12 (Physics, Chemistry, Mathematics).
- Answer any question the student asks. For academics, explain step by step in simple language with a short worked example when useful.
- Reply in the same language the student uses (English, Hindi or Hinglish).
- Write plain text only. No markdown, no asterisks, no # headings. Use numbered steps (1. 2. 3.) and Unicode for maths and chemistry (x², √, ½, H₂O, →).
- Keep answers concise (under about 180 words) unless the student asks for detail.
- If you are not sure about something, say so honestly instead of guessing.`;

const json = (statusCode, obj) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(obj),
});

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const key = process.env.GROQ_API_KEY;
  if (!key) return json(500, { error: 'GROQ_API_KEY is not set' });

  let q = '';
  try {
    q = String(JSON.parse(event.body || '{}').q || '').trim().slice(0, 1000);
  } catch (e) {}
  if (!q) return json(400, { error: 'Empty question' });

  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        temperature: 0.4,
        max_tokens: 700,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: q },
        ],
      }),
    });
    if (!r.ok) return json(502, { error: 'Groq request failed', status: r.status });
    const data = await r.json();
    const reply = (data.choices && data.choices[0] && data.choices[0].message.content || '').trim();
    if (!reply) return json(502, { error: 'Empty reply' });
    return json(200, { reply });
  } catch (e) {
    return json(502, { error: 'Network error' });
  }
};