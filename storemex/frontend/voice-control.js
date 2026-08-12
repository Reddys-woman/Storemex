/* ============================================================
   Storemex Voice Control v3
   Wake: mex / hey mex / storemex / max
   Special: help | response | stop | open <page> | what\'s in pantry
   Multi-item, shopping list, buy later, absolute expiry dates
   Floating mic on every page
   ============================================================ */

(function () {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  const WAKE_RE = /\b(hey\s+)?(store\s*mex|storemex|mex|max)\b/i;
  const ASR_FIX = {
    rise: 'rice', ricee: 'rice', ryes: 'rice', rys: 'rice',
    flower: 'flour', floar: 'flour',
    bred: 'bread', brad: 'bread',
    onoin: 'onion', union: 'onion', onions: 'onion',
    potatos: 'potato', potatoe: 'potato', aloo: 'potato', aaloo: 'potato',
    doodh: 'milk', milc: 'milk',
    eg: 'eggs', egg: 'eggs',
    tomatos: 'tomato',
    dragonfruit: 'dragon fruit',
    donut: 'donut', doughnut: 'donut',
    cola: 'cold drink', coke: 'cold drink', pepsi: 'cold drink',
    softdrink: 'cold drink', 'soft drink': 'cold drink',
  };

  const MONTHS = {
    january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
    april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
    august: 7, aug: 7, september: 8, sep: 8, sept: 8,
    october: 9, oct: 9, november: 10, nov: 10, december: 11, dec: 11,
  };

  const PAGE_MAP = {
    dashboard: 'dashboard', home: 'dashboard', main: 'dashboard',
    pantry: 'pantry', 'pantry page': 'pantry',
    shopping: 'shopping', 'shopping list': 'shopping', shop: 'shopping',
    scan: 'scan', scanner: 'scan', 'scan product': 'scan',
    recipes: 'recipes', recipe: 'recipes',
    alerts: 'alerts', alert: 'alerts', notifications: 'alerts',
    history: 'history', log: 'history', logs: 'history',
  };

  const UNIT_MAP = {
    kg: 'kg', kilo: 'kg', kilos: 'kg', kilogram: 'kg', kilograms: 'kg',
    g: 'g', gram: 'g', grams: 'g',
    l: 'L', litre: 'L', litres: 'L', liter: 'L', liters: 'L',
    ml: 'ml',
    unit: 'units', units: 'units',
    pack: 'pack', packs: 'pack', packet: 'pack', packets: 'pack',
    pc: 'pcs', pcs: 'pcs', piece: 'pcs', pieces: 'pcs',
    dozen: 'pcs',
  };

  let recognition = null;
  let mode = 'off';
  let commandTimeout = null;
  let processing = false;

  // ---------- TTS ----------
  function stopTalking() {
    try {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    } catch (_) {}
  }

  function speak(text) {
    stopTalking();
    if (!text || !window.speechSynthesis) return;
    try {
      const u = new SpeechSynthesisUtterance(String(text).slice(0, 400));
      u.rate = 1.05;
      window.speechSynthesis.speak(u);
    } catch (_) {}
  }

  function toast(msg, ok) {
    let el = document.getElementById('voiceToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'voiceToast';
      el.className = 'voice-toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.toggle('error', ok === false);
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 4000);
  }

  function setUI(state) {
    mode = state;
    const on = state === 'wake' || state === 'command';
    ['voiceMicBtn', 'voiceFab'].forEach((id) => {
      const b = document.getElementById(id);
      if (!b) return;
      b.classList.toggle('listening', on);
      b.classList.toggle('command-mode', state === 'command');
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    const status = document.getElementById('voiceStatus');
    if (status) {
      status.textContent =
        state === 'command' ? 'Command…' : state === 'wake' ? 'Say “mex”…' : '';
      status.classList.toggle('active', on);
    }
  }

  function refreshUI() {
    try {
      if (typeof renderPantryPage === 'function') renderPantryPage();
      if (typeof renderPantryGlance === 'function') renderPantryGlance();
      if (typeof renderRecipes === 'function') renderRecipes();
      if (typeof renderAlerts === 'function') renderAlerts();
      if (typeof renderStats === 'function') renderStats();
      if (typeof renderHistoryPage === 'function') renderHistoryPage();
      if (typeof shoppingDeckInitialized !== 'undefined') shoppingDeckInitialized = false;
      if (typeof renderShoppingResults === 'function') renderShoppingResults();
    } catch (e) {
      console.warn('[Voice] refresh', e);
    }
  }

  // ---------- helpers ----------
  function lev(a, b) {
    a = a.toLowerCase(); b = b.toLowerCase();
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] =
          a[i - 1] === b[j - 1]
            ? dp[i - 1][j - 1]
            : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
    return dp[m][n];
  }

  function normalizeName(s) {
    let t = String(s || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    // multi-word fixes first
    t = t.replace(/\bsoft\s+drink\b/g, 'cold drink');
    t = t.replace(/\bcold\s+drinks?\b/g, 'cold drink');
    t = t.replace(/\bdragon\s+fruits?\b/g, 'dragon fruit');
    const words = t.split(' ').map((w) => ASR_FIX[w] || w);
    t = words.join(' ');
    if (ASR_FIX[t]) t = ASR_FIX[t];
    return t;
  }

  function findPantryItem(nameHint) {
    if (typeof PANTRY_ITEMS === 'undefined' || !nameHint) return null;
    const hint = normalizeName(nameHint);
    if (!hint) return null;
    let best = null;
    let bestScore = Infinity;
    for (const item of PANTRY_ITEMS) {
      const n = normalizeName(item.name);
      if (n === hint || n.includes(hint) || hint.includes(n)) return item;
      const d = lev(n, hint);
      const thresh = Math.max(2, Math.floor(Math.min(n.length, hint.length) * 0.45));
      if (d < bestScore && d <= thresh) {
        bestScore = d;
        best = item;
      }
    }
    return best;
  }

  function guessCategory(name) {
    const n = normalizeName(name);
    if (/milk|egg|butter|cheese|curd|yogurt|yoghurt|cream/.test(n)) return 'dairy';
    if (/rice|wheat|flour|oat|atta|cereal/.test(n)) return 'grains';
    if (/dal|lentil|bean|chickpea|pulse|chana/.test(n)) return 'pulses';
    if (/onion|potato|tomato|carrot|spinach|cabbage|garlic|ginger|veg|cucumber|pepper|chilli|chili/.test(n))
      return 'vegetables';
    if (/apple|banana|orange|mango|fruit|grape|dragon|berry|watermelon|papaya/.test(n)) return 'fruits';
    if (/bread|bun|cake|biscuit|donut|doughnut|cookie|pastry/.test(n)) return 'bakery';
    if (/chicken|fish|mutton|meat|prawn|shrimp/.test(n)) return 'nonveg';
    if (/juice|soda|water|tea|coffee|drink|cola|coke|pepsi|beverage|cold drink|soft drink|sprite|fanta/.test(n))
      return 'beverages';
    if (/chip|snack|namkeen|popcorn|kurkure/.test(n)) return 'snacks';
    return 'others';
  }

  function prettyName(name) {
    return String(name || '')
      .trim()
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }

  function parseQty(text) {
    const s = String(text || '').toLowerCase();
    if (/\bhalf\s*(a\s*)?dozen\b/.test(s)) return 6;
    if (/\ba\s+dozen\b|\bdozen\b/.test(s)) return 12;
    const m = s.match(/(\d+(?:\.\d+)?)/);
    if (m) return parseFloat(m[1]);
    const words = {
      one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, half: 0.5,
    };
    for (const [w, v] of Object.entries(words)) {
      if (new RegExp('\\b' + w + '\\b').test(s)) return v;
    }
    return null;
  }

  function parseUnit(text) {
    const keys = Object.keys(UNIT_MAP).sort((a, b) => b.length - a.length);
    for (const k of keys) {
      if (new RegExp('\\b' + k + '\\b', 'i').test(text)) return UNIT_MAP[k];
    }
    return null;
  }

  /** Parse "26 november 2026" / "nov 26 2026" / "2026-11-26" → {days, iso} */
  function parseAbsoluteDate(text) {
    const s = String(text || '').toLowerCase().trim();
    // ISO
    let m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) {
      const d = new Date(+m[1], +m[2] - 1, +m[3]);
      return dateToDays(d);
    }
    // 26 november 2026 / 26th nov 2026
    m = s.match(/(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)\s+(\d{4})/);
    if (m && MONTHS[m[2]] != null) {
      const d = new Date(+m[3], MONTHS[m[2]], +m[1]);
      return dateToDays(d);
    }
    // november 26 2026
    m = s.match(/([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\s*,?\s*(\d{4})/);
    if (m && MONTHS[m[1]] != null) {
      const d = new Date(+m[3], MONTHS[m[1]], +m[2]);
      return dateToDays(d);
    }
    // 26/11/2026 or 26-11-2026
    m = s.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (m) {
      const d = new Date(+m[3], +m[2] - 1, +m[1]);
      return dateToDays(d);
    }
    return null;
  }

  function dateToDays(d) {
    if (isNaN(d.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    const days = Math.round((d - today) / (24 * 60 * 60 * 1000));
    const iso =
      d.getFullYear() +
      '-' +
      String(d.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(d.getDate()).padStart(2, '0');
    return { days: Math.max(0, days), iso };
  }

  function stripWake(s) {
    return String(s || '')
      .replace(WAKE_RE, ' ')
      .replace(/^[\s,.\-!:]+/, '')
      .trim();
  }

  // ---------- actions ----------
  function applyUpdate(item, qty, unit) {
    const prev = `${formatQty(item.qty)} ${item.unit}`;
    if (unit) {
      if (
        typeof unitsCompatible === 'function' &&
        unitsCompatible(unit, item.unit) &&
        typeof convertQty === 'function'
      ) {
        qty = convertQty(qty, unit, item.unit);
      } else {
        item.unit = unit;
      }
    }
    item.qty = Math.round(Math.max(0, Number(qty)) * 100) / 100;
    item.size = `${formatQty(item.qty)} ${item.unit}`;
    if (typeof addHistoryEntry === 'function') {
      addHistoryEntry(`Voice: ${item.name} ${prev} → ${formatQty(item.qty)} ${item.unit}`);
    }
    return `${item.name} now ${formatQty(item.qty)} ${item.unit}`;
  }

  function applyAdd(name, qty, unit, categoryHint) {
    const existing = findPantryItem(name);
    if (existing) {
      const q = qty == null ? existing.qty + (qty == null ? 1 : 0) : qty;
      // if qty provided as absolute stock set, use update
      if (qty != null) return applyUpdate(existing, qty, unit);
      return applyUpdate(existing, existing.qty + 1, unit);
    }
    let category = categoryHint || guessCategory(name);
    // force beverages keywords
    if (/cold drink|beverage|soda|cola|juice|drink/.test(normalizeName(name))) category = 'beverages';
    const icon = typeof iconForCategory === 'function' ? iconForCategory(category) : 'jar';
    const u = unit || 'pcs';
    const q = qty == null ? 1 : Math.max(0, Number(qty));
    const newItem = {
      name: prettyName(normalizeName(name) || name),
      category,
      icon,
      size: `${formatQty(q)} ${u}`,
      unit: u,
      qty: q,
    };
    PANTRY_ITEMS.push(newItem);
    if (typeof addHistoryEntry === 'function') {
      addHistoryEntry(`Voice: added ${newItem.name} (${formatQty(newItem.qty)} ${newItem.unit}) in ${category}`);
    }
    return `Added ${newItem.name} ${formatQty(newItem.qty)} ${newItem.unit}`;
  }

  function applyRemove(name) {
    const item = findPantryItem(name);
    if (!item) return `No ${name} in pantry`;
    const idx = PANTRY_ITEMS.indexOf(item);
    if (idx >= 0) PANTRY_ITEMS.splice(idx, 1);
    if (typeof addHistoryEntry === 'function') addHistoryEntry(`Voice: removed ${item.name}`);
    return `Removed ${item.name}`;
  }

  function applyExpiry(name, days, expiryIso) {
    let item = findPantryItem(name);
    if (!item) {
      applyAdd(name, 1, 'pcs');
      item = findPantryItem(name);
    }
    if (!item) return null;
    if (expiryIso) {
      const parsed = parseAbsoluteDate(expiryIso) || dateToDays(new Date(expiryIso));
      if (parsed) item.days = parsed.days;
    } else if (days != null && !isNaN(days)) {
      item.days = Math.max(0, Number(days));
    }
    if (typeof addHistoryEntry === 'function') {
      addHistoryEntry(`Voice: ${item.name} expires in ${item.days} day(s)`);
    }
    return `${item.name} expires in ${item.days} day(s)`;
  }

  function showShoppingResultsUI() {
    try {
      if (typeof shoppingDeckInitialized !== 'undefined') shoppingDeckInitialized = true;
      if (typeof SWIPE_DECK !== 'undefined' && typeof SWIPE_INDEX !== 'undefined') {
        SWIPE_INDEX = Math.max(SWIPE_DECK.length, 0);
      }
      if (typeof renderShoppingResults === 'function') renderShoppingResults();
      const resultsEl = document.getElementById('shoppingResults');
      const layoutEl = document.getElementById('shoppingLayout');
      const emptyEl = document.getElementById('shoppingEmptyState');
      if (resultsEl) resultsEl.style.display = 'flex';
      if (layoutEl) layoutEl.style.display = 'none';
      if (emptyEl) emptyEl.style.display = 'none';
    } catch (_) {}
  }

  function applyShopping(name, qty, unit, later) {
    const n = prettyName(normalizeName(name) || name);
    const q = qty == null ? 1 : Number(qty);
    const u = unit || 'pcs';
    if (later) {
      if (typeof BUY_LATER_RESULT === 'undefined') return null;
      const existing = BUY_LATER_RESULT.find((i) => normalizeName(i.name) === normalizeName(n));
      if (!existing) BUY_LATER_RESULT.push({ name: n, category: guessCategory(n) });
      if (typeof addHistoryEntry === 'function') addHistoryEntry(`Voice: buy later ← ${n}`);
      showShoppingResultsUI();
      return `Buy later: ${n}`;
    }
    if (typeof SHOPPING_RESULT === 'undefined') return null;
    const existing = SHOPPING_RESULT.find((i) => normalizeName(i.name) === normalizeName(n));
    if (existing) {
      existing.qty = q;
      existing.unit = u;
    } else {
      SHOPPING_RESULT.push({ name: n, category: guessCategory(n), qty: q, unit: u });
    }
    if (typeof addHistoryEntry === 'function') {
      addHistoryEntry(`Voice: shopping list ← ${n} (${formatQty(q)} ${u})`);
    }
    showShoppingResultsUI();
    return `Shopping list: ${n} ${formatQty(q)} ${u}`;
  }

  function openPage(pageKey) {
    const id = PAGE_MAP[normalizeName(pageKey)] || PAGE_MAP[pageKey.toLowerCase()];
    if (!id) return `Unknown page ${pageKey}`;
    if (typeof goToPage === 'function') goToPage(id, null);
    else if (typeof showPage === 'function') showPage(null, id, null);
    if (typeof addHistoryEntry === 'function') addHistoryEntry(`Voice: opened ${id}`);
    return `Opening ${id}`;
  }

  function listPantry() {
    if (typeof PANTRY_ITEMS === 'undefined' || !PANTRY_ITEMS.length) {
      return 'Pantry is empty.';
    }
    const withStock = PANTRY_ITEMS.filter((i) => i.qty > 0);
    const out = PANTRY_ITEMS.filter((i) => i.qty === 0);
    let msg = '';
    if (withStock.length) {
      msg +=
        'In stock: ' +
        withStock
          .slice(0, 12)
          .map((i) => `${i.name} ${formatQty(i.qty)} ${i.unit}`)
          .join(', ');
      if (withStock.length > 12) msg += ` and ${withStock.length - 12} more`;
      msg += '. ';
    }
    if (out.length) {
      msg += 'Out of stock: ' + out.slice(0, 8).map((i) => i.name).join(', ') + '.';
    }
    return msg.trim() || 'Pantry is empty.';
  }

  function listAlerts(kind) {
    const exp =
      typeof getExpiringSoonItems === 'function' ? getExpiringSoonItems() : [];
    const low = typeof getRestockItems === 'function' ? getRestockItems() : [];
    const unavail =
      typeof getUnavailableItems === 'function' ? getUnavailableItems() : [];

    if (kind === 'expiring') {
      if (!exp.length) return 'Nothing is expiring soon.';
      return (
        'Expiring soon: ' +
        exp
          .slice(0, 10)
          .map((i) => `${i.name} in ${i.days} day${i.days === 1 ? '' : 's'}`)
          .join(', ')
      );
    }
    if (kind === 'restock') {
      if (!low.length) return 'Nothing needs restocking.';
      return (
        'Need restock: ' +
        low
          .slice(0, 10)
          .map((i) => `${i.name} (${formatQty(i.qty)} ${i.unit})`)
          .join(', ')
      );
    }
    if (kind === 'unavailable' || kind === 'out') {
      if (!unavail.length) return 'Nothing is fully out of stock.';
      return 'Out of stock: ' + unavail.slice(0, 10).map((i) => i.name).join(', ');
    }
    // summary
    const parts = [];
    parts.push(
      exp.length
        ? `Expiring: ${exp
            .slice(0, 5)
            .map((i) => `${i.name} (${i.days}d)`)
            .join(', ')}`
        : 'Nothing expiring soon'
    );
    parts.push(
      low.length
        ? `Restock: ${low
            .slice(0, 5)
            .map((i) => i.name)
            .join(', ')}`
        : 'No low stock'
    );
    parts.push(
      unavail.length
        ? `Out: ${unavail
            .slice(0, 5)
            .map((i) => i.name)
            .join(', ')}`
        : 'Nothing out of stock'
    );
    return parts.join('. ') + '.';
  }

  function helpText() {
    return (
      'Say mex, then a command. Examples: update milk to 2 litre; ' +
      'add dragon fruit 1 piece; add 2 kg potato to shopping list; ' +
      'remove onion; open pantry; what is in pantry; what is expiring; ' +
      'set expiry of potato to 26 november 2026; mex stop; mex response.'
    );
  }

  // ---------- multi-clause split (handles many items) ----------
  function splitClauses(text) {
    let t = stripWake(text);
    // normalize separators
    t = t.replace(/\s+and\s+/gi, ', ');
    // "update apple to 5kg, banana to 1 dozen, milk to 2 litre, remove onion"
    // Insert markers before remove/delete/add/update/set when mid-sentence
    t = t.replace(
      /,\s*(?=(?:remove|delete|add|update|set|make|change|put|open)\b)/gi,
      ' || '
    );
    // Also split bare "NAME to QTY" sequences after commas
    // e.g. "banana to 1 dozen, milk to 2 litre"
    const rough = t.split(/\s*\|\|\s*|,\s*/).map((s) => s.trim()).filter(Boolean);
    // Merge orphan qty fragments? Keep as-is; each piece parsed alone
    // If first piece is "update apple to 5kg" and next is "banana to 1 dozen"
    // treat second as update too via localParseOne
    return rough;
  }

  function extractNameFromLeft(left) {
    return left
      .replace(/^(?:please\s+)?(?:update|set|make|change|put|add)\s+/i, '')
      .replace(/\b(the|quantity|qty|stock|amount|of)\b/gi, ' ')
      .replace(new RegExp('\\b(' + Object.keys(UNIT_MAP).join('|') + ')\\b', 'gi'), ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function localParseOne(part, defaultAction) {
    part = part.trim();
    if (!part) return null;

    // stop / help / response handled higher

    // open page
    let m = part.match(/^(?:open|go to|show|navigate to)\s+(.+)$/i);
    if (m) return { type: 'open', name: m[1].trim() };

    // queries
    if (/what('?s| is| are)?\s+(in\s+)?(the\s+)?pantry|list\s+(the\s+)?pantry|what\s+do\s+we\s+have/i.test(part)) {
      return { type: 'query_pantry' };
    }
    if (/what('?s| is)?\s+expir|near\s+expir|expiring\s+soon/i.test(part)) {
      return { type: 'query_expiring' };
    }
    if (/need\s+restock|low\s+stock|restocking/i.test(part)) {
      return { type: 'query_restock' };
    }
    if (/out\s+of\s+stock|unavailable|what('?s| is)?\s+missing/i.test(part)) {
      return { type: 'query_unavailable' };
    }
    if (/status|alerts?|what\s+needs\s+attention/i.test(part)) {
      return { type: 'query_alerts' };
    }

    // expiry with absolute or relative date
    m = part.match(
      /(?:update\s+|set\s+)?(?:the\s+)?expir(?:y|y date|es)?\s+(?:date\s+)?(?:of\s+|for\s+)?(.+?)\s+to\s+(.+)$/i
    );
    if (m) {
      const name = m[1].trim();
      const val = m[2].trim();
      const abs = parseAbsoluteDate(val);
      if (abs) return { type: 'set_expiry', name, days: abs.days, expiry: abs.iso };
      const days = parseQty(val);
      if (days != null) return { type: 'set_expiry', name, days, expiry: null };
    }
    m = part.match(/(.+?)\s+expir(?:es|y)?\s+(?:in\s+)?(\d+)\s*days?/i);
    if (m) return { type: 'set_expiry', name: m[1].replace(/^(set|update)\s+/i, '').trim(), days: +m[2], expiry: null };

    // remove
    m = part.match(/^(?:remove|delete|clear)\s+(.+)$/i);
    if (m) return { type: 'remove', name: m[1].replace(/\s+from\s+.*$/i, '').trim() };

    // shopping / buy later
    const isLater = /\b(buy later|later list)\b/i.test(part);
    const isShop = /\b(shopping list|to buy|buy list|grocery list)\b/i.test(part) || isLater;

    // add ...
    m = part.match(/^(?:add|put)\s+(.+)$/i);
    if (m) {
      let rest = m[1];
      // "cold drink in beverages"
      let catHint = null;
      const catM = rest.match(/\bin\s+(beverages|dairy|fruits|vegetables|grains|bakery|snacks|others|non-?veg|pulses)\b/i);
      if (catM) {
        catHint = catM[1].toLowerCase().replace('non-veg', 'nonveg').replace('non veg', 'nonveg');
        if (catHint === 'beverage') catHint = 'beverages';
        rest = rest.replace(catM[0], ' ');
      }
      rest = rest.replace(/\b(to|on|into)\s+(the\s+)?(shopping list|pantry|buy list|buy later)\b/gi, ' ');
      const qty = parseQty(rest);
      const unit = parseUnit(rest);
      let name = rest
        .replace(/(\d+(?:\.\d+)?)/g, ' ')
        .replace(/\b(half\s*(a\s*)?dozen|dozen|one|two|three|four|five|six|seven|eight|nine|ten)\b/gi, ' ')
        .replace(new RegExp('\\b(' + Object.keys(UNIT_MAP).join('|') + ')\\b', 'gi'), ' ')
        .replace(/\b(of|in)\b/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      return {
        type: isLater ? 'buy_later' : isShop ? 'add_shopping' : 'add',
        name: name || rest,
        qty: qty != null ? qty : 1,
        unit,
        category: catHint,
      };
    }

    // update/set X to Y
    m = part.match(/^(?:update|set|make|change)\s+(.+?)\s+to\s+(.+)$/i);
    if (m) {
      return {
        type: 'update',
        name: extractNameFromLeft(m[1]),
        qty: parseQty(m[2]),
        unit: parseUnit(m[2]),
      };
    }

    // "NAME to QTY UNIT" (continuation after multi-split)
    m = part.match(/^(.+?)\s+to\s+(.+)$/i);
    if (m && parseQty(m[2]) != null) {
      return {
        type: defaultAction || 'update',
        name: extractNameFromLeft(m[1]),
        qty: parseQty(m[2]),
        unit: parseUnit(m[2]),
      };
    }

    // bare "NAME QTY UNIT"
    const qty = parseQty(part);
    const unit = parseUnit(part);
    if (qty != null) {
      let name = part
        .replace(/(\d+(?:\.\d+)?)/g, ' ')
        .replace(new RegExp('\\b(' + Object.keys(UNIT_MAP).join('|') + ')\\b', 'gi'), ' ')
        .replace(/\b(half\s*(a\s*)?dozen|dozen)\b/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (name) {
        return {
          type: isLater ? 'buy_later' : isShop ? 'add_shopping' : defaultAction || 'add',
          name,
          qty,
          unit,
        };
      }
    }
    return null;
  }

  function localParse(transcript) {
    const clauses = splitClauses(transcript);
    const actions = [];
    let defaultAction = 'update';
    for (const c of clauses) {
      if (/^(update|set|make|change)\b/i.test(c)) defaultAction = 'update';
      if (/^add\b/i.test(c)) defaultAction = 'add';
      if (/^remove\b/i.test(c)) defaultAction = 'remove';
      const a = localParseOne(c, defaultAction);
      if (a) actions.push(a);
    }
    return {
      actions,
      reply: actions.length ? 'Okay' : "Didn't catch that",
    };
  }

  function runActions(actions) {
    const lines = [];
    for (const a of actions) {
      if (!a) continue;
      const type = (a.type || '').toLowerCase();
      try {
        if (type === 'open') {
          lines.push(openPage(a.name || a.page || ''));
        } else if (type === 'query_pantry') {
          lines.push(listPantry());
        } else if (type === 'query_expiring') {
          lines.push(listAlerts('expiring'));
        } else if (type === 'query_restock') {
          lines.push(listAlerts('restock'));
        } else if (type === 'query_unavailable') {
          lines.push(listAlerts('unavailable'));
        } else if (type === 'query_alerts') {
          lines.push(listAlerts('all'));
        } else if (type === 'help') {
          lines.push(helpText());
        } else if (type === 'remove') {
          lines.push(applyRemove(a.name));
        } else if (type === 'add_shopping' || type === 'shopping') {
          lines.push(applyShopping(a.name, a.qty, a.unit, false) || 'Could not update shopping list');
        } else if (type === 'buy_later') {
          lines.push(applyShopping(a.name, a.qty, a.unit, true) || 'Could not update buy later');
        } else if (type === 'set_expiry' || type === 'expiry') {
          lines.push(applyExpiry(a.name, a.days, a.expiry) || 'Could not set expiry');
        } else if (type === 'add') {
          lines.push(applyAdd(a.name, a.qty, a.unit, a.category));
        } else if (type === 'query') {
          const item = findPantryItem(a.name);
          lines.push(item ? `${item.name}: ${formatQty(item.qty)} ${item.unit}` : `${a.name} not in pantry`);
        } else {
          // update
          if (!a.name) continue;
          const item = findPantryItem(a.name);
          if (!item) lines.push(applyAdd(a.name, a.qty == null ? 1 : a.qty, a.unit, a.category));
          else if (a.qty == null || isNaN(a.qty)) lines.push(`${item.name} is ${formatQty(item.qty)} ${item.unit}`);
          else lines.push(applyUpdate(item, a.qty, a.unit));
        }
      } catch (e) {
        console.warn('[Voice] action failed', a, e);
        lines.push('Error on ' + (a.name || type));
      }
    }
    refreshUI();
    return lines;
  }

  // ---------- LLM ----------
  function apiBase() {
    if (location.protocol === 'http:' || location.protocol === 'https:') return '';
    return 'http://127.0.0.1:3000';
  }

  async function parseWithLLM(transcript) {
    const names = (typeof PANTRY_ITEMS !== 'undefined' ? PANTRY_ITEMS : []).map((i) => i.name);
    const res = await fetch(apiBase() + '/api/voice/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript, pantryNames: names }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'HTTP ' + res.status);
    }
    const body = await res.json();
    return body.data;
  }

  // ---------- special commands before NLU ----------
  function handleSpecial(raw) {
    const t = stripWake(raw).toLowerCase().replace(/[?.!]/g, '').trim();
    if (!t) return null;

    if (/^(stop|quiet|silence|shut up|enough)$/.test(t) || t === 'mex stop') {
      stopTalking();
      toast('Stopped.', true);
      return 'stop';
    }
    if (/^(help|commands|what can you do)$/.test(t)) {
      const h = helpText();
      toast(h, true);
      speak(h);
      return 'help';
    }
    if (/^(response|respond|are you there|you there|ping|test|hello|hi)$/.test(t)) {
      const msg = "I'm here. Listening. Say a command, or say help.";
      toast(msg, true);
      speak(msg);
      return 'response';
    }
    return null;
  }

  async function handleTranscript(raw) {
    if (processing) return;
    let text = (raw || '').trim();
    if (!text) return;

    // Always allow stop even mid-processing path
    if (/\b(mex|max|storemex)\s+stop\b/i.test(text) || /^stop$/i.test(stripWake(text))) {
      stopTalking();
      processing = false;
      toast('Stopped.', true);
      if (mode !== 'off') enterWakeMode();
      return;
    }

    if (mode === 'wake') {
      if (!WAKE_RE.test(text)) return;
      stopTalking();
      const after = stripWake(text);
      if (after.length < 2) {
        enterCommandMode();
        toast('Yes?', true);
        speak('Yes?');
        return;
      }
      text = after;
    } else {
      // command mode — still strip wake if present
      text = stripWake(text) || text;
    }

    const special = handleSpecial(text);
    if (special) {
      if (mode !== 'off') enterWakeMode();
      return;
    }

    processing = true;
    stopTalking();
    toast('Heard: “' + text + '”', true);

    let parsed = null;
    try {
      parsed = await parseWithLLM(text);
    } catch (e) {
      console.warn('[Voice] LLM failed, local NLU:', e.message);
      parsed = localParse(text);
    }

    // If LLM returned actions, still merge any local multi-clause we might have better split
    if (parsed && parsed.actions && parsed.actions.length) {
      // map LLM types
      parsed.actions = parsed.actions.map((a) => {
        const t = (a.type || '').toLowerCase();
        if (t === 'add_shopping') return a;
        if (t === 'buy_later') return a;
        return a;
      });
    } else {
      parsed = localParse(text);
    }

    // If still empty, try local anyway as secondary
    if (!parsed.actions || !parsed.actions.length) {
      parsed = localParse(text);
    }

    if (!parsed.actions || !parsed.actions.length) {
      toast("Didn't get that.", false);
      speak("Didn't get that.");
      processing = false;
      if (mode !== 'off') enterWakeMode();
      return;
    }

    const lines = runActions(parsed.actions);
    const summary = lines.join('. ');
    toast(summary || 'Done.', true);
    // speak full multi-item result but capped
    speak(summary.slice(0, 350) || 'Done');
    processing = false;
    if (mode !== 'off') enterWakeMode();
  }

  // ---------- recognition ----------
  function ensureRec() {
    if (!SpeechRecognition) return null;
    if (recognition) return recognition;
    recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;
    recognition.continuous = true;
    recognition.onerror = (e) => {
      if (e.error === 'not-allowed') {
        toast('Allow microphone access.', false);
        mode = 'off';
        setUI('off');
      }
    };
    recognition.onend = () => {
      if (mode === 'wake' || mode === 'command') {
        try {
          recognition.start();
        } catch (_) {}
      } else setUI('off');
    };
    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (!r.isFinal) continue;
        handleTranscript(r[0].transcript);
      }
    };
    return recognition;
  }

  function enterWakeMode() {
    clearTimeout(commandTimeout);
    setUI('wake');
    const rec = ensureRec();
    if (!rec) {
      toast('Voice needs Chrome or Edge.', false);
      setUI('off');
      return;
    }
    try {
      rec.continuous = true;
      rec.start();
    } catch (_) {}
  }

  function enterCommandMode() {
    setUI('command');
    clearTimeout(commandTimeout);
    commandTimeout = setTimeout(() => {
      if (mode === 'command') enterWakeMode();
    }, 10000);
    const rec = ensureRec();
    if (rec) {
      try {
        rec.start();
      } catch (_) {}
    }
  }

  function stopAll() {
    clearTimeout(commandTimeout);
    mode = 'off';
    stopTalking();
    processing = false;
    if (recognition) {
      try {
        recognition.onend = null;
        recognition.stop();
      } catch (_) {}
      recognition = null;
    }
    setUI('off');
  }

  function toggle() {
    stopTalking();
    if (mode === 'off') enterWakeMode();
    else stopAll();
  }

  window.StoremexVoice = {
    start: enterWakeMode,
    stop: stopAll,
    toggle,
    handleTranscript,
    isSupported: !!SpeechRecognition,
  };

  // ---------- mount floating FAB + topbar mic (always) ----------
  function mountFab() {
    if (document.getElementById('voiceFab')) return;
    const fab = document.createElement('button');
    fab.type = 'button';
    fab.id = 'voiceFab';
    fab.className = 'voice-fab';
    fab.title = 'Voice control — say mex…';
    fab.setAttribute('aria-label', 'Voice control');
    fab.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="22" height="22">' +
      '<rect x="9" y="2" width="6" height="11" rx="3"/>' +
      '<path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></svg>' +
      '<span class="voice-pulse" aria-hidden="true"></span>';
    fab.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      stopTalking();
      toggle();
    });
    document.body.appendChild(fab);
  }

  function mountTopbar() {
    const topbarRight = document.querySelector('.topbar-right');
    if (!topbarRight || document.getElementById('voiceMicBtn')) return;
    const wrap = document.createElement('div');
    wrap.className = 'voice-wrap';
    wrap.innerHTML =
      '<button type="button" class="icon-btn voice-mic-btn" id="voiceMicBtn" title="Voice control" aria-pressed="false">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">' +
      '<rect x="9" y="2" width="6" height="11" rx="3"/>' +
      '<path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></svg>' +
      '<span class="voice-pulse" aria-hidden="true"></span></button>' +
      '<span class="voice-status" id="voiceStatus"></span>';
    const notif = topbarRight.querySelector('.notif-wrap');
    if (notif) topbarRight.insertBefore(wrap, notif);
    else topbarRight.appendChild(wrap);
    document.getElementById('voiceMicBtn').addEventListener('click', (e) => {
      e.preventDefault();
      stopTalking();
      toggle();
    });
  }

  function mount() {
    mountFab();
    mountTopbar();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
  // re-ensure FAB after SPA-ish renders
  setInterval(mountFab, 2000);
})();
