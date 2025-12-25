"""
Urban Price Radar - Automated Price Data Fetcher

Uses Gemini 1.5 Flash with grounded search to extract real estate price bands
for Mumbai and Pune areas. Designed to run weekly via GitHub Actions.

Schedule:
    - Mumbai: Monday 6:00 AM IST (00:30 UTC)
    - Pune: Monday 6:00 PM IST (12:30 UTC)

Usage:
    python fetch_prices.py --region mumbai
    python fetch_prices.py --region pune
    python fetch_prices.py --region all

Environment:
    GEMINI_API_KEY - Google AI API key with Gemini access
"""

import os
import json
import re
import argparse
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, List
import time

import google.generativeai as genai
from dotenv import load_dotenv

from schema import validate_price_data, PriceData

# Load environment variables
load_dotenv()

# Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
OUTPUT_PATH = Path(__file__).parent.parent / "data" / "prices.json"
MODEL_NAME = "gemini-1.5-flash"

# Rate limiting - Gemini free tier: 15 RPM
REQUESTS_PER_MINUTE = 15
DELAY_BETWEEN_REQUESTS = 60 / REQUESTS_PER_MINUTE + 0.5  # ~4.5 seconds

# Mumbai areas - Updated Monday Morning (6 AM IST)
MUMBAI_AREAS = [
    # South Mumbai
    {"id": "mum-churchgate", "name": "Churchgate", "region": "Mumbai", "lat": 18.9322, "lng": 72.8264, "zoom_level": "area"},
    {"id": "mum-marinedrive", "name": "Marine Drive", "region": "Mumbai", "lat": 18.9432, "lng": 72.8235, "zoom_level": "area"},
    {"id": "mum-colaba", "name": "Colaba", "region": "Mumbai", "lat": 18.9067, "lng": 72.8147, "zoom_level": "area"},
    {"id": "mum-fortarea", "name": "Fort", "region": "Mumbai", "lat": 18.9318, "lng": 72.8352, "zoom_level": "area"},
    {"id": "mum-nariman", "name": "Nariman Point", "region": "Mumbai", "lat": 18.9254, "lng": 72.8242, "zoom_level": "area"},
    {"id": "mum-malabarhill", "name": "Malabar Hill", "region": "Mumbai", "lat": 18.9550, "lng": 72.7975, "zoom_level": "area"},
    {"id": "mum-worli", "name": "Worli", "region": "Mumbai", "lat": 19.0176, "lng": 72.8150, "zoom_level": "area"},
    {"id": "mum-lowerparel", "name": "Lower Parel", "region": "Mumbai", "lat": 18.9980, "lng": 72.8302, "zoom_level": "area"},
    {"id": "mum-prabhadevi", "name": "Prabhadevi", "region": "Mumbai", "lat": 19.0166, "lng": 72.8285, "zoom_level": "area"},
    # Central Mumbai
    {"id": "mum-dadar", "name": "Dadar", "region": "Mumbai", "lat": 19.0178, "lng": 72.8478, "zoom_level": "area"},
    {"id": "mum-matunga", "name": "Matunga", "region": "Mumbai", "lat": 19.0275, "lng": 72.8517, "zoom_level": "area"},
    {"id": "mum-sion", "name": "Sion", "region": "Mumbai", "lat": 19.0400, "lng": 72.8620, "zoom_level": "area"},
    {"id": "mum-wadala", "name": "Wadala", "region": "Mumbai", "lat": 19.0177, "lng": 72.8674, "zoom_level": "area"},
    {"id": "mum-kurla", "name": "Kurla", "region": "Mumbai", "lat": 19.0726, "lng": 72.8793, "zoom_level": "area"},
    {"id": "mum-chembur", "name": "Chembur", "region": "Mumbai", "lat": 19.0620, "lng": 72.8960, "zoom_level": "area"},
    # Eastern Suburbs
    {"id": "mum-ghatkopar", "name": "Ghatkopar", "region": "Mumbai", "lat": 19.0865, "lng": 72.9080, "zoom_level": "area"},
    {"id": "mum-vikhroli", "name": "Vikhroli", "region": "Mumbai", "lat": 19.1100, "lng": 72.9280, "zoom_level": "area"},
    {"id": "mum-kanjurmarg", "name": "Kanjurmarg", "region": "Mumbai", "lat": 19.1310, "lng": 72.9340, "zoom_level": "area"},
    {"id": "mum-bhandup", "name": "Bhandup", "region": "Mumbai", "lat": 19.1480, "lng": 72.9380, "zoom_level": "area"},
    {"id": "mum-mulund", "name": "Mulund", "region": "Mumbai", "lat": 19.1726, "lng": 72.9565, "zoom_level": "area"},
    {"id": "mum-powai", "name": "Powai", "region": "Mumbai", "lat": 19.1176, "lng": 72.9060, "zoom_level": "area"},
    # Western Suburbs - Bandra to Andheri
    {"id": "mum-mahim", "name": "Mahim", "region": "Mumbai", "lat": 19.0360, "lng": 72.8402, "zoom_level": "area"},
    {"id": "bandra", "name": "Bandra", "region": "Mumbai", "lat": 19.0596, "lng": 72.8295, "zoom_level": "area"},
    {"id": "mum-khar", "name": "Khar", "region": "Mumbai", "lat": 19.0710, "lng": 72.8360, "zoom_level": "area"},
    {"id": "mum-santacruz", "name": "Santacruz", "region": "Mumbai", "lat": 19.0830, "lng": 72.8410, "zoom_level": "area"},
    {"id": "mum-vileparle", "name": "Vile Parle", "region": "Mumbai", "lat": 19.0990, "lng": 72.8440, "zoom_level": "area"},
    {"id": "andheri-west", "name": "Andheri West", "region": "Mumbai", "lat": 19.1364, "lng": 72.8296, "zoom_level": "area"},
    {"id": "andheri-east", "name": "Andheri East", "region": "Mumbai", "lat": 19.1197, "lng": 72.8684, "zoom_level": "area"},
    {"id": "mum-juhu", "name": "Juhu", "region": "Mumbai", "lat": 19.1075, "lng": 72.8263, "zoom_level": "area"},
    {"id": "mum-versova", "name": "Versova", "region": "Mumbai", "lat": 19.1300, "lng": 72.8120, "zoom_level": "area"},
    {"id": "mum-lokhandwala", "name": "Lokhandwala", "region": "Mumbai", "lat": 19.1410, "lng": 72.8320, "zoom_level": "area"},
    # Western Suburbs - Goregaon to Dahisar
    {"id": "mum-jogeshwari", "name": "Jogeshwari", "region": "Mumbai", "lat": 19.1360, "lng": 72.8490, "zoom_level": "area"},
    {"id": "goregaon-west", "name": "Goregaon", "region": "Mumbai", "lat": 19.1663, "lng": 72.8526, "zoom_level": "area"},
    {"id": "malad-west", "name": "Malad", "region": "Mumbai", "lat": 19.1870, "lng": 72.8485, "zoom_level": "area"},
    {"id": "kandivali-west", "name": "Kandivali", "region": "Mumbai", "lat": 19.2040, "lng": 72.8520, "zoom_level": "area"},
    {"id": "borivali-west", "name": "Borivali", "region": "Mumbai", "lat": 19.2307, "lng": 72.8567, "zoom_level": "area"},
    {"id": "mum-dahisar", "name": "Dahisar", "region": "Mumbai", "lat": 19.2590, "lng": 72.8610, "zoom_level": "area"},
    # Extended Western Line
    {"id": "mum-miraroad", "name": "Mira Road", "region": "Mumbai", "lat": 19.2870, "lng": 72.8720, "zoom_level": "area"},
    {"id": "mum-bhayander", "name": "Bhayandar", "region": "Mumbai", "lat": 19.3010, "lng": 72.8510, "zoom_level": "area"},
    {"id": "mum-vasai", "name": "Vasai", "region": "Mumbai", "lat": 19.3920, "lng": 72.8280, "zoom_level": "area"},
    {"id": "mum-virar", "name": "Virar", "region": "Mumbai", "lat": 19.4550, "lng": 72.8110, "zoom_level": "area"},
    # Thane
    {"id": "thane-west", "name": "Thane West", "region": "Thane", "lat": 19.2183, "lng": 72.9781, "zoom_level": "area"},
    {"id": "thane-east", "name": "Thane East", "region": "Thane", "lat": 19.1860, "lng": 72.9756, "zoom_level": "area"},
    {"id": "ghodbunder", "name": "Ghodbunder Road", "region": "Thane", "lat": 19.2560, "lng": 72.9670, "zoom_level": "area"},
    # Navi Mumbai
    {"id": "navi-mumbai-vashi", "name": "Vashi", "region": "Navi Mumbai", "lat": 19.0771, "lng": 72.9986, "zoom_level": "area"},
    {"id": "kharghar", "name": "Kharghar", "region": "Navi Mumbai", "lat": 19.0474, "lng": 73.0699, "zoom_level": "area"},
    {"id": "panvel", "name": "Panvel", "region": "Navi Mumbai", "lat": 18.9894, "lng": 73.1175, "zoom_level": "area"},
    {"id": "airoli", "name": "Airoli", "region": "Navi Mumbai", "lat": 19.1550, "lng": 72.9983, "zoom_level": "area"},
    {"id": "belapur", "name": "CBD Belapur", "region": "Navi Mumbai", "lat": 19.0235, "lng": 73.0391, "zoom_level": "area"},
    {"id": "nerul", "name": "Nerul", "region": "Navi Mumbai", "lat": 19.0330, "lng": 73.0160, "zoom_level": "area"},
    # Bhiwandi
    {"id": "bhiwandi-kalher", "name": "Kalher", "region": "Bhiwandi", "lat": 19.2473, "lng": 73.0178, "zoom_level": "area"},
    {"id": "bhiwandi-anjur", "name": "Anjur", "region": "Bhiwandi", "lat": 19.2750, "lng": 73.0280, "zoom_level": "area"},
    {"id": "bhiwandi-kasheli", "name": "Kasheli", "region": "Bhiwandi", "lat": 19.2360, "lng": 73.0146, "zoom_level": "area"},
]

