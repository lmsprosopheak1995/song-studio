const authorized = require('./_auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!authorized(req)) return res.status(401).json({ error: 'ពាក្យសម្ងាត់មិនត្រឹមត្រូវ' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'ខ្វះ ANTHROPIC_API_KEY' });

  const { topic, genre, mood, lang, length } = req.body || {};
  if (!topic || String(topic).length > 1000) return res.status(400).json({ error: 'ប្រធានបទមិនត្រឹមត្រូវ' });

  const structure = {
    short: '1 verse + chorus',
    mid: '2 verses + chorus + bridge',
    long: '3 verses + chorus + bridge + outro'
  }[length] || '2 verses + chorus + bridge';

  const prompt = `You are a professional songwriter. Write an original song.
Topic: ${topic}
Genre: ${genre}
Mood: ${mood}
Lyrics language: ${lang} (if Khmer: natural, singable, poetic Khmer with consistent line rhythm)
Structure: ${structure}
Return ONLY valid JSON, no markdown:
{"title":"...","lyrics":"lyrics with section labels like [Verse 1], [Chorus] on their own lines","style":"one line in English: comma-separated style tags for an AI music generator (genre, tempo/BPM, instruments, vocal type, mood)"}`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5-5',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await r.json();
    if (!r.ok) return res.status(502).json({ error: data?.error?.message || 'Anthropic API error' });
    const text = (data.content || []).map(b => b.text || '').join('').replace(/```json|```/g, '').trim();
    const out = JSON.parse(text);
    return res.status(200).json({ title: out.title, lyrics: out.lyrics, style: out.style });
  } catch (e) {
    return res.status(500).json({ error: 'បង្កើតអត្ថបទមិនបាន: ' + e.message });
  }
};
