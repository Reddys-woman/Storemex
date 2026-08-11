/* ============================================================
   storemex dashboard — script.js
   Handles: horizontal scroll rows, sidebar page switching,
   and the upload dropzone (UI only, no backend yet).
   ============================================================ */

/* ============================================================
   PANTRY PAGE — category data + rendering
   A category section is only shown when it has at least one
   item in stock. Icons are shared across the whole app so the
   same category always looks the same everywhere.
   ============================================================ */

// Shared illustration markup, keyed by icon type.
const PANTRY_ICONS = {
  leaf: `<svg width="64" height="64" viewBox="0 0 64 64" fill="none"><path d="M50 12C30 8 12 20 12 40c0 6 4 10 10 10 20 0 32-16 30-36-.4-1-1.4-2-2-2z" fill="#9BC97E" stroke="#5C7A45" stroke-width="1.8" stroke-linejoin="round"/><path d="M16 46C26 34 36 24 48 14" stroke="#5C7A45" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  apple: `<svg width="60" height="60" viewBox="0 0 60 60" fill="none"><circle cx="30" cy="36" r="18" fill="#E8694E" stroke="#C24A32" stroke-width="1.8"/><path d="M30 18c0-4 1-6 3-8" stroke="#8C6A34" stroke-width="2" stroke-linecap="round"/><path d="M33 12c3-2 6-2 8 0-2 3-6 3-8 0z" fill="#9BC97E" stroke="#5C7A45" stroke-width="1.4"/></svg>`,
  bottle: `<svg width="46" height="60" viewBox="0 0 46 60" fill="none"><path d="M17 2h12l2 10-3 4v34a4 4 0 0 1-4 4H22a4 4 0 0 1-4-4V16l-3-4 2-10z" fill="#EAF3FA" stroke="#4E7FA6" stroke-width="1.8"/><rect x="16" y="26" width="14" height="12" fill="#4E7FA6" opacity="0.85"/><rect x="17" y="6" width="12" height="5" rx="1" fill="#4E7FA6"/></svg>`,
  rice: `<svg width="70" height="52" viewBox="0 0 70 52" fill="none"><path d="M10 26a25 12 0 0 0 50 0z" fill="#F3E7CE" stroke="#D98A3D" stroke-width="1.6"/><ellipse cx="35" cy="26" rx="25" ry="10" fill="#FBF3DD" stroke="#D98A3D" stroke-width="1.6"/><ellipse cx="27" cy="24" rx="2.6" ry="1.4" fill="#D98A3D"/><ellipse cx="35" cy="21" rx="2.6" ry="1.4" fill="#D98A3D"/><ellipse cx="43" cy="25" rx="2.6" ry="1.4" fill="#D98A3D"/><ellipse cx="38" cy="28" rx="2.6" ry="1.4" fill="#D98A3D"/></svg>`,
  egg: `<svg width="70" height="52" viewBox="0 0 70 52" fill="none"><ellipse cx="16" cy="30" rx="12" ry="15" fill="#FBF3DD" stroke="#D9A63D" stroke-width="1.6"/><ellipse cx="35" cy="22" rx="12" ry="15" fill="#FBF3DD" stroke="#D9A63D" stroke-width="1.6"/><ellipse cx="54" cy="30" rx="12" ry="15" fill="#FBF3DD" stroke="#D9A63D" stroke-width="1.6"/></svg>`,
  fish: `<svg width="64" height="58" viewBox="0 0 64 58" fill="none"><path d="M14 10c14-6 30-2 38 10 6 10 4 22-6 28-12 7-28 4-36-8-3-5-2-10 2-12-6-2-8-8-4-14-2-2-1-3 6-4z" fill="#E7C7B8" stroke="#4E9A8A" stroke-width="1.8" stroke-linejoin="round"/><circle cx="24" cy="18" r="3.4" fill="#fff" stroke="#4E9A8A" stroke-width="1.4"/><path d="M16 30c10 4 24 4 34-2M18 38c10 4 22 3 30-4" stroke="#4E9A8A" stroke-width="1.4" stroke-linecap="round" opacity="0.55"/></svg>`,
  snack: `<svg width="52" height="60" viewBox="0 0 52 60" fill="none"><path d="M10 10h32l2 6v34a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4V16l2-6z" fill="#F6DDA0" stroke="#C98A2E" stroke-width="1.8"/><path d="M10 10c2-5 6-8 16-8s14 3 16 8" fill="none" stroke="#C98A2E" stroke-width="1.8"/><path d="M16 28h20M16 36h20M16 44h14" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/></svg>`,
  bread: `<svg width="70" height="50" viewBox="0 0 70 50" fill="none"><path d="M8 30c0-14 12-22 27-22s27 8 27 22c0 8-6 14-14 14H22c-8 0-14-6-14-14z" fill="#F3D9A6" stroke="#B08655" stroke-width="1.8"/><path d="M20 22c4-6 10-9 15-9s11 3 15 9" stroke="#B08655" stroke-width="1.4" stroke-linecap="round" opacity="0.6"/></svg>`,
  jar: `<svg width="50" height="60" viewBox="0 0 50 60" fill="none"><rect x="10" y="16" width="30" height="38" rx="6" fill="#EDE7DD" stroke="#8C7C63" stroke-width="1.8"/><rect x="16" y="6" width="18" height="12" rx="3" fill="#C9A15C" stroke="#8C7C63" stroke-width="1.6"/><path d="M14 30h22M14 38h22M14 46h16" stroke="#8C7C63" stroke-width="1.4" opacity="0.5"/></svg>`
};

// Background color (css var name, without --) per icon type — kept
// consistent everywhere an icon type is used across the app.
const PANTRY_ICON_BG = {
  leaf: 'green-soft', apple: 'red-soft', bottle: 'blue-soft',
  rice: 'orange-soft', egg: 'yellow-soft', fish: 'teal-soft',
  snack: 'amber-soft', bread: 'tan-soft', jar: 'stone-soft'
};

// The only categories the pantry recognizes, in display order.
// A category is skipped entirely when nothing in PANTRY_ITEMS
// belongs to it — nothing is ever shown "empty".
// Categories whose items are restock-focused, long-lasting /
// non-perishable staples. Items in these categories never get an
// expiry countdown badge — see PANTRY_NO_EXPIRY_CATEGORIES below.
const PANTRY_CATEGORIES = [
  { key: 'vegetables', label: 'Vegetables',          icon: 'leaf'  },
  { key: 'fruits',      label: 'Fruits',              icon: 'apple' },
  { key: 'grains',      label: 'Grains & Rice',       icon: 'rice'  },
  { key: 'pulses',      label: 'Pulses & Legumes',    icon: 'rice'  },
  { key: 'dairy',       label: 'Dairy & Eggs',        icon: 'egg'   },
  { key: 'nonveg',      label: 'Non-Veg',             icon: 'fish'  },
  { key: 'bakery',      label: 'Bakery',               icon: 'bread' },
  { key: 'snacks',      label: 'Snacks',               icon: 'snack' },
  { key: 'beverages',   label: 'Beverages',            icon: 'bottle'},
  { key: 'others',      label: 'Others',               icon: 'jar'   }
];

// Categories that are restock-focused / non-perishable (grains, pulses,
// and similar dry goods) — items here are shown without any expiry
// date or "days left" countdown, since they genuinely don't spoil on
// a short timeline.
const PANTRY_NO_EXPIRY_CATEGORIES = ['grains', 'pulses'];

// Sample stock data — swap this out for real pantry data later.
// Every item needs: name, category (must match a key above), icon
// (must match a key in PANTRY_ICONS), size (the descriptive package
// text shown on the left of the meta line, e.g. "500 g"), unit (the
// unit token used for merge/low-stock math — kg/g/L/pcs/pack/units),
// and qty (a NUMBER, decimals allowed — e.g. 1.5 for 1.5 kg tomatoes).
// "days" is only used for perishables — grains/pulses categories are
// exempt from expiry tracking regardless (see PANTRY_NO_EXPIRY_CATEGORIES).
const PANTRY_ITEMS = [
  { name: 'Tomatoes',      category: 'vegetables', icon: 'leaf',   size: '500 g',     unit: 'g',    qty: 4,  days: 1  },
  { name: 'Onions',        category: 'vegetables', icon: 'leaf',   size: '1 kg',      unit: 'kg',   qty: 2,  days: 40 },
  { name: 'Potatoes',      category: 'vegetables', icon: 'leaf',   size: '2 kg',      unit: 'kg',   qty: 1,  days: 20 },
  { name: 'Spinach',       category: 'vegetables', icon: 'leaf',   size: '250 g',     unit: 'g',    qty: 1,  days: 2  },

  { name: 'Apples',        category: 'fruits',     icon: 'apple',  size: '6 pcs',     unit: 'pcs',  qty: 6,  days: 10 },
  { name: 'Bananas',       category: 'fruits',     icon: 'apple',  size: '1 dozen',   unit: 'pcs',  qty: 12, days: 4 },

  { name: 'Basmati Rice',  category: 'grains',     icon: 'rice',   size: '5 kg',      unit: 'kg',   qty: 1  },
  { name: 'Wheat Flour',   category: 'grains',     icon: 'rice',   size: '5 kg',      unit: 'kg',   qty: 1  },
  { name: 'Oats',          category: 'grains',     icon: 'rice',   size: '500 g',     unit: 'g',    qty: 1  },

  { name: 'Toor Dal',      category: 'pulses',     icon: 'rice',   size: '1 kg',      unit: 'kg',   qty: 1  },
  { name: 'Chickpeas',     category: 'pulses',     icon: 'rice',   size: '500 g',     unit: 'g',    qty: 1  },
  { name: 'Moong Dal',     category: 'pulses',     icon: 'rice',   size: '1 kg',      unit: 'kg',   qty: 1  },

  { name: 'Amul Milk',     category: 'dairy',      icon: 'bottle', size: '1 L',       unit: 'L',    qty: 1,  days: 2  },
  { name: 'Eggs',          category: 'dairy',      icon: 'egg',    size: '8 pcs',     unit: 'pcs',  qty: 6,  days: 5  },
  { name: 'Curd',          category: 'dairy',      icon: 'bottle', size: '400 g',     unit: 'g',    qty: 1,  days: 3  },

  { name: 'Chicken',       category: 'nonveg',     icon: 'fish',   size: '500 g',     unit: 'g',    qty: 1,  days: 2  },
  { name: 'Fish Fillet',   category: 'nonveg',     icon: 'fish',   size: '400 g',     unit: 'g',    qty: 1,  days: 1  },

  { name: 'Bread',         category: 'bakery',     icon: 'bread',  size: '1 loaf',    unit: 'pack', qty: 1,  days: 4  },
  { name: 'Burger Buns',   category: 'bakery',     icon: 'bread',  size: '4 pcs',     unit: 'pcs',  qty: 4,  days: 3  },

  { name: 'Maggi',         category: 'snacks',     icon: 'snack',  size: '4 packets', unit: 'pack', qty: 3,  days: 15 },
  { name: 'Potato Chips',  category: 'snacks',     icon: 'snack',  size: '2 packets', unit: 'pack', qty: 2,  days: 25 },
  { name: 'Namkeen',       category: 'snacks',     icon: 'snack',  size: '1 packet',  unit: 'pack', qty: 0,  days: 20 },

  { name: 'Cold Drink',    category: 'beverages',  icon: 'bottle', size: '2 L',       unit: 'L',    qty: 1,  days: 60 },
  { name: 'Orange Juice',  category: 'beverages',  icon: 'bottle', size: '1 L',       unit: 'L',    qty: 1,  days: 7  }
];

/* ============================================================
   NAME / UNIT HELPERS
   These make "Onion" == "Onions" == "onion" (merge into one
   entry) while keeping "Onion" and "Red Onion" — or "Rice" and
   "Basmati Rice" — as genuinely separate items.
   ============================================================ */

// Rounds to 2 decimal places and drops trailing zeros so "1.50"
// displays as "1.5" and "2.00" displays as "2".
function formatQty(n) {
  return (Math.round(n * 100) / 100).toString();
}

// Strips simple plural endings so "Onions"/"Onion"/"onion" all
// normalize to the same key, but multi-word names like "Red Onion"
// or "Basmati Rice" stay distinct from "Onion"/"Rice".
function normalizeItemName(name) {
  let n = name.trim().toLowerCase().replace(/\s+/g, ' ');
  if (n.endsWith('ies')) n = n.slice(0, -3) + 'y';           // batteries -> battery
  else if (n.endsWith('oes')) n = n.slice(0, -2);            // tomatoes -> tomato, potatoes -> potato
  else if (/(s|x|ch|sh)es$/.test(n)) n = n.slice(0, -2);     // boxes -> box, dishes -> dish
  else if (n.endsWith('s') && !n.endsWith('ss')) n = n.slice(0, -1); // onions -> onion, eggs -> egg
  return n;
}

const WEIGHT_UNITS = ['kg', 'g'];

function unitsCompatible(a, b) {
  return a === b || (WEIGHT_UNITS.includes(a) && WEIGHT_UNITS.includes(b));
}

// Converts a quantity from one unit to another — only weight units
// (kg <-> g) actually convert; anything else with matching units
// passes through unchanged.
function convertQty(qty, fromUnit, toUnit) {
  if (fromUnit === toUnit) return qty;
  if (fromUnit === 'kg' && toUnit === 'g') return qty * 1000;
  if (fromUnit === 'g' && toUnit === 'kg') return qty / 1000;
  return qty;
}

// Builds the "size · Qty: N" text shown on every pantry card,
// always reading the live qty/unit off the item (never stale).
function formatMeta(item) {
  return `${item.size} · Qty: ${formatQty(item.qty)}`;
}

/* ============================================================
   DERIVED DATA HELPERS
   Everything below reads PANTRY_ITEMS directly — nothing here is
   a separate hardcoded number, so stats/alerts/badges always
   match whatever is actually in PANTRY_ITEMS.
   ============================================================ */

const EXPIRING_SOON_WITHIN_DAYS = 3;
const LOW_STOCK_QTY_THRESHOLD = 2; // qty at or below this counts as "low stock"

function isNoExpiryItem(item) {
  return PANTRY_NO_EXPIRY_CATEGORIES.includes(item.category) || item.days == null;
}

function getExpiringSoonItems() {
  return PANTRY_ITEMS
    .filter(i => !isNoExpiryItem(i) && i.days <= EXPIRING_SOON_WITHIN_DAYS)
    .sort((a, b) => a.days - b.days);
}

function getRestockItems() {
  return PANTRY_ITEMS
    .filter(i => i.qty > 0 && i.qty <= LOW_STOCK_QTY_THRESHOLD)
    .sort((a, b) => a.qty - b.qty);
}

// Items that are genuinely out of stock. Since PANTRY_ITEMS only ever
// contains products the person has actually added to their pantry,
// any item sitting at Qty: 0 here means it was added before and has
// since run out — not a random item that was never stocked. Products
// that were never added simply never appear in PANTRY_ITEMS at all,
// so this list can never include something the person didn't already
// have.
function getUnavailableItems() {
  return PANTRY_ITEMS.filter(i => i.qty === 0);
}

// A small recipe catalog. A recipe only counts as a "match" and only
// shows up on the dashboard when every one of its ingredients is
// actually present in PANTRY_ITEMS (case-insensitive substring match
// against item names) — nothing is shown that isn't genuinely in stock.
const RECIPE_CATALOG = [
  { title: 'Tomato Rice',        tag: 'Best Match',    tagColor: '#5C7A45', time: '20 min', difficulty: 'Easy', ingredients: ['tomato', 'rice', 'spice'] },
  { title: 'Masala Maggi',       tag: 'Quick & Easy',   tagColor: '#D9A63D', time: '10 min', difficulty: 'Easy', ingredients: ['maggi', 'onion', 'spice'] },
  { title: 'Masala Egg Bhurji',  tag: 'High Protein',   tagColor: '#C24A32', time: '15 min', difficulty: 'Easy', ingredients: ['egg', 'onion', 'spice'] },
  { title: 'Vegetable Khichdi',  tag: 'Comfort Food',   tagColor: '#4E7FA6', time: '30 min', difficulty: 'Easy', ingredients: ['rice', 'lentils', 'spinach'] },
  { title: 'Chana Masala',       tag: 'High Protein',   tagColor: '#C24A32', time: '35 min', difficulty: 'Medium', ingredients: ['chickpeas', 'onion', 'spice'] },
  { title: 'Buttered Toast',     tag: 'Quick & Easy',   tagColor: '#D9A63D', time: '5 min',  difficulty: 'Easy', ingredients: ['bread', 'ghee'] },
  { title: 'Banana Oats',        tag: 'Breakfast',      tagColor: '#8A6FB0', time: '10 min', difficulty: 'Easy', ingredients: ['banana', 'oats', 'honey'] }
];

function getMatchedRecipes() {
  const stockNames = PANTRY_ITEMS.map(i => i.name.toLowerCase());
  return RECIPE_CATALOG.filter(recipe =>
    recipe.ingredients.every(ing => stockNames.some(name => name.includes(ing)))
  );
}

const RECIPE_TIMER_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8.5"/><path d="M12 8v4l2.5 2"/></svg>`;
const RECIPE_DIFFICULTY_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8"/></svg>`;
const RECIPE_HEART_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21c-4.5-3-8-6.3-8-10.5A5.5 5.5 0 0 1 12 7a5.5 5.5 0 0 1 8 3.5c0 4.2-3.5 7.5-8 10.5z"/></svg>`;

function renderRecipeCard(recipe) {
  return `
    <div class="recipe-card">
      <div class="recipe-body">
        <span class="recipe-tag-pill" style="background:${recipe.tagColor};">${recipe.tag}</span>
        <div class="recipe-title-row">
          <span class="recipe-title">${recipe.title}</span>
          ${RECIPE_HEART_ICON}
        </div>
        <div class="recipe-meta">
          <span>${RECIPE_TIMER_ICON}${recipe.time}</span>
          <span>${RECIPE_DIFFICULTY_ICON}${recipe.difficulty}</span>
        </div>
        <div class="recipe-uses">Uses ${recipe.ingredients.join(', ')}</div>
      </div>
    </div>`;
}

function renderRecipes() {
  const row = document.getElementById('recipeRow');
  const dots = document.getElementById('recipeDots');
  if (!row) return;
  const matched = getMatchedRecipes();
  row.innerHTML = matched.map(renderRecipeCard).join('');
  if (dots) {
    dots.innerHTML = matched.map((_, i) => `<span class="${i === 0 ? 'active' : ''}"></span>`).join('');
  }
}

/* ---------- Grouped alerts: Expiring Soon / Restock / Unavailable ---------- */

function alertCard(name, valueLabel, valueColor) {
  return `
    <div class="alert-card">
      <div class="alert-card-name">${name}</div>
      <div class="alert-card-value" style="color:${valueColor};">${valueLabel}</div>
    </div>`;
}

function alertSection(title, dotColor, cardsHtml) {
  if (!cardsHtml) return '';
  return `
    <div class="alert-section">
      <div class="alert-section-title"><span class="alert-section-dot" style="background:${dotColor};"></span>${title}</div>
      <div class="alert-card-grid">${cardsHtml}</div>
    </div>`;
}

function renderAlertGroups(limitPerGroup) {
  const expiring = getExpiringSoonItems();
  const restock = getRestockItems();
  const unavailable = getUnavailableItems();

  const expiringCards = (limitPerGroup ? expiring.slice(0, limitPerGroup) : expiring)
    .map(item => alertCard(item.name, item.days <= 0 ? 'Expires today' : item.days === 1 ? 'Expires in 1 day' : `Expires in ${item.days} days`, '#E8694E'))
    .join('');

  const restockCards = (limitPerGroup ? restock.slice(0, limitPerGroup) : restock)
    .map(item => alertCard(item.name, `${formatQty(item.qty)} in stock`, '#E8C23D'))
    .join('');

  const unavailableCards = (limitPerGroup ? unavailable.slice(0, limitPerGroup) : unavailable)
    .map(item => alertCard(item.name, 'Out of stock', 'var(--sidebar-text-dim)'))
    .join('');

  const html =
    alertSection('Expiring Soon', '#E8694E', expiringCards) +
    alertSection('Restock', '#E8C23D', restockCards) +
    alertSection('Unavailable', '#9B968A', unavailableCards);

  return { html, total: expiring.length + restock.length + unavailable.length };
}

function renderAlerts() {
  // Homepage panel — compact preview, a couple of cards per group
  const homeContainer = document.getElementById('alertsList');
  const homeResult = renderAlertGroups(2);
  if (homeContainer) homeContainer.innerHTML = homeResult.html;

  // Full Alerts page — everything, grouped, or an empty state
  const pageContainer = document.getElementById('alertsPageList');
  const pageEmpty = document.getElementById('alertsPageEmpty');
  const pageResult = renderAlertGroups(null);
  if (pageContainer) pageContainer.innerHTML = pageResult.html;
  if (pageEmpty) pageEmpty.style.display = pageResult.total === 0 ? 'flex' : 'none';

  // Notification bell badge reflects the real total
  const badge = document.getElementById('notifBadge');
  if (badge) badge.textContent = pageResult.total;

  return pageResult.total;
}

function renderPantryGlance() {
  const row = document.getElementById('pantryScroll');
  if (!row) return;
  // Soonest-expiring items first (no-expiry items sort to the end),
  // capped to a short preview row — same source data as the Pantry page.
  const sorted = [...PANTRY_ITEMS].sort((a, b) => {
    const aDays = isNoExpiryItem(a) ? Infinity : a.days;
    const bDays = isNoExpiryItem(b) ? Infinity : b.days;
    return aDays - bDays;
  });
  row.innerHTML = sorted.slice(0, 8).map(renderPantryCard).join('');
}

function renderStats() {
  const totalEl = document.getElementById('statTotalItems');
  const expiringEl = document.getElementById('statExpiringSoon');
  const lowStockEl = document.getElementById('statLowStock');
  const recipeEl = document.getElementById('statRecipeIdeas');

  if (totalEl) totalEl.textContent = PANTRY_ITEMS.length;
  if (expiringEl) expiringEl.textContent = getExpiringSoonItems().length;
  if (lowStockEl) lowStockEl.textContent = getRestockItems().length;
  if (recipeEl) recipeEl.textContent = getMatchedRecipes().length;
}

function pantryDaysBadgeColor(days) {
  if (days <= 1) return '#C24A32';
  if (days <= 5) return '#D9A63D';
  return '#5C7A45';
}

function renderPantryCard(item) {
  const bg = PANTRY_ICON_BG[item.icon] || 'green-soft';
  const noExpiry = PANTRY_NO_EXPIRY_CATEGORIES.includes(item.category) || item.days == null;

  let badge = '';
  if (!noExpiry) {
    const badgeColor = pantryDaysBadgeColor(item.days);
    const dayLabel = item.days === 1 ? '1 day left' : item.days + ' days left';
    badge = `<span class="days-badge" style="color:${badgeColor};">${dayLabel}</span>`;
  } else {
    badge = `<span class="days-badge" style="color:#5C7A45;">In Stock</span>`;
  }

  return `
    <div class="pantry-card">
      <button class="pantry-delete-btn" type="button" title="Remove ${item.name}" onclick="deleteItem('${item.name.replace(/'/g, "\\'")}', event)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
      <div class="pantry-illustration" style="background:var(--${bg});">
        ${badge}
        ${PANTRY_ICONS[item.icon] || ''}
      </div>
      <div class="pantry-name">${item.name}</div>
      <div class="pantry-meta">${formatMeta(item)}</div>
    </div>`;
}

function renderPantryPage() {
  const container = document.getElementById('pantryCategories');
  const emptyState = document.getElementById('pantryEmptyState');
  if (!container) return;

  container.innerHTML = '';
  let totalItems = 0;

  PANTRY_CATEGORIES.forEach(cat => {
    const items = PANTRY_ITEMS.filter(i => i.category === cat.key);
    if (items.length === 0) return; // no stock in this category → skip it entirely

    totalItems += items.length;
    const bg = PANTRY_ICON_BG[cat.icon] || 'green-soft';
    const countLabel = items.length === 1 ? '1 item' : items.length + ' items';

    const section = document.createElement('div');
    section.className = 'pantry-section';
    section.innerHTML = `
      <div class="pantry-section-head">
        <div class="pantry-section-icon" style="background:var(--${bg});">${PANTRY_ICONS[cat.icon] || ''}</div>
        <span class="pantry-section-title">${cat.label}</span>
        <span class="pantry-section-count">${countLabel}</span>
      </div>
      <div class="pantry-grid">
        ${items.map(renderPantryCard).join('')}
      </div>`;
    container.appendChild(section);
  });

  if (emptyState) emptyState.style.display = totalItems === 0 ? 'flex' : 'none';
}

/* ============================================================
   SEARCH
   One search behavior, driven from either search box (the
   dashboard topbar or the Pantry page header) — typing in
   either box keeps the other in sync, jumps to the Pantry page,
   and filters PANTRY_ITEMS. Recognizes a few special keywords in
   addition to plain name/category matching:
     - "expire" / "expiring" / "expired"  -> items expiring soon
     - "unavailable" / "out of stock"     -> items at 0 qty
     - "in stock"                         -> items with qty > 0
   Anything else falls back to a substring match against the
   item's name or its category label/key.
   ============================================================ */

function escapeHtmlText(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function matchesSearch(item, rawQuery) {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;

  if (q.includes('unavailable') || q.includes('out of stock') || q.includes('out-of-stock')) {
    return item.qty === 0;
  }
  if (q.includes('in stock') || q.includes('in-stock') || q === 'instock') {
    return item.qty > 0;
  }
  if (/expir/.test(q)) { // matches "expire", "expiring", "expired"
    return !isNoExpiryItem(item) && item.days <= EXPIRING_SOON_WITHIN_DAYS;
  }

  const cat = PANTRY_CATEGORIES.find(c => c.key === item.category);
  if (cat && cat.label.toLowerCase().includes(q)) return true;
  if (item.category.toLowerCase().includes(q)) return true;
  if (item.name.toLowerCase().includes(q)) return true;

  return false;
}

function renderPantrySearchResults(rawQuery) {
  const container = document.getElementById('pantryCategories');
  const emptyState = document.getElementById('pantryEmptyState');
  if (!container) return;
  if (emptyState) emptyState.style.display = 'none';

  const matches = PANTRY_ITEMS.filter(i => matchesSearch(i, rawQuery));
  const label = escapeHtmlText(rawQuery.trim());

  if (matches.length === 0) {
    container.innerHTML = `
      <div class="pantry-section-head" style="margin-bottom:16px;">
        <span class="pantry-section-title">Search results for "${label}"</span>
        <span class="pantry-section-count">0 items</span>
      </div>
      <div class="page-empty" style="display:flex;">
        <div class="page-empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="#5C7A45" stroke-width="1.6"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
        </div>
        <h3>No matches found</h3>
        <p>Try a different name or category, or a word like "expiring", "in stock" or "unavailable".</p>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div class="pantry-section">
      <div class="pantry-section-head">
        <span class="pantry-section-title">Search results for "${label}"</span>
        <span class="pantry-section-count">${matches.length} ${matches.length === 1 ? 'item' : 'items'}</span>
      </div>
      <div class="pantry-grid">
        ${matches.map(renderPantryCard).join('')}
      </div>
    </div>`;
}

// Keeps both search boxes (dashboard topbar + Pantry page header) in
// sync with whichever one the person is actually typing in.
function syncSearchInputs(value, sourceId) {
  ['dashboardSearchInput', 'pantrySearchInput'].forEach(id => {
    if (id === sourceId) return;
    const el = document.getElementById(id);
    if (el && el.value !== value) el.value = value;
  });
}

function performSearch(rawValue, sourceId) {
  syncSearchInputs(rawValue, sourceId);

  const q = rawValue.trim();
  if (!q) {
    // Search cleared — go back to the normal grouped Pantry view.
    renderPantryPage();
    return;
  }

  goToPage('pantry', null);
  renderPantrySearchResults(q);
}

/* ---------- Horizontal scroll for pantry row ---------- */
function scrollRow(id, dir) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollBy({ left: dir * 220, behavior: 'smooth' });
}

/* ---------- Sidebar page switching ---------- */
// Sidebar stays fixed; only the .page inside <main> that matches
// data-page gets shown. No page reload / navigation involved.
function showPage(evt, pageId, navEl) {
  if (evt) evt.preventDefault();

  // Toggle page visibility
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active');
  });
  const target = document.getElementById('page-' + pageId);
  if (target) target.classList.add('active');

  // Toggle active nav item highlight
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });
  if (navEl) navEl.classList.add('active');
  else {
    // called without an explicit nav element (e.g. from a button
    // elsewhere on the page) — find the matching sidebar item ourselves
    const matchingNav = document.querySelector('.nav-item[data-page="' + pageId + '"]');
    if (matchingNav) matchingNav.classList.add('active');
  }
}

