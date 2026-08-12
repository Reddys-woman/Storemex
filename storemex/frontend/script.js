/* ============================================================
   storemex dashboard — script.js
   Handles: pantry data, alerts, shopping swipe deck,
   sidebar page switching, and dashboard stats.
   ============================================================ */

// ---------- API base ----------
// Always talk to the actual backend on port 3000, no matter which
// origin this page is being viewed from — same fix used on the
// login/signup pages (see login.html for the full explanation).
const BACKEND_ORIGIN = "http://localhost:3000";
const API_BASE = (window.location.origin === BACKEND_ORIGIN) ? "" : BACKEND_ORIGIN;

/* ============================================================
   PANTRY PAGE — category data + rendering
   A category section is only shown when it has at least one
   item in stock. Icons are shared across the whole app so the
   same category always looks the same everywhere.
   ============================================================ */

// Shared illustration markup, keyed by icon type.
const PANTRY_ICONS = {
  leaf: `<svg width="64" height="64" viewBox="0 0 64 64" fill="none"><path d="M50 12C30 8 12 20 12 40c0 6 4 10 10 10 20 0 32-16 30-36-.4-1-1.4-2-2-2z" fill="#9BC97E" stroke="#5C7A45" stroke-width="1.8" stroke-linejoin="round"/><path d="M16 46C26 34 36 24 48 14" stroke="#5C7A45" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  /* Colour-blind friendly veg icon: purple-pink onion */
  onion: `<svg width="60" height="60" viewBox="0 0 60 60" fill="none"><ellipse cx="30" cy="38" rx="18" ry="16" fill="#C9A0DC" stroke="#8B5FBF" stroke-width="1.8"/><ellipse cx="30" cy="38" rx="12" ry="11" fill="#E8CFF0" opacity=".7"/><path d="M24 24c2-8 10-10 12-2 1-6 6-6 8 0" stroke="#7A9B5A" stroke-width="2" stroke-linecap="round"/><path d="M28 22c1-5 5-6 6-1" stroke="#9BC97E" stroke-width="1.6" stroke-linecap="round"/><path d="M18 36c4 2 20 2 24 0" stroke="#8B5FBF" stroke-width="1.2" opacity=".45"/></svg>`,
  apple: `<svg width="60" height="60" viewBox="0 0 60 60" fill="none"><circle cx="30" cy="36" r="18" fill="#E8694E" stroke="#C24A32" stroke-width="1.8"/><path d="M30 18c0-4 1-6 3-8" stroke="#8C6A34" stroke-width="2" stroke-linecap="round"/><path d="M33 12c3-2 6-2 8 0-2 3-6 3-8 0z" fill="#9BC97E" stroke="#5C7A45" stroke-width="1.4"/></svg>`,
  /* Colour-blind friendly fruit icon: bunch of yellow bananas */
  banana: `<svg width="64" height="56" viewBox="0 0 64 56" fill="none"><path d="M18 14c-6 8-8 18-4 26 6 2 10-2 12-8 2-8 0-14-8-18z" fill="#F5D76E" stroke="#C9A227" stroke-width="1.6" stroke-linejoin="round"/><path d="M28 12c-4 10-4 20 2 28 6 0 10-6 10-12 0-10-4-16-12-16z" fill="#FFE566" stroke="#C9A227" stroke-width="1.6" stroke-linejoin="round"/><path d="M38 14c-2 10 0 20 6 26 6-2 8-8 6-14-2-10-6-14-12-12z" fill="#F5D76E" stroke="#C9A227" stroke-width="1.6" stroke-linejoin="round"/><path d="M26 10c4-2 10-2 14 2" stroke="#8C6A34" stroke-width="2" stroke-linecap="round"/></svg>`,
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
  leaf: 'green-soft', onion: 'purple-soft', apple: 'red-soft', banana: 'yellow-soft', bottle: 'blue-soft',
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

/* ---------- Colour-blind mode ---------- */
function isColorBlindMode() {
  try { return localStorage.getItem('storemex_colorblind') === '1'; } catch (_) { return false; }
}
function applyColorBlindMode(on) {
  document.body.classList.toggle('colorblind-mode', !!on);
  const btn = document.getElementById('colorBlindToggle');
  if (btn) {
    btn.classList.toggle('active', !!on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.title = on ? 'Colour-blind mode: ON' : 'Colour-blind mode: OFF';
  }
}
function toggleColorBlindMode() {
  const next = !isColorBlindMode();
  try { localStorage.setItem('storemex_colorblind', next ? '1' : '0'); } catch (_) {}
  applyColorBlindMode(next);
  // Re-render so icons swap (leaf↔onion, apple↔banana)
  try {
    if (typeof renderPantryPage === 'function') renderPantryPage();
    if (typeof renderPantryGlance === 'function') renderPantryGlance();
    if (typeof renderAlerts === 'function') renderAlerts();
    if (typeof renderShoppingResults === 'function') renderShoppingResults();
    if (typeof shoppingDeckInitialized !== 'undefined' && shoppingDeckInitialized && typeof renderSwipeDeck === 'function') renderSwipeDeck();
  } catch (_) {}
}
function resolveIconKey(iconKey) {
  if (!isColorBlindMode()) return iconKey;
  if (iconKey === 'leaf') return 'onion';
  if (iconKey === 'apple') return 'banana';
  return iconKey;
}


// Real pantry data. Seeded with a few out-of-stock staples (qty 0)
// so Unavailable alerts and the Shopping List have something to
// show. Adding the same name again via the Add Item modal merges
// into the existing entry and raises qty from 0.
// Every item needs: name, category (key above), icon (PANTRY_ICONS),
// size, unit (kg/g/L/ml/pcs/pack/units), qty (number). Optional
// "days" for perishables — grains/pulses never use an expiry countdown.
const PANTRY_ITEMS = [
  { name: 'Rice',   category: 'grains',     icon: 'rice',  size: '0 kg',  unit: 'kg',  qty: 0 },
  { name: 'Milk',   category: 'dairy',      icon: 'egg',   size: '0 L',   unit: 'L',   qty: 0 },
  { name: 'Eggs',   category: 'dairy',      icon: 'egg',   size: '12 pcs', unit: 'pcs', qty: 12 },
  { name: 'Potato', category: 'vegetables', icon: 'leaf',  size: '0 kg',  unit: 'kg',  qty: 0 },
  { name: 'Onion',  category: 'vegetables', icon: 'leaf',  size: '0 kg',  unit: 'kg',  qty: 0 },
  { name: 'Bread',  category: 'bakery',     icon: 'bread', size: '0 pcs', unit: 'pcs', qty: 0 }
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

// Alert thresholds (fixed):
// - Expiring: days left ≤ 5
// - Low stock (unit-aware): qty < 1.5 L / 1500 ml / 1.5 kg / 1500 g / 5 units / 2 pack|pcs
const EXPIRING_SOON_WITHIN_DAYS = 5;

function isNoExpiryItem(item) {
  return PANTRY_NO_EXPIRY_CATEGORIES.includes(item.category) || item.days == null;
}

function isLowStock(item) {
  if (!item || item.qty == null || item.qty <= 0) return false; // qty 0 is "Unavailable"
  const u = String(item.unit || '').toLowerCase();
  const q = Number(item.qty);
  if (u === 'l' || u === 'litre' || u === 'liter') return q < 1.5;
  if (u === 'ml') return q < 1500;
  if (u === 'kg') return q < 1.5;
  if (u === 'g') return q < 1500;
  if (u === 'units' || u === 'unit') return q < 5;
  if (u === 'pack' || u === 'packet' || u === 'pcs' || u === 'piece' || u === 'pieces') return q < 2;
  // Unknown unit — treat as low when below 2
  return q < 2;
}

function getExpiringSoonItems() {
  return PANTRY_ITEMS
    .filter(i => !isNoExpiryItem(i) && i.days <= EXPIRING_SOON_WITHIN_DAYS)
    .sort((a, b) => a.days - b.days);
}

function getRestockItems() {
  return PANTRY_ITEMS
    .filter(i => isLowStock(i))
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

// Recipe suggestions now come from the AI backend (see
// backend/ai/recipeSuggester.js) instead of a hardcoded catalog —
// it's asked to suggest realistic, SIMPLE recipes that use ONLY
// what's actually in PANTRY_ITEMS right now (plus basic staples like
// salt/oil/water), refreshed automatically whenever the pantry changes.
let AI_RECIPES = [];
let aiRecipesLoading = false;
let aiRecipesError = null;
let aiRecipesFetchTimer = null;

// Debounced trigger — call this after any pantry mutation instead of
// hitting the API directly, so a burst of changes (e.g. deleting
// several items in a row) only fires one request.
function scheduleAiRecipesRefresh() {
  if (aiRecipesFetchTimer) clearTimeout(aiRecipesFetchTimer);
  aiRecipesFetchTimer = setTimeout(fetchAiRecipes, 500);
}

async function fetchAiRecipes() {
  const availableItems = PANTRY_ITEMS.filter(i => i.qty > 0);

  if (availableItems.length === 0) {
    AI_RECIPES = [];
    aiRecipesError = null;
    aiRecipesLoading = false;
    renderRecipes();
    renderRecipesPage();
    return;
  }

  aiRecipesLoading = true;
  aiRecipesError = null;
  renderRecipes();
  renderRecipesPage();

  try {
    const payload = {
      items: availableItems.map(i => {
        const cat = PANTRY_CATEGORIES.find(c => c.key === i.category);
        return { name: i.name, category: cat ? cat.label : i.category };
      })
    };
    const res = await fetch(`${API_BASE}/api/recipes/suggest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const body = await res.json();
    if (!res.ok || !body.success) {
      throw new Error(body.error || 'Could not get recipe suggestions.');
    }
    AI_RECIPES = Array.isArray(body.data) ? body.data : [];
  } catch (err) {
    aiRecipesError = err.message;
    AI_RECIPES = [];
  } finally {
    aiRecipesLoading = false;
    renderRecipes();
    renderRecipesPage();
  }
}

