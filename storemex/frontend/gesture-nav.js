/* ==========================================================
   gesture-nav.js — StoreMex
   Camera-based hand gesture navigation
   ONE-HAND NAVIGATION
   ----------------------------------------------------------
   ✊ 0 fingers → Dashboard
   ☝️ 1 finger  → Pantry
   ✌️ 2 fingers → Scan
   🤟 3 fingers → Recipes
   🖖 4 fingers → Shopping
   🖐️ 5 fingers → Alerts
   TWO-HAND GESTURES (take priority over one-hand navigation)
   ----------------------------------------------------------
   👐 Both palms open  → Pause / Resume gesture navigation
   👍👍 Both thumbs up  → Confirm
   👎👎 Both thumbs down → Cancel
   ✊✊ Both fists       → Disable gesture navigation
   NOTE: a single-hand 👍 or 👎 must NOT trigger Confirm/Cancel.
   CONTEXTUAL PINCH (🤏)
   ----------------------------------------------------------
   Dashboard            → toggle colour-blind mode
   Pantry               → open Add Item modal
   Scan page            → open camera
   Scan camera open     → capture
   Scan result visible  → focus current field
   Shopping             → toggle voice assistant
   SCAN RESULT
   ----------------------------------------------------------
   ← / →  → previous / next form control (native focus)
   ↑ / ↓  → change select option (when a <select> is focused)
   👍👍   → confirm current field / add to pantry on last field
   👎👎   → discard scan result
   SHOPPING
   ----------------------------------------------------------
   ← / →  → decideCurrentCard("left" / "right") (existing logic)
   🤏     → toggle #voiceFab
   ========================================================== */

