# Weather Dashboard

A weather dashboard with a 7-day / today / tomorrow forecast, an interactive map,
a rain-chance chart, other-cities widget, city search with autocomplete,
voice search, and light/dark themes.

## Stack

- **Frontend:** vanilla JS, Leaflet.js for the map (`src/`)
- **Backend:** a single serverless function (`api/weather.js`) that talks to
  the OpenWeatherMap API
- **Local dev:** Express (`server.js`) serves `src/` and mounts the same
  function at `/api/weather`, mirroring how Vercel routes requests in
  production
- **Deployment:** Vercel (see `.github/workflows/deploy.yml`)

## Setup

1. Get a free API key from [OpenWeatherMap](https://openweathermap.org/api).
2. Copy `.envsample` to `.env` and fill in your key:
   ```
   OPENWEATHER_API_KEY=your_openweather_api_key_here
   PORT=3000
   ```
3. Install dependencies:
   ```
   npm install
   ```
4. Run locally:
   ```
   npm start
   ```
   Then open http://localhost:3000

## Deployment (Vercel)

The app deploys via GitHub Actions (`.github/workflows/deploy.yml`) on every
push to `main`. It requires these repository secrets:

- `VERCEL_TOKEN`
- `ORG_ID`
- `PROJECT_ID`

The `OPENWEATHER_API_KEY` environment variable must also be set in the
Vercel project settings (Project → Settings → Environment Variables) —
GitHub secrets are not automatically shared with the Vercel runtime.

## API

`GET /api/weather?city=CityName`
`GET /api/weather?lat=..&lon=..`

Returns:
```json
{
  "city": "Colombo",
  "country": "LK",
  "coord": { "lat": 6.93, "lon": 79.85 },
  "daily": [...],
  "hourlyToday": [...],
  "hourlyTomorrow": [...],
  "hourlyRain": [...],
  "otherCities": [...]
}
```