const RECIPE_TIMER_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8.5"/><path d="M12 8v4l2.5 2"/></svg>`;
const RECIPE_DIFFICULTY_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8"/></svg>`;
const RECIPE_HEART_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21c-4.5-3-8-6.3-8-10.5A5.5 5.5 0 0 1 12 7a5.5 5.5 0 0 1 8 3.5c0 4.2-3.5 7.5-8 10.5z"/></svg>`;

// Recipe tags come back as free-form text from the AI, so their pill
// color is derived from the text itself — same tag always gets the
// same color, without needing a hardcoded lookup table.
const RECIPE_TAG_COLORS = ['#5C7A45', '#D9A63D', '#C24A32', '#4E7FA6', '#8A6FB0', '#4E9A8A'];
function recipeTagColor(tag) {
  const text = tag || '';
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = text.charCodeAt(i) + ((hash << 5) - hash);
  return RECIPE_TAG_COLORS[Math.abs(hash) % RECIPE_TAG_COLORS.length];
}

function renderRecipeCard(recipe) {
  return `
    <div class="recipe-card">
      <div class="recipe-body">
        <span class="recipe-tag-pill" style="background:${recipeTagColor(recipe.tag)};">${escapeHtmlText(recipe.tag || 'Recipe')}</span>
        <div class="recipe-title-row">
          <span class="recipe-title">${escapeHtmlText(recipe.title)}</span>
          ${RECIPE_HEART_ICON}
        </div>
        <div class="recipe-meta">
          <span>${RECIPE_TIMER_ICON}${escapeHtmlText(recipe.time || '')}</span>
          <span>${RECIPE_DIFFICULTY_ICON}${escapeHtmlText(recipe.difficulty || '')}</span>
        </div>
        <div class="recipe-uses">Uses ${(recipe.ingredients || []).map(escapeHtmlText).join(', ')}</div>
      </div>
    </div>`;
}

function renderRecipeLoadingCard() {
  return `<div class="recipe-loading-card"><div class="scan-spinner"></div><span>Cooking up ideas from your pantry…</span></div>`;
}

function renderRecipeEmptyCard(message) {
  return `<div class="recipe-empty-card">${escapeHtmlText(message)}</div>`;
}

