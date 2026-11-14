'use strict';
/**
 * demo-data.js — Plan 575. The data of one demo catering business, built as plain objects.
 * Pure: no database, no clock (`now` is a parameter). Every id is a fixed `demo_…` string, so a second
 * run of the seed script finds the documents it already wrote.
 */

const { initClosing } = require('../../utils/closing-rules');
const { jerusalemDate } = require('../../middleware/usage');

const DAY = 86400000;
const round2 = n => Math.round(n * 100) / 100;

const SUPPLIERS = [
  { key: 'veg', name: 'ירקות השדה', contact: 'יוסי כהן', days: [0, 2, 4], mov: 300, lead: 1 },
  { key: 'meat', name: 'בשר ועוף הגליל', contact: 'מוטי לוי', days: [1, 3], mov: 800, lead: 2 },
  { key: 'dry', name: 'מחסן יבש', contact: 'רונית אדרי', days: [0, 3], mov: 500, lead: 3 },
  { key: 'oil', name: 'תבלינים ושמנים', contact: 'אבי מזרחי', days: [2], mov: 250, lead: 4 },
];

// key, name, unit, category, [supplier, price], [second supplier, price], purchase option, allergens
const CRATE10 = { unitSymbol: 'ארגז', conversionRate: 10, uom: 'kg' };
const SACK25 = { unitSymbol: 'שק', conversionRate: 25, uom: 'kg' };
const CAN5 = { unitSymbol: 'פח', conversionRate: 5, uom: 'liter' };
const PRODUCTS = [
  ['onion', 'בצל יבש', 'kg', 'vegetables', ['veg', 3.5], ['dry', 4.2], CRATE10],
  ['tomato', 'עגבנייה', 'kg', 'vegetables', ['veg', 6]],
  ['cucumber', 'מלפפון', 'kg', 'vegetables', ['veg', 5.5]],
  ['eggplant', 'חציל', 'kg', 'vegetables', ['veg', 7]],
  ['potato', 'תפוח אדמה', 'kg', 'vegetables', ['veg', 4], null, SACK25],
  ['carrot', 'גזר', 'kg', 'vegetables', ['veg', 4.5]],
  ['zucchini', 'קישוא', 'kg', 'vegetables', ['veg', 6.5]],
  ['pepper', 'פלפל אדום', 'kg', 'vegetables', ['veg', 12]],
  ['garlic', 'שום', 'kg', 'vegetables', ['veg', 28]],
  ['parsley', 'פטרוזיליה', 'kg', 'vegetables', ['veg', 22]],
  ['cilantro', 'כוסברה', 'kg', 'vegetables', ['veg', 24]],
  ['lemon', 'לימון', 'kg', 'vegetables', ['veg', 8], null, CRATE10],
  ['chickenBreast', 'חזה עוף', 'kg', 'meat', ['meat', 36], ['dry', 39]],
  ['chickenThigh', 'שוק עוף', 'kg', 'meat', ['meat', 24]],
  ['beefRib', 'צלעות בקר', 'kg', 'meat', ['meat', 89]],
  ['lamb', 'כתף כבש', 'kg', 'meat', ['meat', 78]],
  ['salmon', 'פילה סלמון', 'kg', 'fish', ['meat', 92], null, null, ['fish']],
  ['seabream', 'דג דניס', 'kg', 'fish', ['meat', 68], null, null, ['fish']],
  ['flour', 'קמח לבן', 'kg', 'dry', ['dry', 4.8], null, SACK25, ['gluten']],
  ['sugar', 'סוכר', 'kg', 'dry', ['dry', 5.2], null, SACK25],
  ['rice', 'אורז בסמטי', 'kg', 'dry', ['dry', 11]],
  ['tahini', 'טחינה גולמית', 'kg', 'dry', ['dry', 24], ['oil', 27], null, ['sesame']],
  ['darkChoc', 'שוקולד מריר', 'kg', 'dry', ['dry', 46], null, null, ['milk_solids']],
  ['chickpea', 'חומוס יבש', 'kg', 'dry', ['dry', 9]],
  ['couscous', 'קוסקוס', 'kg', 'dry', ['dry', 10], null, null, ['gluten']],
  ['walnut', 'אגוזי מלך', 'kg', 'dry', ['dry', 58], null, null, ['nuts']],
  ['oliveOil', 'שמן זית', 'liter', 'dry', ['oil', 38], ['dry', 42], CAN5],
  ['canola', 'שמן קנולה', 'liter', 'dry', ['oil', 9]],
  ['cumin', 'כמון טחון', 'kg', 'spices', ['oil', 55]],
  ['paprika', 'פפריקה מעושנת', 'kg', 'spices', ['oil', 62]],
];