/* ---------- Navigate from anywhere on the page ---------- */
// Buttons like "View All Items", "See All Recipes", "View Shopping List"
// etc. call this directly with just the target page id.
function goToPage(pageId, evt) {
  if (evt) evt.preventDefault();
  showPage(null, pageId, null);
}

/* ---------- Add Item modal ---------- */

// Maps a category key to the icon used for it — kept in sync with
// PANTRY_CATEGORIES so a manually-added item renders consistently
// with the rest of the app.
function iconForCategory(categoryKey) {
  const cat = PANTRY_CATEGORIES.find(c => c.key === categoryKey);
  return cat ? cat.icon : 'jar';
}

function openAddItemModal(evt) {
  if (evt) evt.preventDefault();
  const overlay = document.getElementById('addItemOverlay');
  if (overlay) overlay.style.display = 'flex';
}

function closeAddItemModal() {
  const overlay = document.getElementById('addItemOverlay');
  if (overlay) overlay.style.display = 'none';
  const form = document.getElementById('addItemForm');
  if (form) form.reset();
}

function handleAddItemSubmit(evt) {
  evt.preventDefault();

  const nameInput = document.getElementById('addItemName');
  const qtyInput = document.getElementById('addItemQty');
  const unitSelect = document.getElementById('addItemUnit');
  const categorySelect = document.getElementById('addItemCategory');
  const expiryInput = document.getElementById('addItemExpiry');

  const name = nameInput.value.trim();
  const qty = parseFloat(qtyInput.value); // decimals allowed — e.g. 1.5 L, 5.5 kg
  const unit = unitSelect.value;
  const category = categorySelect.value;
  const expiryValue = expiryInput.value; // '' if left blank (optional)

  if (!name || isNaN(qty) || qty < 0) return; // required fields guard (inputs are also marked required)

  // Expiry date is optional. If given, convert to "days left" from
  // today; if left blank, the item behaves exactly like a no-expiry
  // pantry staple (shows "In Stock" instead of a countdown) — same
  // path used for rice/dal, so this covers both "genuinely doesn't
  // expire" and "has an expiry but I don't know/can't read the date".
  let days;
  if (expiryValue) {
    const msPerDay = 24 * 60 * 60 * 1000;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiryDate = new Date(expiryValue + 'T00:00:00');
    days = Math.round((expiryDate - today) / msPerDay);
    if (days < 0) days = 0;
  }

  // Look for an existing item that's really "the same product" —
  // same normalized name (so "Onion"/"Onions"/"onion" all match one
  // another) and a compatible unit (kg <-> g convert automatically;
  // anything else must match exactly). "Red Onion" or "Basmati Rice"
  // normalize to different keys, so those correctly stay separate.
  const normalizedNew = normalizeItemName(name);
  const existing = PANTRY_ITEMS.find(i =>
    normalizeItemName(i.name) === normalizedNew && unitsCompatible(i.unit, unit)
  );

  if (existing) {
    // Merge into the existing item instead of creating a duplicate.
    const convertedQty = convertQty(qty, unit, existing.unit);
    existing.qty = Math.round((existing.qty + convertedQty) * 100) / 100;
    existing.size = `${formatQty(existing.qty)} ${existing.unit}`;

    // If this category was a catch-all guess ("Others") but the person
    // just picked something more specific, adopt it — self-heals a
    // mis-categorized entry instead of leaving it stuck in Others.
    if (existing.category === 'others' && category !== 'others') {
      existing.category = category;
      existing.icon = iconForCategory(category);
    }

    // If a fresher expiry was given, use it (soonest wins); otherwise
    // keep whatever the existing item already had.
    if (days !== undefined && (existing.days === undefined || days < existing.days)) {
      existing.days = days;
    }

    addHistoryEntry(`${existing.name} was updated — now ${formatQty(existing.qty)} ${existing.unit} in stock`);
  } else {
    const newItem = {
      name,
      category,
      icon: iconForCategory(category),
      size: `${formatQty(qty)} ${unit}`,
      unit,
      qty,
      ...(days !== undefined ? { days } : {})
    };
    PANTRY_ITEMS.push(newItem);

    addHistoryEntry(`${newItem.name} was added to the pantry`);
  }

  closeAddItemModal();
  renderPantryPage();
  renderPantryGlance();
  renderRecipes();
  renderAlerts();
  renderStats();
}

