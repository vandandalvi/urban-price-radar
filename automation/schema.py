"""
JSON Schema validation for Urban Price Radar price data.
Ensures data integrity before committing to repository.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Literal
from datetime import datetime


class PriceBand(BaseModel):
    """Price band with min/max range and confidence level."""
    min: int = Field(..., ge=0, description="Minimum price in INR")
    max: int = Field(..., ge=0, description="Maximum price in INR")
    confidence: Literal["low", "medium", "high"] = Field(
        ..., description="Confidence level based on data quality"
    )

    @field_validator("max")
    @classmethod
    def max_greater_than_min(cls, v, info):
        if "min" in info.data and v < info.data["min"]:
            raise ValueError("max must be greater than or equal to min")
        return v


class PropertyPrices(BaseModel):
    """Price bands for all property types."""
    one_rk: PriceBand = Field(..., alias="1rk")
    one_bhk: PriceBand = Field(..., alias="1bhk")
    two_bhk: PriceBand = Field(..., alias="2bhk")
    three_bhk_plus: PriceBand = Field(..., alias="3bhk_plus")

    class Config:
        populate_by_name = True


class Area(BaseModel):
    """Geographic area with price data."""
    id: str = Field(..., min_length=1, description="Unique area identifier")
    name: str = Field(..., min_length=1, description="Display name")
    region: str = Field(..., min_length=1, description="Parent region")
    lat: float = Field(..., ge=-90, le=90, description="Latitude")
    lng: float = Field(..., ge=-180, le=180, description="Longitude")
    zoom_level: Literal["region", "area", "micro"] = Field(
        ..., description="Visibility zoom level"
    )
    buy: PropertyPrices = Field(..., description="Purchase price bands")
    rent: PropertyPrices = Field(..., description="Rental price bands")


class PriceData(BaseModel):
    """Root schema for prices.json."""
    version: str = Field(..., pattern=r"^\d+\.\d+\.\d+$")
    generated_at: datetime
    disclaimer: str = Field(..., min_length=10)
    areas: list[Area] = Field(..., min_length=1)

    @field_validator("areas")
    @classmethod
    def unique_area_ids(cls, v):
        ids = [area.id for area in v]
        if len(ids) != len(set(ids)):
            raise ValueError("Area IDs must be unique")
        return v


def validate_price_data(data: dict) -> PriceData:
    """Validate price data against schema."""
    return PriceData.model_validate(data)


if __name__ == "__main__":
    # Test with sample data
    import json
    from pathlib import Path
    
    data_path = Path(__file__).parent.parent / "data" / "prices.json"
    if data_path.exists():
        with open(data_path) as f:
            data = json.load(f)
        
        try:
            validated = validate_price_data(data)
            print(f"✅ Validation passed! {len(validated.areas)} areas loaded.")
        except Exception as e:
            print(f"❌ Validation failed: {e}")
    else:
        print(f"⚠️ No data file found at {data_path}")
