"""
filter.py — Step 2.5 of the catalog seeder pipeline.

Strict positive-match ingredient filter.

Every product must:
  1. Pass the drop-patterns check (snacks, drinks, candy, cleaning, personal care)
  2. Match at least one known cooking ingredient keyword

Products that only match by brand name, flavor tag, or packaging are dropped.
"""

import logging
from typing import Any

from config import NON_FOOD_KEYWORDS

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# DROP first — anything matching these is discarded regardless of category
# ---------------------------------------------------------------------------

_DROP_PATTERNS: tuple[str, ...] = (
    # Non-food already in config.NON_FOOD_KEYWORDS, but repeat the worst offenders
    # Cleaning / household
    "אקונומיקה", "אבקת כביסה", "מרכך כביסה", "נוזל כלים", "סנו ", "פרסיל",
    "אריאל", "וניש", "פיניש", "מדיח", "חומר ניקוי",
    # Personal care
    "פנטן", "כיף תחליב", "שמפו", "מרכך שיער", "קרם לחות", "לוסיון",
    "בושם", "דאודורנט", "ג'ל מקלחת",
    # Alcohol
    "וודקה", "ויסקי", "בירה", "יין ", "ארק ", "הארק", "ליקר", "בורבון",
    # Drinks (non-ingredient)
    "קוקה קולה", "פפסי", "ספרייט", "פנטה", "רד בול", "מונסטר",
    "נביעות", "ספרינג ", "תפוזינה", "פריגת", "ויטמינצ'יק", "ויטמינציק",
    "נורדיק מוגז", "שוופס", "פיוז טי", "פיוז תה", "ליפטון",
    "אייס קפה", "משקה קפה קר", "משקה מוקה",
    "בריזר",  # alcoholic premix
    # Coffee products (not ingredients)
    "קפה נמס", "נס קפה", "קפסולות קפה", "קפסולות נאפולי", "פולי אספרסו",
    "קפה טייסטרס", "קפה פלטינום", "רד מאג", "נסקפה",
    # Candy / sweets
    "סוכריות", "מנטוס", "סקיטלס", "וורטר", "ללס", "מאסט מנטה",
    "המתקות", "גומי ",
    # Snack bars / chocolate bars
    "קינדר", "מרס ", "טופיפי", "פסק זמן", "כיף כף", "פרה קראנץ",
    "פרה שוקולד", "שוקולד פרה", "שוקולד מילקה", "מילקה שוקולד",
    "שוקולד ריטר", "שוקולד ספלנדיד", "שוקולד חלב עלית",
    "קרמוגית", "קרמיסימו",
    # Snacks (crisps, puffs)
    "ביסלי", "במבה", "פרינגלס", "דוריטוס", "לייז", "תפוצ'יפס", "תפוציפס",
    "פצפוצ", "נשנושים", "חרוזית", "ציטוס פופס", "פריכיות", "פריכונים",
    "טריקס ", "שוגי ",
    # Biscuits / cookies / wafers (not baking ingredients)
    "עוגיות", "עוגת הבית", "בפלות", "ערגליות", "פתי בר", "קרם קרקר",
    "קרקר זהב", "לחמית שיפון", "כריות בטעם", "פינוקיות", "מרבה עוגיות",
    "קואטרה", "שקדי מרק",
    # Desserts / puddings
    "מעדן ", "פודינג", "מלבי", "סימפוניה", "דניאלה מעדן",
    "ממולדה לבן", "דנונה בר",
    # Chocolate milk drinks
    "שוקו ", "שוקולית", "אבקת שוקו", "משקה חלב", "דני מהדרין שוקו",
    # Flavored milk drinks
    "משקה חלב בטעם", "חלב בטעם",
    # Soy/oat drinks (not ingredient milk)
    "משקה סויה", "אלפרו", "משקה שיבולת שועל",
    # Probiotic drinks
    "אקטימל", "אקטיביה משקה",
    # Soup mixes / instant meals (not raw ingredients)
    "נמס בכוס", "מנה חמה", "אסם מרק זך",
    # Spreads that are not cooking ingredients
    "נוטלה", "ממרח עוגיות לוטוס", "ממרח לוטוס",
    # Ready-to-eat hummus (not raw chickpeas)
    "חומוס יכין", "חומוס אחלה", "חומוס מסעדות", "חומוס צבר",
    "חומוסטחינה", "חומוס עם טחינה", "חומוס לניגוב", "חומוס ישראלי",
    "חומוס אבי", "חומוס סוגת", "חומוס חריף אחלה",
    # Instant noodles / ready pasta
    "נודלס",
    # Fruit jams / syrup (borderline — keep out for now)
    "קונפיטורת", "סירופ דיאט",
    # Baby food
    "דייסת", "מטרנה",
    # Margarine brands (הרכב שומן לא-מוגדר)
    "בלו בנד", "לורפק", "מזולה",
    # Dishwasher salt
    "מלח למדיח",
    # Cereals / granola (snack-adjacent)
    "גרנולה", "דגני קראנץ", "פיטנס קלאסי", "פיטנס גרנולה",
    # Laundry gel
    "גל לבן לכביסה",
)


# ---------------------------------------------------------------------------
# INGREDIENT KEYWORDS — product name must contain at least one
# Each tuple is checked with substring matching against name_hebrew
# ---------------------------------------------------------------------------