function renderRecipes() {
  const row = document.getElementById('recipeRow');
  const dots = document.getElementById('recipeDots');
  if (!row) return;

  if (aiRecipesLoading) {
    row.innerHTML = renderRecipeLoadingCard();
    if (dots) dots.innerHTML = '';
    return;
  }
  if (aiRecipesError) {
    row.innerHTML = renderRecipeEmptyCard("Couldn't load recipe ideas — check the backend server is running.");
    if (dots) dots.innerHTML = '';
    return;
  }
  if (AI_RECIPES.length === 0) {
    row.innerHTML = renderRecipeEmptyCard('Add a few items to your pantry to get AI recipe ideas.');
    if (dots) dots.innerHTML = '';
    return;
  }

  const preview = AI_RECIPES.slice(0, 4);
  row.innerHTML = preview.map(renderRecipeCard).join('');
  if (dots) {
    dots.innerHTML = preview.map((_, i) => `<span class="${i === 0 ? 'active' : ''}"></span>`).join('');
  }
}

/* ---------- Recipes page (full list, with steps) ---------- */

let expandedRecipeIdx = null;

function toggleRecipeSteps(idx) {
  expandedRecipeIdx = expandedRecipeIdx === idx ? null : idx;
  renderRecipesPage();
}

function renderRecipePageCard(recipe, idx) {
  const isOpen = expandedRecipeIdx === idx;
  const steps = recipe.steps || [];
  return `
    <div class="recipe-card recipe-page-card ${isOpen ? 'open' : ''}" onclick="toggleRecipeSteps(${idx})">
      <div class="recipe-body">
        <span class="recipe-tag-pill" style="background:${recipeTagColor(recipe.tag)};">${escapeHtmlText(recipe.tag || 'Recipe')}</span>
        <div class="recipe-title-row">
          <span class="recipe-title">${escapeHtmlText(recipe.title)}</span>
          ${RECIPE_HEART_ICON}
        </div>
        <div class="recipe-meta">
          <span>${RECIPE_TIMER_ICON}${escapeHtmlText(recipe.time || '')}</span>
          <span>${RECIPE_DIFFICULTY_ICON}${escapeHtmlText(recipe.difficulty || '')}</span>
        </div>
        <div class="recipe-uses">Uses ${(recipe.ingredients || []).map(escapeHtmlText).join(', ')}</div>
        ${steps.length ? `
          <div class="recipe-steps-toggle">${isOpen ? 'Hide steps' : 'View steps'} <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="width:11px;height:11px;transform:rotate(${isOpen ? -90 : 90}deg);"><path d="m9 6 6 6-6 6"/></svg></div>
          <ol class="recipe-steps-list" style="display:${isOpen ? 'flex' : 'none'};">
            ${steps.map(s => `<li>${escapeHtmlText(s)}</li>`).join('')}
          </ol>` : ''}
      </div>
    </div>`;
}

function renderRecipesPage() {
  const grid = document.getElementById('recipesPageGrid');
  const empty = document.getElementById('recipesPageEmpty');
  const loading = document.getElementById('recipesPageLoading');
  const error = document.getElementById('recipesPageError');
  if (!grid) return;

  loading.style.display = aiRecipesLoading ? 'flex' : 'none';
  error.style.display = (!aiRecipesLoading && aiRecipesError) ? 'flex' : 'none';
  if (error) error.querySelector('span').textContent = aiRecipesError ? `Couldn't load recipe ideas: ${aiRecipesError}. Make sure the backend server is running on localhost:3000.` : '';

  const showEmpty = !aiRecipesLoading && !aiRecipesError && AI_RECIPES.length === 0;
  empty.style.display = showEmpty ? 'flex' : 'none';

  if (aiRecipesLoading || aiRecipesError || showEmpty) {
    grid.innerHTML = '';
    return;
  }

  grid.innerHTML = AI_RECIPES.map((r, i) => renderRecipePageCard(r, i)).join('');
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
    .map(item => alertCard(item.name, item.days <= 0 ? 'Expires today' : item.days === 1 ? 'Expires in 1 day' : `Expires in ${item.days} days`, isColorBlindMode() ? '#7B5EA7' : '#E8694E'))
    .join('');

  const restockCards = (limitPerGroup ? restock.slice(0, limitPerGroup) : restock)
    .map(item => alertCard(item.name, `${formatQty(item.qty)} in stock`, '#E8C23D'))
    .join('');

  const unavailableCards = (limitPerGroup ? unavailable.slice(0, limitPerGroup) : unavailable)
    .map(item => alertCard(item.name, 'Out of stock', 'var(--sidebar-text-dim)'))
    .join('');

  const html =
    alertSection('Expiring Soon', isColorBlindMode() ? '#7B5EA7' : '#E8694E', expiringCards) +
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
  if (recipeEl) recipeEl.textContent = AI_RECIPES.length;
}

function pantryDaysBadgeColor(days) {
  if (days <= 1) return isColorBlindMode() ? '#7B5EA7' : '#C24A32';
  if (days <= 5) return '#D9A63D';
  return isColorBlindMode() ? '#4E7FA6' : '#5C7A45';
}

