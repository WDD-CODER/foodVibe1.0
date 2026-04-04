"""
main.py — Catalog Seeder Pipeline Orchestrator

Usage:
  python main.py              # Full run (fetch → normalize → diff → enrich → review → write)
  python main.py --dry-run      # Fetch/normalize/diff only — no Gemini calls, no DB write
  python main.py --skip-fetch   # Re-use existing output/pending-review.json (re-enrich + review)
  python main.py --approve-all  # Skip interactive review — approve everything automatically

Steps:
  1. FETCH      — pull from il-supermarket-scraper + Open Food Facts bulk
  2. NORMALIZE  — map to Product model skeleton
  3. DIFF       — filter out products already in PRODUCT_LIST or pending-review.json
  4. ENRICH     — batched LLM enrichment (yield, expiry, allergens, English name)
  5. REVIEW     — CLI admin approval table
  6. WRITE      — insert approved products into MongoDB (skipped in --dry-run)
"""

import argparse
import json
import logging
import sys
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)


def main() -> int:
    parser = argparse.ArgumentParser(description="foodVibe Catalog Seeder")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Run the full pipeline but skip writing to MongoDB",
    )
    parser.add_argument(
        "--skip-fetch",
        action="store_true",
        help="Skip fetch/normalize/diff — re-use existing output/pending-review.json",
    )
    parser.add_argument(
        "--approve-all",
        action="store_true",
        help="Skip interactive review — approve all enriched products automatically",
    )
    parser.add_argument(
        "--skip-enrich",
        action="store_true",
        help="Skip Gemini enrichment — re-use existing output/enriched.json",
    )
    args = parser.parse_args()

    # Lazy imports — config validates env vars on import
    try:
        from config import OUTPUT_DIR, PENDING_REVIEW_FILE, SEED_OUTPUT_FILE
    except RuntimeError as exc:
        logger.error(f"Configuration error: {exc}")
        return 1

    Path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)

    # ------------------------------------------------------------------
    # Steps 1–3: Fetch → Normalize → Diff
    # ------------------------------------------------------------------
    if args.skip_fetch:
        if not Path(PENDING_REVIEW_FILE).exists():
            logger.error(
                f"--skip-fetch specified but {PENDING_REVIEW_FILE} does not exist. "
                "Run without --skip-fetch first."
            )
            return 1
        logger.info(f"[main] --skip-fetch: loading from {PENDING_REVIEW_FILE}")
        with open(PENDING_REVIEW_FILE, "r", encoding="utf-8") as f:
            pending = json.load(f)
        logger.info(f"[main] Loaded {len(pending)} pending products from file")
    else:
        from fetch import fetch_off_bulk, fetch_supermarket_products
        from normalize import normalize_products
        from diff import diff_against_db

        logger.info("[main] Step 1: Fetching supermarket products...")
        try:
            raw_products = fetch_supermarket_products()
        except RuntimeError as exc:
            logger.error(str(exc))
            return 1

        logger.info("[main] Step 1: Fetching Open Food Facts bulk data...")
        off_lookup = fetch_off_bulk()

        logger.info("[main] Step 2: Normalizing...")
        normalized = normalize_products(raw_products, off_lookup)

        logger.info("[main] Step 3: Diffing against existing catalog...")
        pending = diff_against_db(normalized)

        if not pending:
            logger.info("[main] No new products found. Nothing to do.")
            return 0

        # Save pending list for --skip-fetch on re-runs
        with open(PENDING_REVIEW_FILE, "w", encoding="utf-8") as f:
            json.dump(pending, f, ensure_ascii=False, indent=2)
        logger.info(f"[main] {len(pending)} new products saved to {PENDING_REVIEW_FILE}")

    # ------------------------------------------------------------------
    # Step 4: Enrich  (skipped in --dry-run)
    # ------------------------------------------------------------------
    if args.dry_run:
        logger.info(
            f"[main] DRY RUN complete. "
            f"{len(pending)} new products found and saved to {PENDING_REVIEW_FILE}. "
            "Re-run without --dry-run to enrich and review them."
        )
        return 0

    enriched_file = Path(OUTPUT_DIR) / "enriched.json"

    if args.skip_enrich:
        if not enriched_file.exists():
            logger.error(f"--skip-enrich specified but {enriched_file} does not exist.")
            return 1
        with open(enriched_file, "r", encoding="utf-8") as f:
            enriched = json.load(f)
        logger.info(f"[main] --skip-enrich: loaded {len(enriched)} products from {enriched_file}")
    else:
        from enrich import enrich_all
        logger.info(f"[main] Step 4: Enriching {len(pending)} products via LLM...")
        enriched = enrich_all(pending)

    # Save enriched output so re-runs don't waste Gemini calls (skip if we loaded it)
    if not args.skip_enrich:
        with open(enriched_file, "w", encoding="utf-8") as f:
            json.dump(enriched, f, ensure_ascii=False, indent=2)
        logger.info(f"[main] Enriched products saved to {enriched_file}")

    # ------------------------------------------------------------------
    # Step 5: Admin Review
    # ------------------------------------------------------------------
    if args.approve_all:
        ok = [p for p in enriched if not p.get("_enrichment_failed")]
        logger.info(f"[main] --approve-all: approving all {len(ok)} enriched products")
        approved = ok
    else:
        from review import run_review_cli
        logger.info("[main] Step 5: Starting admin review CLI...")
        approved = run_review_cli(enriched)

    if not approved:
        logger.info("[main] No products approved. Exiting.")
        return 0

    # ------------------------------------------------------------------
    # Step 6: Write to DB
    # ------------------------------------------------------------------
    from db_write import write_approved

    inserted = write_approved(approved, dry_run=False)
    logger.info(f"[main] Done. {inserted} products inserted into PRODUCT_LIST.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
