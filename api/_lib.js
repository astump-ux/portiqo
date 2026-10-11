// api/_lib.js — gemeinsame Helfer für Warteliste/Tracking (Unterstrich = keine Route).
// Env:
//   DATABASE_URL     Neon-Verbindung (Schema `marketing`, Tabellen siehe migration/2026-10-11-waitlist.sql)
//   RESEND_API_KEY   Versand der Bestätigungsmail über send.portiqo.ai
//   MAIL_FROM        optional, Default 'Portiqo <warteliste@send.portiqo.ai>'
//   SITE_URL         optional, Basis für Links in Mails (Default: Host der Anfrage)
const { neon } = require('@neondatabase/serverless');
const crypto = require('crypto');

let _sql = null;
function sql() {
  if (!_sql) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL fehlt');
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql;
}

function token() { return crypto.randomBytes(24).toString('base64url'); }

function siteUrl(req) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  const host = (req.headers['x-forwarded-host'] || req.headers.host || 'portiqo.ai').split(',')[0].trim();
  return 'https://' + host;
}

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch (e) { return {}; } }
  return await new Promise(function (resolve) {
    let data = '';
    req.on('data', function (c) { data += c; if (data.length > 20000) req.destroy(); });
    req.on('end', function () { try { resolve(JSON.parse(data || '{}')); } catch (e) { resolve({}); } });
    req.on('error', function () { resolve({}); });
  });
}

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function str(v, max) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s.slice(0, max || 200) : null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

async function sendMail(to, subject, html, text) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY fehlt');
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.MAIL_FROM || 'Portiqo <warteliste@send.portiqo.ai>',
      to: [to], subject: subject, html: html, text: text,
      reply_to: 'info@portiqo.ai'
    })
  });
  if (!r.ok) throw new Error('Resend ' + r.status + ': ' + (await r.text()).slice(0, 300));
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function confirmMail(base, tok) {
  const c = base + '/api/confirm?t=' + encodeURIComponent(tok);
  const u = base + '/api/unsubscribe?t=' + encodeURIComponent(tok);
  const html =
    '<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#0f172a;line-height:1.55">' +
    '<div style="background:#0f172a;color:#fff;padding:18px 22px;border-radius:12px 12px 0 0;font-weight:700;font-size:18px">Portiqo</div>' +
    '<div style="border:1px solid #e2e8f0;border-top:0;padding:22px;border-radius:0 0 12px 12px">' +
    '<p style="margin:0 0 12px">Hallo,</p>' +
    '<p style="margin:0 0 18px">bitte bestätige deine Anmeldung zur Portiqo-Warteliste. Erst danach stehst du auf der Liste.</p>' +
    '<p style="margin:0 0 22px"><a href="' + esc(c) + '" style="background:#2563eb;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;display:inline-block">Anmeldung bestätigen</a></p>' +
    '<p style="margin:0 0 12px;font-size:14px;color:#64748b">Wir schreiben dir nur zum Start von Portiqo und schicken dir deinen Zugang, sobald er bereit ist. Wenn du dich nicht angemeldet hast, ignoriere diese Mail einfach – ohne Bestätigung speichern wir nichts dauerhaft.</p>' +
    '<p style="margin:18px 0 0;font-size:12px;color:#94a3b8">SMART work labs GmbH · Subbelrather Straße 297 · 50825 Köln · <a href="' + esc(u) + '" style="color:#94a3b8">Abmelden</a></p>' +
    '</div></div>';
  const text = 'Bitte bestätige deine Anmeldung zur Portiqo-Warteliste:\n' + c +
    '\n\nWenn du dich nicht angemeldet hast, ignoriere diese Mail.\nAbmelden: ' + u +
    '\n\nSMART work labs GmbH, Subbelrather Straße 297, 50825 Köln';
  return { subject: 'Bitte bestätige deine Anmeldung bei Portiqo', html: html, text: text };
}

module.exports = { sql, token, siteUrl, readJson, json, str, EMAIL_RE, sendMail, confirmMail };
