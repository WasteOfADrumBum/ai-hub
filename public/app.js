const $ = (sel) => document.querySelector(sel);
const REFRESH_MS = 5 * 60 * 1000;
const FEED_PAGE = 30;

const state = { data: null, tools: new Set(), area: '', feedLimit: FEED_PAGE };

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const badge = (tool) => `<span class="badge" data-tool="${esc(tool)}">${esc(tool || 'Unknown')}</span>`;

function span(mins) {
  mins = Math.abs(mins);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  return hrs < 48 ? `${hrs}h` : `${Math.round(hrs / 24)}d`;
}

function ago(iso) {
  if (!iso) return 'never';
  const mins = Math.round((Date.now() - new Date(iso)) / 60000);
  return mins < 1 ? 'just now' : `${span(mins)} ago`;
}

function until(iso) {
  const mins = Math.round((new Date(iso) - Date.now()) / 60000);
  return mins < 0 ? `Overdue by ${span(mins)}` : `Due in ${span(mins)}`;
}

const clock = (iso) => new Date(iso).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const isStale = (iso, hours) => Boolean(hours) && (!iso || Date.now() - new Date(iso) > hours * 3600e3);
const window_ = (hours) => (hours % 24 === 0 ? `${hours / 24}d` : `${hours}h`);

function renderLatest() {
  $('#latest').innerHTML = state.data.tools.map(({ tool, latest, staleAfterHours }) => {
    const stale = isStale(latest?.at, staleAfterHours);
    const staleTag = stale ? `<span class="stale" title="Expected an update within ${window_(staleAfterHours)} (Owners cadence)">Stale</span>` : '';
    if (!latest) {
      return `<article class="tool-card empty ${stale ? 'is-stale' : ''}" data-tool="${esc(tool)}">
        <div class="row">${badge(tool)}${staleTag}</div>
        <p class="summary">No updates yet</p>
        <div class="meta">${staleAfterHours ? `Expected every ${window_(staleAfterHours)}` : 'Logged manually'}</div>
      </article>`;
    }
    return `<article class="tool-card ${stale ? 'is-stale' : ''}" data-tool="${esc(tool)}">
      <div class="row"><span class="bot">${esc(latest.bot || tool)}</span>${badge(tool)}</div>
      <p class="summary">${esc(latest.summary)}</p>
      <div class="meta">
        <span>${esc(latest.area)}</span>
        <time datetime="${latest.at}" title="${esc(clock(latest.at))}">${ago(latest.at)}</time>
        ${staleTag}
        ${latest.link ? `<a href="${esc(latest.link)}" target="_blank" rel="noopener noreferrer">Open</a>` : ''}
      </div>
    </article>`;
  }).join('');
}

function renderFilters() {
  const { data } = state;
  const tools = data.tools.map((t) => t.tool);
  $('#tool-filter').innerHTML = [`<button class="chip" type="button" data-all aria-pressed="${state.tools.size === 0}">All</button>`]
    .concat(tools.map((t) => `<button class="chip" type="button" data-tool="${esc(t)}" aria-pressed="${state.tools.has(t)}">${esc(t)}</button>`))
    .join('');

  const areas = [...new Set([...data.owners.map((o) => o.area), ...data.feed.map((f) => f.area)].filter(Boolean))].sort();
  if (state.area && !areas.includes(state.area)) state.area = '';
  $('#area-filter').innerHTML = `<option value="">All areas</option>` +
    areas.map((a) => `<option ${a === state.area ? 'selected' : ''}>${esc(a)}</option>`).join('');
}

function renderFeed() {
  const rows = state.data.feed.filter((f) =>
    (state.tools.size === 0 || state.tools.has(f.tool)) && (!state.area || f.area === state.area));
  const shown = rows.slice(0, state.feedLimit);
  $('#feed').innerHTML = shown.length
    ? shown.map((f) => `<li>
        <div class="row">
          ${badge(f.tool)}<span class="bot">${esc(f.bot)}</span><span>${esc(f.area)}</span>
          ${f.status && f.status.toLowerCase() !== 'ok' ? `<span class="status">${esc(f.status)}</span>` : ''}
          <time datetime="${f.at || ''}" title="${f.at ? esc(clock(f.at)) : esc(f.time)}">${f.at ? ago(f.at) : esc(f.time)}</time>
        </div>
        <p>${esc(f.summary)}${f.link ? ` <a href="${esc(f.link)}" target="_blank" rel="noopener noreferrer">Link</a>` : ''}</p>
      </li>`).join('')
    : `<li class="empty-state">Nothing matches these filters.</li>`;
  const more = rows.length - shown.length;
  document.querySelector('.more')?.remove();
  if (more > 0) $('#feed').insertAdjacentHTML('afterend', `<button class="more" type="button">Show ${Math.min(more, FEED_PAGE)} more</button>`);
}