// Preparations: key, name, station, yield (kg), lines [product key, amount], steps
const RECIPES = [
  ['marinade', 'מרינדה לעוף', 'קר', 1, [['oliveOil', 0.3], ['garlic', 0.2], ['lemon', 0.4], ['paprika', 0.05], ['cumin', 0.03], ['parsley', 0.1]],
    ['לטחון את השום והעשבים', 'לערבב עם השמן, המיץ והתבלינים']],
  ['onionSauce', 'רוטב בצל קרמלי', 'חם', 1.5, [['onion', 1], ['carrot', 0.5], ['garlic', 0.1], ['oliveOil', 0.1], ['sugar', 0.1]],
    ['לקלות בצל וגזר בשמן על להבה נמוכה', 'להוסיף סוכר ושום ולבשל 40 דקות', 'לטחון עד לקבלת רוטב חלק']],
  ['tahiniBase', 'בסיס טחינה', 'קר', 2, [['tahini', 1], ['lemon', 0.4], ['garlic', 0.05], ['cumin', 0.02]],
    ['לטחון שום עם לימון', 'להוסיף טחינה ומים קרים ולערבב עד חלקות']],
  ['tomatoSalsa', 'סלסת עגבניות', 'קר', 2.4, [['tomato', 2], ['onion', 0.3], ['cilantro', 0.1], ['oliveOil', 0.1], ['lemon', 0.2]],
    ['לחתוך עגבניות ובצל לקוביות קטנות', 'לערבב עם כוסברה, שמן ולימון']],
  ['roastVeg', 'ירקות צלויים', 'חם', 3, [['eggplant', 1.5], ['zucchini', 1], ['pepper', 0.8], ['oliveOil', 0.15], ['parsley', 0.05]],
    ['לחתוך את הירקות לקוביות', 'לצלות בתנור 220 מעלות 25 דקות', 'לערבב עם פטרוזיליה']],
  ['chocSpread', 'ממרח שוקולד ואגוזים', 'קינוחים', 1.6, [['darkChoc', 1], ['sugar', 0.3], ['walnut', 0.3], ['oliveOil', 0.1]],
    ['להמיס את השוקולד', 'לטחון אגוזים ולערבב עם סוכר ושמן']],
];

