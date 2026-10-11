# Portiqo

Marketing landing page (static). Deployed on Vercel → portiqo.ai.

## Warteliste (seit 11.10.2026)

- Seite: `index.html` (Deutsch, A/B/C: a = Monitoring-Mechanik, b = Morgen-Briefing, c = Wissen/Handeln/Schlafen; `?v=a|b|c` erzwingt, sonst je 1/3, ohne Cookies).
- API (Vercel Functions): `api/waitlist.js` (Double-Opt-in), `api/confirm.js`, `api/unsubscribe.js`, `api/survey.js`, `api/track.js`.
- Datenbank: Neon, Schema `marketing` — Migration `migration/2026-10-11-waitlist.sql`. Auswertung: `SELECT * FROM marketing.lp_funnel;`
- Env im Vercel-Projekt: `DATABASE_URL`, `RESEND_API_KEY` (Pflicht), optional `MAIL_FROM`, `SITE_URL`.
- Bestehende Nutzer: Login-Link führt weiter auf die App.