function renderPantryCard(item) {
  const bg = PANTRY_ICON_BG[item.icon] || 'green-soft';
  const noExpiry = PANTRY_NO_EXPIRY_CATEGORIES.includes(item.category) || item.days == null;

  // Urgency styling: an item expiring within 2 days is the most urgent
  // thing in the pantry, so it gets the red, bouncing treatment to grab
  // attention. Low-stock items get a calmer yellow highlight instead -
  // no bounce, since it's a "notice when convenient" not a "look now."
  // If both apply, expiry wins - it's the more time-sensitive problem.
  const isCritical = !noExpiry && item.days <= 2;
  const isRestock = !isCritical && isLowStock(item);
  const isSafe = !isCritical && !isRestock && item.qty > 0;
  const urgencyClass = isCritical ? ' card-critical' : (isRestock ? ' card-restock' : (isSafe ? ' card-safe' : ''));

  let badge = '';
  if (!noExpiry) {
    const badgeColor = pantryDaysBadgeColor(item.days);
    const dayLabel = item.days === 1 ? '1 day left' : item.days + ' days left';
    badge = `<span class="days-badge" style="color:${badgeColor};">${dayLabel}</span>`;
  } else if (item.qty === 0) {
    badge = `<span class="days-badge" style="color:${isColorBlindMode() ? '#7B5EA7' : 'var(--red)'};">Out of Stock</span>`;
  } else if (isLowStock(item)) {
    badge = `<span class="days-badge" style="color:var(--yellow);">Low Stock</span>`;
  } else {
    badge = `<span class="days-badge" style="color:${isColorBlindMode() ? '#4E7FA6' : '#5C7A45'};">In Stock</span>`;
  }

  return `
    <div class="pantry-card${urgencyClass}">
      <div class="pantry-card-menu">
        <button class="pantry-menu-btn" type="button" title="More options" onclick="togglePantryCardMenu(event, '${item.name.replace(/'/g, "\\'")}')">
          <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.9"/><circle cx="12" cy="12" r="1.9"/><circle cx="12" cy="19" r="1.9"/></svg>
        </button>
        <div class="pantry-menu-dropdown">
          <button type="button" onclick="openUpdateItemModal('${item.name.replace(/'/g, "\\'")}', event)">✏️ Update</button>
          <button type="button" onclick="markItemUsed('${item.name.replace(/'/g, "\\'")}', event)">✅ Mark Used/Removed</button>
          <button type="button" class="danger" onclick="deleteItem('${item.name.replace(/'/g, "\\'")}', event)">🗑️ Delete</button>
        </div>
      </div>
      <div class="pantry-illustration" style="background:var(--${bg});">
        ${badge}
        ${PANTRY_ICONS[resolveIconKey(item.icon)] || ''}
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
        <div class="pantry-section-icon" style="background:var(--${bg});">${PANTRY_ICONS[resolveIconKey(cat.icon)] || ''}</div>
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

/* ============================================================
   SHOPPING LIST — swipe deck
   Pulls items that actually need attention (unavailable, low
   stock, or expiring soon) into a card stack. Each card is
   decided by swiping right ("Shopping List", with the qty/unit
   chosen on the card) or left ("Buy Later") — via the on-card
   buttons or a manual mouse/touch drag.
   A hand-gesture recognizer (separate branch) can optionally
   call window.handleGestureSwipe('left' | 'right'), which routes
   into the same decideCurrentCard() flow.
   ============================================================ */

const SHOPPING_UNIT_OPTIONS = [
  { value: 'g',     label: 'g' },
  { value: 'kg',    label: 'kg' },
  { value: 'ml',    label: 'ml' },
  { value: 'L',     label: 'L' },
  { value: 'units', label: 'unit' },
  { value: 'pack',  label: 'packet' },
  { value: 'pcs',   label: 'piece' }
];

let SWIPE_DECK = [];          // cards still to review — {name, category, categoryLabel, icon, statusLabel, statusColor, qty, unit}
let SWIPE_INDEX = 0;          // index of the current top card
let SHOPPING_RESULT = [];     // decided "buy now" items — {name, category, qty, unit}
let BUY_LATER_RESULT = [];    // decided "buy later" items — {name, category}
let shoppingDeckInitialized = false;
let currentDragHandlers = null;

// Items worth reviewing for the shopping list — anything unavailable,
// low on stock, or expiring soon. Fully-stocked items don't need a
// shopping decision, so they're left out of the deck entirely.
function getShoppingCandidates() {
  const combined = [...getUnavailableItems(), ...getExpiringSoonItems(), ...getRestockItems()];
  const seen = new Set();
  const unique = [];
  combined.forEach(item => {
    if (!seen.has(item.name)) {
      seen.add(item.name);
      unique.push(item);
    }
  });
  return unique;
}

function shoppingStatusForItem(item) {
  if (item.qty === 0) return { label: 'Unavailable', color: 'var(--sidebar-text-dim)' };
  if (!isNoExpiryItem(item) && item.days <= EXPIRING_SOON_WITHIN_DAYS) {
    const label = item.days <= 0 ? 'Expires Today' : item.days === 1 ? 'Expires in 1 day' : `Expires in ${item.days} days`;
    return { label, color: isColorBlindMode() ? '#7B5EA7' : '#E8694E' };
  }
  if (isLowStock(item)) return { label: 'Low Stock', color: '#E8C23D' };
  return { label: 'In Stock', color: '#5C7A45' };
}

function unitLabel(unit) {
  const found = SHOPPING_UNIT_OPTIONS.find(u => u.value === unit);
  return found ? found.label : unit;
}

function initShoppingSwipe() {
  SWIPE_DECK = getShoppingCandidates().map(item => {
    const status = shoppingStatusForItem(item);
    const catInfo = PANTRY_CATEGORIES.find(c => c.key === item.category);
    const iconKey = catInfo ? catInfo.icon : (item.icon || 'jar');
    return {
      name: item.name,
      category: item.category,
      categoryLabel: catInfo ? catInfo.label : item.category,
      icon: iconKey,
      statusLabel: status.label,
      statusColor: status.color,
      qty: 1,
      unit: item.unit || 'units'
    };
  });
  // Preserve voice-added shopping / buy-later rows unless Start Over
  const keepShop = Array.isArray(SHOPPING_RESULT) ? SHOPPING_RESULT.slice() : [];
  const keepLater = Array.isArray(BUY_LATER_RESULT) ? BUY_LATER_RESULT.slice() : [];
  SWIPE_INDEX = 0;
  SHOPPING_RESULT = keepShop;
  BUY_LATER_RESULT = keepLater;
  shoppingDeckInitialized = true;
  // If user already has voice shopping items and no cards left to swipe, show results
  if (keepShop.length || keepLater.length) {
    if (SWIPE_DECK.length === 0) {
      renderShoppingResults();
      const resultsEl = document.getElementById('shoppingResults');
      const layoutEl = document.getElementById('shoppingLayout');
      const emptyEl = document.getElementById('shoppingEmptyState');
      if (resultsEl) resultsEl.style.display = 'flex';
      if (layoutEl) layoutEl.style.display = 'none';
      if (emptyEl) emptyEl.style.display = 'none';
      return;
    }
  }
  renderSwipeDeck();
}

function resetShoppingSwipe() {
  SHOPPING_RESULT = [];
  BUY_LATER_RESULT = [];
  shoppingDeckInitialized = false;
  initShoppingSwipe();
}

function renderSwipeDeck() {
  const deckEl = document.getElementById('swipeDeck');
  const progressEl = document.getElementById('swipeProgress');
  const resultsEl = document.getElementById('shoppingResults');
  const emptyEl = document.getElementById('shoppingEmptyState');
  const layoutEl = document.getElementById('shoppingLayout');
  if (!deckEl) return;

  // No items need shopping at all right now.
  if (SWIPE_DECK.length === 0) {
    if (layoutEl) layoutEl.style.display = 'none';
    if (resultsEl) resultsEl.style.display = 'none';
    if (emptyEl) emptyEl.style.display = 'flex';
    return;
  }
  if (emptyEl) emptyEl.style.display = 'none';

  // Every card has been decided — show the two final lists.
  if (SWIPE_INDEX >= SWIPE_DECK.length) {
    if (layoutEl) layoutEl.style.display = 'none';
    renderShoppingResults();
    if (resultsEl) resultsEl.style.display = 'flex';
    return;
  }

  if (layoutEl) layoutEl.style.display = 'flex';
  if (resultsEl) resultsEl.style.display = 'none';

  if (progressEl) progressEl.textContent = `${SWIPE_INDEX} / ${SWIPE_DECK.length} reviewed`;

  const visible = SWIPE_DECK.slice(SWIPE_INDEX, SWIPE_INDEX + 3);
  deckEl.innerHTML = visible.map((item, i) => renderSwipeCard(item, i, SWIPE_INDEX + i)).join('');

  const topCard = deckEl.querySelector('.swipe-card[data-top="true"]');
  if (topCard) attachDragHandlers(topCard);
}

function renderSwipeCard(item, stackPos, globalIdx) {
  const stackClass = stackPos === 0 ? '' : `stack-${stackPos}`;
  const isTop = stackPos === 0;
  const iconKey = item.icon || 'jar';
  const bg = PANTRY_ICON_BG[iconKey] || 'green-soft';
  const iconSvg = PANTRY_ICONS[resolveIconKey(iconKey)] || PANTRY_ICONS.jar;
  return `
    <div class="swipe-card ${stackClass}" data-top="${isTop}" data-idx="${globalIdx}" style="z-index:${10 - stackPos};">
      <div class="swipe-overlay-label left">BUY LATER</div>
      <div class="swipe-overlay-label right">SHOPPING LIST</div>
      <div class="swipe-card-illustration" style="background:var(--${bg});">
        <div class="swipe-card-badge" style="background:${item.statusColor};">${item.statusLabel}</div>
        ${iconSvg}
      </div>
      <div class="swipe-card-body">
        <div class="swipe-card-category">${item.categoryLabel}</div>
        <div class="swipe-card-name">${item.name}</div>
        <div class="swipe-qty-row">
          <button type="button" class="swipe-qty-btn" onclick="adjustSwipeQty(${globalIdx}, -1)">−</button>
          <input type="number" class="swipe-qty-input" id="swipeQtyInput-${globalIdx}" value="${formatQty(item.qty)}" min="0" step="0.1" oninput="setSwipeQty(${globalIdx}, this.value)">
          <button type="button" class="swipe-qty-btn" onclick="adjustSwipeQty(${globalIdx}, 1)">+</button>
          <select class="swipe-unit-select" onchange="setSwipeUnit(${globalIdx}, this.value)">
            ${SHOPPING_UNIT_OPTIONS.map(u => `<option value="${u.value}" ${u.value === item.unit ? 'selected' : ''}>${u.label}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>`;
}

function adjustSwipeQty(idx, delta) {
  const item = SWIPE_DECK[idx];
  if (!item) return;
  item.qty = Math.max(0, Math.round((item.qty + delta) * 100) / 100);
  const input = document.getElementById('swipeQtyInput-' + idx);
  if (input) input.value = formatQty(item.qty);
}

function setSwipeQty(idx, value) {
  const item = SWIPE_DECK[idx];
  if (!item) return;
  const n = parseFloat(value);
  item.qty = isNaN(n) || n < 0 ? 0 : n;
}

function setSwipeUnit(idx, unit) {
  const item = SWIPE_DECK[idx];
  if (!item) return;
  item.unit = unit;
}

// Decides the current top card — used by the on-card buttons, the
// manual drag release, AND the gesture-recognizer hook below, so all
// three input methods funnel through one place.
function decideCurrentCard(direction) {
  if (SWIPE_INDEX >= SWIPE_DECK.length) return;
  const item = SWIPE_DECK[SWIPE_INDEX];

  animateCardOut(direction, () => {
    if (direction === 'right') {
      SHOPPING_RESULT.push({ name: item.name, category: item.categoryLabel, qty: item.qty, unit: item.unit });
    } else {
      BUY_LATER_RESULT.push({ name: item.name, category: item.categoryLabel });
    }
    SWIPE_INDEX++;
    renderSwipeDeck();
  });
}

function animateCardOut(direction, callback) {
  const deckEl = document.getElementById('swipeDeck');
  const topCard = deckEl ? deckEl.querySelector('.swipe-card[data-top="true"]') : null;
  if (!topCard) { callback(); return; }

  topCard.style.transition = 'transform .3s ease, opacity .3s ease';
  topCard.style.transform = `translate(${direction === 'right' ? 640 : -640}px, -40px) rotate(${direction === 'right' ? 25 : -25}deg)`;
  topCard.style.opacity = '0';
  setTimeout(callback, 260);
}

function renderShoppingResults() {
  const shopEl = document.getElementById('shoppingListResult');
  const laterEl = document.getElementById('buyLaterResult');

  if (shopEl) {
    shopEl.innerHTML = SHOPPING_RESULT.length
      ? SHOPPING_RESULT.map(i => `
        <div class="result-row">
          <div><div class="result-row-name">${i.name}</div><div class="result-row-cat">${i.category}</div></div>
          <span class="result-row-qty">${formatQty(i.qty)} ${unitLabel(i.unit)}</span>
        </div>`).join('')
      : '<p class="result-empty">Nothing added yet.</p>';
  }

  if (laterEl) {
    laterEl.innerHTML = BUY_LATER_RESULT.length
      ? BUY_LATER_RESULT.map(i => `
        <div class="result-row">
          <div><div class="result-row-name">${i.name}</div><div class="result-row-cat">${i.category}</div></div>
        </div>`).join('')
      : '<p class="result-empty">Nothing here yet.</p>';
  }
}

/* ---------- Manual drag (mouse + touch) ---------- */
function attachDragHandlers(cardEl) {
  if (currentDragHandlers) {
    document.removeEventListener('mousemove', currentDragHandlers.move);
    document.removeEventListener('mouseup', currentDragHandlers.up);
  }

  let dragging = false, startX = 0, startY = 0, currentX = 0, currentY = 0;
  const threshold = 110;

  const setOverlayOpacity = (dx) => {
    const leftLabel = cardEl.querySelector('.swipe-overlay-label.left');
    const rightLabel = cardEl.querySelector('.swipe-overlay-label.right');
    if (leftLabel) leftLabel.style.opacity = dx < 0 ? Math.min(1, Math.abs(dx) / 100) : 0;
    if (rightLabel) rightLabel.style.opacity = dx > 0 ? Math.min(1, dx / 100) : 0;
  };

  const onPointerDown = (e) => {
    dragging = true;
    const point = e.touches ? e.touches[0] : e;
    startX = point.clientX;
    startY = point.clientY;
    cardEl.style.transition = 'none';
    cardEl.classList.add('dragging');
  };

  const onPointerMove = (e) => {
    if (!dragging) return;
    const point = e.touches ? e.touches[0] : e;
    currentX = point.clientX - startX;
    currentY = point.clientY - startY;
    cardEl.style.transform = `translate(${currentX}px, ${currentY}px) rotate(${currentX / 14}deg)`;
    setOverlayOpacity(currentX);
  };

  const onPointerUp = () => {
    if (!dragging) return;
    dragging = false;
    cardEl.classList.remove('dragging');
    cardEl.style.transition = 'transform .3s ease, opacity .3s ease';

    if (currentX > threshold) {
      decideCurrentCard('right');
    } else if (currentX < -threshold) {
      decideCurrentCard('left');
    } else {
      cardEl.style.transform = 'translate(0,0) rotate(0deg)';
      setOverlayOpacity(0);
    }
    currentX = 0;
    currentY = 0;
  };

  cardEl.addEventListener('mousedown', onPointerDown);
  cardEl.addEventListener('touchstart', onPointerDown, { passive: true });
  cardEl.addEventListener('touchmove', onPointerMove, { passive: true });
  cardEl.addEventListener('touchend', onPointerUp);
  document.addEventListener('mousemove', onPointerMove);
  document.addEventListener('mouseup', onPointerUp);

  currentDragHandlers = { move: onPointerMove, up: onPointerUp };
}

/* ---------- Gesture integration hook ----------
   The hand-swipe gesture recognizer lives in a separate branch /
   module. When available it can call window.handleGestureSwipe('left' | 'right')
   and it will drive the exact same flow as the buttons / drag. */
window.handleGestureSwipe = function (direction) {
  if (direction !== 'left' && direction !== 'right') return;
  decideCurrentCard(direction);
};

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

  // Shopping List: keep the current session (mid-swipe OR finished
  // results list) when switching pages. Only build a fresh deck when
  // there is no active session yet. "Start Over" clears the flag so
  // a new deck is built the next time this page is shown.
  if (pageId === 'shopping') {
    if (shoppingDeckInitialized) {
      renderSwipeDeck(); // restore cards or results list as-is
    } else {
      initShoppingSwipe();
    }
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
  scheduleAiRecipesRefresh();
}

/* ---------- Pantry card 3-dot menu (Update / Mark Used / Delete) ---------- */
function togglePantryCardMenu(evt, name) {
  evt.stopPropagation();
  const dropdown = evt.currentTarget.nextElementSibling;
  const wasOpen = dropdown.classList.contains('open');
  closeAllPantryCardMenus();
  if (!wasOpen) dropdown.classList.add('open');
}

function closeAllPantryCardMenus() {
  document.querySelectorAll('.pantry-menu-dropdown.open').forEach(d => d.classList.remove('open'));
}
document.addEventListener('click', closeAllPantryCardMenus);

/* ---------- Update pantry item (name, qty, unit, category, expiry) ---------- */
function openUpdateItemModal(name, evt) {
  if (evt) evt.stopPropagation();
  closeAllPantryCardMenus();

  const item = PANTRY_ITEMS.find(i => i.name === name);
  if (!item) return;

  document.getElementById('updateItemOriginalName').value = item.name;
  document.getElementById('updateItemName').value = item.name;
  document.getElementById('updateItemQty').value = item.qty;
  document.getElementById('updateItemUnit').value = item.unit;
  document.getElementById('updateItemCategory').value = item.category;

  const expiryInput = document.getElementById('updateItemExpiry');
  if (expiryInput) {
    if (item.days != null && !PANTRY_NO_EXPIRY_CATEGORIES.includes(item.category)) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + item.days);
      expiryInput.value = d.toISOString().slice(0, 10);
    } else {
      expiryInput.value = '';
    }
  }

  const overlay = document.getElementById('updateItemOverlay');
  if (overlay) overlay.style.display = 'flex';
}