// Dishes: key, name, course, station, lines [[kind, key, amount]] (for 10 portions), steps
const DISHES = [
  ['salsaSalad', 'סלט עגבניות וכוסברה', 'salads', 'קר', [['r', 'tomatoSalsa', 2], ['p', 'cucumber', 1], ['p', 'parsley', 0.1], ['p', 'lemon', 0.3]],
    ['לערבב את הסלסה עם מלפפון חתוך', 'לתבל בלימון ופטרוזיליה']],
  ['hummus', 'חומוס וטחינה', 'spreads_dips_salty_creams', 'קר', [['p', 'chickpea', 1.2], ['r', 'tahiniBase', 1], ['p', 'oliveOil', 0.15], ['p', 'paprika', 0.02]],
    ['להשרות ולבשל את החומוס', 'לטחון עם בסיס הטחינה', 'להגיש עם שמן זית ופפריקה']],
  ['eggplantTahini', 'חציל קלוי בטחינה', 'starter_vegetarian', 'חם', [['p', 'eggplant', 3], ['r', 'tahiniBase', 1], ['p', 'parsley', 0.1], ['p', 'garlic', 0.05]],
    ['לצלות חציל שלם על להבה', 'לקלף ולהגיש עם טחינה ופטרוזיליה']],
  ['chickenBreast', 'חזה עוף במרינדה', 'main_dish_chicken', 'חם', [['p', 'chickenBreast', 2.5], ['r', 'marinade', 0.8], ['p', 'potato', 2]],
    ['למרינד את העוף 12 שעות', 'לצלות בתנור 180 מעלות', 'להגיש עם תפוחי אדמה אפויים']],
  ['chickenRice', 'שוק עוף עם אורז', 'main_dish_chicken', 'חם', [['p', 'chickenThigh', 3], ['r', 'marinade', 0.6], ['p', 'rice', 1.2], ['p', 'onion', 0.5], ['p', 'carrot', 0.5]],
    ['לצרוב את השוקיים', 'לבשל אורז עם בצל וגזר', 'להגיש יחד']],
  ['beefRib', 'צלעות בקר ברוטב', 'main_dish_meat', 'חם', [['p', 'beefRib', 3.5], ['r', 'onionSauce', 1.5], ['p', 'potato', 2.5], ['r', 'roastVeg', 1.5]],
    ['לצרוב את הצלעות', 'לבשל ברוטב הבצל 3 שעות', 'להגיש עם ירקות צלויים']],
  ['salmon', 'סלמון צלוי וקוסקוס', 'main_dish_fish', 'חם', [['p', 'salmon', 2.2], ['r', 'roastVeg', 2], ['p', 'lemon', 0.3], ['p', 'oliveOil', 0.1], ['p', 'couscous', 1]],
    ['לתבל את הסלמון בשמן ולימון', 'לצלות 8 דקות', 'להגיש על קוסקוס וירקות']],
  ['chocCake', 'עוגת שוקולד', 'desserts', 'קינוחים', [['r', 'chocSpread', 1.5], ['p', 'flour', 0.5], ['p', 'sugar', 0.6], ['p', 'oliveOil', 0.2]],
    ['לערבב את הממרח עם קמח וסוכר', 'לאפות 25 דקות ב-170 מעלות']],
  ['tahiniCookies', 'עוגיות טחינה', 'cakes_cookies_tarts', 'מאפה', [['p', 'tahini', 1], ['p', 'flour', 1], ['p', 'sugar', 0.8], ['p', 'walnut', 0.3]],
    ['ללוש טחינה, קמח וסוכר', 'ליצור כדורים ולשבץ אגוזים', 'לאפות 15 דקות']],
  ['chocMousse', 'קרם שוקולד ואגוזים', 'sweet_creams_custards_mousse', 'קינוחים', [['p', 'darkChoc', 1], ['p', 'sugar', 0.3], ['p', 'walnut', 0.4], ['p', 'lemon', 0.1]],
    ['להמיס שוקולד עם סוכר', 'לקרר ולהגיש עם אגוזים וגרידת לימון']],
];
const DISH_YIELD = 10;
const APPROVED_DISHES = new Set(['salsaSalad', 'hummus', 'eggplantTahini', 'chickenBreast', 'chickenRice', 'beefRib']);

const VENUES = [
  { id: 'demo_venue_garden', name: 'גן האירועים', env: 'outdoor_field', capacity: 250, address: 'הגליל העליון', contact: 'שרית', phone: '050-0000011' },
  { id: 'demo_venue_kitchen', name: 'מטבח הייצור', env: 'professional_kitchen', capacity: 30, address: 'אזור התעשייה', contact: 'דני', phone: '050-0000012' },
];

const CLIENTS = [
  ['demo_client_1', 'חברת טכנו-סופט', 'business', 'טכנו-סופט'],
  ['demo_client_2', 'מיכל אברהמי', 'private', ''],
  ['demo_client_3', 'אלון ברק', 'private', ''],
  ['demo_client_4', 'סטודיו שמש', 'production_company', 'סטודיו שמש'],
  ['demo_client_5', 'משפחת רוזן', 'private', ''],
  ['demo_client_6', 'רן דגן', 'private', ''],
];

