# 🏠 Urban Price Radar

A market-awareness tool that helps users quickly eliminate unaffordable areas using approximate price bands, before they waste time on listings and brokers.

## What This Is

- ✅ A **first-layer decision filter**
- ✅ A **time-saving discovery tool**
- ✅ A **map-first price band viewer** for Mumbai / MMR

## What This Is NOT

- ❌ A property marketplace
- ❌ A valuation engine
- ❌ A recommendation system

## Architecture

```
Gemini + Search
      ↓
GitHub Actions (Weekly)
      ↓
Validated JSON (prices.json)
      ↓
Flask API Layer
      ↓
React Map UI
```

## Project Structure

```
├── automation/          # Python data pipeline
│   ├── fetch_prices.py  # Gemini-powered price extraction
│   ├── schema.py        # JSON schema validation
│   └── requirements.txt
├── backend/             # Flask API
│   ├── app.py
│   └── requirements.txt
├── frontend/            # React + Vite + Leaflet
│   ├── src/
│   └── package.json
├── data/
│   └── prices.json      # Generated price bands
└── .github/workflows/   # Automation cron
```

## Quick Start

### 1. Data Automation (Optional - sample data included)

```bash
cd automation
pip install -r requirements.txt
# Set GEMINI_API_KEY environment variable
python fetch_prices.py
```

### 2. Backend

```bash
cd backend
pip install -r requirements.txt
python app.py
# Runs on http://localhost:5000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

## Features

- **No login required** - Instant map view
- **Rent vs Buy toggle** - Separate datasets
- **Property type filter** - 1RK, 1BHK, 2BHK, 3BHK+
- **Budget range filter** - Greys out unaffordable zones
- **Zoom-based density** - Region → Area → Micro-locality
- **Confidence indicators** - Low/Medium/High based on data quality

## Disclaimer

> "Prices shown are indicative bands based on recent public listings, not verified transactions."

This product optimizes for **time saved**, not pricing truth.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Data | Python, Gemini 1.5 Flash, GitHub Actions |
| Backend | Flask, Static JSON |
| Frontend | React (Vite), react-leaflet, Leaflet divIcons |


## Deployment

### Vercel (Frontend + Static Data) ✅

No backend needed! Price data is served as a static JSON file.

1. Connect your GitHub repo to [Vercel](https://vercel.com)
2. Set the root directory to `frontend`
3. Deploy! That's it.

Vercel will auto-detect Vite and serve `prices.json` from the public folder.

### GitHub Actions (Weekly Price Updates)

1. Go to your repo → **Settings → Secrets and variables → Actions**
2. Add a new secret: `GEMINI_API_KEY` with your Google AI API key
3. The workflow runs automatically:
   - **Mumbai:** Monday 6:00 AM IST
   - **Pune:** Monday 6:00 PM IST
4. Manual trigger: Go to **Actions → Update Price Data → Run workflow**

When prices update, GitHub Actions commits to the repo → Vercel auto-deploys.

### Environment Variables

| Variable | Service | Description |
|----------|---------|-------------|
| `GEMINI_API_KEY` | GitHub Actions | Google AI API key for price fetching |

## License

MIT

