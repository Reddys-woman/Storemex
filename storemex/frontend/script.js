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
  { key: 'pantryStaples', label: 'Pantry Staples',     icon: 'jar'   },
  { key: 'dryGoods',    label: 'Dry Goods',            icon: 'rice'  },
  { key: 'others',      label: 'Others',               icon: 'jar'   }
];

// Categories that are restock-focused / non-perishable — items here
// are shown without any expiry date or "days left" countdown.
const PANTRY_NO_EXPIRY_CATEGORIES = ['pantryStaples', 'dryGoods'];

// Sample stock data — swap this out for real pantry data later.
// Every item needs: name, category (must match a key above),
// icon (must match a key in PANTRY_ICONS), meta (qty text) and days (days left).
const PANTRY_ITEMS = [
  { name: 'Tomatoes',      category: 'vegetables', icon: 'leaf',   meta: '500 g · Qty: 4',  days: 1  },
  { name: 'Onions',        category: 'vegetables', icon: 'leaf',   meta: '1 kg · Qty: 2',   days: 40 },
  { name: 'Potatoes',      category: 'vegetables', icon: 'leaf',   meta: '2 kg · Qty: 1',   days: 20 },
  { name: 'Spinach',       category: 'vegetables', icon: 'leaf',   meta: '250 g · Qty: 1',  days: 2  },

  { name: 'Apples',        category: 'fruits',     icon: 'apple',  meta: '6 pcs · Qty: 6',  days: 10 },
  { name: 'Bananas',       category: 'fruits',     icon: 'apple',  meta: '1 dozen · Qty: 12', days: 4 },

  { name: 'Basmati Rice',  category: 'grains',     icon: 'rice',   meta: '5 kg · Qty: 1',   days: 120 },
  { name: 'Wheat Flour',   category: 'grains',     icon: 'rice',   meta: '5 kg · Qty: 1',   days: 90  },
  { name: 'Oats',          category: 'grains',     icon: 'rice',   meta: '500 g · Qty: 1',  days: 60  },

  { name: 'Toor Dal',      category: 'pulses',     icon: 'rice',   meta: '1 kg · Qty: 1',   days: 180 },
  { name: 'Chickpeas',     category: 'pulses',     icon: 'rice',   meta: '500 g · Qty: 1',  days: 150 },
  { name: 'Moong Dal',     category: 'pulses',     icon: 'rice',   meta: '1 kg · Qty: 1',   days: 180 },

  { name: 'Amul Milk',     category: 'dairy',      icon: 'bottle', meta: '1 L · Qty: 1',    days: 2  },
  { name: 'Eggs',          category: 'dairy',      icon: 'egg',    meta: '8 pcs · Qty: 6',  days: 5  },
  { name: 'Curd',          category: 'dairy',      icon: 'bottle', meta: '400 g · Qty: 1',  days: 3  },

  { name: 'Chicken',       category: 'nonveg',     icon: 'fish',   meta: '500 g · Qty: 1',  days: 2  },
  { name: 'Fish Fillet',   category: 'nonveg',     icon: 'fish',   meta: '400 g · Qty: 1',  days: 1  },

  { name: 'Bread',         category: 'bakery',     icon: 'bread',  meta: '1 loaf · Qty: 1', days: 4  },
  { name: 'Burger Buns',   category: 'bakery',     icon: 'bread',  meta: '4 pcs · Qty: 4',  days: 3  },

  { name: 'Maggi',         category: 'snacks',     icon: 'snack',  meta: '4 packets · Qty: 3', days: 15 },
  { name: 'Potato Chips',  category: 'snacks',     icon: 'snack',  meta: '2 packets · Qty: 2', days: 25 },
  { name: 'Namkeen',       category: 'snacks',     icon: 'snack',  meta: '1 packet · Qty: 1',  days: 20 },

  { name: 'Cold Drink',    category: 'beverages',  icon: 'bottle', meta: '2 L · Qty: 1',    days: 60 },
  { name: 'Orange Juice',  category: 'beverages',  icon: 'bottle', meta: '1 L · Qty: 1',    days: 7  },

  // 🏠 Pantry Staples — restock-focused, no expiry tracking
  { name: 'Salt',           category: 'pantryStaples', icon: 'jar', meta: '1 kg · Qty: 1' },
  { name: 'Sugar',          category: 'pantryStaples', icon: 'jar', meta: '1 kg · Qty: 1' },
  { name: 'Baking Soda',    category: 'pantryStaples', icon: 'jar', meta: '200 g · Qty: 1' },
  { name: 'Baking Powder',  category: 'pantryStaples', icon: 'jar', meta: '100 g · Qty: 1' },
  { name: 'Cornstarch',     category: 'pantryStaples', icon: 'jar', meta: '200 g · Qty: 1' },
  { name: 'Vinegar',        category: 'pantryStaples', icon: 'bottle', meta: '500 ml · Qty: 1' },
  { name: 'Soy Sauce',      category: 'pantryStaples', icon: 'bottle', meta: '500 ml · Qty: 1' },
  { name: 'Cooking Oil',    category: 'pantryStaples', icon: 'bottle', meta: '1 L · Qty: 1' },
  { name: 'Ghee',           category: 'pantryStaples', icon: 'jar', meta: '500 g · Qty: 1' },
  { name: 'Honey',          category: 'pantryStaples', icon: 'jar', meta: '250 g · Qty: 1' },
  { name: 'Maple Syrup',    category: 'pantryStaples', icon: 'bottle', meta: '250 ml · Qty: 1' },
  { name: 'Dry Spices',     category: 'pantryStaples', icon: 'jar', meta: 'Assorted · Qty: 1' },
  { name: 'Spice Mixes',    category: 'pantryStaples', icon: 'jar', meta: 'Assorted · Qty: 1' },
  { name: 'Tea',            category: 'pantryStaples', icon: 'jar', meta: '250 g · Qty: 1' },
  { name: 'Coffee',         category: 'pantryStaples', icon: 'jar', meta: '200 g · Qty: 1' },
  { name: 'Cocoa Powder',   category: 'pantryStaples', icon: 'jar', meta: '200 g · Qty: 1' },

  // 🌾 Dry Goods — long-lasting, no expiry tracking
  { name: 'Rice',           category: 'dryGoods', icon: 'rice', meta: '5 kg · Qty: 1' },
  { name: 'Wheat Flour / Atta', category: 'dryGoods', icon: 'rice', meta: '5 kg · Qty: 1' },
  { name: 'Maida',          category: 'dryGoods', icon: 'rice', meta: '1 kg · Qty: 1' },
  { name: 'Semolina / Suji', category: 'dryGoods', icon: 'rice', meta: '1 kg · Qty: 1' },
  { name: 'Poha',           category: 'dryGoods', icon: 'rice', meta: '500 g · Qty: 1' },
  { name: 'Oats',           category: 'dryGoods', icon: 'rice', meta: '500 g · Qty: 1' },
  { name: 'Dry Pasta',      category: 'dryGoods', icon: 'rice', meta: '500 g · Qty: 1' },
  { name: 'Dry Noodles',    category: 'dryGoods', icon: 'rice', meta: '500 g · Qty: 1' },
  { name: 'Dried Beans',    category: 'dryGoods', icon: 'rice', meta: '500 g · Qty: 1' },
  { name: 'Lentils / Dal',  category: 'dryGoods', icon: 'rice', meta: '1 kg · Qty: 1' },
  { name: 'Chickpeas',      category: 'dryGoods', icon: 'rice', meta: '500 g · Qty: 1' },
  { name: 'Rajma',          category: 'dryGoods', icon: 'rice', meta: '500 g · Qty: 1' },
  { name: 'Dry Peas',       category: 'dryGoods', icon: 'rice', meta: '500 g · Qty: 1' }
];

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
      <div class="pantry-illustration" style="background:var(--${bg});">
        ${badge}
        ${PANTRY_ICONS[item.icon] || ''}
      </div>
      <div class="pantry-name">${item.name}</div>
      <div class="pantry-meta">${item.meta}</div>
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
// Buttons like "View All Items", "See All Recipes", "Consumption Log"
// etc. call this directly with just the target page id.
function goToPage(pageId, evt) {
  if (evt) evt.preventDefault();
  showPage(null, pageId, null);
}

/* ---------- Upload dropzone (UI only for now) ---------- */
/* ---------- Upload dropzone handling ---------- */
document.addEventListener('DOMContentLoaded', () => {
  renderPantryPage();


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
