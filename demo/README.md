# App tour (Playwright)

A scripted walkthrough of Invasive Plant Tracker's features, driven by Playwright on a mobile viewport (Pixel 5), paced with human-like pauses and typing rather than running at test-suite speed.

It exercises: locate-me, drop-pin, photo species ID, filling out the plant form, status changes, logging a treatment, attaching a photo, the Plants list (sort/filter), the calendar, the species guide search, drawing a patch by tapping, drawing a patch by walking it with GPS, and the map filters panel.

It runs against your real app and creates real plant records so the flow looks genuine — then **deletes everything it created** when it finishes, so your tracker is left exactly as it was.

## Run it

```bash
cd demo
npm install        # first time only
npm run demo         # headed — watch it happen (needs a display)
```

For a headless run (e.g. no display available):

```bash
HEADLESS=true npm run demo
```

Either way, a screen recording is saved to `demo/videos/*.webm` when it finishes.

### Converting for iMessage / Photos / Messages

Playwright records `.webm` (VP8), which Apple's Messages app won't preview or play. Convert the most recent recording to an H.264 MP4 with:

```bash
npm run convert
```

This produces `demo/videos/<same-name>.mp4` — a standard, widely compatible format (also fine for Slack, WhatsApp, etc.), via `ffmpeg` (already required, see below).

## Options (env vars)

| Var        | Default                 | Purpose                                    |
|------------|--------------------------|---------------------------------------------|
| `BASE_URL` | `http://localhost:3000` | Where the app is running                    |
| `HEADLESS` | `false`                  | `true` to run without a visible browser      |
| `SLOWMO`   | `250`                    | ms Playwright pauses after every action      |

## Requirements

Needs the app running (`docker compose up -d` from the repo root) and Playwright's Chromium browser installed (`npx playwright install chromium` if `npm install` didn't already have it cached). `npm run convert` additionally needs `ffmpeg` on your PATH.
