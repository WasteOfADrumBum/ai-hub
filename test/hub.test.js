import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildHub, parseEastern, staleAfterHours } from '../lib/hub.js';
import { mockTabs } from '../lib/mock.js';

test('parses Eastern sheet times across DST', () => {
  assert.equal(parseEastern('2026-10-30 10:38'), '2026-10-30T14:38:00.000Z'); // EDT
  assert.equal(parseEastern('2026-12-01 10:38'), '2026-12-01T15:38:00.000Z'); // EST
  assert.equal(parseEastern('10/30/2026 6:05'), '2026-10-30T10:05:00.000Z');
  assert.equal(parseEastern(''), null);
  assert.equal(parseEastern('soon'), null);
});

test('turns cadence text into stale windows', () => {
  assert.equal(staleAfterHours('Daily 6 AM · Mon deep review · 1st of month'), 28);
  assert.equal(staleAfterHours('Mon/Wed/Fri ~6:10 AM picks · Fri 4 PM funnel review'), 76);
  assert.equal(staleAfterHours('~Weekly, on check-in (no routine)'), 192);
  assert.equal(staleAfterHours('On request'), null);
});

test('builds the hub payload from Sheet-shaped rows', () => {
  const hub = buildHub(mockTabs(), { mode: 'mock' });
  assert.deepEqual(hub.tools.map((t) => t.tool), ['Grok', 'ChatGPT', 'Claude', 'Muse', 'Codex']);
  assert.equal(hub.tools.find((t) => t.tool === 'Grok').staleAfterHours, 28);
  assert.equal(hub.tools.find((t) => t.tool === 'Claude').staleAfterHours, null);
  assert.equal(hub.handoffs.length, 2, 'done handoffs are hidden');
  assert.ok(hub.feed[0].at >= hub.feed[1].at, 'feed is newest first');
  assert.ok(hub.owners.find((o) => o.area === 'News').lastAt);
});

test('masks long digit runs and drops non-http links', () => {
  const hub = buildHub({
    Feed: [
      ['Time (ET)', 'Tool', 'Bot', 'Area', 'Summary', 'Link', 'Status'],
      ['2026-10-30 10:00', 'chatgpt', 'MAIN 2', 'Money', 'Paid card 4111111111111111 on 2026-10-30', 'javascript:alert(1)', 'ok'],
    ],
  }, { mode: 'live' });
  assert.equal(hub.feed[0].summary, 'Paid card ••••1111 on 2026-10-30');
  assert.equal(hub.feed[0].link, '');
  assert.equal(hub.feed[0].tool, 'ChatGPT');
});
