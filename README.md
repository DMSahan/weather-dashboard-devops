# Weather Dashboard

## Group Information

- **Student 1:** Sahan Kaveesha - ITBIN-2414-0027 - Role: DevOps Engineer
- **Student 2:** Dulara Nayanakantha - ITBIN-2414-0014 - Role: Backend Engineer
- **Student 3:** Oshan Kavinda - ITBIN-2414-0013 - Role: Frontend Engineer

## Project Description

Weather Dashboard is a real-time weather web application that gives users an
at-a-glance view of current conditions and forecasts for any city, alongside
a global map view. It combines a live 7-day / today / tomorrow forecast, an
interactive Leaflet map, a rain-probability chart, and a comparison view of
other major cities, all backed by the OpenWeatherMap API. The goal of the
project was to build a small full-stack application end-to-end — frontend,
backend API, and a working CI/CD pipeline — and deploy it to production.

## Live Deployment

🔗 **Live URL:** https://weather-dashboard-devops-verasal-creative.vercel.app

## Technologies Used

- HTML5 / CSS3 / JavaScript (vanilla)
- Leaflet.js (interactive map)
- Node.js + Express (local development server)
- OpenWeatherMap API (weather data)
- GitHub Actions (CI/CD)
- Vercel (deployment platform, serverless functions)

## Features

- **Live forecast views** — Today, Tomorrow, and Next 7 Days tabs, each showing temperature, feels-like, wind, pressure, humidity, sunrise/sunset.
- **Interactive global map** — powered by Leaflet, flies to and pins the searched or detected location.
- **City search with autocomplete** — debounced search-as-you-type suggestions via OpenStreetMap Nominatim, plus voice search using the Web Speech API.
- **Chance-of-rain chart** — animated bar chart of hourly precipitation probability.
- **Other large cities widget** — quick comparison of current conditions in major world cities.
- **Geolocation-aware** — automatically detects and loads the user's current location on first visit, with a graceful fallback and permission prompt if location access is denied.
- **Light / dark theme toggle.**

## Branch Strategy

We followed a standard Git Flow branching model:

- `main` - Production branch (protected, auto-deploys on commit)
- `develop` - Development & integration branch (prerelease testing)
- `feature/*` - Individual developer work branches (e.g. `feature/fix-bug`)

Work was merged into `develop` first via pull request, tested, then merged
into `main` to trigger a production deployment.

## Individual Contributions

### Sahan Kaveesha — DevOps Engineer
- Set up the initial repository structure and branch protection rules.
- Configured GitHub Actions CI/CD workflows (`ci.yml` & `deploy.yml`).
- Set up and managed Vercel project configuration, environment variables, and secrets (`OPENWEATHER_API_KEY`, `VERCEL_TOKEN`, `ORG_ID`, `PROJECT_ID`).
- Fixed environment variable and deployment configuration issues (`Fix weather API deployment and environment variable configuration`, `standardize OpenWeather API env config for local and Vercel`).
- Restructured the `/api` directory placement for correct Vercel serverless function detection.
- Removed exposed API keys from source control and rotated credentials.

### Dulara Nayanakantha — Backend Engineer
- Built the `/api/weather` serverless function integrating the OpenWeatherMap current-weather and forecast endpoints.
- Implemented data aggregation logic (daily forecast grouping, hourly breakdowns, rain-probability calculation, other-cities lookup).
- Handled API error responses and edge cases (invalid city, missing coordinates, missing API key).

### Oshan Kavinda — Frontend Engineer
- Built the dashboard UI layout, styling, and light/dark theme system.
- Integrated the Leaflet map with custom markers and smooth fly-to animation.
- Implemented city search with autocomplete, debouncing, and voice search.
- Built the forecast cards, rain chart, and other-cities list rendering logic.

## Setup & Installation Instructions

### Prerequisites

- Node.js (version 18 or higher)
- Git installed locally
- A free OpenWeatherMap API key (https://openweathermap.org/api)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/DMSahan/weather-dashboard-devops.git
   ```
2. Navigate into the directory:
   ```bash
   cd weather-dashboard-devops
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Copy `.envsample` to `.env` and add your OpenWeatherMap API key:
   ```bash
   OPENWEATHER_API_KEY=your_openweather_api_key_here
   PORT=3000
   ```
5. Run the development server:
   ```bash
   npm start
   ```
6. Open http://localhost:3000

## CI/CD Deployment Process

The project uses two GitHub Actions workflows:

- **`ci.yml` (CI Pipeline)** — runs on every push and pull request to `main`,
  `develop`, and `feature/**` branches. It installs dependencies, runs ESLint
  (`npm run lint`), and runs the build step (`npm run build`) to catch
  errors before any code is merged.
- **`deploy.yml` (Deploy to Production)** — runs only on pushes to `main`.
  It installs the Vercel CLI, pulls production environment configuration,
  builds the project artifacts, and deploys directly to Vercel using
  `vercel deploy --prebuilt --prod`, authenticated with the `VERCEL_TOKEN`,
  `ORG_ID`, and `PROJECT_ID` repository secrets.

This means every change goes through automated linting and a build check
before it can reach `main`, and once merged into `main` it deploys to
production automatically without any manual steps.

## Challenges & Resolutions

- **Serverless function not found:** the `/api` directory was initially
  structured incorrectly, causing Vercel to not detect the weather function.
  This was resolved by restructuring the API directory placement to match
  Vercel's convention.
- **401 Unauthorized from the weather API:** caused by an environment
  variable name mismatch between the code (`OPENWEATHER_API_KEY`) and what
  was configured in Vercel. Standardizing the environment variable name and
  value across local `.env` and Vercel's Environment Variables settings
  resolved this.
- **Exposed API key:** an API key was briefly committed to source control.
  It was removed from the repository and rotated for a new key, then
  reconfigured exclusively through environment variables/secrets.
- **Local vs. production routing mismatch:** the frontend lived under `src/`
  while the API lived under `/api`, which needed explicit Vercel output
  configuration to serve both correctly in production.

## Build Status

![CI Pipeline](https://github.com/DMSahan/weather-dashboard-devops/actions/workflows/ci.yml/badge.svg)
![Deploy to Production](https://github.com/DMSahan/weather-dashboard-devops/actions/workflows/deploy.yml/badge.svg)
