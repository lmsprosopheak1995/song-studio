// បើមិនកំណត់ APP_PASSWORD → បើកសាធារណៈ (គ្មានពាក្យសម្ងាត់)
// បើកំណត់ APP_PASSWORD → ត្រូវផ្ញើក្នុង header x-app-password
const hits = new Map(); // កម្រិតប្រើប្រាស់ត្រង់ៗ (ក្នុងអង្គចងចាំ instance ប៉ុណ្ណោះ)

module.exports = function authorized(req, kind = 'x', maxPerHour = 20) {
  const pw = process.env.APP_PASSWORD;
  if (pw && req.headers['x-app-password'] !== pw) return false;
  if (!pw) {
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'local';
    const key = kind + ':' + ip, now = Date.now();
    const arr = (hits.get(key) || []).filter(t => now - t < 3600e3);
    if (arr.length >= maxPerHour) return false;
    arr.push(now); hits.set(key, arr);
  }
  return true;
};
