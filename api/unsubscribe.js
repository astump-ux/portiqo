// GET /api/unsubscribe?t=<token> — Eintrag vollständig löschen, dann Weiterleitung auf /abgemeldet.
const L = require('./_lib');

module.exports = async function (req, res) {
  const url = new URL(req.url, 'https://x');
  const tok = L.str(url.searchParams.get('t'), 64);
  if (tok) {
    try { await L.sql()`DELETE FROM marketing.waitlist WHERE token = ${tok}`; }
    catch (e) { console.error('unsubscribe', e && e.message); }
  }
  res.statusCode = 302;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Location', '/abgemeldet');
  res.end();
};