function closeUpdateItemModal() {
  const overlay = document.getElementById('updateItemOverlay');
  if (overlay) overlay.style.display = 'none';
  const form = document.getElementById('updateItemForm');
  if (form) form.reset();
}

function adjustUpdateQty(delta) {
  const input = document.getElementById('updateItemQty');
  if (!input) return;
  let val = parseFloat(input.value);
  if (isNaN(val)) val = 0;
  val = Math.max(0, Math.round((val + delta) * 100) / 100);
  input.value = val;
}

function handleUpdateItemSubmit(evt) {
  evt.preventDefault();

  const originalName = document.getElementById('updateItemOriginalName').value;
  const item = PANTRY_ITEMS.find(i => i.name === originalName);
  if (!item) { closeUpdateItemModal(); return; }

  const name = document.getElementById('updateItemName').value.trim();
  const qty = parseFloat(document.getElementById('updateItemQty').value); // decimals allowed
  const unit = document.getElementById('updateItemUnit').value;
  const category = document.getElementById('updateItemCategory').value;
  const expiryValue = document.getElementById('updateItemExpiry').value;

  if (!name || isNaN(qty) || qty < 0) return;

  item.name = name;
  item.qty = qty;
  item.unit = unit;
  item.size = `${formatQty(qty)} ${unit}`;
  item.category = category;
  item.icon = iconForCategory(category);

  if (expiryValue) {
    const msPerDay = 24 * 60 * 60 * 1000;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiryDate = new Date(expiryValue + 'T00:00:00');
    let days = Math.round((expiryDate - today) / msPerDay);
    if (days < 0) days = 0;
    item.days = days;
  } else {
    delete item.days;
  }

  addHistoryEntry(`${item.name} was updated`);

  closeUpdateItemModal();
  renderPantryPage();
  renderPantryGlance();
  renderRecipes();
  renderAlerts();
  renderStats();
  scheduleAiRecipesRefresh();
}