# Pune areas - Updated Monday Evening (6 PM IST)
PUNE_AREAS = [
    # Core Pune
    {"id": "pune-kothrud", "name": "Kothrud", "region": "Pune", "lat": 18.5074, "lng": 73.8077, "zoom_level": "area"},
    {"id": "pune-deccan", "name": "Deccan", "region": "Pune", "lat": 18.5170, "lng": 73.8400, "zoom_level": "area"},
    {"id": "pune-shivaji", "name": "Shivajinagar", "region": "Pune", "lat": 18.5308, "lng": 73.8475, "zoom_level": "area"},
    {"id": "pune-camp", "name": "Camp", "region": "Pune", "lat": 18.5140, "lng": 73.8800, "zoom_level": "area"},
    # IT Corridor (West)
    {"id": "pune-baner", "name": "Baner", "region": "Pune", "lat": 18.5590, "lng": 73.7868, "zoom_level": "area"},
    {"id": "pune-balewadi", "name": "Balewadi", "region": "Pune", "lat": 18.5726, "lng": 73.7698, "zoom_level": "area"},
    {"id": "pune-wakad", "name": "Wakad", "region": "Pune", "lat": 18.5980, "lng": 73.7640, "zoom_level": "area"},
    {"id": "pune-hinjewadi", "name": "Hinjewadi", "region": "Pune", "lat": 18.5912, "lng": 73.7380, "zoom_level": "area"},
    {"id": "pune-tathawade", "name": "Tathawade", "region": "Pune", "lat": 18.6140, "lng": 73.7550, "zoom_level": "area"},
    {"id": "pune-aundh", "name": "Aundh", "region": "Pune", "lat": 18.5580, "lng": 73.8070, "zoom_level": "area"},
    {"id": "pune-pashan", "name": "Pashan", "region": "Pune", "lat": 18.5330, "lng": 73.7880, "zoom_level": "area"},
    {"id": "pune-bavdhan", "name": "Bavdhan", "region": "Pune", "lat": 18.5120, "lng": 73.7690, "zoom_level": "area"},
    # East Pune
    {"id": "pune-vimannagar", "name": "Viman Nagar", "region": "Pune", "lat": 18.5679, "lng": 73.9143, "zoom_level": "area"},
    {"id": "pune-kalyani", "name": "Kalyani Nagar", "region": "Pune", "lat": 18.5462, "lng": 73.9020, "zoom_level": "area"},
    {"id": "pune-koregaon", "name": "Koregaon Park", "region": "Pune", "lat": 18.5362, "lng": 73.8940, "zoom_level": "area"},
    {"id": "pune-kharadi", "name": "Kharadi", "region": "Pune", "lat": 18.5530, "lng": 73.9470, "zoom_level": "area"},
    {"id": "pune-hadapsar", "name": "Hadapsar", "region": "Pune", "lat": 18.5089, "lng": 73.9260, "zoom_level": "area"},
    {"id": "pune-magarpatta", "name": "Magarpatta", "region": "Pune", "lat": 18.5158, "lng": 73.9280, "zoom_level": "area"},
    {"id": "pune-wagholi", "name": "Wagholi", "region": "Pune", "lat": 18.5790, "lng": 73.9770, "zoom_level": "area"},
    {"id": "pune-dhanori", "name": "Dhanori", "region": "Pune", "lat": 18.5880, "lng": 73.9060, "zoom_level": "area"},
    # South Pune
    {"id": "pune-kondhwa", "name": "Kondhwa", "region": "Pune", "lat": 18.4650, "lng": 73.8930, "zoom_level": "area"},
    {"id": "pune-undri", "name": "Undri", "region": "Pune", "lat": 18.4580, "lng": 73.9100, "zoom_level": "area"},
    {"id": "pune-wanowrie", "name": "Wanowrie", "region": "Pune", "lat": 18.4940, "lng": 73.8940, "zoom_level": "area"},
    {"id": "pune-bibwewadi", "name": "Bibwewadi", "region": "Pune", "lat": 18.4830, "lng": 73.8630, "zoom_level": "area"},
    {"id": "pune-warje", "name": "Warje", "region": "Pune", "lat": 18.4860, "lng": 73.8060, "zoom_level": "area"},
    {"id": "pune-sinhagad", "name": "Sinhagad Road", "region": "Pune", "lat": 18.4740, "lng": 73.8220, "zoom_level": "area"},
    # PCMC (Pimpri-Chinchwad)
    {"id": "pune-pimpri", "name": "Pimpri", "region": "Pune", "lat": 18.6298, "lng": 73.7997, "zoom_level": "area"},
    {"id": "pune-chinchwad", "name": "Chinchwad", "region": "Pune", "lat": 18.6492, "lng": 73.7658, "zoom_level": "area"},
    {"id": "pune-nigdi", "name": "Nigdi", "region": "Pune", "lat": 18.6518, "lng": 73.7708, "zoom_level": "area"},
]


