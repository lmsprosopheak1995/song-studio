# Song Studio (Vercel)

អត្ថបទចម្រៀង: Claude (Anthropic API) → សំឡេងចម្រៀង: ElevenLabs Music API

## ដំឡើង
1. ដាក់ឯកសារទាំងនេះក្នុង GitHub repo ថ្មី ហើយ Import ទៅ Vercel (Framework = Other)។
2. Vercel → Settings → Environment Variables៖
   - `ANTHROPIC_API_KEY`  (console.anthropic.com)
   - `ELEVENLABS_API_KEY` (elevenlabs.io → API Keys; ត្រូវមានគម្រោងដែលអនុញ្ញាត Music API)
   - `APP_PASSWORD` (ជម្រើស — ទុកទទេ = គ្មានពាក្យសម្ងាត់)
   - `ELEVENLABS_MUSIC_MODEL` (ជម្រើស: music_v1 | music_v2 | music_v2_5)
3. Deploy ។ បើកគេហទំព័រ បញ្ចូល APP_PASSWORD ហើយប្រើ។

ឬសាកល្បងក្នុងម៉ាស៊ីន៖ `npm i -g vercel && vercel dev` (ចម្លង .env.example ទៅ .env.local)។

## ចំណាំ
- `maxDuration` 300 វិនាទី អាចត្រូវបន្ថយតាមគម្រោង Vercel របស់អ្នក (កែក្នុង vercel.json)។
- ប្រវែងចម្រៀងកំណត់ត្រឹម 150 វិនាទី ដើម្បីមិនឱ្យហួសកម្រិត response 4.5MB របស់ Vercel Functions។
- គុណភាពសំឡេងច្រៀងភាសាខ្មែរ អាស្រ័យលើម៉ូដែលរបស់ ElevenLabs — សាកល្បងជាមួយ English ផងដែរ ហើយប្តូរ model ប្រៀបធៀប។
- ការប្រើប្រាស់នីមួយៗចំណាយ credits ។ កុំចែក APP_PASSWORD ទៅអ្នកដែលមិនទុកចិត្ត។
