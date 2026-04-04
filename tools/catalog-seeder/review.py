"""
review.py — Step 5 of the catalog seeder pipeline.

CLI-based admin review table using `rich` for display and `questionary` for
interactive editing and approve/reject actions.

Displays enriched products; allows inline editing of yield_factor and
expiry_days_default; shows allergen_source_ as a read-only trust indicator.
Writes approved products to output/seed-products.json.
"""

import json
import logging
from pathlib import Path
from typing import Any

import questionary
from rich.console import Console
from rich.table import Table
from rich import box

from config import PENDING_MANUAL_FILE, PENDING_REVIEW_FILE, SEED_OUTPUT_FILE

logger = logging.getLogger(__name__)
console = Console()

_ALLERGEN_SOURCE_LABEL = {"off": "[green]OFF✓[/green]", "llm": "[yellow]AI~[/yellow]"}


def run_review_cli(products: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Show an interactive CLI review for all enriched products.
    Returns the list of approved products (written to seed-products.json).
    """
    if not products:
        console.print("[yellow]No new products to review.[/yellow]")
        return []

    # Separate enrichment-failed products for manual fill section
    ok_products = [p for p in products if not p.get("_enrichment_failed")]
    failed_products = [p for p in products if p.get("_enrichment_failed")]

    console.rule("[bold]Catalog Seeder — Admin Review[/bold]")
    console.print(f"\n[bold]{len(ok_products)}[/bold] enriched products ready for review.")
    if failed_products:
        console.print(
            f"[yellow]{len(failed_products)} products need manual fill[/yellow] "
            f"(shown at the end)."
        )

    # --- Main review pass ---
    approved: list[dict[str, Any]] = []
    rejected: list[dict[str, Any]] = []

    mode = questionary.select(
        "How do you want to review?",
        choices=[
            "Approve all (review table only)",
            "Approve all — skip table",
            "Review one by one",
        ],
    ).ask()

    if mode is None:
        console.print("[red]Cancelled.[/red]")
        return []

    if mode == "Approve all — skip table":
        approved = list(ok_products)
    else:
        _print_product_table(ok_products)
        if mode == "Approve all (review table only)":
            approved = list(ok_products)
        else:
            approved, rejected = _review_one_by_one(ok_products)

    # --- Manual fill for failed products ---
    if failed_products:
        console.rule("[bold yellow]Needs Manual Fill[/bold yellow]")
        console.print(
            "These products failed LLM enrichment. Fill yield_factor and "
            "expiry_days_default manually, then approve or skip each one."
        )
        manually_filled = _manual_fill(failed_products)
        approved.extend(manually_filled)

    # Save
    _save_approved(approved)
    console.print(
        f"\n[green]✓ {len(approved)} products approved[/green] → {SEED_OUTPUT_FILE}"
    )
    if rejected:
        console.print(f"[dim]{len(rejected)} products rejected and not saved.[/dim]")

    return approved


# ---------------------------------------------------------------------------
# Table display
# ---------------------------------------------------------------------------

def _print_product_table(products: list[dict[str, Any]]) -> None:
    table = Table(
        box=box.SIMPLE_HEAD,
        show_lines=False,
        title="Enriched Products",
        title_style="bold",
    )
    table.add_column("#", style="dim", width=4)
    table.add_column("Hebrew Name", min_width=20)
    table.add_column("English Name", min_width=18)
    table.add_column("Category", width=12)
    table.add_column("Unit", width=6)
    table.add_column("Price ₪", width=8, justify="right")
    table.add_column("Yield", width=6, justify="right")
    table.add_column("Expiry (d)", width=10, justify="right")
    table.add_column("Allergens", min_width=20)
    table.add_column("Src", width=6)

    for i, p in enumerate(products, 1):
        allergen_src = p.get("allergen_source_", "llm")
        src_label = "[green]OFF✓[/green]" if allergen_src == "off" else "[yellow]AI~[/yellow]"
        allergens = ", ".join(p.get("allergens_", [])) or "[dim]—[/dim]"

        table.add_row(
            str(i),
            p.get("name_hebrew", ""),
            p.get("name_english") or "[dim]—[/dim]",
            p.get("_category_group", ""),
            p.get("base_unit_", ""),
            f"{p.get('buy_price_global_', 0):.2f}",
            f"{p.get('yield_factor_', 0):.2f}",
            str(p.get("expiry_days_default_", 0)),
            allergens,
            src_label,
        )

    console.print(table)


# ---------------------------------------------------------------------------
# One-by-one review
# ---------------------------------------------------------------------------

def _review_one_by_one(
    products: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    approved: list[dict[str, Any]] = []
    rejected: list[dict[str, Any]] = []

    for i, product in enumerate(products, 1):
        console.print(
            f"\n[bold]({i}/{len(products)})[/bold] "
            f"[cyan]{product['name_hebrew']}[/cyan] "
            f"({product.get('name_english') or 'no English name'})"
        )
        console.print(
            f"  Category: {product.get('_category_group')}  |  "
            f"Unit: {product.get('base_unit_')}  |  "
            f"Price: ₪{product.get('buy_price_global_', 0):.2f}"
        )
        console.print(
            f"  Yield: {product.get('yield_factor_')}  |  "
            f"Expiry: {product.get('expiry_days_default_')}d  |  "
            f"Allergens ({product.get('allergen_source_', 'llm')}): "
            f"{', '.join(product.get('allergens_', [])) or '—'}"
        )

        action = questionary.select(
            "Action:",
            choices=[
                "Approve",
                "Edit yield & expiry, then approve",
                "Skip (reject)",
                "Quit review",
            ],
        ).ask()

        if action is None or action == "Quit review":
            # Approve everything not yet decided
            remaining = products[i - 1 :]
            choice = questionary.confirm(
                f"Approve remaining {len(remaining)} products?", default=True
            ).ask()
            if choice:
                approved.extend(remaining)
            else:
                rejected.extend(remaining)
            break

        if action == "Skip (reject)":
            rejected.append(product)
        elif action == "Edit yield & expiry, then approve":
            product = _edit_product(product)
            approved.append(product)
        else:
            approved.append(product)

    return approved, rejected


def _edit_product(product: dict[str, Any]) -> dict[str, Any]:
    """Inline edit yield_factor and expiry_days_default for one product."""
    yf_str = questionary.text(
        f"yield_factor (current: {product.get('yield_factor_')}):",
        default=str(product.get("yield_factor_") or ""),
    ).ask()
    try:
        yf = float(yf_str)
        if 0.1 <= yf <= 1.0:
            product["yield_factor_"] = yf
        else:
            console.print("[yellow]Invalid — keeping original[/yellow]")
    except (TypeError, ValueError):
        console.print("[yellow]Invalid — keeping original[/yellow]")

    ed_str = questionary.text(
        f"expiry_days_default (current: {product.get('expiry_days_default_')}):",
        default=str(product.get("expiry_days_default_") or "0"),
    ).ask()
    try:
        ed = int(ed_str)
        if ed >= 0:
            product["expiry_days_default_"] = ed
        else:
            console.print("[yellow]Invalid — keeping original[/yellow]")
    except (TypeError, ValueError):
        console.print("[yellow]Invalid — keeping original[/yellow]")

    return product


# ---------------------------------------------------------------------------
# Manual fill for enrichment-failed products
# ---------------------------------------------------------------------------

def _manual_fill(failed: list[dict[str, Any]]) -> list[dict[str, Any]]:
    approved: list[dict[str, Any]] = []

    for i, product in enumerate(failed, 1):
        console.print(
            f"\n[bold yellow]({i}/{len(failed)})[/bold yellow] "
            f"[cyan]{product['name_hebrew']}[/cyan]  "
            f"[dim](enrichment failed)[/dim]"
        )

        action = questionary.select(
            "Action:",
            choices=[
                "Fill manually and approve",
                "Skip (reject)",
            ],
        ).ask()

        if action == "Fill manually and approve":
            product = _edit_product(product)
            # Fill allergens manually too
            allergen_str = questionary.text(
                "Allergens (comma-separated, or empty):",
                default="",
            ).ask()
            from config import ALLOWED_ALLERGENS
            allergens = [
                a.strip() for a in (allergen_str or "").split(",")
                if a.strip() in ALLOWED_ALLERGENS
            ]
            product["allergens_"] = allergens
            product["allergen_source_"] = "llm"
            product["_enrichment_failed"] = False
            approved.append(product)

    return approved


# ---------------------------------------------------------------------------
# Save
# ---------------------------------------------------------------------------

def _save_approved(approved: list[dict[str, Any]]) -> None:
    """Write approved products to output/seed-products.json."""
    Path(SEED_OUTPUT_FILE).parent.mkdir(parents=True, exist_ok=True)
    with open(SEED_OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(approved, f, ensure_ascii=False, indent=2)
