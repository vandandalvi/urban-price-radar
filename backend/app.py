"""
Urban Price Radar - Flask Backend

Thin API layer serving price band data.
Intentionally minimal - no database, no auth, no business logic.

Endpoints:
    GET /api/prices - Returns all price band data
    GET /api/health - Health check

Usage:
    python app.py
    
Server runs on http://localhost:5000
"""

import json
from pathlib import Path

from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend dev

# Path to price data
DATA_PATH = Path(__file__).parent.parent / "data" / "prices.json"


def load_prices() -> dict:
    """Load price data from JSON file."""
    if not DATA_PATH.exists():
        return {
            "version": "0.0.0",
            "generated_at": None,
            "disclaimer": "No data available",
            "areas": []
        }
    
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


@app.route("/api/prices", methods=["GET"])
def get_prices():
    """
    Get all price band data.
    
    Returns:
        JSON with version, generated_at, disclaimer, and areas array
    """
    data = load_prices()
    return jsonify(data)


@app.route("/api/health", methods=["GET"])
def health():
    """Health check endpoint."""
    data = load_prices()
    return jsonify({
        "status": "healthy",
        "version": data.get("version", "unknown"),
        "areas_count": len(data.get("areas", [])),
        "generated_at": data.get("generated_at")
    })


@app.route("/", methods=["GET"])
def root():
    """Root endpoint with API info."""
    return jsonify({
        "name": "Urban Price Radar API",
        "version": "1.0.0",
        "endpoints": {
            "/api/prices": "GET - Returns all price band data",
            "/api/health": "GET - Health check"
        },
        "disclaimer": "Prices shown are indicative bands based on recent public listings, not verified transactions."
    })


if __name__ == "__main__":
    print("🏠 Urban Price Radar API")
    print("=" * 40)
    
    data = load_prices()
    print(f"📊 Loaded {len(data.get('areas', []))} areas")
    print(f"📅 Data version: {data.get('version', 'N/A')}")
    print(f"🌐 Starting server on http://localhost:5000")
    print("=" * 40)
    
    app.run(host="0.0.0.0", port=5000, debug=True)