_INGREDIENT_KEYWORDS: tuple[str, ...] = (
    # ── Meat ──────────────────────────────────────────────────────────────
    "חזה עוף", "ירך עוף", "כנפיים", "פרגית", "שוק עוף",
    "עוף טחון", "עוף קפוא", "עוף שלם", "פילה עוף",
    "שניצל עוף", "שניצלונים", "אצבעות שניצל",
    "בשר טחון", "סטייק", "אנטריקוט", "פילה בקר",
    "צלי בקר", "כבש", "טלה", "עגל",
    "נקניקיות",
    # ── Fish ──────────────────────────────────────────────────────────────
    "סלמון", "פילה סלמון",
    "טונה", "דג טונה",
    "פילה דג", "פורל", "הליבוט", "בורי", "מוסר ים",
    "דניס", "אמנון",
    # ── Eggs ──────────────────────────────────────────────────────────────
    "ביצים", "ביצי",
    # ── Dairy ─────────────────────────────────────────────────────────────
    "חלב 1%", "חלב 2%", "חלב 3%", "חלב 4%",
    "חלב מועשר", "חלב עמיד", "חלב טבעי", "חלב עיזים",
    "חלב נטול לקטוז", "חלב מרוכז",
    "גבינה לבנה", "גבינה צהובה", "גבינה קשה", "גבינה מלוחה",
    "גבינת קוטג", "קוטג'",
    "גבינת שמנת", "גבינת קרם",
    "גבינת לאבנה", "לאבנה",
    "גבינת חלומי", "חלומי",
    "ריקוטה", "מוצרלה", "בולגרית", "מסקרפונה",
    "גבינה צהובה עמק", "גבינה צהובה נעם",
    "גבינת נפוליאון",
    "יוגורט", "אשל",
    "שמנת לבישול", "שמנת חמוצה", "שמנת מתוקה", "שמנת להקצפה",
    "חמאה",
    # ── Vegetables / Produce ──────────────────────────────────────────────
    "עגבניות", "רוטב עגבניות", "רסק עגבניות", "ממרח עגבניות",
    "פלפל אדום", "פלפל ירוק", "פלפל צהוב", "פלפל חריף",
    "מלפפון", "כרוב כבוש",
    "אפונה", "אפונת גינה",
    "גזר", "בצל",
    "שום כתוש", "שום קלוף",
    "תרד", "ברוקולי", "כרובית",
    "פטריות",
    "חציל", "קישוא", "דלעת", "בטטה",
    # ── Grains & Staples ──────────────────────────────────────────────────
    "קמח", "קמח לבן", "קמח מלא",
    "אורז בסמטי", "אורז יסמין", "אורז עגול", "אורז מלא",
    "פסטה", "ספגטי", "מקרוני", "פנה", "פרפרים", "תלתלים",
    "קוסקוס", "פתיתים",
    "עדשים", "עדשים אדומות", "עדשים ירוקות",
    "גרגרי חומוס", "גרגירי חומוס",
    "שעועית לבנה", "שעועית שחורה", "שעועית אדומה",
    "פול",
    "שיבולת שועל",
    "קינואה", "כוסמת", "בורגול", "סולת",
    # ── Pantry & Condiments ───────────────────────────────────────────────
    "שמן זית", "שמן חמניות", "שמן קנולה",
    "חומץ",
    "טחינה",
    "דבש",
    "מיונז",
    "קטשופ",
    "חרדל",
    "מלח הארץ", "מלח הימלאיה", "מלח ים", "מלח שולחן",
    "מלח למליחות",
    "סוכר", "סוכר דמררה",
    "שמרים",
    "קקאו",
    "אבקת אפייה",
    "ממרח אריסה", "אריסה",
    "ממרח פסטו", "פסטו",
    "לאבנה בשמן זית",
    # ── Spices ────────────────────────────────────────────────────────────
    "פלפל שחור", "פלפל לבן",
    "כמון", "כורכום", "פפריקה", "זעתר", "קינמון",
    "כוסברה", "בזיליקום", "אורגנו", "רוזמרין",
    "ג'ינג'ר", "סומק", "הל", "ציפורן", "קארי",
    "עלי דפנה", "נענע יבשה",
    "תיבול",
)


def apply_food_filter(normalized: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Filter normalized products to kitchen-relevant ingredients only.
    Returns the filtered list. Logs drop count and category breakdown.
    """
    before = len(normalized)
    results = []

    from collections import Counter
    category_counts: Counter = Counter()

    for p in normalized:
        name = p.get("name_hebrew", "")

        # Step 1: blocklist (config + local drop patterns)
        if _is_dropped(name):
            continue

        # Step 2: must match a known cooking ingredient
        if not _is_ingredient(name):
            continue

        results.append(p)
        category_counts[p.get("_category_group", "unknown")] += 1

    dropped = before - len(results)
    logger.info(
        f"[filter] {len(results)}/{before} products passed ingredient filter "
        f"({dropped} dropped)"
    )
    for cat, count in sorted(category_counts.items(), key=lambda x: -x[1]):
        logger.info(f"[filter]   {cat}: {count}")

    return results


def _is_dropped(name: str) -> bool:
    """True if the name matches any blocklist pattern."""
    if any(kw in name for kw in NON_FOOD_KEYWORDS):
        return True
    return any(pat in name for pat in _DROP_PATTERNS)


def _is_ingredient(name: str) -> bool:
    """True if the name contains at least one known cooking ingredient keyword."""
    return any(kw in name for kw in _INGREDIENT_KEYWORDS)
