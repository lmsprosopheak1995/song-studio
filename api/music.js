const authorized = require('./_auth');

/* ជ្រើសសេវាតាម env: MUSIC_PROVIDER = lyria | songup | elevenlabs (លំនាំដើម elevenlabs) */

const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------- Google Lyria 3 (Gemini API) — ត្រឡប់ MP3 ផ្ទាល់ ---------- */
async function lyria({ lyrics, style, lang, secs }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('ខ្វះ GEMINI_API_KEY');
  const model = process.env.LYRIA_MODEL || 'lyria-3-pro-preview';
  const prompt =
    `Create a song of about ${secs} seconds. Style: ${style}.\n` +
    `Sung vocals in ${lang || 'the same language as the lyrics'}. Sing these lyrics exactly as written, with clear pronunciation:\n\n${lyrics}`;
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt.slice(0, 8000) }] }],
      generationConfig: { responseModalities: ['AUDIO', 'TEXT'] }
    })
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('Lyria: ' + (data?.error?.message || r.status));
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const audio = parts.find(p => (p.inlineData || p.inline_data));
  const inline = audio && (audio.inlineData || audio.inline_data);
  if (!inline?.data) throw new Error('Lyria មិនបានត្រឡប់សំឡេង (អាចត្រូវបានទប់ស្កាត់)');
  return { buffer: Buffer.from(inline.data, 'base64'), mime: inline.mimeType || inline.mime_type || 'audio/mpeg' };
}

/* ---------- SongUp AI — ដំណើរការអសមកាល (1–3 នាទី) ---------- */
async function songup({ lyrics, style, lang, title }) {
  const key = process.env.SONGUP_API_KEY;
  if (!key) throw new Error('ខ្វះ SONGUP_API_KEY');
  const base = 'https://www.songupai.com/api/v1';
  const headers = { 'content-type': 'application/json', authorization: 'Bearer ' + key };

  // ⚠ ឈ្មោះវាល (idea, language, style, lyrics, title) ផ្អែកលើការពិពណ៌នាសាធារណៈ
  //   សូមផ្ទៀងផ្ទាត់នឹង OpenAPI របស់ SongUp: https://www.songupai.com/api/v1/openapi
  const create = await fetch(base + '/songs', {
    method: 'POST', headers,
    body: JSON.stringify({
      idea: `${style}. Vocals sung in ${lang}.`,
      language: lang === 'Khmer' ? 'km' : 'en',
      style,
      lyrics,
      title: title || undefined
    })
  });
  const created = await create.json().catch(() => ({}));
  if (!create.ok) throw new Error('SongUp: ' + JSON.stringify(created).slice(0, 400));
  const id = created.id || created.song?.id;
  if (!id) throw new Error('SongUp: មិនមាន id ក្នុងចម្លើយ');

  const deadline = Date.now() + 270e3;
  while (Date.now() < deadline) {
    await sleep(6000);
    const g = await fetch(`${base}/songs/${id}`, { headers });
    const s = await g.json().catch(() => ({}));
    const song = s.song || s;
    const st = String(song.status || '').toLowerCase();
    if (song.audio_url && (st === 'completed' || st === 'complete' || st === 'done' || st === 'ready')) return { audio_url: song.audio_url };
    if (st === 'failed' || st === 'error') throw new Error('SongUp: បង្កើតមិនបានសម្រេច');
  }
  throw new Error('SongUp: ចំណាយពេលយូរពេក សូមព្យាយាមម្តងទៀត');
}

/* ---------- ElevenLabs Music ---------- */
async function elevenlabs({ lyrics, style, lang, secs }) {
  if (!process.env.ELEVENLABS_API_KEY) throw new Error('ខ្វះ ELEVENLABS_API_KEY');
  const r = await fetch('https://api.elevenlabs.io/v1/music?output_format=mp3_44100_96', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'xi-api-key': process.env.ELEVENLABS_API_KEY },
    body: JSON.stringify({
      prompt: `${style}. A song with vocals sung in ${lang || 'the same language as the lyrics'}.\nLyrics:\n${lyrics}`.slice(0, 4000),
      music_length_ms: secs * 1000,
      model_id: process.env.ELEVENLABS_MUSIC_MODEL || 'music_v1'
    })
  });
  if (!r.ok) throw new Error('ElevenLabs: ' + (await r.text()).slice(0, 400));
  return { buffer: Buffer.from(await r.arrayBuffer()), mime: 'audio/mpeg' };
}

const PROVIDERS = { lyria, songup, elevenlabs };

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!authorized(req, 'music', 5)) return res.status(429).json({ error: 'ប្រើច្រើនពេក (អតិបរមា 5 ចម្រៀងក្នុងមួយម៉ោង) សូមរង់ចាំ' });

  const { lyrics, style, lang, seconds, title } = req.body || {};
  if (!lyrics || !style) return res.status(400).json({ error: 'ត្រូវការអត្ថបទ និងស្ទីល' });
  const secs = Math.min(150, Math.max(30, parseInt(seconds, 10) || 90));

  const name = (process.env.MUSIC_PROVIDER || 'elevenlabs').toLowerCase();
  const fn = PROVIDERS[name];
  if (!fn) return res.status(500).json({ error: 'MUSIC_PROVIDER មិនត្រឹមត្រូវ: ' + name });

  try {
    const out = await fn({ lyrics, style, lang, secs, title });
    if (out.audio_url) return res.status(200).json({ audio_url: out.audio_url });
    res.setHeader('Content-Type', out.mime);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(out.buffer);
  } catch (e) {
    console.error('music error', name, e);
    return res.status(502).json({ error: e.message });
  }
};
