"""
config.py — shared constants and env-var loading for the catalog seeder pipeline.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load from tools/catalog-seeder/.env first, fall back to server/.env
_HERE = Path(__file__).parent
_SERVER_ENV = _HERE / ".." / ".." / "server" / ".env"

load_dotenv(_HERE / ".env", override=False)
load_dotenv(_SERVER_ENV, override=False)

# ---------------------------------------------------------------------------
# MongoDB
# ---------------------------------------------------------------------------
_is_local = os.getenv("NODE_ENV", "").lower() == "development"
MONGO_URI: str = (
    os.getenv("MONGO_LOCAL_URI", "") if _is_local else os.getenv("MONGO_URI", "")
)
if not MONGO_URI:
    raise RuntimeError(
        "No MongoDB URI found. Set MONGO_URI (or MONGO_LOCAL_URI + NODE_ENV=development) "
        "in tools/catalog-seeder/.env or server/.env"
    )

COLLECTION = "PRODUCT_LIST"
SUPPLIERS_COLLECTION = "KITCHEN_SUPPLIERS"

# ---------------------------------------------------------------------------
# Gemini (same API key as the Node.js backend uses)
# ---------------------------------------------------------------------------
GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY is not set.")

LLM_MODEL = "gemini-2.5-flash-lite"   # matches server/routes/ai.js
DAILY_LIMIT = 1000
BATCH_SIZE = 25  # products per LLM call
MAX_PRODUCTS = 800  # keep only the N most cross-chain products (most popular = most universal)

# ---------------------------------------------------------------------------
# Shared daily call counter — same MongoDB collection the Node.js backend uses
# ---------------------------------------------------------------------------
USAGE_COLLECTION = "GEMINI_USAGE"

# ---------------------------------------------------------------------------
# Output paths
# ---------------------------------------------------------------------------
OUTPUT_DIR = _HERE / "output"
PENDING_REVIEW_FILE = OUTPUT_DIR / "pending-review.json"
PENDING_MANUAL_FILE = OUTPUT_DIR / "pending-manual.json"
SEED_OUTPUT_FILE = OUTPUT_DIR / "seed-products.json"

# ---------------------------------------------------------------------------
# Allergens — allowed values only
# ---------------------------------------------------------------------------
ALLOWED_ALLERGENS = frozenset(
    ["gluten", "dairy", "eggs", "fish", "shellfish", "tree_nuts", "peanuts", "soy", "sesame"]
)

# ---------------------------------------------------------------------------
# Base-unit inference: map category slug → base_unit_
# ---------------------------------------------------------------------------
CATEGORY_UNIT_MAP: dict[str, str] = {
    "proteins":          "kg",
    "dairy_liquid":      "liter",   # milk, cream
    "dairy_solid":       "kg",      # cheese, butter
    "produce_loose":     "kg",      # tomatoes, onions
    "produce_packaged":  "unit",    # bagged salad
    "grains":            "kg",
    "pantry_liquid":     "liter",   # oils, sauces
    "pantry_solid":      "unit",    # spices, dry goods
    "frozen":            "kg",      # fallback; prefer weight field from feed if present
}

# ---------------------------------------------------------------------------
# Store whitelist — only fetch from food supermarkets
# ---------------------------------------------------------------------------
FOOD_CHAINS: frozenset[str] = frozenset([
    "Bareket", "CityMarketKiryatGat", "CityMarketShops", "FreshMarketAndSuperDosh",
    "HaziHinam", "HetCohen", "Keshet", "KingStore", "Maayan2000", "MahsaniAShuk",
    "MeshnatYosef1", "MeshnatYosef2", "Osherad", "Polizer", "RamiLevy",
    "SalachDabach", "ShefaBarcartAshem", "Shufersal", "ShukAhir",
    "SuperSapir", "SuperYuda", "TivTaam", "Victory", "VictoryNewSource",
    "YaynotBitanAndCarrefour", "Yohananof",
])

# ---------------------------------------------------------------------------
# Non-food keyword blocklist — drop products whose Hebrew name contains any of these
# ---------------------------------------------------------------------------
NON_FOOD_KEYWORDS: tuple[str, ...] = (
    # Cosmetics / makeup
    "שפתון", "לק ", "איפור", "קונסילר", "פאודר", "מסקרה", "אייליינר",
    "צלליות", "רוז'", "סרום פנים", "קרם פנים", "טונר פנים",
    # Body / hair care
    "קרם גוף", "לוסיון גוף", "ספריי גוף", "בושם", "דאודורנט",
    "שמפו", "מרכך שיער", "ג'ל מקלחת", "צבע שיער",
    # Hygiene
    "טמפון", "פד היגייני", "ממטרה",
    # Cleaning
    "אקונומיקה", "אבקת כביסה", "מרכך כביסה", "נוזל כלים",
    # Paper / disposable
    "נייר טואלט", "ממחטות",
    # Baby care
    "חיתול", "טיטול",
    # Pet food
    "מזון לכלב", "מזון לחתול",
)

# ---------------------------------------------------------------------------
# Human-readable category groups used for LLM batching
CATEGORY_GROUPS: dict[str, list[str]] = {
    "proteins":  ["proteins", "meat", "fish", "poultry", "eggs"],
    "dairy":     ["dairy", "dairy_liquid", "dairy_solid", "cheese", "butter", "milk"],
    "grains":    ["grains", "flour", "bread", "pasta", "rice", "cereals"],
    "produce":   ["produce", "produce_loose", "produce_packaged", "vegetables", "fruits"],
    "pantry":    ["pantry", "pantry_liquid", "pantry_solid", "oils", "spices", "sauces", "condiments"],
    "frozen":    ["frozen"],
}
