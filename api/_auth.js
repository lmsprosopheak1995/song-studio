// ពិនិត្យពាក្យសម្ងាត់ មុននឹងចំណាយ credits
module.exports = function authorized(req) {
  const pw = process.env.APP_PASSWORD;
  if (!pw) return false; // បើមិនកំណត់ APP_PASSWORD នឹងបដិសេធទាំងអស់ (សុវត្ថិភាព)
  return req.headers['x-app-password'] === pw;
};
