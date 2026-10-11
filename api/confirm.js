// GET /api/confirm?t=<token> — Double-Opt-in bestätigen, dann Weiterleitung auf /bestaetigt.
const L = require('./_lib');

module.exports = async function (req, res) {
  const url = new URL(req.url, 'https://x');
  const tok = L.str(url.searchParams.get('t'), 64);
  let ok = false;
  if (tok) {
    try {
      const r = await L.sql()`UPDATE marketing.waitlist SET confirmed_at = COALESCE(confirmed_at, now())
                              WHERE token = ${tok} RETURNING id`;
      ok = r.length > 0;
    } catch (e) { console.error('confirm', e && e.message); }
  }
  res.statusCode = 302;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Location', ok ? '/bestaetigt' : '/bestaetigt?fehler=1');
  res.end();
};
