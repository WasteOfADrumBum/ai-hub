import { isSignedIn, passcodeConfigured } from '../lib/auth.js';
import { send } from '../lib/http.js';
import { buildHub } from '../lib/hub.js';
import { mockTabs } from '../lib/mock.js';
import { readTabs, sheetsConfigured } from '../lib/sheets.js';

const TABS = ['Feed', 'Handoffs', 'Owners'];

export default async function handler(req, res) {
  // Without a passcode nothing real is ever served: the page runs on sample data.
  if (!passcodeConfigured()) {
    return send(res, 200, buildHub(mockTabs(), { mode: 'mock', reason: 'no-passcode' }));
  }
  if (!isSignedIn(req)) return send(res, 401, { error: 'signin' });

  if (!sheetsConfigured()) {
    return send(res, 200, buildHub(mockTabs(), { mode: 'mock' }));
  }
  try {
    return send(res, 200, buildHub(await readTabs(TABS), { mode: 'live' }));
  } catch (err) {
    console.error(err);
    return send(res, 502, { error: err.message });
  }
}