// "Mark Used/Removed" — the product was used up or thrown away (e.g.
// expiry got too close), so it's zeroed out to Out of Stock rather
// than deleted outright: qty -> 0 and expiry cleared to none.
function markItemUsed(name, evt) {
  if (evt) evt.stopPropagation();
  closeAllPantryCardMenus();

  const item = PANTRY_ITEMS.find(i => i.name === name);
  if (!item) return;

  item.qty = 0;
  item.size = `0 ${item.unit}`;
  delete item.days;

  addHistoryEntry(`${item.name} was marked as used/removed`);

  renderPantryPage();
  renderPantryGlance();
  renderRecipes();
  renderAlerts();
  renderStats();
  scheduleAiRecipesRefresh();
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
  scheduleAiRecipesRefresh();

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
    scheduleAiRecipesRefresh();
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

document.addEventListener('DOMContentLoaded', () => {
  renderPantryPage();
  renderPantryGlance();
  renderRecipes();
  renderAlerts();
  renderStats();
  renderHistoryPage();
  setupScanDropzone();
  setupScanCamera();
  fetchAiRecipes(); // initial AI recipe fetch based on whatever's already in the pantry
});

/* ============================================================
   SCAN PRODUCT — upload / drag-drop / camera capture, wired to
   the real backend AI + barcode scanner at POST /api/scan.
   ============================================================ */

let scanCameraStream = null;

function setupScanDropzone() {
  const dropzone = document.getElementById('scanDropzone');
  const fileInput = document.getElementById('scanFileInput');
  const uploadBtn = document.getElementById('scanUploadBtn');
  if (!dropzone || !fileInput || !uploadBtn) return;

  // Click anywhere on the dropzone (or the button) opens the file picker.
  // The "Use Camera" button lives inside the dropzone too, so its own
  // click handler stops the event from bubbling up to this one.
  dropzone.addEventListener('click', () => fileInput.click());
  uploadBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });

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
    if (files && files.length) handleScanFile(files[0]);
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files.length) {
      handleScanFile(fileInput.files[0]);
      fileInput.value = ''; // allow re-selecting the same file later
    }
  });
}

