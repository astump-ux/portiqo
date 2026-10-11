// POST /api/track — anonyme Reichweitenmessung je Variante.
// Speichert nur Ereignisname, Variante, utm_source/utm_campaign und Zeitpunkt.
// Keine IP, kein User-Agent, keine Cookies, keine Geräte-ID.
const L = require('./_lib');

const EVENTS = ['view', 'form_start', 'nav_cta', 'plan_free', 'earlybird_click', 'survey_submit'];

module.exports = async function (req, res) {
  if (req.method !== 'POST') { res.statusCode = 204; return res.end(); }
  try {
    const b = await L.readJson(req);
    if (EVENTS.indexOf(b.event) >= 0) {
      const variant = ['a', 'b', 'c'].indexOf(b.variant) >= 0 ? b.variant : 'a';
      await L.sql()`INSERT INTO marketing.lp_events (event, variant, utm_source, utm_campaign)
                    VALUES (${b.event}, ${variant}, ${L.str(b.utm_source, 100)}, ${L.str(b.utm_campaign, 100)})`;
    }
  } catch (e) { console.error('track', e && e.message); }
  res.statusCode = 204;
  res.end();
};