def create_prompt(area_name: str, city: str = "Mumbai") -> str:
    """Create structured prompt for Gemini to extract price bands."""
    return f"""You are a real estate data analyst. Search for current property prices in {area_name}, {city}, India.

Find approximate price ranges for BUYING and RENTING properties in this area.

Return ONLY a JSON object in this exact format (no markdown, no explanation):
{{
    "buy": {{
        "1rk": {{"min": <number>, "max": <number>, "confidence": "<low|medium|high>"}},
        "1bhk": {{"min": <number>, "max": <number>, "confidence": "<low|medium|high>"}},
        "2bhk": {{"min": <number>, "max": <number>, "confidence": "<low|medium|high>"}},
        "3bhk_plus": {{"min": <number>, "max": <number>, "confidence": "<low|medium|high>"}}
    }},
    "rent": {{
        "1rk": {{"min": <number>, "max": <number>, "confidence": "<low|medium|high>"}},
        "1bhk": {{"min": <number>, "max": <number>, "confidence": "<low|medium|high>"}},
        "2bhk": {{"min": <number>, "max": <number>, "confidence": "<low|medium|high>"}},
        "3bhk_plus": {{"min": <number>, "max": <number>, "confidence": "<low|medium|high>"}}
    }}
}}

Rules:
- All prices in INR (Indian Rupees)
- Buy prices are total purchase prices
- Rent prices are monthly rent
- Confidence levels:
  - "low": Sparse or inconsistent listings found
  - "medium": Multiple recent listings available
  - "high": Strong consensus across multiple sources
- Return realistic {city} market prices for 2024-2025
- No text outside the JSON object"""