/* ---------- Delete pantry item (with Undo + History log) ---------- */

// In-memory activity log — newest first. Kept simple (no persistence)
// to match the rest of the app's mock-data approach.
const HISTORY = [];

function addHistoryEntry(text) {
  const entry = { id: Date.now() + Math.random(), text, time: new Date() };
  HISTORY.unshift(entry);
  renderHistoryPage();
  return entry;
}

function renderHistoryPage() {
  const list = document.getElementById('historyList');
  const empty = document.getElementById('historyEmptyState');
  if (!list) return;

  if (HISTORY.length === 0) {
    list.innerHTML = '';
    if (empty) empty.style.display = 'flex';
    return;
  }
  if (empty) empty.style.display = 'none';

  list.innerHTML = HISTORY.map(h => `
    <div class="history-item">
      <div class="history-item-dot"></div>
      <div>
        <p class="history-item-text">${h.text}</p>
        <p class="history-item-time">${h.time.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p>
      </div>
    </div>`).join('');
}

// Removes an item from the pantry, logs it to History, and offers a
// 6-second Undo via the bottom toast. Undoing puts the item back in
// its original spot and quietly removes the History line too, so a
// mistaken delete + undo leaves no trace behind.
function deleteItem(name, evt) {
  if (evt) evt.stopPropagation();

  const idx = PANTRY_ITEMS.findIndex(i => i.name === name);
  if (idx === -1) return;
  const [removed] = PANTRY_ITEMS.splice(idx, 1);
  const originalIndex = idx;

  renderPantryPage();
  renderPantryGlance();
  renderRecipes();
  renderAlerts();
  renderStats();

  const historyEntry = addHistoryEntry(`${removed.name} was removed from pantry`);

  showUndoToast(`${removed.name} removed from pantry`, () => {
    PANTRY_ITEMS.splice(originalIndex, 0, removed);

    const hIdx = HISTORY.findIndex(h => h.id === historyEntry.id);
    if (hIdx !== -1) HISTORY.splice(hIdx, 1);
    renderHistoryPage();

    renderPantryPage();
    renderPantryGlance();
    renderRecipes();
    renderAlerts();
    renderStats();
  });
}

