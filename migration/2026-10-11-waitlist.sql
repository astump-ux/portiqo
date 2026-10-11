-- Portiqo Landingpage: Warteliste (Double-Opt-in) + anonyme Reichweitenmessung je A/B-Variante.
-- Additiv, eigenes Schema `marketing`, berührt keine App-Tabellen.
CREATE SCHEMA IF NOT EXISTS marketing;

CREATE TABLE IF NOT EXISTS marketing.waitlist (
  id            bigserial PRIMARY KEY,
  email         text NOT NULL UNIQUE,
  token         text NOT NULL UNIQUE,
  variant       text,
  early_bird    boolean NOT NULL DEFAULT false,
  utm           jsonb NOT NULL DEFAULT '{}'::jsonb,
  form          text,
  referrer      text,
  locale        text NOT NULL DEFAULT 'de',
  consent_text  text,
  consent_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_mail_at  timestamptz,
  confirmed_at  timestamptz,
  survey        jsonb,
  survey_at     timestamptz,
  invited_at    timestamptz
);

CREATE TABLE IF NOT EXISTS marketing.lp_events (
  id            bigserial PRIMARY KEY,
  at            timestamptz NOT NULL DEFAULT now(),
  event         text NOT NULL,
  variant       text,
  utm_source    text,
  utm_campaign  text
);
CREATE INDEX IF NOT EXISTS lp_events_at_idx ON marketing.lp_events (at);

-- Auswertung je Variante (Besuche = Seitenaufrufe, nicht eindeutige Personen).
CREATE OR REPLACE VIEW marketing.lp_funnel AS
WITH e AS (
  SELECT variant,
         count(*) FILTER (WHERE event = 'view')            AS views,
         count(*) FILTER (WHERE event = 'form_start')      AS form_starts,
         count(*) FILTER (WHERE event = 'earlybird_click') AS earlybird_clicks
  FROM marketing.lp_events GROUP BY variant
), w AS (
  SELECT variant,
         count(*)                                          AS signups,
         count(*) FILTER (WHERE confirmed_at IS NOT NULL)  AS confirmed,
         count(*) FILTER (WHERE early_bird)                AS early_bird,
         count(*) FILTER (WHERE survey IS NOT NULL)        AS surveys
  FROM marketing.waitlist GROUP BY variant
)
SELECT COALESCE(e.variant, w.variant) AS variant,
       COALESCE(views, 0) AS views, COALESCE(form_starts, 0) AS form_starts,
       COALESCE(signups, 0) AS signups, COALESCE(confirmed, 0) AS confirmed,
       COALESCE(early_bird, 0) AS early_bird, COALESCE(earlybird_clicks, 0) AS earlybird_clicks,
       COALESCE(surveys, 0) AS surveys,
       round(100.0 * COALESCE(confirmed, 0) / NULLIF(views, 0), 1) AS confirmed_per_100_views
FROM e FULL JOIN w ON e.variant = w.variant
ORDER BY 1;
