// POST /api/waitlist — Eintrag auf die Warteliste (Double-Opt-in).
// Body: { email, variant, early_bird, utm{}, form, referrer, company(honeypot) }
// Antwort: { ok:true, token } — token nur für den optionalen Fragebogen dieser Anmeldung.
const L = require('./_lib');

const CONSENT_TEXT = 'Warteliste Portiqo: E-Mails zum Start und Zugang; Abmeldung jederzeit (Stand 2026-10-11)';
const RESEND_AFTER_MIN = 10;

module.exports = async function (req, res) {
  if (req.method !== 'POST') return L.json(res, 405, { ok: false, error: 'Nur POST' });
  try {
    const b = await L.readJson(req);
    if (b.company) return L.json(res, 200, { ok: true }); // Honeypot: Bot still abweisen

    const email = L.str(b.email, 254) ? L.str(b.email, 254).toLowerCase() : '';
    if (!L.EMAIL_RE.test(email)) return L.json(res, 400, { ok: false, error: 'Bitte gib eine gültige E-Mail-Adresse ein.' });

    const variant = b.variant === 'b' ? 'b' : 'a';
    const earlyBird = b.early_bird === true;
    const utm = {};
    if (b.utm && typeof b.utm === 'object') {
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(function (k) {
        const v = L.str(b.utm[k], 100); if (v) utm[k] = v;
      });
    }
    const form = L.str(b.form, 20);
    const referrer = L.str(b.referrer, 200);
    const sql = L.sql();
    // Unbestätigte Einträge nach 7 Tagen löschen (Zusage in Mail + Datenschutz).
    await sql`DELETE FROM marketing.waitlist WHERE confirmed_at IS NULL AND created_at < now() - interval '7 days'`;

    const rows = await sql`SELECT id, token, confirmed_at, last_mail_at FROM marketing.waitlist WHERE email = ${email}`;
    let tok, sendNow = false;

    if (rows.length === 0) {
      tok = L.token();
      await sql`INSERT INTO marketing.waitlist (email, token, variant, early_bird, utm, form, referrer, consent_text, consent_at)
                VALUES (${email}, ${tok}, ${variant}, ${earlyBird}, ${JSON.stringify(utm)}::jsonb, ${form}, ${referrer}, ${CONSENT_TEXT}, now())`;
      sendNow = true;
    } else {
      const r = rows[0];
      tok = r.token;
      if (earlyBird) await sql`UPDATE marketing.waitlist SET early_bird = true WHERE id = ${r.id}`;
      if (!r.confirmed_at) {
        const last = r.last_mail_at ? new Date(r.last_mail_at).getTime() : 0;
        sendNow = Date.now() - last > RESEND_AFTER_MIN * 60 * 1000;
      }
    }

    if (sendNow) {
      const m = L.confirmMail(L.siteUrl(req), tok);
      await L.sendMail(email, m.subject, m.html, m.text);
      await sql`UPDATE marketing.waitlist SET last_mail_at = now() WHERE token = ${tok}`;
    }
    // Gleiche Antwort für neue und bekannte Adressen (keine Auskunft, ob eine Adresse existiert).
    return L.json(res, 200, { ok: true, token: tok });
  } catch (e) {
    console.error('waitlist', e && e.message);
    return L.json(res, 500, { ok: false, error: 'Das hat nicht geklappt. Bitte versuch es gleich noch einmal.' });
  }
};