function renderHandoffs() {
  const list = state.data.handoffs;
  $('#handoff-count').textContent = list.length || '';
  $('#handoffs').innerHTML = list.length
    ? list.map((h) => {
      const overdue = h.neededAt && new Date(h.neededAt) < Date.now();
      return `<li>
        <div class="route">${badge(h.from)} to ${badge(h.to)}</div>
        <p>${esc(h.note)}</p>
        ${h.neededBy ? `<span class="due ${overdue ? 'overdue' : ''}" title="${esc(h.neededBy)}">${h.neededAt ? until(h.neededAt) : 'Needed by ' + esc(h.neededBy)}</span>` : ''}
      </li>`;
    }).join('')
    : `<li class="empty-state">No open handoffs.</li>`;
}

function renderOwners() {
  $('#owners tbody').innerHTML = state.data.owners.map((o) => {
    const stale = isStale(o.lastAt, o.staleAfterHours);
    return `<tr>
      <td class="area">${esc(o.area)}</td>
      <td><div class="owner"><span>${esc(o.owner)}</span>${badge(o.tool)}</div></td>
      <td class="cadence">${esc(o.cadence)}</td>
      <td class="seen">${o.lastAt ? `<time datetime="${o.lastAt}" title="${esc(clock(o.lastAt))}">${ago(o.lastAt)}</time>` : '<span class="muted">never</span>'}
        ${stale ? '<br><span class="stale">Stale</span>' : ''}</td>
    </tr>`;
  }).join('');
}

function render() {
  const { data } = state;
  const mode = $('#mode');
  mode.hidden = false;
  mode.textContent = data.mode === 'live' ? 'Live' : 'Sample data';
  mode.classList.toggle('live', data.mode === 'live');
  mode.title = data.mode === 'live' ? 'Reading the AI Hub Sheet' : 'Service account not set up yet, showing sample data';
  $('#updated').textContent = `Updated ${new Date(data.generatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  $('#signout').hidden = data.reason === 'no-passcode';
  renderLatest();
  renderFilters();
  renderFeed();
  renderHandoffs();
  renderOwners();
}

function show(view) {
  $('#signin').hidden = view !== 'signin';
  $('#hub').hidden = view !== 'hub';
}

function showError(msg) {
  const el = $('#error');
  el.hidden = !msg;
  el.textContent = msg || '';
}

async function load() {
  const btn = $('#refresh');
  btn.classList.add('spin');
  try {
    const res = await fetch('/api/hub', { credentials: 'same-origin', cache: 'no-store' });
    if (res.status === 401) { show('signin'); $('#passcode').focus(); return; }
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
    state.data = body;
    showError('');
    show('hub');
    render();
  } catch (err) {
    showError(`Couldn't load the hub: ${err.message}`);
  } finally {
    btn.classList.remove('spin');
  }
}

$('#signin-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = $('#signin-error');
  errEl.hidden = true;
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passcode: $('#passcode').value }),
  });
  if (res.ok) { $('#passcode').value = ''; load(); return; }
  errEl.textContent = res.status === 401 ? 'That passcode is not right.' : 'Sign-in is not available right now.';
  errEl.hidden = false;
});

$('#signout').addEventListener('click', async () => {
  await fetch('/api/login', { method: 'DELETE' });
  state.data = null;
  $('#mode').hidden = true;
  $('#updated').textContent = '';
  show('signin');
});

$('#refresh').addEventListener('click', load);

$('#tool-filter').addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  if (chip.hasAttribute('data-all')) state.tools.clear();
  else {
    const t = chip.dataset.tool;
    state.tools.has(t) ? state.tools.delete(t) : state.tools.add(t);
  }
  state.feedLimit = FEED_PAGE;
  renderFilters();
  renderFeed();
});

$('#area-filter').addEventListener('change', (e) => {
  state.area = e.target.value;
  state.feedLimit = FEED_PAGE;
  renderFeed();
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('.more')) return;
  state.feedLimit += FEED_PAGE;
  renderFeed();
});

// Keep it fresh while open; refresh immediately when the app comes back to the foreground.
setInterval(() => { if (!document.hidden && state.data) load(); }, REFRESH_MS);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && state.data && Date.now() - new Date(state.data.generatedAt) > 60000) load();
});

if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});

load();