function setupScanCamera() {
  const openBtn = document.getElementById('scanOpenCameraBtn');
  const closeBtn = document.getElementById('scanCloseCameraBtn');
  const captureBtn = document.getElementById('scanCaptureBtn');
  if (!openBtn || !closeBtn || !captureBtn) return;

  openBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openScanCamera();
  });
  closeBtn.addEventListener('click', closeScanCamera);
  captureBtn.addEventListener('click', captureScanPhoto);
}

function openScanCamera() {
  const box = document.getElementById('scanCameraBox');
  const video = document.getElementById('scanVideo');
  const status = document.getElementById('scanCameraStatus');
  if (!box || !video) return;

  box.style.display = 'flex';
  if (status) status.textContent = '';

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    if (status) status.textContent = 'Camera not supported on this device — use "Select Image" instead.';
    return;
  }

  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    .then(stream => {
      scanCameraStream = stream;
      video.srcObject = stream;
    })
    .catch(() => {
      if (status) status.textContent = 'Camera access denied or unavailable — use "Select Image" instead.';
    });
}

function closeScanCamera() {
  const box = document.getElementById('scanCameraBox');
  const video = document.getElementById('scanVideo');
  if (scanCameraStream) {
    scanCameraStream.getTracks().forEach(t => t.stop());
    scanCameraStream = null;
  }
  if (video) video.srcObject = null;
  if (box) box.style.display = 'none';
}

function captureScanPhoto() {
  const video = document.getElementById('scanVideo');
  const canvas = document.getElementById('scanCanvas');
  if (!video || !canvas || !scanCameraStream) return;

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

  closeScanCamera();
  sendImageToScanApi(dataUrl);
}

