// Passcode session: a signed, httpOnly cookie. The signing key is derived from
// HUB_PASSCODE, so changing the passcode signs everyone out.
import crypto from 'node:crypto';

export const COOKIE = 'hub_session';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function key() {
  return crypto.createHash('sha256').update('ai-hub-session:' + process.env.HUB_PASSCODE).digest();
}

function sign(value) {
  return crypto.createHmac('sha256', key()).update(value).digest('base64url');
}

function safeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

export function passcodeConfigured() {
  return Boolean(process.env.HUB_PASSCODE);
}

export function checkPasscode(input) {
  if (!passcodeConfigured()) return false;
  const a = crypto.createHash('sha256').update(String(input || '')).digest();
  const b = crypto.createHash('sha256').update(process.env.HUB_PASSCODE).digest();
  return crypto.timingSafeEqual(a, b);
}

function readCookie(req, name) {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

export function isSignedIn(req) {
  if (!passcodeConfigured()) return false;
  const token = readCookie(req, COOKIE);
  if (!token) return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig || !safeEqual(sig, sign(exp))) return false;
  return Number(exp) > Date.now() / 1000;
}

function secureFlag(req) {
  const host = req.headers.host || '';
  return host.startsWith('localhost') || host.startsWith('127.0.0.1') ? '' : '; Secure';
}

export function sessionCookie(req) {
  const exp = String(Math.floor(Date.now() / 1000) + MAX_AGE);
  return `${COOKIE}=${exp}.${sign(exp)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${secureFlag(req)}`;
}

export function clearCookie(req) {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureFlag(req)}`;
}
