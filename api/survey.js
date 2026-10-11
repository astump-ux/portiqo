// POST /api/survey — optionaler Fragebogen nach der Anmeldung.
// Body: { token, stocks?, first?, tools?[], early_bird? } — Felder werden zusammengeführt.
const L = require('./_lib');

const ALLOWED = {
  stocks: ['keine', '1–5', '6–15', '16–30', 'über 30'],
  first: ['Ereignis-Monitoring', 'Morgen-Briefing', 'Analysen', 'Eigene Regeln'],
  early_bird: ['ja', 'vielleicht', 'nein'],
  tools: ['Parqet', 'getquin', 'Finanzfluss Copilot', 'Excel', 'App vom Broker', 'nichts', 'anderes']
};

module.exports = async function (req, res) {
  if (req.method !== 'POST') return L.json(res, 405, { ok: false });
  try {
    const b = await L.readJson(req);
    const tok = L.str(b.token, 64);
    if (!tok) return L.json(res, 400, { ok: false });
    const data = {};
    ['stocks', 'first', 'early_bird'].forEach(function (k) {
      if (ALLOWED[k].indexOf(b[k]) >= 0) data[k] = b[k];
    });
    if (Array.isArray(b.tools)) data.tools = b.tools.filter(function (t) { return ALLOWED.tools.indexOf(t) >= 0; }).slice(0, 7);
    if (!Object.keys(data).length) return L.json(res, 200, { ok: true });
    const sql = L.sql();
    const eb = data.early_bird === 'ja';
    const r = await sql`UPDATE marketing.waitlist
      SET survey = COALESCE(survey, '{}'::jsonb) || ${JSON.stringify(data)}::jsonb,
          survey_at = now(),
          early_bird = early_bird OR ${eb}
      WHERE token = ${tok} RETURNING id`;
    return L.json(res, r.length ? 200 : 404, { ok: r.length > 0 });
  } catch (e) {
    console.error('survey', e && e.message);
    return L.json(res, 500, { ok: false });
  }
};
