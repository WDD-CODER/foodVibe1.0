"""
patch_nutrition_manual.py — Apply Gemini-generated nutrition to demo products.

Matches by name_hebrew (demo products have no barcodes).
Updates both Atlas + Local MongoDB AND demo-products.json so future re-seeds
have nutrition baked in.

Usage:
  python patch_nutrition_manual.py           # dry run
  python patch_nutrition_manual.py --write   # apply to DB + JSON
"""

import argparse
import json
import logging
import sys
import io
from pathlib import Path

import pymongo

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S")
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Gemini nutrition data — keyed by demo _id
# ---------------------------------------------------------------------------
NUTRITION_BY_ID = {
    "demo_001": {"energy_kcal": 40, "protein_g": 1.1, "carbs_g": 9.3, "sugars_g": 4.2, "fat_g": 0.1, "fiber_g": 1.7, "sodium_g": 0.004},
    "demo_004": {"energy_kcal": 149, "protein_g": 6.4, "carbs_g": 33.1, "sugars_g": 1.0, "fat_g": 0.5, "fiber_g": 2.1, "sodium_g": 0.017},
    "demo_007": {"energy_kcal": 15, "protein_g": 0.7, "carbs_g": 3.6, "sugars_g": 1.7, "fat_g": 0.1, "fiber_g": 0.5, "sodium_g": 0.002},
    "demo_020": {"energy_kcal": 30, "protein_g": 1.8, "carbs_g": 7.3, "sugars_g": 2.3, "fat_g": 0.2, "fiber_g": 2.6, "sodium_g": 0.016},
    "demo_022": {"energy_kcal": 36, "protein_g": 3.0, "carbs_g": 6.3, "sugars_g": 0.9, "fat_g": 0.8, "fiber_g": 3.3, "sodium_g": 0.056},
    "demo_037": {"energy_kcal": 120, "protein_g": 23.0, "carbs_g": 0.0, "sugars_g": 0.0, "fat_g": 2.6, "fiber_g": 0.0, "sodium_g": 0.045},
    "demo_052": {"energy_kcal": 380, "protein_g": 0.0, "carbs_g": 98.0, "sugars_g": 97.0, "fat_g": 0.0, "fiber_g": 0.0, "sodium_g": 0.028},
    "demo_062": {"energy_kcal": 381, "protein_g": 0.3, "carbs_g": 91.0, "sugars_g": 0.0, "fat_g": 0.1, "fiber_g": 0.0, "sodium_g": 0.009},
    "demo_073": {"energy_kcal": 0, "protein_g": 0.0, "carbs_g": 0.0, "sugars_g": 0.0, "fat_g": 0.0, "fiber_g": 0.0, "sodium_g": 38.7},
    "demo_074": {"energy_kcal": 251, "protein_g": 10.4, "carbs_g": 64.0, "sugars_g": 0.6, "fat_g": 3.3, "fiber_g": 25.3, "sodium_g": 0.02},
    "demo_084": {"energy_kcal": 66, "protein_g": 4.4, "carbs_g": 5.8, "sugars_g": 0.9, "fat_g": 3.4, "fiber_g": 2.1, "sodium_g": 1.1},
    "demo_085": {"energy_kcal": 53, "protein_g": 8.1, "carbs_g": 4.9, "sugars_g": 0.4, "fat_g": 0.1, "fiber_g": 0.8, "sodium_g": 5.5},
    "demo_086": {"energy_kcal": 595, "protein_g": 17.0, "carbs_g": 21.2, "sugars_g": 0.5, "fat_g": 53.8, "fiber_g": 9.3, "sodium_g": 0.115},
    "demo_087": {"energy_kcal": 304, "protein_g": 0.3, "carbs_g": 82.4, "sugars_g": 82.1, "fat_g": 0.0, "fiber_g": 0.0, "sodium_g": 0.004},
    "demo_101": {"energy_kcal": 172, "protein_g": 13.5, "carbs_g": 2.0, "sugars_g": 0.5, "fat_g": 12.1, "fiber_g": 0.0, "sodium_g": 0.85},
    "demo_102": {"energy_kcal": 297, "protein_g": 12.0, "carbs_g": 2.5, "sugars_g": 1.0, "fat_g": 26.8, "fiber_g": 0.0, "sodium_g": 1.1},
    "demo_103": {"energy_kcal": 165, "protein_g": 15.5, "carbs_g": 8.2, "sugars_g": 6.5, "fat_g": 7.4, "fiber_g": 0.3, "sodium_g": 0.65},
    "demo_104": {"energy_kcal": 274, "protein_g": 8.8, "carbs_g": 50.5, "sugars_g": 5.7, "fat_g": 4.1, "fiber_g": 2.4, "sodium_g": 0.51},
    "demo_105": {"energy_kcal": 19, "protein_g": 0.9, "carbs_g": 4.3, "sugars_g": 1.8, "fat_g": 0.1, "fiber_g": 2.9, "sodium_g": 0.66},
    "demo_106": {"energy_kcal": 680, "protein_g": 1.0, "carbs_g": 0.6, "sugars_g": 0.6, "fat_g": 75.0, "fiber_g": 0.0, "sodium_g": 0.63},
    "demo_107": {"energy_kcal": 101, "protein_g": 1.0, "carbs_g": 25.8, "sugars_g": 22.1, "fat_g": 0.1, "fiber_g": 0.3, "sodium_g": 0.91},
    "demo_116": {"energy_kcal": 80, "protein_g": 1.8, "carbs_g": 17.8, "sugars_g": 1.7, "fat_g": 0.8, "fiber_g": 2.0, "sodium_g": 0.013},
    "demo_118": {"energy_kcal": 884, "protein_g": 0.0, "carbs_g": 0.0, "sugars_g": 0.0, "fat_g": 100.0, "fiber_g": 0.0, "sodium_g": 0.0},
    "demo_119": {"energy_kcal": 0, "protein_g": 0.0, "carbs_g": 0.0, "sugars_g": 0.0, "fat_g": 0.0, "fiber_g": 0.0, "sodium_g": 0.001},
    "demo_120": {"energy_kcal": 0, "protein_g": 0.0, "carbs_g": 0.0, "sugars_g": 0.0, "fat_g": 0.0, "fiber_g": 0.0, "sodium_g": 0.0},
    "demo_122": {"energy_kcal": 255, "protein_g": 12.0, "carbs_g": 18.0, "sugars_g": 1.2, "fat_g": 15.0, "fiber_g": 1.5, "sodium_g": 0.72},
    "demo_123": {"energy_kcal": 240, "protein_g": 13.0, "carbs_g": 3.0, "sugars_g": 1.0, "fat_g": 20.0, "fiber_g": 0.0, "sodium_g": 1.0},
    "demo_124": {"energy_kcal": 250, "protein_g": 18.5, "carbs_g": 0.0, "sugars_g": 0.0, "fat_g": 19.5, "fiber_g": 0.0, "sodium_g": 0.075},
    "demo_125": {"energy_kcal": 210, "protein_g": 22.0, "carbs_g": 11.0, "sugars_g": 9.0, "fat_g": 8.5, "fiber_g": 0.5, "sodium_g": 0.55},
    "demo_126": {"energy_kcal": 225, "protein_g": 14.5, "carbs_g": 9.5, "sugars_g": 1.8, "fat_g": 13.5, "fiber_g": 1.2, "sodium_g": 0.62},
    "demo_127": {"energy_kcal": 125, "protein_g": 19.0, "carbs_g": 0.0, "sugars_g": 0.0, "fat_g": 5.5, "fiber_g": 0.0, "sodium_g": 0.08},
    "demo_128": {"energy_kcal": 270, "protein_g": 17.2, "carbs_g": 3.2, "sugars_g": 0.0, "fat_g": 20.5, "fiber_g": 2.3, "sodium_g": 0.012},
    "demo_129": {"energy_kcal": 310, "protein_g": 0.0, "carbs_g": 77.0, "sugars_g": 77.0, "fat_g": 0.0, "fiber_g": 0.0, "sodium_g": 0.025},
    "demo_130": {"energy_kcal": 205, "protein_g": 4.1, "carbs_g": 46.5, "sugars_g": 36.0, "fat_g": 0.6, "fiber_g": 2.2, "sodium_g": 2.45},
    "demo_131": {"energy_kcal": 18, "protein_g": 0.1, "carbs_g": 0.1, "sugars_g": 0.1, "fat_g": 0.0, "fiber_g": 0.0, "sodium_g": 0.005},
    "demo_132": {"energy_kcal": 588, "protein_g": 25.1, "carbs_g": 20.0, "sugars_g": 9.2, "fat_g": 50.4, "fiber_g": 6.0, "sodium_g": 0.43},
    "demo_133": {"energy_kcal": 175, "protein_g": 2.2, "carbs_g": 41.0, "sugars_g": 37.5, "fat_g": 1.1, "fiber_g": 0.6, "sodium_g": 3.4},
    "demo_134": {"energy_kcal": 53, "protein_g": 8.0, "carbs_g": 5.1, "sugars_g": 1.2, "fat_g": 0.1, "fiber_g": 0.8, "sodium_g": 5.9},
    "demo_135": {"energy_kcal": 62, "protein_g": 9.2, "carbs_g": 6.1, "sugars_g": 2.2, "fat_g": 0.1, "fiber_g": 0.0, "sodium_g": 7.1},
    "demo_136": {"energy_kcal": 53, "protein_g": 8.1, "carbs_g": 4.9, "sugars_g": 0.4, "fat_g": 0.1, "fiber_g": 0.8, "sodium_g": 5.5},
    "demo_137": {"energy_kcal": 366, "protein_g": 6.0, "carbs_g": 80.1, "sugars_g": 0.1, "fat_g": 1.4, "fiber_g": 2.4, "sodium_g": 0.005},
    "demo_138": {"energy_kcal": 42, "protein_g": 1.4, "carbs_g": 8.5, "sugars_g": 5.2, "fat_g": 0.2, "fiber_g": 1.6, "sodium_g": 0.45},
    "demo_139": {"energy_kcal": 884, "protein_g": 0.0, "carbs_g": 0.0, "sugars_g": 0.0, "fat_g": 100.0, "fiber_g": 0.0, "sodium_g": 0.0},
    "demo_140": {"energy_kcal": 57, "protein_g": 0.4, "carbs_g": 15.2, "sugars_g": 9.8, "fat_g": 0.1, "fiber_g": 3.1, "sodium_g": 0.001},
    "demo_141": {"energy_kcal": 89, "protein_g": 1.1, "carbs_g": 22.8, "sugars_g": 12.2, "fat_g": 0.3, "fiber_g": 2.6, "sodium_g": 0.001},
    "demo_144": {"energy_kcal": 18, "protein_g": 0.9, "carbs_g": 3.9, "sugars_g": 2.6, "fat_g": 0.2, "fiber_g": 1.2, "sodium_g": 0.005},
    "demo_146": {"energy_kcal": 178, "protein_g": 4.2, "carbs_g": 37.5, "sugars_g": 1.1, "fat_g": 0.9, "fiber_g": 1.2, "sodium_g": 0.32},
    "demo_147": {"energy_kcal": 360, "protein_g": 6.8, "carbs_g": 79.5, "sugars_g": 0.1, "fat_g": 0.6, "fiber_g": 1.3, "sodium_g": 0.001},
    "demo_148": {"energy_kcal": 148, "protein_g": 2.8, "carbs_g": 31.5, "sugars_g": 0.4, "fat_g": 1.2, "fiber_g": 0.6, "sodium_g": 0.38},
    "demo_149": {"energy_kcal": 338, "protein_g": 0.5, "carbs_g": 83.2, "sugars_g": 2.4, "fat_g": 0.1, "fiber_g": 1.2, "sodium_g": 0.58},
    "demo_150": {"energy_kcal": 351, "protein_g": 0.3, "carbs_g": 86.4, "sugars_g": 0.0, "fat_g": 0.1, "fiber_g": 1.1, "sodium_g": 0.02},
    "demo_151": {"energy_kcal": 285, "protein_g": 4.2, "carbs_g": 54.8, "sugars_g": 6.1, "fat_g": 5.2, "fiber_g": 3.2, "sodium_g": 0.58},
    "demo_152": {"energy_kcal": 285, "protein_g": 4.2, "carbs_g": 54.8, "sugars_g": 6.1, "fat_g": 5.2, "fiber_g": 3.2, "sodium_g": 0.58},
    "demo_153": {"energy_kcal": 312, "protein_g": 3.4, "carbs_g": 41.4, "sugars_g": 0.3, "fat_g": 14.7, "fiber_g": 3.8, "sodium_g": 0.21},
    "demo_154": {"energy_kcal": 536, "protein_g": 7.0, "carbs_g": 52.9, "sugars_g": 1.2, "fat_g": 34.6, "fiber_g": 4.8, "sodium_g": 0.53},
    "demo_155": {"energy_kcal": 455, "protein_g": 4.8, "carbs_g": 61.2, "sugars_g": 42.5, "fat_g": 21.5, "fiber_g": 1.2, "sodium_g": 0.28},
    "demo_157": {"energy_kcal": 315, "protein_g": 3.6, "carbs_g": 28.4, "sugars_g": 25.1, "fat_g": 20.8, "fiber_g": 1.1, "sodium_g": 0.11},
    "demo_158": {"energy_kcal": 405, "protein_g": 5.2, "carbs_g": 51.5, "sugars_g": 38.5, "fat_g": 20.4, "fiber_g": 1.4, "sodium_g": 0.22},
    "demo_159": {"energy_kcal": 395, "protein_g": 5.1, "carbs_g": 92.4, "sugars_g": 90.2, "fat_g": 0.2, "fiber_g": 0.0, "sodium_g": 0.08},
    "demo_160": {"energy_kcal": 318, "protein_g": 1.8, "carbs_g": 81.3, "sugars_g": 57.5, "fat_g": 0.2, "fiber_g": 0.0, "sodium_g": 0.08},
    "demo_163": {"energy_kcal": 505, "protein_g": 5.4, "carbs_g": 62.5, "sugars_g": 31.2, "fat_g": 26.1, "fiber_g": 2.1, "sodium_g": 0.31},
    "demo_164": {"energy_kcal": 445, "protein_g": 4.1, "carbs_g": 61.5, "sugars_g": 52.0, "fat_g": 21.8, "fiber_g": 2.4, "sodium_g": 0.18},
    "demo_165": {"energy_kcal": 482, "protein_g": 4.8, "carbs_g": 64.2, "sugars_g": 34.5, "fat_g": 22.1, "fiber_g": 1.6, "sodium_g": 0.12},
    "demo_166": {"energy_kcal": 245, "protein_g": 2.8, "carbs_g": 31.2, "sugars_g": 24.5, "fat_g": 12.8, "fiber_g": 0.0, "sodium_g": 0.05},
    "demo_167": {"energy_kcal": 125, "protein_g": 1.8, "carbs_g": 19.5, "sugars_g": 17.5, "fat_g": 4.5, "fiber_g": 0.0, "sodium_g": 0.04},
    "demo_168": {"energy_kcal": 355, "protein_g": 0.8, "carbs_g": 71.5, "sugars_g": 61.2, "fat_g": 7.8, "fiber_g": 0.0, "sodium_g": 0.22},
    "demo_169": {"energy_kcal": 305, "protein_g": 2.1, "carbs_g": 59.5, "sugars_g": 49.5, "fat_g": 6.2, "fiber_g": 2.4, "sodium_g": 0.08},
    "demo_170": {"energy_kcal": 585, "protein_g": 24.4, "carbs_g": 21.5, "sugars_g": 4.9, "fat_g": 49.7, "fiber_g": 8.0, "sodium_g": 0.41},
    "demo_171": {"energy_kcal": 553, "protein_g": 18.2, "carbs_g": 30.2, "sugars_g": 5.9, "fat_g": 43.9, "fiber_g": 3.3, "sodium_g": 0.012},
    "demo_172": {"energy_kcal": 354, "protein_g": 3.3, "carbs_g": 15.2, "sugars_g": 6.2, "fat_g": 33.5, "fiber_g": 9.0, "sodium_g": 0.02},
    "demo_173": {"energy_kcal": 573, "protein_g": 17.7, "carbs_g": 23.4, "sugars_g": 0.3, "fat_g": 49.7, "fiber_g": 11.8, "sodium_g": 0.011},
    "demo_174": {"energy_kcal": 405, "protein_g": 14.8, "carbs_g": 44.5, "sugars_g": 19.5, "fat_g": 17.5, "fiber_g": 5.2, "sodium_g": 4.6},
    "demo_186": {"energy_kcal": 215, "protein_g": 0.9, "carbs_g": 54.2, "sugars_g": 50.1, "fat_g": 0.1, "fiber_g": 1.8, "sodium_g": 0.52},
    "demo_187": {"energy_kcal": 155, "protein_g": 1.1, "carbs_g": 34.8, "sugars_g": 29.5, "fat_g": 0.6, "fiber_g": 0.8, "sodium_g": 1.25},
    "demo_188": {"energy_kcal": 15, "protein_g": 1.1, "carbs_g": 2.4, "sugars_g": 1.1, "fat_g": 0.1, "fiber_g": 1.6, "sodium_g": 0.59},
    "demo_189": {"energy_kcal": 155, "protein_g": 2.1, "carbs_g": 31.5, "sugars_g": 26.2, "fat_g": 2.8, "fiber_g": 0.6, "sodium_g": 1.55},
    "demo_190": {"energy_kcal": 255, "protein_g": 9.5, "carbs_g": 48.5, "sugars_g": 4.8, "fat_g": 4.8, "fiber_g": 14.5, "sodium_g": 0.12},
    "demo_191": {"energy_kcal": 31, "protein_g": 1.0, "carbs_g": 6.0, "sugars_g": 4.2, "fat_g": 0.3, "fiber_g": 2.1, "sodium_g": 0.004},
    "demo_192": {"energy_kcal": 248, "protein_g": 2.2, "carbs_g": 59.5, "sugars_g": 51.5, "fat_g": 0.8, "fiber_g": 0.4, "sodium_g": 2.15},
    "demo_193": {"energy_kcal": 495, "protein_g": 4.5, "carbs_g": 69.5, "sugars_g": 38.5, "fat_g": 24.5, "fiber_g": 5.1, "sodium_g": 0.62},
    "demo_194": {"energy_kcal": 145, "protein_g": 1.8, "carbs_g": 24.8, "sugars_g": 21.5, "fat_g": 4.8, "fiber_g": 0.0, "sodium_g": 0.04},
    # demo_162 and demo_185 returned all nulls — skipped intentionally
}