import {
  HandLandmarker,
  FilesetResolver,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";

// ============================================================
// 1. PAGE MAPPING
// ============================================================
const GESTURE_PAGE_MAP = {
  0: "dashboard",
  1: "pantry",
  2: "scan",
  3: "recipes",
  4: "shopping",
  5: "alerts",
};

// ============================================================
// 2. MEDIAPIPE / RUNTIME STATE
// ============================================================
let handLandmarker = null;
let running = false;
let gesturePaused = false;

// ============================================================
// 3. WIDGET STYLES
// ============================================================
const style = document.createElement("style");
style.textContent = `
  #gnav-widget {
    position: fixed;
    right: 20px;
    bottom: 20px;
    width: 220px;
    background: #101610f0;
    border: 1px solid #2a352680;
    border-radius: 16px;
    padding: 12px;
    font-family: "SF Mono", "Menlo", monospace;
    font-size: 11px;
    color: #8fa08a;
    z-index: 99999;
    backdrop-filter: blur(6px);
    box-shadow: 0 8px 30px -6px rgba(0,0,0,0.5);
  }
  #gnav-cam-shell {
    position: relative;
    width: 100%;
    aspect-ratio: 4/3;
    border-radius: 10px;
    overflow: hidden;
    background: #000;
    margin-bottom: 8px;
  }
  #gnav-video,
  #gnav-overlay {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transform: scaleX(-1);
  }
  #gnav-status {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
  }
  #gnav-tag {
    color: #d99a3d;
    font-weight: 600;
  }
  #gnav-toggle {
    width: 100%;
    padding: 8px;
    border-radius: 999px;
    border: 1px solid #6b9c5b;
    background: transparent;
    color: #6b9c5b;
    font-family: inherit;
    font-size: 11px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    cursor: pointer;
  }
  #gnav-toggle:hover {
    background: #6b9c5b;
    color: #0d120e;
  }
  #gnav-toggle:disabled {
    opacity: 0.6;
    cursor: wait;
  }
  #gnav-widget.collapsed #gnav-cam-shell,
  #gnav-widget.collapsed #gnav-status {
    display: none;
  }
  /* ========================================================
     GESTURE GUIDE
     ======================================================== */
  #gnav-guide {
    margin-top: 10px;
    border-top: 1px solid #2a352680;
    padding-top: 8px;
  }
  #gnav-guide-toggle {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border: none;
    background: transparent;
    color: #d99a3d;
    font-family: inherit;
    font-size: 11px;
    font-weight: 600;
    padding: 4px 0;
    cursor: pointer;
  }
  #gnav-guide-arrow {
    transition: transform 0.2s ease;
  }
  #gnav-guide.open #gnav-guide-arrow {
    transform: rotate(180deg);
  }
  #gnav-guide-content {
    display: none;
    margin-top: 8px;
  }
  #gnav-guide.open #gnav-guide-content {
    display: block;
  }
  .gnav-guide-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
    color: #c3cdc0;
  }
  .gnav-guide-icon {
    width: 34px;
    text-align: center;
    font-size: 15px;
  }
  .gnav-guide-label {
    font-size: 10px;
  }
  .gnav-guide-section {
    color: #6b9c5b;
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-top: 8px;
    margin-bottom: 3px;
  }
  #gnav-first-time {
    position: fixed;
    right: 250px;
    bottom: 20px;
    width: 260px;
    background: #101610f7;
    border: 1px solid #6b9c5b80;
    border-radius: 16px;
    padding: 16px;
    font-family: "SF Mono", "Menlo", monospace;
    color: #c3cdc0;
    z-index: 100000;
    box-shadow: 0 12px 40px rgba(0,0,0,0.45);
    backdrop-filter: blur(8px);
  }
  #gnav-first-time h3 {
    margin: 0 0 6px;
    color: #d99a3d;
    font-size: 13px;
  }
  #gnav-first-time p {
    margin: 0 0 12px;
    font-size: 10px;
    line-height: 1.5;
  }
  .gnav-welcome-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 3px 0;
    font-size: 10px;
  }
  .gnav-welcome-icon {
    width: 34px;
    text-align: center;
    font-size: 15px;
  }
  #gnav-first-time button {
    width: 100%;
    margin-top: 10px;
    padding: 8px;
    border-radius: 999px;
    border: 1px solid #6b9c5b;
    background: transparent;
    color: #6b9c5b;
    font-family: inherit;
    font-size: 10px;
    cursor: pointer;
  }
  #gnav-first-time button:hover {
    background: #6b9c5b;
    color: #0d120e;
  }
  /* ========================================================
     PAUSED INDICATOR
     ======================================================== */
  #gnav-paused {
    display: none;
    margin-bottom: 8px;
    padding: 6px;
    text-align: center;
    border: 1px solid #d99a3d80;
    border-radius: 8px;
    color: #d99a3d;
    font-size: 9px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  #gnav-paused.visible {
    display: block;
  }
`;
document.head.appendChild(style);

// ============================================================
// 4. WIDGET MARKUP
// ============================================================
const widget = document.createElement("div");
widget.id = "gnav-widget";
widget.className = "collapsed";
widget.innerHTML = `
  <div id="gnav-cam-shell">
    <video id="gnav-video" autoplay playsinline muted></video>
    <canvas id="gnav-overlay"></canvas>
  </div>
  <div id="gnav-status">
    <span id="gnav-model-status">off</span>
    <span id="gnav-tag"></span>
  </div>
  <div id="gnav-paused">Gesture navigation paused</div>
  <div id="gnav-guide">
    <button id="gnav-guide-toggle" type="button">
      <span>GESTURE GUIDE</span>
      <span id="gnav-guide-arrow">▼</span>
    </button>
    <div id="gnav-guide-content">
      <div id="gnav-guide-navigation">
        <div class="gnav-guide-section">Navigation</div>
        <div class="gnav-guide-row"><span class="gnav-guide-icon">✊</span><span class="gnav-guide-label">Dashboard</span></div>
        <div class="gnav-guide-row"><span class="gnav-guide-icon">☝️</span><span class="gnav-guide-label">Pantry</span></div>
        <div class="gnav-guide-row"><span class="gnav-guide-icon">✌️</span><span class="gnav-guide-label">Scan</span></div>
        <div class="gnav-guide-row"><span class="gnav-guide-icon">🤟</span><span class="gnav-guide-label">Recipes</span></div>
        <div class="gnav-guide-row"><span class="gnav-guide-icon">🖖</span><span class="gnav-guide-label">Shopping</span></div>
        <div class="gnav-guide-row"><span class="gnav-guide-icon">🖐️</span><span class="gnav-guide-label">Alerts</span></div>
        <div class="gnav-guide-section">Two-Hand Gestures</div>
        <div class="gnav-guide-row"><span class="gnav-guide-icon">👐</span><span class="gnav-guide-label">Pause / Resume</span></div>
        <div class="gnav-guide-row"><span class="gnav-guide-icon">👍👍</span><span class="gnav-guide-label">Confirm</span></div>
        <div class="gnav-guide-row"><span class="gnav-guide-icon">👎👎</span><span class="gnav-guide-label">Cancel</span></div>
        <div class="gnav-guide-row"><span class="gnav-guide-icon">✊✊</span><span class="gnav-guide-label">Disable gesture nav</span></div>
        <div class="gnav-guide-section">Context Actions</div>
        <div class="gnav-guide-row"><span class="gnav-guide-icon">🤏</span><span class="gnav-guide-label">Context action / Select</span></div>
        <div class="gnav-guide-row"><span class="gnav-guide-icon">← →</span><span class="gnav-guide-label">Shopping cards</span></div>
      </div>
      <div id="gnav-guide-scan" style="display:none;">
        <div class="gnav-guide-section">Scan Controls</div>
        <div class="gnav-guide-row"><span class="gnav-guide-icon">🤏</span><span class="gnav-guide-label">Open camera / Capture</span></div>
        <div class="gnav-guide-row"><span class="gnav-guide-icon">✊</span><span class="gnav-guide-label">Cancel camera</span></div>
        <div class="gnav-guide-row"><span class="gnav-guide-icon">← →</span><span class="gnav-guide-label">Next / Previous field</span></div>
        <div class="gnav-guide-row"><span class="gnav-guide-icon">↑ ↓</span><span class="gnav-guide-label">Change dropdown option</span></div>
        <div class="gnav-guide-row"><span class="gnav-guide-icon">👍👍</span><span class="gnav-guide-label">Confirm field / Add to pantry</span></div>
        <div class="gnav-guide-row"><span class="gnav-guide-icon">👎👎</span><span class="gnav-guide-label">Discard result</span></div>
      </div>
    </div>
  </div>
  <button id="gnav-toggle">Enable gesture nav</button>
`;
document.body.appendChild(widget);

// ============================================================
// 5. DOM REFERENCES
// ============================================================
const video = document.getElementById("gnav-video");
const overlay = document.getElementById("gnav-overlay");
const ctx = overlay.getContext("2d");
const toggleBtn = document.getElementById("gnav-toggle");
const modelStatus = document.getElementById("gnav-model-status");
const gestureTag = document.getElementById("gnav-tag");
const pausedIndicator = document.getElementById("gnav-paused");
const guide = document.getElementById("gnav-guide");
const guideToggle = document.getElementById("gnav-guide-toggle");
const navigationGuide = document.getElementById("gnav-guide-navigation");
const scanGuide = document.getElementById("gnav-guide-scan");

// ============================================================
// 6. FIRST-TIME GUIDE (localStorage)
// ============================================================
function showFirstTimeGuide() {
  if (localStorage.getItem("storemex_gesture_guide_seen")) {
    return;
  }
  const popup = document.createElement("div");
  popup.id = "gnav-first-time";
  popup.innerHTML = `
    <h3>👋 Gesture Navigation</h3>
    <p>Use your hand to navigate StoreMex without touching the screen.</p>
    <div class="gnav-welcome-row"><span class="gnav-welcome-icon">✊</span>Dashboard</div>
    <div class="gnav-welcome-row"><span class="gnav-welcome-icon">☝️</span>Pantry</div>
    <div class="gnav-welcome-row"><span class="gnav-welcome-icon">✌️</span>Scan</div>
    <div class="gnav-welcome-row"><span class="gnav-welcome-icon">🤟</span>Recipes</div>
    <div class="gnav-welcome-row"><span class="gnav-welcome-icon">🖖</span>Shopping</div>
    <div class="gnav-welcome-row"><span class="gnav-welcome-icon">🖐️</span>Alerts</div>
    <div class="gnav-welcome-row"><span class="gnav-welcome-icon">👐</span>Pause / Resume</div>
    <div class="gnav-welcome-row"><span class="gnav-welcome-icon">👍👍</span>Confirm (both hands)</div>
    <div class="gnav-welcome-row"><span class="gnav-welcome-icon">👎👎</span>Cancel (both hands)</div>
    <div class="gnav-welcome-row"><span class="gnav-welcome-icon">✊✊</span>Disable gestures</div>
    <button id="gnav-welcome-close">Got it</button>
  `;
  document.body.appendChild(popup);
  document.getElementById("gnav-welcome-close").addEventListener("click", () => {
    localStorage.setItem("storemex_gesture_guide_seen", "true");
    popup.remove();
  });
}

// ============================================================
// 7. GUIDE TOGGLE / CONTEXT UPDATE
// ============================================================
guideToggle.addEventListener("click", () => {
  guide.classList.toggle("open");
});

function updateGestureGuide() {
  const currentPage = getCurrentPage();
  if (currentPage === "scan") {
    navigationGuide.style.display = "none";
    scanGuide.style.display = "block";
  } else {
    navigationGuide.style.display = "block";
    scanGuide.style.display = "none";
  }
}

// ============================================================
// 8. ONE-HAND NAVIGATION STATE
// ============================================================
const NAV_STABLE_FRAMES = 12;
const NAV_COOLDOWN_MS = 700;
let navCountHistory = [];
let lastNavSwitchAt = 0;
let activeNavIndex = -1;

// ============================================================
// 9. PINCH STATE
// ============================================================
let pinchActive = false;
const PINCH_THRESHOLD = 0.045;
const PINCH_RELEASE_THRESHOLD = 0.065;

// ============================================================
// 10. SWIPE STATE
// ============================================================
const HISTORY_LEN = 8;
let palmHistory = [];
let lastSwipeAt = 0;
const SWIPE_COOLDOWN_MS = 900;

// ============================================================
// 11. CAMERA-FIST-CANCEL STATE
// ============================================================
let cameraFistLatched = false;

// ============================================================
// 12. TWO-HAND GESTURE STATE
// ============================================================
const TWO_HAND_STABLE_FRAMES = 6;
let twoHandHistory = [];
let lastTwoHandGesture = null;

// ============================================================
// 13. SCAN FIELD STATE
// ============================================================
const SCAN_FIELDS = [
  "scanResultName",
  "scanResultQty",
  "scanResultUnit",
  "scanResultCategory",
  "scanResultExpiry",
];
let scanFieldIndex = 0;

// ============================================================
// 14. UTILITY
// ============================================================
function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function setGestureTag(text) {
  gestureTag.textContent = text;
}

// ============================================================
// 15. CURRENT PAGE / MODAL HELPERS
// ============================================================
function getCurrentPage() {
  const activePage = document.querySelector('[id^="page-"].active');
  if (!activePage) {
    return null;
  }
  return activePage.id.replace("page-", "");
}

function isScanCameraOpen() {
  const closeButton = document.getElementById("scanCloseCameraBtn");
  if (!closeButton) {
    return false;
  }
  return closeButton.offsetParent !== null;
}

function isScanResultVisible() {
  const resultArea = document.getElementById("scanResultArea");
  if (!resultArea) {
    return false;
  }
  return resultArea.innerHTML.trim().length > 0;
}

function isAddItemModalOpen() {
  const form = document.getElementById("addItemForm");
  if (!form) {
    return false;
  }
  return form.offsetParent !== null;
}

function getScanFields() {
  return SCAN_FIELDS.map((id) => document.getElementById(id)).filter(Boolean);
}

function getCurrentScanField() {
  const fields = getScanFields();
  if (!fields.length) {
    return null;
  }
  if (scanFieldIndex >= fields.length) {
    scanFieldIndex = 0;
  }
  return fields[scanFieldIndex];
}

function updateScanFieldTag() {
  const field = getCurrentScanField();
  if (!field) {
    return;
  }
  const label = document.querySelector(`label[for="${field.id}"]`);
  const text = label
    ? label.textContent.replace(/\(optional.*?\)/gi, "").trim()
    : field.id;
  setGestureTag(`FIELD ${scanFieldIndex + 1}/${getScanFields().length} → ${text}`);
}

// ============================================================
// 16. HAND SHAPE CLASSIFIERS
// ============================================================
function countExtendedFingers(landmarks) {
  let count = 0;

  if (dist(landmarks[8], landmarks[0]) > dist(landmarks[6], landmarks[0]) * 1.12) {
    count++;
  }
  if (dist(landmarks[12], landmarks[0]) > dist(landmarks[10], landmarks[0]) * 1.12) {
    count++;
  }
  if (dist(landmarks[16], landmarks[0]) > dist(landmarks[14], landmarks[0]) * 1.12) {
    count++;
  }
  if (dist(landmarks[20], landmarks[0]) > dist(landmarks[18], landmarks[0]) * 1.12) {
    count++;
  }

  const thumbTip = landmarks[4];
  const thumbIP = landmarks[3];
  const thumbMCP = landmarks[2];
  const thumbExtended = dist(thumbTip, thumbMCP) > dist(thumbIP, thumbMCP) * 1.25;
  const thumbAwayFromPalm = dist(thumbTip, landmarks[5]) > dist(thumbMCP, landmarks[5]) * 1.15;
  if (thumbExtended && thumbAwayFromPalm) {
    count++;
  }

  return count;
}

function isThumbsUp(landmarks) {
  const thumbTip = landmarks[4];
  const thumbIP = landmarks[3];
  const thumbMCP = landmarks[2];
  const indexMCP = landmarks[5];
  const middleMCP = landmarks[9];

  const thumbExtended = dist(thumbTip, thumbMCP) > dist(thumbIP, thumbMCP) * 1.18;
  const fingersFolded = countExtendedFingers(landmarks) <= 1;
  const thumbAboveHand = thumbTip.y < Math.min(indexMCP.y, middleMCP.y) - 0.03;

  return thumbExtended && fingersFolded && thumbAboveHand;
}

function isThumbsDown(landmarks) {
  const thumbTip = landmarks[4];
  const thumbIP = landmarks[3];
  const thumbMCP = landmarks[2];
  const indexMCP = landmarks[5];
  const middleMCP = landmarks[9];

  const thumbExtended = dist(thumbTip, thumbMCP) > dist(thumbIP, thumbMCP) * 1.18;
  const fingersFolded = countExtendedFingers(landmarks) <= 1;
  const thumbBelowHand = thumbTip.y > Math.max(indexMCP.y, middleMCP.y) + 0.03;

  return thumbExtended && fingersFolded && thumbBelowHand;
}

function isOpenPalm(landmarks) {
  return countExtendedFingers(landmarks) === 5;
}

function isFist(landmarks) {
  return countExtendedFingers(landmarks) === 0;
}

// ============================================================
// 17. ONE-HAND NAVIGATION
// ============================================================
function switchToNavIndex(count) {
  const pageKey = GESTURE_PAGE_MAP[count];
  if (pageKey === undefined) {
    return;
  }
  const navEl = document.querySelector(`.nav-item[data-page="${pageKey}"]`);
  if (!navEl) {
    console.warn(`[GestureNav] Navigation item missing: ${pageKey}`);
    setGestureTag(`${count} → ${pageKey} NOT FOUND`);
    return;
  }
  navEl.click();
  updateGestureGuide();
  const label = count === 0 ? "FIST" : `${count} FINGERS`;
  setGestureTag(`${label} → ${pageKey}`);
  console.log(`[GestureNav] ${label} → ${pageKey}`);
}

function updateNavFromCount(count) {
  if (gesturePaused) {
    return;
  }
  if (isScanCameraOpen()) {
    return;
  }
  if (isScanResultVisible()) {
    return;
  }
  if (isAddItemModalOpen()) {
    return;
  }

  navCountHistory.push(count);
  if (navCountHistory.length > NAV_STABLE_FRAMES) {
    navCountHistory.shift();
  }
  if (navCountHistory.length < NAV_STABLE_FRAMES) {
    return;
  }

  const stable = navCountHistory.every((value) => value === count);
  if (!stable) {
    return;
  }

  const now = performance.now();
  if (now - lastNavSwitchAt < NAV_COOLDOWN_MS) {
    return;
  }
  if (count === activeNavIndex) {
    return;
  }

  activeNavIndex = count;
  lastNavSwitchAt = now;
  switchToNavIndex(count);
}

// ============================================================
// 18. DASHBOARD
// ============================================================
function toggleColourBlindMode() {
  const button = document.getElementById("colorBlindTogglE");
  if (!button) {
    console.warn("[GestureNav] colorBlindTogglE not found");
    setGestureTag("COLOR BLIND TOGGLE NOT FOUND");
    return;
  }
  button.click();
  setGestureTag("🤏 → COLOR BLIND MODE");
}

// ============================================================
// 19. PANTRY
// ============================================================
function openAddItem() {
  if (typeof openAddItemModal === "function") {
    openAddItemModal(new Event("gesture"));
    setGestureTag("🤏 → ADD ITEM");
    return;
  }
  const button = document.querySelector('[onclick*="openAddItemModal"]');
  if (button) {
    button.click();
    setGestureTag("🤏 → ADD ITEM");
    return;
  }
  console.warn("[GestureNav] openAddItemModal not found");
  setGestureTag("ADD ITEM NOT FOUND");
}

function confirmAddItem() {
  // Use the existing form-submission handler by name, as specified.
  if (typeof handleAddItemSubmit === "function") {
    handleAddItemSubmit(new Event("gesture"));
    setGestureTag("👍👍 → ADD ITEM CONFIRMED");
    return;
  }
  // Fallback only if handleAddItemSubmit isn't available for some reason.
  const form = document.getElementById("addItemForm");
  if (!form) {
    console.warn("[GestureNav] handleAddItemSubmit and addItemForm not found");
    setGestureTag("ADD ITEM CONFIRM NOT FOUND");
    return;
  }
  if (typeof form.requestSubmit === "function") {
    form.requestSubmit();
  } else {
    const submit = form.querySelector('button[type="submit"]');
    if (submit) {
      submit.click();
    }
  }
  setGestureTag("👍👍 → ADD ITEM CONFIRMED");
}

function cancelAddItem() {
  if (typeof closeAddItemModal === "function") {
    closeAddItemModal();
    setGestureTag("👎👎 → ADD ITEM CANCELLED");
    return;
  }
  const close = document.querySelector('.modal-card .modal-close[onclick*="closeAddItemModal"]');
  if (close) {
    close.click();
  }
  setGestureTag("👎👎 → ADD ITEM CANCELLED");
}

// ============================================================
// 20. SCAN CAMERA
// ============================================================
function clickUseCamera() {
  const button = document.getElementById("scanOpenCameraBtn");
  if (!button) {
    console.warn("[GestureNav] scanOpenCameraBtn not found");
    setGestureTag("CAMERA BUTTON NOT FOUND");
    return;
  }
  button.click();
  setGestureTag("🤏 → USE CAMERA");
}

function clickCapture() {
  const button = document.getElementById("scanCaptureBtn");
  if (!button) {
    console.warn("[GestureNav] scanCaptureBtn not found");
    setGestureTag("CAPTURE BUTTON NOT FOUND");
    return;
  }
  button.click();
  setGestureTag("🤏 → CAPTURE");
}

function clickCloseCamera() {
  const button = document.getElementById("scanCloseCameraBtn");
  if (!button) {
    console.warn("[GestureNav] scanCloseCameraBtn not found");
    setGestureTag("CLOSE CAMERA BUTTON NOT FOUND");
    return;
  }
  button.click();
  setGestureTag("✊ → CANCEL CAMERA");
}

// ============================================================
// 21. SCAN RESULT
// ============================================================
function discardScanResult() {
  const resultArea = document.getElementById("scanResultArea");
  if (!resultArea) {
    return;
  }
  resultArea.innerHTML = "";
  scanFieldIndex = 0;
  setGestureTag("👎👎 → DISCARDED");
}

function addScanToPantry() {
  if (typeof confirmScanAddToPantry === "function") {
    confirmScanAddToPantry();
    setGestureTag("👍👍 → ADDED TO PANTRY");
    return;
  }
  console.warn("[GestureNav] confirmScanAddToPantry not found");
  setGestureTag("ADD TO PANTRY NOT FOUND");
}

function moveScanField(direction) {
  const fields = getScanFields();
  if (!fields.length) {
    return;
  }
  scanFieldIndex += direction;
  if (scanFieldIndex >= fields.length) {
    scanFieldIndex = 0;
  }
  if (scanFieldIndex < 0) {
    scanFieldIndex = fields.length - 1;
  }
  const field = fields[scanFieldIndex];
  field.focus();
  updateScanFieldTag();
}

function focusCurrentScanField() {
  const field = getCurrentScanField();
  if (!field) {
    return;
  }
  field.focus();
  if (field.tagName === "SELECT") {
    try {
      field.click();
    } catch (error) {
      console.debug("[GestureNav] Could not open select:", error);
    }
  }
  updateScanFieldTag();
}

function moveSelectOption(direction) {
  const field = getCurrentScanField();
  if (!field || field.tagName !== "SELECT") {
    return;
  }
  const max = field.options.length - 1;
  let next = field.selectedIndex + direction;
  next = Math.max(0, Math.min(max, next));
  field.selectedIndex = next;
  field.dispatchEvent(new Event("change", { bubbles: true }));
  setGestureTag(`OPTION → ${field.options[field.selectedIndex].text}`);
}

function confirmCurrentScanField() {
  const fields = getScanFields();
  if (!fields.length) {
    return;
  }
  if (scanFieldIndex === fields.length - 1) {
    addScanToPantry();
    return;
  }
  moveScanField(1);
  setGestureTag("👍👍 → NEXT FIELD");
}

// ============================================================
// 22. HISTORY (contextual pinch fallback for other pages)
// ============================================================
function openHistory() {
  const historyNav = document.querySelector('.nav-item[data-page="history"]');
  if (!historyNav) {
    console.warn("[GestureNav] History nav item not found");
    setGestureTag("HISTORY NOT FOUND");
    return;
  }
  historyNav.click();
  setGestureTag("🤏 → HISTORY");
}

// ============================================================
// 23. SHOPPING VOICE ASSISTANT
// ============================================================
function toggleVoiceAssistant() {
  const button = document.getElementById("voiceFab");
  if (!button) {
    console.warn("[GestureNav] voiceFab not found");
    setGestureTag("VOICE BUTTON NOT FOUND");
    return;
  }
  button.click();
  setGestureTag("🤏 → VOICE ASSISTANT");
}

// ============================================================
// 23. PINCH (edge-triggered, single click per pinch cycle)
// ============================================================
function handlePinch() {
  if (pinchActive) {
    return;
  }
  pinchActive = true;

  const currentPage = getCurrentPage();

  // Priority 2: scan camera contextual
  if (isScanCameraOpen()) {
    clickCapture();
    return;
  }

  // Priority 3: scan result contextual
  if (currentPage === "scan" && isScanResultVisible()) {
    focusCurrentScanField();
    return;
  }

  // Priority 4: other contextual pinch actions
  if (currentPage === "scan") {
    clickUseCamera();
    return;
  }
  if (currentPage === "dashboard") {
    toggleColourBlindMode();
    return;
  }
  if (currentPage === "pantry") {
    openAddItem();
    return;
  }
  if (currentPage === "shopping") {
    toggleVoiceAssistant();
    return;
  }

  // Any other page (recipes, alerts, etc.) falls back to History.
  if (currentPage && currentPage !== "history") {
    openHistory();
    return;
  }

  setGestureTag("🤏 (no action on this page)");
}

function releasePinch() {
  if (!pinchActive) {
    return;
  }
  pinchActive = false;
  setGestureTag("READY");
}

// ============================================================
// 24. GLOBAL CONFIRM / CANCEL (only reached via two-hand gestures)
// ============================================================
function handleThumbsUp() {
  const currentPage = getCurrentPage();

  if (currentPage === "pantry" && isAddItemModalOpen()) {
    confirmAddItem();
    return;
  }

  if (currentPage === "scan" && isScanResultVisible()) {
    confirmCurrentScanField();
    return;
  }

  setGestureTag("👍👍 CONFIRM");
}

function handleThumbsDown() {
  const currentPage = getCurrentPage();

  if (isScanCameraOpen()) {
    clickCloseCamera();
    return;
  }

  if (currentPage === "scan" && isScanResultVisible()) {
    discardScanResult();
    return;
  }

  if (currentPage === "pantry" && isAddItemModalOpen()) {
    cancelAddItem();
    return;
  }

  setGestureTag("👎👎 CANCEL");
}

// ============================================================
// 25. PAUSE / RESUME
// ============================================================
function toggleGesturePause() {
  gesturePaused = !gesturePaused;
  navCountHistory = [];
  palmHistory = [];

  if (gesturePaused) {
    pausedIndicator.classList.add("visible");
    modelStatus.textContent = "paused";
    setGestureTag("PAUSED");
  } else {
    pausedIndicator.classList.remove("visible");
    modelStatus.textContent = "tracking";
    setGestureTag("READY");
  }
}

// ============================================================
// 26. DISABLE GESTURE NAVIGATION
// ============================================================
function disableGestureNavigation() {
  if (!running) {
    return;
  }
  running = false;

  const stream = video.srcObject;
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
  }
  video.srcObject = null;

  widget.classList.add("collapsed");
  toggleBtn.textContent = "Enable gesture nav";
  modelStatus.textContent = "off";
  gestureTag.textContent = "";
  pausedIndicator.classList.remove("visible");

  gesturePaused = false;
  navCountHistory = [];
  palmHistory = [];
  pinchActive = false;
  activeNavIndex = -1;
  cameraFistLatched = false;
  twoHandHistory = [];
  lastTwoHandGesture = null;

  console.log("[GestureNav] Disabled by two-fist gesture");
}