// Events: key, name, eventType, servingType, guests, client index, stage, created days ago, event day offset,
// stage history [[stage, days ago]], margin, extra ₪ per guest, sections [[name, [[dish key, portions per diner]]]]
const EVENTS = [
  ['conf', 'כנס שנתי להייטק', 'כנסים', 'buffet_family', 120, 0, 'inquiry', 5, 45, [['inquiry', 5]], 0.30, 30,
    [['פתיחה', [['salsaSalad', 0.5], ['hummus', 0.5]]], ['עיקריות', [['chickenRice', 1]]], ['קינוחים', [['tahiniCookies', 1]]]]],
  ['birthday', 'מסיבת יום הולדת 40', 'מסיבה', 'cocktail_passed', 60, 1, 'quote_sent', 12, 30, [['inquiry', 12], ['quote_sent', 9]], 0.32, 38,
    [['פתיחה', [['eggplantTahini', 1]]], ['עיקריות', [['chickenBreast', 1]]], ['קינוחים', [['chocMousse', 1]]]]],
  ['corporate', 'ארוחת צוות עסקית', 'עסקי', 'plated_course', 40, 3, 'deposit_paid', 25, 5, [['inquiry', 25], ['quote_sent', 22], ['deposit_paid', 10]], 0.28, 45,
    [['פתיחה', [['salsaSalad', 1]]], ['עיקריות', [['salmon', 1]]]]],
  ['wedding', 'חתונה בגן האירועים', 'חתונה', 'plated_course', 220, 2, 'ordering', 38, 11, [['inquiry', 38], ['quote_sent', 34], ['deposit_paid', 20], ['ordering', 3]], 0.30, 42,
    [['פתיחה', [['hummus', 0.5], ['eggplantTahini', 0.5]]], ['עיקריות', [['beefRib', 1]]], ['קינוחים', [['chocCake', 1]]]]],
  ['barmitzvah', 'בר מצווה במשפחה', 'פרטי', 'buffet_family', 150, 4, 'finished', 80, -62,
    [['inquiry', 80], ['quote_sent', 76], ['deposit_paid', 70], ['ordering', 66], ['execution', 62], ['finished', 61]], 0.31, 34,
    [['פתיחה', [['salsaSalad', 0.5], ['hummus', 0.5]]], ['עיקריות', [['chickenRice', 1]]], ['קינוחים', [['tahiniCookies', 1]]]]],
  ['launch', 'השקת מוצר', 'עסקי', 'cocktail_passed', 90, 0, 'finished', 50, -20,
    [['inquiry', 50], ['quote_sent', 46], ['deposit_paid', 40], ['ordering', 24], ['execution', 20], ['finished', 19]], 0.29, 40,
    [['פתיחה', [['eggplantTahini', 1]]], ['עיקריות', [['salmon', 1]]], ['קינוחים', [['chocMousse', 1]]]]],
  ['friends', 'ערב חברים בבית', 'פרטי', 'chef_plated_front', 45, 5, 'not_closed', 33, 20, [['inquiry', 33], ['quote_sent', 28], ['not_closed', 15]], 0.30, 36,
    [['פתיחה', [['salsaSalad', 1]]], ['עיקריות', [['beefRib', 1]]]]],
];

/**
 * The money of one event, following `event-pricing.ts` (`computeEventPricing` + `toPricingCache`).
 * Rounded to 2 decimals here because the demo stores whole agorot.
 */
function demoPricing({ foodCost, pricePerGuest, guestCount, extraCost, now }) {
  const food = round2(foodCost);
  const revenue = pricePerGuest * guestCount;
  const profit = revenue - food - extraCost;
  return {
    foodCost: food,
    revenue: round2(revenue),
    profit: round2(profit),
    profitPct: revenue > 0 ? round2((profit / revenue) * 100) : null,
    partial: false,
    computedAt: now,
  };
}

