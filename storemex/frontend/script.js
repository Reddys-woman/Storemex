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
document.addEventListener('DOMContentLoaded', () => {
  const dropzone = document.getElementById('uploadDropzone');
  const fileInput = document.getElementById('fileInput');
  const uploadBtn = document.getElementById('uploadBtn');
  const fileList = document.getElementById('uploadFileList');

  if (!dropzone || !fileInput) return;

  // Click anywhere on the dropzone (or the button) opens the file picker
  dropzone.addEventListener('click', () => fileInput.click());
  uploadBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  // Drag & drop visual state
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
    if (files && files.length) handleFiles(files);
  });

  // File picker selection
  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files.length) {
      handleFiles(fileInput.files);
      fileInput.value = ''; // allow re-selecting the same file later
    }
  });

  function handleFiles(fileArray) {
    Array.from(fileArray).forEach(file => {
      const fileRow = addFileRow(file);
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
        const response = await fetch('/api/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64Image })
        });
        const data = await response.json();
        if (data.success && data.data) {
          const item = data.data;
          statusSpan.style.color = '#10b981';
          statusSpan.textContent = ` ✅ Scanned: ${item.brand} ${item.name} (${item.quantity || ''} ${item.unit || ''})`;
        } else {
          statusSpan.style.color = '#ef4444';
          statusSpan.textContent = ' ❌ Scan failed';
        }
      } catch (err) {
        console.error('Scan API error:', err);
        statusSpan.style.color = '#ef4444';
        statusSpan.textContent = ' ❌ Scan error';
      }
    };
    reader.readAsDataURL(file);
  }

  function addFileRow(file) {
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
