"""
main.py — Catalog Seeder Pipeline Orchestrator

Usage:
  python main.py              # FETCH → FILTER → NORMALIZE → write catalog-review.json (STOP)
  python main.py --dry-run      # Same as above but only log stats — do not write file
  python main.py --from-review  # Load catalog-review.json (approved:true) → ENRICH → DIFF → WRITE
  python main.py --approve-all  # With --from-review: skip interactive review, approve all

Steps (default path):
  1. FETCH      — pull from il-supermarket-scraper + Open Food Facts bulk
  2. NORMALIZE  — map to Product model skeleton
  2.5 FILTER    — food-signal filter; drop non-kitchen items
  → write catalog-review.json and stop

Steps (--from-review path):
  load catalog-review.json → filter approved:true → ENRICH → DIFF → WRITE
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
        help="Log pipeline stats without writing any file or DB",
    )
    parser.add_argument(
        "--from-review",
        action="store_true",
        help=(
            "Skip fetch/filter/normalize — load catalog-review.json, "
            "take approved:true items, and proceed to enrich + diff + write."
        ),
    )
    parser.add_argument(
        "--skip-fetch",
        action="store_true",
        help="Deprecated — use --from-review instead.",
    )
    parser.add_argument(
        "--approve-all",
        action="store_true",
        help="With --from-review: skip interactive review, approve all enriched products",
    )
    parser.add_argument(
        "--skip-enrich",
        action="store_true",
        help="Skip Gemini enrichment — re-use existing output/enriched.json",
    )
    args = parser.parse_args()

    if args.skip_fetch and not args.from_review:
        logger.warning("[main] --skip-fetch is deprecated — treating as --from-review")
        args.from_review = True

    # Lazy imports — config validates env vars on import
    try:
        from config import CATALOG_REVIEW_FILE, OUTPUT_DIR, PENDING_REVIEW_FILE, SEED_OUTPUT_FILE
    except RuntimeError as exc:
        logger.error(f"Configuration error: {exc}")
        return 1

    Path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)

    # ------------------------------------------------------------------
    # DEFAULT PATH: Fetch → Normalize → Filter → write catalog-review.json
    # ------------------------------------------------------------------
    if not args.from_review:
        from fetch import fetch_off_bulk, fetch_supermarket_products
        from normalize import normalize_products
        from filter import apply_food_filter

        logger.info("[main] Step 1: Fetching supermarket products...")
        try:
            raw_products = fetch_supermarket_products()
        except RuntimeError as exc:
            logger.error(str(exc))
            return 1

        logger.info("[main] Step 1b: Fetching Open Food Facts bulk data...")
        off_lookup = fetch_off_bulk()

        logger.info("[main] Step 2: Normalizing...")
        normalized = normalize_products(raw_products, off_lookup)

        logger.info("[main] Step 2.5: Applying food filter...")
        filtered = apply_food_filter(normalized)

        if args.dry_run:
            logger.info(
                f"[main] DRY RUN: {len(filtered)} products would be written to "
                f"{CATALOG_REVIEW_FILE}. Re-run without --dry-run to save."
            )
            return 0

        import datetime
        review_doc = {
            "generated_at": datetime.datetime.utcnow().isoformat(),
            "total": len(filtered),
            "items": filtered,
        }
        with open(CATALOG_REVIEW_FILE, "w", encoding="utf-8") as f:
            json.dump(review_doc, f, ensure_ascii=False, indent=2)
        logger.info(
            f"[main] {len(filtered)} products written to {CATALOG_REVIEW_FILE}. "
            "Review and set approved:true, then re-run with --from-review."
        )
        return 0

    # ------------------------------------------------------------------
    # --from-review PATH: load approved items → Enrich → Diff → Write
    # ------------------------------------------------------------------
    if not Path(CATALOG_REVIEW_FILE).exists():
        logger.error(
            f"catalog-review.json not found at {CATALOG_REVIEW_FILE}. "
            "Run without --from-review first."
        )
        return 1

    with open(CATALOG_REVIEW_FILE, "r", encoding="utf-8") as f:
        review_doc = json.load(f)

    all_items = review_doc.get("items", review_doc) if isinstance(review_doc, dict) else review_doc
    approved_items = [p for p in all_items if p.get("approved") and not p.get("drop")]

    if not approved_items:
        logger.info("[main] No approved items found in catalog-review.json. Nothing to do.")
        return 0

    logger.info(f"[main] {len(approved_items)} approved items loaded from catalog-review.json")

    # Strip review-only fields; map kitchen_category → categories_ if set
    _REVIEW_FIELDS = {"approved", "drop", "kitchen_category", "suggested_category", "notes"}
    pending = []
    for p in approved_items:
        kc = p.get("kitchen_category", "").strip()
        item = {k: v for k, v in p.items() if k not in _REVIEW_FIELDS}
        if kc:
            item["categories_"] = [kc]
        pending.append(item)

    # ------------------------------------------------------------------
    # Step 3: Diff against existing catalog
    # ------------------------------------------------------------------
    from diff import diff_against_db
    logger.info("[main] Step 3: Diffing against existing catalog...")
    pending = diff_against_db(pending)

    if not pending:
        logger.info("[main] No new products found (all already in DB). Nothing to do.")
        return 0

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
