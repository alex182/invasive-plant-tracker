# Invasive Plant Tracker

A field-use PWA for tracking and coordinating invasive plant removal. Drop a pin or walk the outline of a patch with GPS, log treatments over time, browse a species ID guide with photos, and export your data as CSV or GeoJSON.

## Features

- **Map** — point plants and polygon "patches" rendered together, clustered markers, status/species filters, dark/light theme
- **Add a plant** — drop a pin at your GPS location, or long-press (right-click on desktop) the map to place one manually
- **Draw a patch** — trace a patch outline by tapping vertices on the map, or walk its edge live with GPS ("walk mode": auto-drops a point every ~3m, with pause/resume, undo, and a live accuracy circle)
- **Locate me** — on-demand button that drops a "you are here" marker and recenters the map, without constantly polling GPS in the background
- **Photo species suggestions** — snap a photo on the add-plant form to get species suggestions from Pl@ntNet, shown as tappable chips matched against your tracked species list (optional, needs an API key; suggestions only — you still confirm the species yourself)
- **Species guide** — identification photos (including whole-plant/habit shots sourced from Bugwood/Invasive.org), removal method and timing notes, source links
- **Treatments** — log removal/herbicide events per plant with auto-suggested follow-up dates
- **Status lifecycle** — Planned → In progress → Monitoring → Removed; a one-tap "Found regrowth" on a removed or monitored plant reopens it, logs a "Regrowth found" treatment with a fresh follow-up, and clears the removal date
- **Calendar** — upcoming and overdue follow-ups
- **Photo timeline** — attach multiple dated photos to a plant, each tagged with a removal stage (before / during / after) so the gallery groups into a progress timeline; photos can also be tied to a specific treatment; edit captions, dates, and stage, view full-screen; the newest photo is the plant's thumbnail
- **Navigate & nearby** — open a plant's coordinates in the phone's maps app, see distance + bearing from your current location, or sort the Plants list by proximity for a field work queue
- **Stats dashboard** — removal rate, status and per-species breakdowns, total mapped patch area (ha / acres), a 12-month treatment chart, and overdue follow-up counts
- **Attribution** — set your name once (stored on the device); it's recorded as "logged by" on every plant and treatment you add, so a crew sharing one instance can see who recorded what
- **Accounts & roles** — username/password login with `admin` and `user` roles; each plant is owned by whoever added it, and only its owner (or an admin) can edit or delete it
- **Organizations** — an admin can group users into an organization from **Settings → Organizations**; org members share every plant the org owns (any member can view, edit, and delete them) and the map's "my plants" filter widens to show the whole org's plants
- **Offline queue** — new plants/treatments created while offline are queued in the browser and synced automatically once back online (photo uploads and "Found regrowth" need a connection)
- **Export** — CSV and GeoJSON (patches export as closed GeoJSON polygons, points as GeoJSON points; both include `logged_by` and `photo_count`)
- **Installable PWA** — add to home screen, works offline for previously loaded data

## Tech stack

- **Backend**: Node.js, Express, TypeScript, SQLite (`better-sqlite3`)
- **Frontend**: React, TypeScript, Vite, React Router, Leaflet (`react-leaflet`, marker clustering), PWA (`vite-plugin-pwa`)
- **Deployment**: Docker Compose (backend + nginx-served frontend), optional Caddy reverse proxy for HTTPS

## Quick start (Docker Compose)

This is the standard way to run the whole app — it builds both services and persists data in named volumes.

```bash
git clone https://github.com/alex182/invasive-plant-tracker.git
cd invasive-plant-tracker
docker compose up -d --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api

The first boot seeds the species reference data automatically. Plant/treatment data lives in the `db_data` volume; uploaded photos live in `uploads_data`.

### Photo species suggestions (optional)

The "Identify from photo" button on the add-plant form calls [Pl@ntNet's API](https://my.plantnet.org/) to suggest a species from a photo. It's off by default; to enable it:

```bash
cp .env.example .env
# edit .env and set PLANTNET_API_KEY to a key from https://my.plantnet.org/ (free for non-commercial use)
docker compose up -d --build backend
```

Docker Compose reads `.env` automatically (it's gitignored, so your key never gets committed). Without a key configured, the button still shows but returns a clear "not configured" message instead of erroring.

### HTTPS for GPS features (walk mode, drop-pin, locate-me)

Browsers only allow the Geolocation API on secure origins (HTTPS, or `localhost` on the same machine). If you're opening the app from a phone or another device on your LAN via plain `http://<lan-ip>:3000`, geolocation will silently fail — Firefox in particular won't even show a permission prompt.

This repo includes a `Caddyfile` that runs a Caddy reverse proxy with a self-signed certificate to solve this:

```bash
docker compose up -d caddy
```

Then open `https://<your-lan-ip>/` on the device — you'll get a "not secure" warning once (self-signed cert), accept it, and geolocation will work normally from then on.

**Before using it**, edit `Caddyfile` and replace `192.168.1.231` (in both the `default_sni` line and the site address list) with your machine's actual LAN IP — find it with `hostname -I` (Linux) or `ipconfig getifaddr en0` (macOS). If that IP changes later (e.g. DHCP reassignment), update the file and run `docker compose restart caddy`.

## Deploying from the git repo

To deploy (or update) this app on a server or another machine using this repository as the source of truth:

```bash
# first time
git clone https://github.com/alex182/invasive-plant-tracker.git
cd invasive-plant-tracker
docker compose up -d --build

# later, to pick up new changes
cd invasive-plant-tracker
git pull
docker compose up -d --build
```

`docker compose up -d --build` is safe to re-run — it rebuilds only what changed and recreates containers without touching the `db_data`/`uploads_data`/`caddy_data`/`caddy_config` volumes, so your data survives redeploys.

To also deploy the HTTPS proxy on the new machine, remember to update the LAN IP in `Caddyfile` first (see above), then include `caddy` in the compose command:

```bash
docker compose up -d --build backend frontend caddy
```

### Updating just one service

```bash
docker compose up -d --build backend    # after a backend-only change
docker compose up -d --build frontend   # after a frontend-only change
```

### Stopping / removing

```bash
docker compose down          # stop containers, keep volumes (data preserved)
docker compose down -v       # stop containers AND delete all data — irreversible
```

## Local development (without Docker)

Backend and frontend run as separate dev servers with hot reload.

```bash
# backend (http://localhost:3001)
cd backend
npm install
npm run dev

# frontend (http://localhost:5173, proxies /api to the backend)
cd frontend
npm install
npm run dev
```

### Tests and linting

```bash
cd backend  && npm test && npm run lint
cd frontend && npm test && npm run lint
```

## Configuration

The backend reads these environment variables (see `docker-compose.yml` for the defaults used in the container setup):

| Variable      | Default            | Purpose                          |
|---------------|---------------------|-----------------------------------|
| `PORT`        | `3001`              | Backend HTTP port                 |
| `DATA_DIR`    | `./data`             | SQLite database location          |
| `UPLOADS_DIR` | `./uploads`          | Uploaded plant photo storage      |
| `PLANTNET_API_KEY` | *(unset)* | Enables the "Identify from photo" feature — get one at [my.plantnet.org](https://my.plantnet.org/). Can also be set at runtime on the **Settings** page, which takes precedence over this variable. |
| `PLANTNET_PROJECT` | `all`  | Pl@ntNet flora dataset to match against (also settable on the Settings page) |

## Project layout

```
backend/    Express API + SQLite (species, plants, treatments, export)
frontend/   React PWA (map, forms, guide, calendar)
Caddyfile   Optional HTTPS reverse proxy for LAN/GPS access
```
