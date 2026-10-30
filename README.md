# AI Hub

One private page that shows what every AI did: latest update per tool, the feed, open handoffs, and who owns which area. It reads the "AI Hub" Google Sheet and never writes to it.

Plain HTML/JS plus three Vercel functions. No npm dependencies.

## How it works

- `api/hub.js` reads the Feed, Handoffs and Owners tabs with a Google service account (read-only scope) and returns one JSON payload. Columns are matched by header name, so you can reorder them.
- `api/login.js` checks `HUB_PASSCODE` and sets a signed, httpOnly cookie that lasts 30 days. Changing the passcode signs everyone out.
- The page (`public/`) is an installable PWA. The service worker caches the app shell only. Hub data is never cached on the device.
- Stale warnings come from the Owners "Expected cadence" text: anything with "Daily" goes stale after 28h, "Mon/Wed/Fri" after the longest gap plus 4h (76h), "Weekly" after 8 days. "On request" never goes stale. A tool's card uses the tightest cadence among the areas it owns.
- As a safeguard, any run of 8+ digits in a summary or note is masked to its last 4, and only `http(s)` links are rendered.

## Modes

| Env set | What you get |
| --- | --- |
| nothing | Sample data, no sign-in (local preview) |
| `HUB_PASSCODE` only | Sign-in required, sample data |
| `HUB_PASSCODE` + `GOOGLE_SERVICE_ACCOUNT_JSON` + `SHEET_ID` | Sign-in required, live Sheet data |

Real Sheet data is never served without a passcode.

## Environment variables (Vercel only, never in the repo)

- `GOOGLE_SERVICE_ACCOUNT_JSON`: the full contents of the service account's JSON key
- `SHEET_ID`: `13WtKxnZhUNCGkyGFnI27EJ4QjolCNgnlBwSVwzB8LpI`
- `HUB_PASSCODE`: the passcode for the sign-in screen

The Sheet must be shared with the service account's email as **Viewer**.

## Sheet format

- **Feed**: `Time (ET)`, `Tool`, `Bot`, `Area`, `Summary`, `Link`, `Status`. Time as `YYYY-MM-DD HH:MM` in Eastern time. Tool is one of Grok, ChatGPT, Claude, Muse, Codex. A Status other than `ok` shows as a flag.
- **Handoffs**: `From`, `To`, `Note`, `Needed by`, `Done`. A row is hidden once Done is `TRUE`, `yes`, `x` or `✓`.
- **Owners**: `Area`, `Owner`, `Tool`, `Expected cadence`.

## Local preview

```sh
npm run dev                      # http://localhost:3000, sample data
HUB_PASSCODE=test npm run dev    # with the sign-in screen
npm test
```
