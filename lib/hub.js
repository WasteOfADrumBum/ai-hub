// Turns raw Sheet rows into the payload the page renders. Columns are matched
// by header name, so reordering columns in the Sheet doesn't break anything.

export const TOOLS = ['Grok', 'ChatGPT', 'Claude', 'Muse', 'Codex'];
const TIME_ZONE = 'America/New_York';

const norm = (s) => String(s || '').toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z]/g, '');

function table(rows, fields) {
  const [header = [], ...body] = rows;
  const keys = header.map(norm);
  const index = {};
  for (const [field, names] of Object.entries(fields)) {
    index[field] = keys.findIndex((k) => names.includes(k));
  }
  return body
    .filter((r) => r.some((c) => String(c).trim()))
    .map((r) => {
      const o = {};
      for (const [field, i] of Object.entries(index)) o[field] = i >= 0 ? String(r[i] ?? '').trim() : '';
      return o;
    });
}

// Offset (minutes) of TIME_ZONE from UTC at a given instant.
function zoneOffset(date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: TIME_ZONE, hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(date).map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return (asUtc - date.getTime()) / 60000;
}

// "2026-10-30 10:38" (Eastern) -> ISO string. Also accepts full ISO timestamps.
export function parseEastern(text) {
  const s = String(text || '').trim();
  if (!s) return null;
  if (/[zZ]|[+-]\d\d:?\d\d$/.test(s)) {
    const d = new Date(s);
    return isNaN(d) ? null : d.toISOString();
  }
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/)
    || s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!m) return null;
  let [, a, b, c, h = 0, min = 0, sec = 0] = m;
  const [y, mo, d] = a.length === 4 ? [a, b, c] : [c, a, b];
  const guess = Date.UTC(y, mo - 1, d, h, min, sec);
  let t = guess - zoneOffset(new Date(guess)) * 60000;
  t = guess - zoneOffset(new Date(t)) * 60000; // second pass handles DST edges
  return new Date(t).toISOString();
}

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

// Free-text cadence -> hours before a tool/area counts as stale (null = never).
export function staleAfterHours(cadence) {
  const c = String(cadence || '').toLowerCase();
  if (/daily|every day|each day/.test(c)) return 24 + 4;
  const days = [...new Set((c.match(/\b(sun|mon|tue|wed|thu|fri|sat)/g) || []).map((d) => DAYS.indexOf(d)))].sort();
  if (days.length > 1) {
    let gap = 0;
    days.forEach((d, i) => { gap = Math.max(gap, ((days[(i + 1) % days.length] - d + 7) % 7) || 7); });
    return gap * 24 + 4;
  }
  if (/week/.test(c) || days.length === 1) return 7 * 24 + 24;
  if (/month|1st/.test(c)) return 32 * 24;
  return null;
}

// Keep account-style numbers out of the UI even if one slips into the Sheet.
const mask = (s) => s.replace(/\b\d{8,}\b/g, (n) => '••••' + n.slice(-4));
const safeLink = (s) => (/^https?:\/\//i.test(s) ? s : '');
const isDone = (s) => /^(true|yes|y|x|done|✓|✔|1)$/i.test(s);
const toolName = (s) => TOOLS.find((t) => t.toLowerCase() === s.toLowerCase()) || s;

export function buildHub(raw, meta) {
  const feed = table(raw.Feed || [], {
    time: ['time', 'timestamp', 'date'], tool: ['tool'], bot: ['bot'], area: ['area'],
    summary: ['summary'], link: ['link', 'url'], status: ['status'],
  })
    .map((r) => ({ ...r, tool: toolName(r.tool), summary: mask(r.summary), link: safeLink(r.link), at: parseEastern(r.time) }))
    .sort((a, b) => (b.at || '').localeCompare(a.at || ''));

  const owners = table(raw.Owners || [], {
    area: ['area'], owner: ['owner'], tool: ['tool'], cadence: ['expectedcadence', 'cadence'],
  }).map((o) => ({
    ...o,
    tool: toolName(o.tool),
    staleAfterHours: staleAfterHours(o.cadence),
    lastAt: feed.find((f) => f.area.toLowerCase() === o.area.toLowerCase() && f.at)?.at || null,
  }));

  const handoffs = table(raw.Handoffs || [], {
    from: ['from'], to: ['to'], note: ['note'], neededBy: ['neededby', 'due'], done: ['done'],
  })
    .filter((h) => !isDone(h.done))
    .map((h) => ({ from: toolName(h.from), to: toolName(h.to), note: mask(h.note), neededBy: h.neededBy, neededAt: parseEastern(h.neededBy) }))
    .sort((a, b) => (a.neededAt || '9').localeCompare(b.neededAt || '9'));

  const tools = [...new Set([...TOOLS, ...feed.map((f) => f.tool).filter(Boolean)])].map((tool) => {
    const latest = feed.find((f) => f.tool === tool && f.at) || null;
    const limits = owners.filter((o) => o.tool === tool && o.staleAfterHours).map((o) => o.staleAfterHours);
    return { tool, latest, staleAfterHours: limits.length ? Math.min(...limits) : null };
  });

  return { ...meta, generatedAt: new Date().toISOString(), tools, feed, handoffs, owners };
}