// ============================================================
// 27. TWO-HAND GESTURES
// ============================================================
function classifyTwoHandGesture(handA, handB) {
  if (isOpenPalm(handA) && isOpenPalm(handB)) {
    return "palms";
  }
  if (isFist(handA) && isFist(handB)) {
    return "fists";
  }
  if (isThumbsUp(handA) && isThumbsUp(handB)) {
    return "thumbsUp";
  }
  if (isThumbsDown(handA) && isThumbsDown(handB)) {
    return "thumbsDown";
  }
  return null;
}

function handleTwoHandGesture(hands) {
  if (hands.length < 2) {
    twoHandHistory = [];
    lastTwoHandGesture = null;
    return false;
  }

  const [handA, handB] = hands;
  const gesture = classifyTwoHandGesture(handA, handB);

  twoHandHistory.push(gesture);
  if (twoHandHistory.length > TWO_HAND_STABLE_FRAMES) {
    twoHandHistory.shift();
  }
  const stable =
    twoHandHistory.length === TWO_HAND_STABLE_FRAMES &&
    twoHandHistory.every((g) => g === gesture);

  // Any two-hand configuration blocks one-hand nav/pinch this frame,
  // even if it's not (yet) a recognised, stable gesture.
  if (!stable || !gesture || gesture === lastTwoHandGesture) {
    return true;
  }

  lastTwoHandGesture = gesture;

  // While paused, the only gesture allowed through is the open-palms
  // resume gesture itself — everything else must not execute.
  if (gesturePaused && gesture !== "palms") {
    return true;
  }

  switch (gesture) {
    case "palms":
      toggleGesturePause();
      break;
    case "fists":
      disableGestureNavigation();
      break;
    case "thumbsUp":
      handleThumbsUp();
      break;
    case "thumbsDown":
      handleThumbsDown();
      break;
  }

  return true;
}

