/* ============================================================
   storemex dashboard — script.js
   Handles: horizontal scroll rows, sidebar page switching,
   and the upload dropzone (UI only, no backend yet).
   ============================================================ */

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