let undoToastTimer = null;

function showUndoToast(message, onUndo) {
  const toast = document.getElementById('undoToast');
  const msgEl = document.getElementById('undoToastMessage');
  const undoBtn = document.getElementById('undoToastBtn');
  if (!toast || !msgEl || !undoBtn) return;

  clearTimeout(undoToastTimer);
  msgEl.textContent = message;
  toast.classList.add('show');

  const cleanup = () => {
    toast.classList.remove('show');
    undoBtn.onclick = null;
  };

  undoBtn.onclick = () => {
    onUndo();
    cleanup();
    clearTimeout(undoToastTimer);
  };

  undoToastTimer = setTimeout(cleanup, 6000);
}

/* ---------- Notification popover ---------- */

function toggleNotifPanel(evt, forceState) {
  if (evt) evt.stopPropagation();
  const panel = document.getElementById('notifPanel');
  if (!panel) return;

  const shouldShow = forceState !== undefined ? forceState : panel.style.display === 'none';

  if (shouldShow) {
    const expiringCount = getExpiringSoonItems().length;
    const restockCount = getRestockItems().length;
    const unavailableCount = getUnavailableItems().length;

    const expEl = document.getElementById('notifCountExpiring');
    const resEl = document.getElementById('notifCountRestock');
    const unaEl = document.getElementById('notifCountUnavailable');
    const emptyEl = document.getElementById('notifPanelEmpty');

    if (expEl) expEl.textContent = expiringCount;
    if (resEl) resEl.textContent = restockCount;
    if (unaEl) unaEl.textContent = unavailableCount;
    if (emptyEl) emptyEl.style.display = (expiringCount + restockCount + unavailableCount === 0) ? 'block' : 'none';

    panel.style.display = 'block';
  } else {
    panel.style.display = 'none';
  }
}