function handleScanFile(file) {
  if (!file.type || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = () => sendImageToScanApi(reader.result);
  reader.readAsDataURL(file);
}

// Best-effort match of whatever category text the AI/barcode lookup
// returns (e.g. "Snacks", "en:beverages", "Dairy Products") onto one
// of our own category keys — falls back to "others" so nothing is
// ever lost, and the person can always correct it in the form below.
function mapScanCategory(rawCategory) {
  if (!rawCategory) return 'others';
  const text = rawCategory.toLowerCase();
  const found = PANTRY_CATEGORIES.find(c =>
    text.includes(c.key) || text.includes(c.label.toLowerCase().split(' ')[0])
  );
  if (found) return found.key;
  if (/veg/.test(text)) return 'vegetables';
  if (/fruit/.test(text)) return 'fruits';
  if (/rice|flour|grain|atta|cereal/.test(text)) return 'grains';
  if (/pulse|lentil|dal|bean|legume/.test(text)) return 'pulses';
  if (/dairy|milk|egg|curd|paneer|cheese|yog/.test(text)) return 'dairy';
  if (/meat|chicken|fish|mutton|prawn|seafood/.test(text)) return 'nonveg';
  if (/bread|bakery|bun|cake/.test(text)) return 'bakery';
  if (/snack|chips|namkeen|noodle|biscuit/.test(text)) return 'snacks';
  if (/drink|beverage|juice|soda|water|cola/.test(text)) return 'beverages';
  return 'others';
}

function sendImageToScanApi(imageDataUrl) {
  const resultArea = document.getElementById('scanResultArea');
  if (!resultArea) return;

  resultArea.innerHTML = `
    <div class="scan-loading">
      <div class="scan-spinner"></div>
      <span>Scanning package for a barcode, then checking with AI vision if needed…</span>
    </div>`;

  fetch(`${API_BASE}/api/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: imageDataUrl })
  })
    .then(res => res.json().then(body => ({ ok: res.ok, body })))
    .then(({ ok, body }) => {
      if (!ok || !body.success) {
        throw new Error(body.error || 'Scan failed — please try a clearer photo.');
      }
      renderScanResult(body.data, imageDataUrl);
    })
    .catch(err => {
      resultArea.innerHTML = `
        <div class="scan-error">
          <span>Couldn't complete the scan: ${escapeHtmlText(err.message)}. Make sure the storemex backend server is running on <strong>localhost:3000</strong>, then try again.</span>
          <button type="button" class="modal-btn-secondary" onclick="document.getElementById('scanResultArea').innerHTML=''">Dismiss</button>
        </div>`;
    });
}

function renderScanResult(data, imageDataUrl) {
  const resultArea = document.getElementById('scanResultArea');
  if (!resultArea) return;

  const categoryKey = mapScanCategory(data.category);
  const sourceLabel = data.source === 'barcode' ? 'Identified via Barcode' : 'Identified via AI Vision';
  const confidencePct = Math.round((data.confidence || 0) * 100);

  resultArea.innerHTML = `
    <div class="scan-result-card">
      <img class="scan-result-thumb" src="${imageDataUrl}" alt="Scanned package">
      <div class="scan-result-fields">
        <div class="scan-result-badges">
          <span class="scan-source-badge">${sourceLabel}</span>
          <span class="scan-confidence-badge">${confidencePct}% confidence</span>
          ${data.needs_review ? '<span class="scan-confidence-badge" style="background:var(--red-soft);color:#C24A32;">Please double-check</span>' : ''}
        </div>

        <label class="form-label" for="scanResultName">Item name</label>
        <input class="form-input" type="text" id="scanResultName" value="${escapeHtmlText(data.name || '')}">

        <div class="scan-result-row">
          <div>
            <label class="form-label" for="scanResultQty">Quantity</label>
            <input class="form-input" type="number" id="scanResultQty" min="0" step="0.01" value="${data.quantity != null ? data.quantity : 1}">
          </div>
          <div>
            <label class="form-label" for="scanResultUnit">Unit</label>
            <select class="form-input" id="scanResultUnit">
              <option value="kg">kg</option>
              <option value="g">gram</option>
              <option value="L">litre</option>
              <option value="ml">ml</option>
              <option value="units">units</option>
              <option value="pcs">pieces</option>
              <option value="pack">pack</option>
            </select>
          </div>
        </div>

        <label class="form-label" for="scanResultCategory">Category</label>
        <select class="form-input" id="scanResultCategory">
          ${PANTRY_CATEGORIES.map(c => `<option value="${c.key}" ${c.key === categoryKey ? 'selected' : ''}>${c.label}</option>`).join('')}
        </select>

        <label class="form-label" for="scanResultExpiry">Expiry date <span class="form-optional">(optional)</span></label>
        <input class="form-input" type="date" id="scanResultExpiry" value="${data.expiry_date || ''}">

        <div class="modal-actions">
          <button type="button" class="modal-btn-secondary" onclick="document.getElementById('scanResultArea').innerHTML=''">Discard</button>
          <button type="button" class="modal-btn-primary" onclick="confirmScanAddToPantry()">Add to Pantry</button>
        </div>
      </div>
    </div>`;

  // Pre-select the unit the scan actually returned, if it's one we support.
  const unitSelect = document.getElementById('scanResultUnit');
  const rawUnit = (data.unit || '').toLowerCase();
  const unitMap = { g: 'g', gram: 'g', grams: 'g', kg: 'kg', ml: 'ml', l: 'L', litre: 'L', liter: 'L', pcs: 'pcs', piece: 'pcs', pieces: 'pcs', count: 'pcs', pack: 'pack', packet: 'pack', unit: 'units', units: 'units' };
  if (unitSelect && unitMap[rawUnit]) unitSelect.value = unitMap[rawUnit];
}

function confirmScanAddToPantry() {
  const nameInput = document.getElementById('scanResultName');
  const qtyInput = document.getElementById('scanResultQty');
  const unitSelect = document.getElementById('scanResultUnit');
  const categorySelect = document.getElementById('scanResultCategory');
  const expiryInput = document.getElementById('scanResultExpiry');
  if (!nameInput || !qtyInput || !unitSelect || !categorySelect) return;

  const name = nameInput.value.trim();
  const qty = parseFloat(qtyInput.value);
  const unit = unitSelect.value;
  const category = categorySelect.value;
  const expiryValue = expiryInput ? expiryInput.value : '';

  if (!name || isNaN(qty) || qty < 0) {
    nameInput.style.borderColor = !name ? '#C24A32' : '';
    qtyInput.style.borderColor = (isNaN(qty) || qty < 0) ? '#C24A32' : '';
    return;
  }

  let days;
  if (expiryValue) {
    const msPerDay = 24 * 60 * 60 * 1000;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiryDate = new Date(expiryValue + 'T00:00:00');
    days = Math.round((expiryDate - today) / msPerDay);
    if (days < 0) days = 0;
  }

  const normalizedNew = normalizeItemName(name);
  const existing = PANTRY_ITEMS.find(i =>
    normalizeItemName(i.name) === normalizedNew && unitsCompatible(i.unit, unit)
  );

  if (existing) {
    const convertedQty = convertQty(qty, unit, existing.unit);
    existing.qty = Math.round((existing.qty + convertedQty) * 100) / 100;
    existing.size = `${formatQty(existing.qty)} ${existing.unit}`;
    if (existing.category === 'others' && category !== 'others') {
      existing.category = category;
      existing.icon = iconForCategory(category);
    }
    if (days !== undefined && (existing.days === undefined || days < existing.days)) {
      existing.days = days;
    }
    addHistoryEntry(`${existing.name} was updated via scan — now ${formatQty(existing.qty)} ${existing.unit} in stock`);
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
    addHistoryEntry(`${newItem.name} was added to the pantry via scan`);
  }

  const resultArea = document.getElementById('scanResultArea');
  if (resultArea) {
    resultArea.innerHTML = `<div class="scan-loading" style="background:var(--green-soft);color:#5C7A45;"><span>✓ ${escapeHtmlText(name)} added to your pantry.</span></div>`;
    setTimeout(() => { resultArea.innerHTML = ''; }, 2600);
  }

  renderPantryPage();
  renderPantryGlance();
  renderRecipes();
  renderAlerts();
  renderStats();
  scheduleAiRecipesRefresh();
}


/* Restore colour-blind preference on load */
document.addEventListener('DOMContentLoaded', function () {
  applyColorBlindMode(isColorBlindMode());
});