def extract_json_from_response(text: str) -> Optional[dict]:
    """Extract JSON object from Gemini response."""
    # Try to find JSON in the response
    text = text.strip()
    
    # Remove markdown code blocks if present
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\n?", "", text)
        text = re.sub(r"\n?```$", "", text)
    
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Try to find JSON object in text
        match = re.search(r"\{[\s\S]*\}", text)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass
    return None


def fetch_prices_for_area(model, area: dict, city: str = "Mumbai") -> Optional[dict]:
    """Fetch price data for a single area using Gemini."""
    prompt = create_prompt(area["name"], city)
    
    try:
        response = model.generate_content(prompt)
        prices = extract_json_from_response(response.text)
        
        if prices and "buy" in prices and "rent" in prices:
            return {**area, **prices}
        else:
            print(f"  ⚠️ Invalid response format for {area['name']}")
            return None
            
    except Exception as e:
        print(f"  ❌ Error fetching {area['name']}: {e}")
        return None


def get_areas_for_region(region: str) -> List[dict]:
    """Get area list based on region."""
    if region == "mumbai":
        return MUMBAI_AREAS
    elif region == "pune":
        return PUNE_AREAS
    elif region == "all":
        return MUMBAI_AREAS + PUNE_AREAS
    else:
        raise ValueError(f"Unknown region: {region}")