// ============================================================
// 28. SWIPE
// ============================================================
function detectSwipe(landmarks) {
  const wrist = landmarks[0];
  const now = performance.now();

  palmHistory.push({ x: wrist.x, y: wrist.y, t: now });
  if (palmHistory.length > HISTORY_LEN) {
    palmHistory.shift();
  }
  if (palmHistory.length < HISTORY_LEN) {
    return;
  }

  const first = palmHistory[0];
  const last = palmHistory[palmHistory.length - 1];
  const dx = last.x - first.x;
  const dy = last.y - first.y;
  const dt = last.t - first.t;

  if (dt <= 0 || dt >= 700) {
    return;
  }
  if (now - lastSwipeAt < SWIPE_COOLDOWN_MS) {
    return;
  }

  // Horizontal swipe
  if (Math.abs(dx) > 0.22 && Math.abs(dx) > Math.abs(dy) * 1.25) {
    lastSwipeAt = now;
    const direction = dx > 0 ? "right" : "left";
    setGestureTag(direction === "right" ? "SWIPE RIGHT" : "SWIPE LEFT");
    handleHorizontalSwipe(direction);
    palmHistory = [];
    return;
  }

  // Vertical swipe (only used for select-option navigation on scan result)
  if (Math.abs(dy) > 0.2 && Math.abs(dy) > Math.abs(dx) * 1.25) {
    lastSwipeAt = now;
    const field = getCurrentScanField();
    if (isScanResultVisible() && field && field.tagName === "SELECT") {
      moveSelectOption(dy < 0 ? 1 : -1);
    }
    palmHistory = [];
  }
}