// Clicking anywhere outside the notification popover closes it
document.addEventListener('click', (e) => {
  const panel = document.getElementById('notifPanel');
  const bell = document.getElementById('notifBellBtn');
  if (!panel || panel.style.display === 'none') return;
  if (panel.contains(e.target) || (bell && bell.contains(e.target))) return;
  panel.style.display = 'none';
});

/* ---------- Upload dropzone (UI only for now) ---------- */
/* ---------- Upload dropzone handling ---------- */
document.addEventListener('DOMContentLoaded', () => {
  renderPantryPage();
  renderPantryGlance();
  renderRecipes();
  renderAlerts();
  renderStats();
  renderHistoryPage();


  function setupDropzone(dropzoneId, fileInputId, uploadBtnId, fileListId) {
    const dropzone = document.getElementById(dropzoneId);
    const fileInput = document.getElementById(fileInputId);
    const uploadBtn = document.getElementById(uploadBtnId);
    const fileList = document.getElementById(fileListId);

    if (!dropzone || !fileInput || !fileList) return;

    dropzone.addEventListener('click', () => fileInput.click());
    if (uploadBtn) {
      uploadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
      });
    }

    ['dragenter', 'dragover'].forEach(evtName => {
      dropzone.addEventListener(evtName, (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });
    });
    ['dragleave', 'drop'].forEach(evtName => {
      dropzone.addEventListener(evtName, (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
      });
    });
    dropzone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files && files.length) handleFiles(files, fileList);
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files.length) {
        handleFiles(fileInput.files, fileList);
        fileInput.value = '';
      }
    });
  }

  // Bind Dashboard dropzone and Scan Product page dropzone
  setupDropzone('uploadDropzone', 'fileInput', 'uploadBtn', 'uploadFileList');
  setupDropzone('scanDropzone', 'scanFileInput', 'scanUploadBtn', 'scanFileList');

  function handleFiles(fileArray, fileList) {
    Array.from(fileArray).forEach(file => {
      const fileRow = addFileRow(file, fileList);
      scanFile(file, fileRow);
    });
  }

  async function scanFile(file, fileRow) {
    const statusSpan = document.createElement('span');
    statusSpan.className = 'ufi-status';
    statusSpan.style.marginLeft = '10px';
    statusSpan.style.color = '#3b82f6';
    statusSpan.style.fontSize = '0.85rem';
    statusSpan.textContent = ' 🔍 Scanning...';
    fileRow.appendChild(statusSpan);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Image = e.target.result;
      try {
        // Try relative endpoint first, then http://localhost:3000/api/scan as fallback
        let apiUrl = '/api/scan';
        if (window.location.protocol === 'file:') {
          apiUrl = 'http://localhost:3000/api/scan';
        }

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64Image })
        });
        const data = await response.json();
        if (data.success && data.data) {
          const item = data.data;
          statusSpan.style.color = '#10b981';
          statusSpan.textContent = ` ✅ Scanned: ${item.brand ? item.brand + ' ' : ''}${item.name} (${item.quantity || ''} ${item.unit || ''})`;
          
          // Dynamically add card to Pantry UI
          addPantryCardToUI(item);
        } else {
          statusSpan.style.color = '#ef4444';
          statusSpan.textContent = ' ❌ Scan failed: ' + (data.error || 'Server error');
        }
      } catch (err) {
        console.error('Scan API error:', err);
        statusSpan.style.color = '#ef4444';
        statusSpan.textContent = ' ❌ Scan error: Ensure backend server is running';
      }
    };
    reader.readAsDataURL(file);
  }

  function addPantryCardToUI(item) {
    const pantryRow = document.getElementById('pantryScroll');
    if (!pantryRow) return;

    const card = document.createElement('div');
    card.className = 'pantry-card';
    
    let daysBadge = 'Fresh 🟢';
    if (item.expiry_date) {
      daysBadge = item.expiry_date;
    }

    const qtyText = item.quantity ? `${item.quantity} ${item.unit || ''}` : '1 pack';
    const displayName = item.brand ? `${item.brand} ${item.name}` : item.name;

    card.innerHTML = `
      <div class="pantry-illustration" style="background:var(--amber-soft);">
        <span class="days-badge" style="color:#5C7A45;">${daysBadge}</span>
        <svg width="52" height="60" viewBox="0 0 52 60" fill="none">
          <path d="M10 10h32l2 6v34a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4V16l2-6z" fill="#F6DDA0" stroke="#C98A2E" stroke-width="1.8"/>
          <path d="M10 10c2-5 6-8 16-8s14 3 16 8" fill="none" stroke="#C98A2E" stroke-width="1.8"/>
          <path d="M16 28h20M16 36h20M16 44h14" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>
        </svg>
      </div>
      <div class="pantry-name">${escapeHtml(displayName)}</div>
      <div class="pantry-meta">${escapeHtml(qtyText)} &nbsp;·&nbsp; Qty: 1</div>
    `;

    pantryRow.insertBefore(card, pantryRow.firstChild);

    // Update total items count in stat card
    const totalItemsEl = document.querySelector('.stat-value');
    if (totalItemsEl) {
      const currentVal = parseInt(totalItemsEl.textContent, 10);
      if (!isNaN(currentVal)) {
        totalItemsEl.textContent = currentVal + 1;
      }
    }
  }

  function addFileRow(file, fileList) {
    const row = document.createElement('div');
    row.className = 'upload-file-item';
    row.innerHTML = `
      <div class="ufi-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <path d="M14 2v6h6"/>
        </svg>
      </div>
      <span class="ufi-name">${escapeHtml(file.name)}</span>
      <span class="ufi-size">${formatSize(file.size)}</span>
      <button class="ufi-remove" type="button" title="Remove">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    `;
    row.querySelector('.ufi-remove').addEventListener('click', () => row.remove());
    fileList.appendChild(row);
    return row;
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
});