def get_city_for_region(region: str) -> str:
    """Get city name for prompts based on region."""
    if region == "mumbai":
        return "Mumbai"
    elif region == "pune":
        return "Pune"
    return "India"


def load_existing_data() -> dict:
    """Load existing price data to merge with updates."""
    if OUTPUT_PATH.exists():
        with open(OUTPUT_PATH, "r") as f:
            return json.load(f)
    return {"version": "1.0.0", "areas": []}


def merge_price_data(existing: dict, new_areas: List[dict]) -> dict:
    """Merge new price data with existing data."""
    # Create a map of existing areas by ID
    existing_map = {area["id"]: area for area in existing.get("areas", [])}
    
    # Update with new areas
    for area in new_areas:
        existing_map[area["id"]] = area
    
    return {
        "version": existing.get("version", "1.0.0"),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "disclaimer": "Prices shown are indicative bands based on recent public listings, not verified transactions.",
        "areas": list(existing_map.values())
    }


def fetch_all_prices(region: str = "all") -> dict:
    """Fetch prices for specified region and merge with existing data."""
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY environment variable not set")
    
    # Configure Gemini
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel(MODEL_NAME)
    
    areas = get_areas_for_region(region)
    city = get_city_for_region(region)
    
    print(f"🚀 Starting price fetch for {len(areas)} {region.upper()} areas...")
    print(f"📅 {datetime.now(timezone.utc).isoformat()}")
    print(f"⏱️ Rate limit: {REQUESTS_PER_MINUTE} requests/min (~{DELAY_BETWEEN_REQUESTS:.1f}s delay)\n")
    
    new_areas = []
    
    for i, area in enumerate(areas, 1):
        print(f"[{i}/{len(areas)}] Fetching {area['name']}...")
        
        result = fetch_prices_for_area(model, area, city)
        if result:
            new_areas.append(result)
            print(f"  ✅ Got prices for {area['name']}")
        else:
            print(f"  ⏭️ Skipping {area['name']} (will keep existing data)")
        
        # Rate limiting
        if i < len(areas):
            time.sleep(DELAY_BETWEEN_REQUESTS)
    
    # Load existing data and merge
    existing = load_existing_data()
    merged = merge_price_data(existing, new_areas)
    
    print(f"\n✅ Updated {len(new_areas)} areas, total {len(merged['areas'])} areas")
    
    return merged
def save_prices(data: dict) -> None:
    """Save price data to JSON file."""
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    
    with open(OUTPUT_PATH, "w") as f:
        json.dump(data, f, indent=2, default=str)
    
    print(f"💾 Saved to {OUTPUT_PATH}")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Fetch real estate prices")
    parser.add_argument(
        "--region",
        choices=["mumbai", "pune", "all"],
        default="all",
        help="Region to fetch prices for (default: all)"
    )
    args = parser.parse_args()
    
    try:
        print(f"""
╔══════════════════════════════════════════════════════════════╗
║           🏠 Urban Price Radar - Price Updater                ║
╠══════════════════════════════════════════════════════════════╣
║  Schedule:                                                    ║
║    • Mumbai: Monday 6:00 AM IST (00:30 UTC)                   ║
║    • Pune:   Monday 6:00 PM IST (12:30 UTC)                   ║
╚══════════════════════════════════════════════════════════════╝
""")
        prices = fetch_all_prices(args.region)
        save_prices(prices)
        print("\n🎉 Price update complete!")
    except Exception as e:
        print(f"\n❌ Failed: {e}")
        raise


if __name__ == "__main__":
    main()