DEMO_PRODUCTS_PATH = Path(__file__).parent.parent.parent / "public" / "assets" / "data" / "demo-products.json"


def patch(write: bool) -> None:
    from config import COLLECTION, MONGO_ATLAS_URI, MONGO_LOCAL_URI

    # Build name_hebrew → nutrition lookup via demo-products.json
    with open(DEMO_PRODUCTS_PATH, encoding="utf-8") as f:
        demo_products = json.load(f)

    id_to_name = {p["_id"]: p["name_hebrew"] for p in demo_products}
    name_to_nutrition = {
        id_to_name[demo_id]: nutr
        for demo_id, nutr in NUTRITION_BY_ID.items()
        if demo_id in id_to_name
    }

    logger.info(f"[patch] {len(name_to_nutrition)} products have nutrition data to apply")

    # --- Update demo-products.json ---
    updated_json = 0
    for p in demo_products:
        nutr = NUTRITION_BY_ID.get(p["_id"])
        if nutr and not p.get("nutrition_per_100g"):
            p["nutrition_per_100g"] = nutr
            updated_json += 1

    if write:
        with open(DEMO_PRODUCTS_PATH, "w", encoding="utf-8") as f:
            json.dump(demo_products, f, ensure_ascii=False, indent=2)
        logger.info(f"[patch] demo-products.json updated: {updated_json} products patched")
    else:
        logger.info(f"[patch] DRY RUN — would update {updated_json} products in demo-products.json")

    # --- Update MongoDB ---
    targets = []
    if MONGO_ATLAS_URI:
        targets.append(("Atlas", MONGO_ATLAS_URI))
    if MONGO_LOCAL_URI:
        targets.append(("Local", MONGO_LOCAL_URI))

    for label, uri in targets:
        updated = 0
        not_found = 0
        try:
            client = pymongo.MongoClient(uri, serverSelectionTimeoutMS=5000)
            db = client.get_default_database()
            col = db[COLLECTION]

            for name_hebrew, nutr in name_to_nutrition.items():
                if write:
                    result = col.update_one(
                        {"userId": "__master__", "name_hebrew": name_hebrew},
                        {"$set": {"nutrition_per_100g": nutr}},
                    )
                    if result.matched_count:
                        updated += 1
                    else:
                        not_found += 1
                        logger.debug(f"[db] [{label}] Not found: {name_hebrew}")
                else:
                    exists = col.find_one({"userId": "__master__", "name_hebrew": name_hebrew}, {"_id": 1})
                    if exists:
                        updated += 1
                    else:
                        not_found += 1

            client.close()
            if write:
                logger.info(f"[db] [{label}] Updated: {updated}, not found in DB: {not_found}")
            else:
                logger.info(f"[db] [{label}] DRY RUN — would update: {updated}, not found: {not_found}")
        except Exception as exc:
            logger.error(f"[db] [{label}] Connection failed: {exc}")

    if not write:
        logger.info("[patch] DRY RUN complete — pass --write to apply.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--write", action="store_true", help="Apply updates (default is dry run)")
    args = parser.parse_args()
    patch(write=args.write)
