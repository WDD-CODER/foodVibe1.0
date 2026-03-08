/**
 * Trim demo data to 15 dishes + 3 preps and their dependencies.
 * Run from project root: node scripts/trim-demo-data.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'public', 'assets', 'data');

const KEPT_DISH_IDS = new Set([
  'dish_011', 'dish_012', 'dish_013', 'dish_014', 'dish_015', 'dish_016',
  'dish_017', 'dish_018', 'dish_019', 'dish_020', 'dish_021', 'dish_022',
  'dish_023', 'dish_024', 'dish_025'
]);
const KEPT_PREP_IDS = new Set(['prep_014', 'prep_015', 'prep_016']);

function loadJson(name) {
  const p = path.join(DATA, name);
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}
function saveJson(name, data) {
  const p = path.join(DATA, name);
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
}

function collectRefs(items, type) {
  const set = new Set();
  for (const item of items) {
    const ing = item.ingredients_ || [];
    for (const i of ing) {
      if (i.type === type && i.referenceId) set.add(i.referenceId);
    }
    const base = item.logistics_?.baseline_ || [];
    for (const b of base) {
      if (b.equipment_id_) set.add(b.equipment_id_);
    }
  }
  return set;
}

// Load all
const dishes = loadJson('demo-dishes.json');
const recipes = loadJson('demo-recipes.json');
const products = loadJson('demo-products.json');
const equipment = loadJson('demo-equipment.json');
const suppliers = loadJson('demo-suppliers.json');
const venues = loadJson('demo-venues.json');
const labels = loadJson('demo-labels.json');
const preparations = loadJson('demo-kitchen-preparations.json');

// Filter dishes and preps
const keptDishes = dishes.filter(d => KEPT_DISH_IDS.has(d._id));
const keptRecipes = recipes.filter(r => KEPT_PREP_IDS.has(r._id));

// Rename dish_023
for (const d of keptDishes) {
  if (d._id === 'dish_023') d.name_hebrew = 'פונדו';
}

// Collect product and equipment IDs from kept dishes + preps
const productIds = new Set();
const equipmentIds = new Set();
for (const d of keptDishes) {
  for (const i of d.ingredients_ || []) {
    if (i.type === 'product' && i.referenceId) productIds.add(i.referenceId);
  }
  for (const b of d.logistics_?.baseline_ || []) {
    if (b.equipment_id_) equipmentIds.add(b.equipment_id_);
  }
}
for (const r of keptRecipes) {
  for (const i of r.ingredients_ || []) {
    if (i.type === 'product' && i.referenceId) productIds.add(i.referenceId);
  }
  for (const b of r.logistics_?.baseline_ || []) {
    if (b.equipment_id_) equipmentIds.add(b.equipment_id_);
  }
}

// Collect supplier IDs from kept products
const keptProducts = products.filter(p => productIds.has(p._id));
const supplierIds = new Set();
for (const p of keptProducts) {
  const ids = p.supplierIds_ || [];
  ids.forEach(id => supplierIds.add(id));
}

// Trim
const keptEquip = equipment.filter(e => equipmentIds.has(e._id));
const keptSuppliers = suppliers.filter(s => supplierIds.has(s._id));
const keptVenues = venues.length ? venues.slice(0, 1) : []; // minimal
let finalLabels = labels;
if (Array.isArray(labels) && labels.length) {
  const sipur = labels.find(l => l.key === 'sipur_shel_ochel');
  finalLabels = sipur ? [sipur] : labels.slice(0, 1);
}

// Prep categories: collect from mise_categories_ and prep_items_
const categoryNames = new Set();
const prepNames = new Set();
for (const d of keptDishes) {
  for (const mc of d.mise_categories_ || []) {
    if (mc.category_name) categoryNames.add(mc.category_name);
    for (const it of mc.items || []) if (it.item_name) prepNames.add(it.item_name);
  }
  for (const pi of d.prep_items_ || []) {
    if (pi.category_name) categoryNames.add(pi.category_name);
    if (pi.preparation_name) prepNames.add(pi.preparation_name);
  }
}
const prepDoc = Array.isArray(preparations) ? preparations[0] : preparations;
const allCats = (prepDoc && prepDoc.categories) ? prepDoc.categories : [];
const allPreps = (prepDoc && prepDoc.preparations) ? prepDoc.preparations : [];
const keptCategories = allCats.filter(c => categoryNames.has(c));
const keptPrepsList = allPreps.filter(p => keptCategories.includes(p.category) && prepNames.has(p.name));
const newPrepDoc = { categories: keptCategories.length ? keptCategories : ['sauces', 'רטבים', 'לחם', 'תוספות', 'נקניקיות'], preparations: keptPrepsList };

// Write
saveJson('demo-dishes.json', keptDishes);
saveJson('demo-recipes.json', keptRecipes);
saveJson('demo-products.json', keptProducts);
saveJson('demo-equipment.json', keptEquip);
saveJson('demo-suppliers.json', keptSuppliers);
saveJson('demo-venues.json', keptVenues);
saveJson('demo-labels.json', finalLabels);
saveJson('demo-kitchen-preparations.json', [newPrepDoc]);

console.log('Trimmed: dishes', keptDishes.length, 'recipes', keptRecipes.length, 'products', keptProducts.length, 'equipment', keptEquip.length);
