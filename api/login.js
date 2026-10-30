import { checkPasscode, clearCookie, passcodeConfigured, sessionCookie } from '../lib/auth.js';
import { readJson, send } from '../lib/http.js';

export default async function handler(req, res) {
  if (req.method === 'DELETE') {
    return send(res, 200, { ok: true }, { 'Set-Cookie': clearCookie(req) });
  }
  if (req.method !== 'POST') return send(res, 405, { error: 'method' });
  if (!passcodeConfigured()) return send(res, 503, { error: 'HUB_PASSCODE is not set' });

  let body = {};
  try { body = await readJson(req); } catch { /* treated as a wrong passcode */ }
  if (!checkPasscode(body.passcode)) {
    await new Promise((r) => setTimeout(r, 600)); // slow down guessing
    return send(res, 401, { error: 'wrong' });
  }
  return send(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie(req) });
}
