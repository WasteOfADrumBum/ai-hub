// Read-only Google Sheets access with a service account. No SDK: we sign the
// OAuth JWT ourselves and call the REST API.
import crypto from 'node:crypto';

const SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly';
let cachedToken = null; // { token, exp }

export function sheetsConfigured() {
  return Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON && process.env.SHEET_ID);
}

function credentials() {
  const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  // Pasted keys sometimes arrive with literal "\n" instead of newlines.
  creds.private_key = String(creds.private_key || '').replace(/\\n/g, '\n');
  return creds;
}

async function accessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp - 60 > now) return cachedToken.token;

  const { client_email, private_key } = credentials();
  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({
    iss: client_email,
    scope: SCOPE,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })}`;
  const signature = crypto.createSign('RSA-SHA256').update(unsigned).sign(private_key, 'base64url');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${signature}`,
    }),
  });
  if (!res.ok) throw new Error(`Google token request failed (${res.status})`);
  const data = await res.json();
  cachedToken = { token: data.access_token, exp: now + data.expires_in };
  return cachedToken.token;
}

// Returns { Feed: [[...header], ...rows], Handoffs: [...], Owners: [...] }
export async function readTabs(tabs) {
  const token = await accessToken();
  const params = new URLSearchParams();
  for (const tab of tabs) params.append('ranges', `${tab}!A:Z`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(process.env.SHEET_ID)}/values:batchGet?${params}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const hint = res.status === 403 ? ' (is the Sheet shared with the service account?)' : '';
    throw new Error(`Sheets read failed (${res.status})${hint}`);
  }
  const data = await res.json();
  const out = {};
  tabs.forEach((tab, i) => { out[tab] = data.valueRanges?.[i]?.values || []; });
  return out;
}
