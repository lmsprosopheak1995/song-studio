const authorized = require('./_auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!authorized(req, 'lyrics', 20)) return res.status(429).json({ error: 'ប្រើច្រើនពេក សូមរង់ចាំមួយម៉ោង' });
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
Output EXACTLY in this format, no markdown, no extra commentary:
TITLE: <song title>
STYLE: <one line in English: comma-separated style tags for an AI music generator (genre, tempo/BPM, instruments, vocal type, mood)>
LYRICS:
<lyrics with section labels like [Verse 1], [Chorus] on their own lines>`;

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
    const text = (data.content || []).map(b => b.text || '').join('').trim();
    const title = (text.match(/^TITLE:\s*(.*)$/mi) || [])[1] || '';
    const style = (text.match(/^STYLE:\s*(.*)$/mi) || [])[1] || '';
    const lyrics = (text.split(/^LYRICS:\s*$/mi)[1] || text.replace(/^(TITLE|STYLE):.*$/gmi, '')).trim();
    if (!lyrics) return res.status(502).json({ error: 'AI មិនបានត្រឡប់អត្ថបទ' });
    const out = { title: title.trim(), lyrics, style: style.trim() };
    return res.status(200).json({ title: out.title, lyrics: out.lyrics, style: out.style });
  } catch (e) {
    console.error('lyrics error', e);
    return res.status(500).json({ error: 'បង្កើតអត្ថបទមិនបាន: ' + e.message });
  }
};
