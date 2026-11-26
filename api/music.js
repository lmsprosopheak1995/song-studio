const authorized = require('./_auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!authorized(req)) return res.status(401).json({ error: 'ពាក្យសម្ងាត់មិនត្រឹមត្រូវ' });
  if (!process.env.ELEVENLABS_API_KEY) return res.status(500).json({ error: 'ខ្វះ ELEVENLABS_API_KEY' });

  const { lyrics, style, lang, seconds } = req.body || {};
  if (!lyrics || !style) return res.status(400).json({ error: 'ត្រូវការអត្ថបទ និងស្ទីល' });

  // កម្រិត 30–150 វិនាទី ដើម្បីកុំឱ្យហួសកម្រិតទំហំ response របស់ Vercel (~4.5MB)
  const secs = Math.min(150, Math.max(30, parseInt(seconds, 10) || 90));
  const prompt = `${style}. A song with vocals sung in ${lang || 'the same language as the lyrics'}.\nLyrics:\n${lyrics}`.slice(0, 4000);

  const body = {
    prompt,
    music_length_ms: secs * 1000,
    model_id: process.env.ELEVENLABS_MUSIC_MODEL || 'music_v1'
  };

  try {
    const r = await fetch('https://api.elevenlabs.io/v1/music?output_format=mp3_44100_96', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY
      },
      body: JSON.stringify(body)
    });
    if (!r.ok) {
      const t = await r.text();
      return res.status(502).json({ error: 'ElevenLabs: ' + t.slice(0, 500) });
    }
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(buf);
  } catch (e) {
    return res.status(500).json({ error: 'បង្កើតតន្ត្រីមិនបាន: ' + e.message });
  }
};