function handleHorizontalSwipe(direction) {
  const currentPage = getCurrentPage();

  // Scan result: move between form controls
  if (currentPage === "scan" && isScanResultVisible()) {
    moveScanField(direction === "right" ? 1 : -1);
    return;
  }

  // Shopping: existing card decision logic, only while shopping is active
  if (currentPage === "shopping") {
    if (typeof decideCurrentCard === "function") {
      decideCurrentCard(direction);
    }
  }
}

// ============================================================
// 29. FRAME CLASSIFICATION (single hand)
// ============================================================
function classifyFrame(landmarks) {
  if (gesturePaused) {
    return;
  }

  const cameraOpen = isScanCameraOpen();
  if (!cameraOpen) {
    cameraFistLatched = false;
  }

  // Single-hand thumbs up/down must NOT trigger confirm/cancel and must
  // NOT be misread as a 1-finger "Pantry" navigation gesture.
  if (isThumbsUp(landmarks) || isThumbsDown(landmarks)) {
    palmHistory = [];
    navCountHistory = [];
    return;
  }

  const fingerCount = countExtendedFingers(landmarks);
  const pinchDistance = dist(landmarks[4], landmarks[8]);

  // Pinch (contextual, priority 2-4)
  if (pinchDistance < PINCH_THRESHOLD) {
    handlePinch();
    palmHistory = [];
    navCountHistory = [];
    return;
  }
  if (pinchActive && pinchDistance > PINCH_RELEASE_THRESHOLD) {
    releasePinch();
  }

  // Scan camera contextual: fist cancels, debounced so holding the fist
  // only triggers one click.
  if (cameraOpen) {
    if (fingerCount === 0) {
      if (!cameraFistLatched) {
        cameraFistLatched = true;
        clickCloseCamera();
      }
    } else {
      cameraFistLatched = false;
    }
    palmHistory = [];
    navCountHistory = [];
    return;
  }

  // Scan result contextual: swipe navigates fields/options, no page nav.
  if (isScanResultVisible()) {
    navCountHistory = [];
    detectSwipe(landmarks);
    return;
  }

  // Priority 5: one-hand navigation + swipe
  updateNavFromCount(fingerCount);
  detectSwipe(landmarks);
}