function buildDemoData({ now, ownerId, businessId, ownerName = 'demo_chef' }) {
  const base = { schemaVersion: 2, businessId, createdBy: ownerId };
  const created = now - 88 * DAY;
  const stamp = { ...base, createdAt: created, updatedAt: now - 7 * DAY };
  const ago = days => now - days * DAY;

  const suppliers = SUPPLIERS.map((s, i) => ({
    _id: `demo_sup_${s.key}`, ...stamp, nameHebrew: s.name, contactPerson: s.contact, phone: `050-000000${i + 1}`,
    deliveryDays: s.days, minOrderMov: s.mov, leadTimeDays: s.lead,
  }));

  const productInfo = new Map();
  const products = PRODUCTS.map(([key, name, unit, category, first, second, option, allergens]) => {
    const sources = [first, second].filter(Boolean).map(([sup, price]) => ({ supplierId: `demo_sup_${sup}`, price, addedBy: ownerId, addedAt: created }));
    const cheapest = [...sources].sort((a, b) => a.price - b.price)[0];
    const id = `demo_prod_${key}`;
    productInfo.set(key, { id, name, unit, price: cheapest.price, supplierId: cheapest.supplierId });
    return {
      _id: id, ...stamp, nameHebrew: name, baseUnit: unit, sources, purchaseOptions: option ? [option] : [], categories: [category],
      yieldFactor: 1, allergens: allergens ?? [], minStockLevel: category === 'dry' ? 10 : 5, expiryDaysDefault: category === 'dry' || category === 'spices' ? 180 : 5,
    };
  });

  // Cost of every recipe and dish, plus the spend per supplier.
  const costInfo = new Map();
  const toLine = (owner, n, [kind, key, amount]) => {
    const isRecipe = kind === 'r';
    return {
      _id: `${owner}_i${n + 1}`, referenceId: isRecipe ? `demo_rec_${key}` : productInfo.get(key).id, type: isRecipe ? 'recipe' : 'product', amount,
      unit: isRecipe ? 'kg' : productInfo.get(key).unit, nameSnapshot: isRecipe ? costInfo.get(key).name : productInfo.get(key).name,
    };
  };
  /** Adds `factor` × the lines to the per-supplier map; returns the cost. */
  const spend = (lines, factor, perSupplier) => {
    let total = 0;
    for (const [kind, key, amount] of lines) {
      if (kind === 'r') {
        const r = costInfo.get(key);
        total += spend(r.lines, (amount / r.yield) * factor, perSupplier);
      } else {
        const p = productInfo.get(key);
        const cost = amount * factor * p.price;
        perSupplier.set(p.supplierId, (perSupplier.get(p.supplierId) ?? 0) + cost);
        total += cost;
      }
    }
    return total;
  };
  const stepsOf = steps => steps.map((instruction, n) => ({ order: n + 1, instruction, laborTimeMinutes: 10 + n * 5 }));

  const recipes = RECIPES.map(([key, name, station, yieldKg, rawLines, steps]) => {
    const lines = rawLines.map(([k, a]) => ['p', k, a]);
    costInfo.set(key, { name, lines, yield: yieldKg });
    return {
      _id: `demo_rec_${key}`, ...stamp, nameHebrew: name,
      ingredients: lines.map((l, n) => ({ ...toLine(`demo_rec_${key}`, n, l), calculatedCost: round2(spend([l], 1, new Map())) })),
      steps: stepsOf(steps), yieldAmount: yieldKg, yieldUnit: 'kg', defaultStation: station, isApproved: true, course: 'general_preps',
    };
  });

  const dishes = DISHES.map(([key, name, course, station, lines, steps]) => {
    costInfo.set(key, { name, lines, yield: DISH_YIELD });
    return {
      _id: `demo_dish_${key}`, ...stamp, nameHebrew: name,
      ingredients: lines.map((l, n) => ({ ...toLine(`demo_dish_${key}`, n, l), calculatedCost: round2(spend([l], 1, new Map())) })),
      steps: stepsOf(steps), yieldAmount: DISH_YIELD, yieldUnit: 'portion', defaultStation: station, isApproved: APPROVED_DISHES.has(key), course,
    };
  });

  const venues = VENUES.map(v => ({
    _id: v.id, ...stamp, nameHebrew: v.name, environmentType: v.env, availableInfrastructure: [], capacity: v.capacity,
    address: v.address, contactName: v.contact, contactPhone: v.phone, active: true,
  }));

  const clients = CLIENTS.map(([id, name, clientType, companyName], i) => {
    const phone = `052-000000${i + 1}`;
    const digits = phone.replace(/\D/g, '');
    return {
      _id: id, ...stamp, name, phone, phoneNormalized: digits, phoneKey: digits.slice(-9), liveKey: digits.slice(-9),
      clientType, ...(companyName ? { companyName } : {}), source: 'manual', kinds: ['event_client'], lifecycle: 'active',
    };
  });

  const menuEvents = EVENTS.map(([key, name, eventType, servingType, guests, clientIdx, stage, createdAgo, dateOffset, history, margin, extraPerGuest, sectionSpecs]) => {
    const perSupplier = new Map();
    let foodCost = 0;
    const sections = sectionSpecs.map(([sectionName, items], s) => ({
      _id: `demo_evt_${key}_s${s + 1}`, name: sectionName, sortOrder: s,
      items: items.map(([dishKey, perDiner]) => {
        const portions = guests * perDiner;
        foodCost += spend(costInfo.get(dishKey).lines, portions / DISH_YIELD, perSupplier);
        return { recipeId: `demo_dish_${dishKey}`, recipeType: 'dish', derivedPortions: portions, portionsPerDiner: perDiner };
      }),
    }));
    const extraCost = guests * extraPerGuest;
    const pricePerGuest = Math.ceil((foodCost / guests + extraPerGuest) / (1 - margin) / 5) * 5;
    const pricing = demoPricing({ foodCost, pricePerGuest, guestCount: guests, extraCost, now });
    const client = clients[clientIdx];
    const stageHistory = history.map(([st, d]) => ({
      stage: st, at: ago(d), by: ownerId, byName: ownerName,
      ...(st === 'not_closed' ? { reason: 'price' } : {}),
    }));
    const at = stage2 => ago(history.find(h => h[0] === stage2)[1]);
    const event = {
      _id: `demo_evt_${key}`, ...base, createdAt: ago(createdAgo), updatedAt: ago(history[history.length - 1][1]),
      name, eventType, servingType, eventDate: jerusalemDate(now + dateOffset * DAY), guestCount: guests, sections,
      pricePerGuest, extraCosts: { amount: extraCost, note: 'צוות והובלה' }, pricing,
      clientId: client._id, clientName: client.name, clientPhone: client.phone, stage, stageHistory,
    };
    if (stage === 'deposit_paid' || stage === 'ordering' || stage === 'finished') {
      event.closedAt = at('deposit_paid');
      event.deposit = { amount: round2(pricing.revenue * 0.3), date: jerusalemDate(event.closedAt) };
    }
    if (stage === 'not_closed') {
      event.notClosedAt = at('not_closed');
      event.notClosedReason = 'price';
    }
    if (stage === 'ordering' || stage === 'finished') {
      const snapshot = {
        at: at('ordering'),
        suppliers: [...perSupplier].map(([supplierId, cost]) => ({
          supplierId, name: suppliers.find(s => s._id === supplierId).nameHebrew, plannedCost: round2(cost),
        })),
        extraCosts: extraCost, plannedRevenue: pricing.revenue, plannedProfit: pricing.profit, plannedProfitPct: pricing.profitPct,
      };
      if (stage === 'finished') {
        snapshot.frozenAt = at('execution');
        const factor = key === 'barmitzvah' ? 0.96 : 1.09; // 4% under the plan, then 9% over
        const closing = initClosing(snapshot);
        closing.suppliers = closing.suppliers.map(row => ({ ...row, actualPaid: round2(row.planned * factor), arrived: true, hasInvoice: true, photos: [] }));
        closing.actualExtraCosts = extraCost;
        closing.actualRevenue = pricing.revenue;
        closing.finishedAt = at('finished');
        closing.finishedBy = ownerId;
        event.closing = closing;
      }
      event.planSnapshot = snapshot;
    }
    return event;
  });

  const usageDays = [];
  const todayMs = Date.parse(`${jerusalemDate(now)}T00:00:00Z`); // calendar days: step back on the date, not on the clock
  for (let d = 0; d < 30; d++) {
    if (d % 3 === 2 && d < 27) continue;
    const date = new Date(todayMs - d * DAY).toISOString().slice(0, 10);
    usageDays.push({ _id: `${ownerId}:${date}`, userId: ownerId, businessId, date, firstAt: now - d * DAY - 3600000, lastAt: now - d * DAY, writeCount: 3 + (d % 5) });
  }

  const baseline = { inquiriesPerMonth: 5, eventsClosedPerMonth: 2, avgRevenuePerEvent: 28000, estProfitPct: 22 };
  return { suppliers, products, recipes, dishes, venues, clients, menuEvents, usageDays, baseline };
}

module.exports = { buildDemoData, demoPricing };