// ============================================================
// 30. DRAWING
// ============================================================
const HAND_BONES = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17],
];

function clearOverlay() {
  ctx.clearRect(0, 0, overlay.width, overlay.height);
}

function drawLandmarks(landmarks) {
  // Spec requires yellow landmarks/skeleton for both detected hands.
  ctx.fillStyle = "#FFD400";
  ctx.strokeStyle = "rgba(255,212,0,0.6)";
  ctx.lineWidth = 2;

  for (const [a, b] of HAND_BONES) {
    const p1 = landmarks[a];
    const p2 = landmarks[b];
    ctx.beginPath();
    ctx.moveTo(p1.x * overlay.width, p1.y * overlay.height);
    ctx.lineTo(p2.x * overlay.width, p2.y * overlay.height);
    ctx.stroke();
  }

  for (const point of landmarks) {
    ctx.beginPath();
    ctx.arc(point.x * overlay.width, point.y * overlay.height, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ============================================================
// 31. MAIN LOOP
// ============================================================
function loop() {
  if (!running) {
    return;
  }

  if (video.readyState >= 2) {
    const result = handLandmarker.detectForVideo(video, performance.now());
    clearOverlay();

    if (result.landmarks && result.landmarks.length > 0) {
      // Draw every detected hand (fixes single-hand-only skeleton bug).
      for (const hand of result.landmarks) {
        drawLandmarks(hand);
      }

      if (result.landmarks.length >= 2) {
        // Two-hand gestures take priority and consume the frame entirely,
        // so a two-hand pose can never also fire one-hand navigation.
        handleTwoHandGesture(result.landmarks);
      } else {
        classifyFrame(result.landmarks[0]);
      }
    } else {
      // No hands detected: reset all transient state.
      palmHistory = [];
      navCountHistory = [];
      pinchActive = false;
      activeNavIndex = -1;
      cameraFistLatched = false;
      twoHandHistory = [];
      lastTwoHandGesture = null;
    }
  }

  requestAnimationFrame(loop);
}

// ============================================================
// 32. INITIALIZE MEDIAPIPE
// ============================================================
async function initModel() {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
  );
  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numHands: 2,
  });
}

// ============================================================
// 33. ENABLE / DISABLE BUTTON
// ============================================================
toggleBtn.addEventListener("click", async () => {
  if (running) {
    disableGestureNavigation();
    return;
  }

  widget.classList.remove("collapsed");
  toggleBtn.disabled = true;
  toggleBtn.textContent = "starting…";
  modelStatus.textContent = "loading model…";

  if (!handLandmarker) {
    try {
      await initModel();
    } catch (error) {
      console.error("[GestureNav] Model error:", error);
      modelStatus.textContent = "failed to load";
      toggleBtn.disabled = false;
      toggleBtn.textContent = "Retry";
      return;
    }
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 480, height: 360 },
    });
    video.srcObject = stream;
    await video.play();
  } catch (error) {
    console.error("[GestureNav] Camera error:", error);
    modelStatus.textContent = "camera permission denied";
    toggleBtn.disabled = false;
    toggleBtn.textContent = "Retry";
    return;
  }

  overlay.width = video.videoWidth || 480;
  overlay.height = video.videoHeight || 360;

  // Reset all state before starting.
  running = true;
  gesturePaused = false;
  activeNavIndex = -1;
  navCountHistory = [];
  palmHistory = [];
  pinchActive = false;
  lastNavSwitchAt = 0;
  lastSwipeAt = 0;
  scanFieldIndex = 0;
  cameraFistLatched = false;
  twoHandHistory = [];
  lastTwoHandGesture = null;

  pausedIndicator.classList.remove("visible");
  toggleBtn.disabled = false;
  toggleBtn.textContent = "Disable gesture nav";
  modelStatus.textContent = "tracking";

  updateGestureGuide();
  showFirstTimeGuide();
  setGestureTag("READY");

  loop();
});

// ============================================================
// 34. INITIAL GUIDE STATE
// ============================================================
updateGestureGuide();

console.log(
  "%c[GestureNav] StoreMex gesture system loaded",
  "color:#6b9c5b;font-weight:bold;"
);