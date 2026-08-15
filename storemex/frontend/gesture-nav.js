/* ==========================================================
   gesture-nav.js — StoreMex
   Camera-based hand gesture navigation

   PAGE NAVIGATION
   ----------------------------------------------------------
   ✊ 0 fingers → Dashboard
   ☝ 1 finger  → Pantry
   ✌ 2 fingers → Scan
   🤟 3 fingers → Recipes
   🖖 4 fingers → Shopping
   🖐 5 fingers → Alerts

   SPECIAL GESTURES
   ----------------------------------------------------------
   🤏 Pinch on Scan page       → Use Camera
   🤏 Pinch while camera open  → Capture
   ✊ Fist while camera open   → Cancel Camera
   🤏 Pinch elsewhere          → History

   SHOPPING
   ----------------------------------------------------------
   Swipe Left / Right → existing shopping card controls

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
// 2. MEDIAPIPE
// ============================================================

let handLandmarker = null;
let running = false;


// ============================================================
// 3. WIDGET
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

  /* ==========================================================
   GESTURE GUIDE
   ========================================================== */

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
  width: 24px;
  text-align: center;
  font-size: 16px;
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

  box-shadow:
    0 12px 40px rgba(0,0,0,0.45);

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
  width: 24px;

  text-align: center;

  font-size: 16px;
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
`;

document.head.appendChild(style);


const widget = document.createElement("div");

widget.id = "gnav-widget";
widget.className = "collapsed";

widget.innerHTML = `
  <div id="gnav-cam-shell">
    <video
      id="gnav-video"
      autoplay
      playsinline
      muted
    ></video>

    <canvas id="gnav-overlay"></canvas>
  </div>

  <div id="gnav-status">
    <span id="gnav-model-status">off</span>
    <span id="gnav-tag"></span>
  </div>

  <div id="gnav-guide">

    <button id="gnav-guide-toggle" type="button">
      <span>GESTURE GUIDE</span>
      <span id="gnav-guide-arrow">▼</span>
    </button>

    <div id="gnav-guide-content">

      <div
        id="gnav-guide-navigation"
      >

        <div class="gnav-guide-section">
          Navigation
        </div>

        <div class="gnav-guide-row">
          <span class="gnav-guide-icon">✊</span>
          <span class="gnav-guide-label">
            Dashboard
          </span>
        </div>

        <div class="gnav-guide-row">
          <span class="gnav-guide-icon">☝️</span>
          <span class="gnav-guide-label">
            Pantry
          </span>
        </div>

        <div class="gnav-guide-row">
          <span class="gnav-guide-icon">✌️</span>
          <span class="gnav-guide-label">
            Scan
          </span>
        </div>

        <div class="gnav-guide-row">
          <span class="gnav-guide-icon">🤟</span>
          <span class="gnav-guide-label">
            Recipes
          </span>
        </div>

        <div class="gnav-guide-row">
          <span class="gnav-guide-icon">🖖</span>
          <span class="gnav-guide-label">
            Shopping
          </span>
        </div>

        <div class="gnav-guide-row">
          <span class="gnav-guide-icon">🖐️</span>
          <span class="gnav-guide-label">
            Alerts
          </span>
        </div>

        <div class="gnav-guide-section">
          Actions
        </div>

        <div class="gnav-guide-row">
          <span class="gnav-guide-icon">🤏</span>
          <span class="gnav-guide-label">
            Action / Select
          </span>
        </div>

        <div class="gnav-guide-row">
          <span class="gnav-guide-icon">←→</span>
          <span class="gnav-guide-label">
            Shopping cards
          </span>
        </div>

      </div>


      <div
        id="gnav-guide-scan"
        style="display:none;"
      >

        <div class="gnav-guide-section">
          Scan Controls
        </div>

        <div class="gnav-guide-row">
          <span class="gnav-guide-icon">🤏</span>
          <span class="gnav-guide-label">
            Open Camera
          </span>
        </div>

        <div class="gnav-guide-row">
          <span class="gnav-guide-icon">🤏</span>
          <span class="gnav-guide-label">
            Capture Image
          </span>
        </div>

        <div class="gnav-guide-row">
          <span class="gnav-guide-icon">✊</span>
          <span class="gnav-guide-label">
            Cancel Camera
          </span>
        </div>

      </div>

    </div>
  </div>

  <button id="gnav-toggle">
    Enable gesture nav
  </button>
`;

document.body.appendChild(widget);

// ============================================================
// FIRST-TIME GESTURE HELP
// ============================================================

function showFirstTimeGuide() {

  if (
    localStorage.getItem(
      "storemex_gesture_guide_seen"
    )
  ) {
    return;
  }


  const popup =
    document.createElement(
      "div"
    );


  popup.id =
    "gnav-first-time";


  popup.innerHTML = `
    <h3>
      👋 Gesture Navigation
    </h3>

    <p>
      Use your hand to navigate StoreMex
      without touching the screen.
    </p>

    <div class="gnav-welcome-row">
      <span class="gnav-welcome-icon">✊</span>
      Dashboard
    </div>

    <div class="gnav-welcome-row">
      <span class="gnav-welcome-icon">☝️</span>
      Pantry
    </div>

    <div class="gnav-welcome-row">
      <span class="gnav-welcome-icon">✌️</span>
      Scan
    </div>

    <div class="gnav-welcome-row">
      <span class="gnav-welcome-icon">🤟</span>
      Recipes
    </div>

    <div class="gnav-welcome-row">
      <span class="gnav-welcome-icon">🖖</span>
      Shopping
    </div>

    <div class="gnav-welcome-row">
      <span class="gnav-welcome-icon">🖐️</span>
      Alerts
    </div>

    <div class="gnav-welcome-row">
      <span class="gnav-welcome-icon">🤏</span>
      Actions / Select
    </div>

    <button id="gnav-welcome-close">
      Got it
    </button>
  `;


  document.body.appendChild(
    popup
  );


  document
    .getElementById(
      "gnav-welcome-close"
    )
    .addEventListener(
      "click",
      () => {

        localStorage.setItem(
          "storemex_gesture_guide_seen",
          "true"
        );


        popup.remove();

      }
    );
}


// ============================================================
// 4. DOM REFERENCES
// ============================================================

const video =
  document.getElementById("gnav-video");

const overlay =
  document.getElementById("gnav-overlay");

const ctx =
  overlay.getContext("2d");

const toggleBtn =
  document.getElementById("gnav-toggle");

const modelStatus =
  document.getElementById("gnav-model-status");

const gestureTag =
  document.getElementById("gnav-tag");

// ============================================================
// GESTURE GUIDE
// ============================================================

const guide =
  document.getElementById(
    "gnav-guide"
  );

const guideToggle =
  document.getElementById(
    "gnav-guide-toggle"
  );

const navigationGuide =
  document.getElementById(
    "gnav-guide-navigation"
  );

const scanGuide =
  document.getElementById(
    "gnav-guide-scan"
  );


// ------------------------------------------------------------
// COLLAPSE / EXPAND GUIDE
// ------------------------------------------------------------

guideToggle.addEventListener(
  "click",
  () => {

    guide.classList.toggle(
      "open"
    );

  }
);


// ------------------------------------------------------------
// UPDATE GUIDE BASED ON PAGE
// ------------------------------------------------------------

function updateGestureGuide() {

  const currentPage =
    getCurrentPage();


  if (
    currentPage === "scan"
  ) {

    navigationGuide.style.display =
      "none";

    scanGuide.style.display =
      "block";

  } else {

    navigationGuide.style.display =
      "block";

    scanGuide.style.display =
      "none";
  }
}


// ============================================================
// 5. NAVIGATION STATE
// ============================================================

const NAV_STABLE_FRAMES = 12;
const NAV_COOLDOWN_MS = 700;

let navCountHistory = [];
let lastNavSwitchAt = 0;
let activeNavIndex = -1;
let lastGestureAt = 0;

// ============================================================
// 6. PINCH STATE
// ============================================================

// Pinch must behave like a mouse click:
// pinch → ONE action
// hold → nothing else
// release → ready for next pinch

let pinchActive = false;

const PINCH_THRESHOLD = 0.045;
const PINCH_RELEASE_THRESHOLD = 0.065;


// ============================================================
// 7. CAMERA / SWIPE STATE
// ============================================================

const HISTORY_LEN = 8;

let palmHistory = [];

let lastSwipeAt = 0;

const SWIPE_COOLDOWN_MS = 900;


// ============================================================
// 8. UTILITY
// ============================================================

function dist(a, b) {
  return Math.hypot(
    a.x - b.x,
    a.y - b.y
  );
}


// ============================================================
// 9. CURRENT PAGE
// ============================================================

function getCurrentPage() {

  const activePage =
    document.querySelector(
      '[id^="page-"].active'
    );

  if (!activePage) {
    return null;
  }

  return activePage.id.replace(
    "page-",
    ""
  );
}


// ============================================================
// 10. CAMERA OVERLAY DETECTION
// ============================================================

function isScanCameraOpen() {

  const closeButton =
    document.getElementById(
      "scanCloseCameraBtn"
    );

  if (!closeButton) {
    return false;
  }

  /*
    We intentionally check several common states
    because the existing StoreMex scanner may use
    different CSS/classes to show the camera.
  */

  if (
    closeButton.offsetParent !== null
  ) {
    return true;
  }

  return false;
}


// ============================================================
// 11. COUNT EXTENDED FINGERS
// ============================================================

function countExtendedFingers(landmarks) {
  let count = 0;

  // ----------------------------------------------------------
  // INDEX
  // ----------------------------------------------------------
  if (
    dist(landmarks[8], landmarks[0]) >
    dist(landmarks[6], landmarks[0]) * 1.12
  ) {
    count++;
  }

  // ----------------------------------------------------------
  // MIDDLE
  // ----------------------------------------------------------
  if (
    dist(landmarks[12], landmarks[0]) >
    dist(landmarks[10], landmarks[0]) * 1.12
  ) {
    count++;
  }

  // ----------------------------------------------------------
  // RING
  // ----------------------------------------------------------
  if (
    dist(landmarks[16], landmarks[0]) >
    dist(landmarks[14], landmarks[0]) * 1.12
  ) {
    count++;
  }

  // ----------------------------------------------------------
  // PINKY
  // ----------------------------------------------------------
  if (
    dist(landmarks[20], landmarks[0]) >
    dist(landmarks[18], landmarks[0]) * 1.12
  ) {
    count++;
  }

  // ----------------------------------------------------------
  // THUMB
  // ----------------------------------------------------------
  //
  // Don't count the thumb using wrist distance.
  // Instead, check whether the thumb tip is actually
  // outside the palm relative to the index finger.
  //

  const thumbTip = landmarks[4];
  const thumbIP = landmarks[3];
  const thumbMCP = landmarks[2];

  const thumbExtended =
    dist(thumbTip, thumbMCP) >
    dist(thumbIP, thumbMCP) * 1.25;

  /*
    Additional check:
    For a fist, thumb tip is generally close to the
    palm/index area. This prevents a closed fist from
    becoming "1 finger".
  */

  const thumbAwayFromPalm =
    dist(thumbTip, landmarks[5]) >
    dist(thumbMCP, landmarks[5]) * 1.15;

  if (
    thumbExtended &&
    thumbAwayFromPalm
  ) {
    count++;
  }

  return count;
}


// ============================================================
// 12. NAVIGATION
// ============================================================

function switchToNavIndex(count) {

  const pageKey =
    GESTURE_PAGE_MAP[count];

  if (
    pageKey === undefined
  ) {
    return;
  }


  const navEl =
    document.querySelector(
      `.nav-item[data-page="${pageKey}"]`
    );


  if (!navEl) {

    console.warn(
      `[GestureNav] Navigation item missing: ${pageKey}`
    );

    gestureTag.textContent =
      `${count} → ${pageKey} NOT FOUND`;

    return;
  }


  navEl.click();

  updateGestureGuide();


  const label =
    count === 0
      ? "FIST"
      : `${count} FINGERS`;

  gestureTag.textContent =
    `${label} → ${pageKey}`;


  console.log(
    `[GestureNav] ${label} → ${pageKey}`
  );
}


// ============================================================
// 13. STABLE NAVIGATION
// ============================================================

function updateNavFromCount(count) {

  /*
    IMPORTANT:
    If the camera overlay is open, don't navigate between
    pages. Gestures are temporarily being used for camera
    controls.
  */

  if (
    isScanCameraOpen()
  ) {
    return;
  }


  navCountHistory.push(
    count
  );


  if (
    navCountHistory.length >
    NAV_STABLE_FRAMES
  ) {
    navCountHistory.shift();
  }


  if (
    navCountHistory.length <
    NAV_STABLE_FRAMES
  ) {
    return;
  }


  const stable =
    navCountHistory.every(
      value => value === count
    );


  if (!stable) {
    return;
  }


  const now =
    performance.now();


  if (
    now - lastNavSwitchAt <
    NAV_COOLDOWN_MS
  ) {
    return;
  }


  if (
    count === activeNavIndex
  ) {
    return;
  }


  activeNavIndex =
    count;

  lastNavSwitchAt =
    now;


  switchToNavIndex(
    count
  );
}


// ============================================================
// 14. USE CAMERA
// ============================================================

function clickUseCamera() {

  const button =
    document.getElementById(
      "scanOpenCameraBtn"
    );


  if (!button) {

    console.warn(
      "[GestureNav] scanOpenCameraBtn not found"
    );

    gestureTag.textContent =
      "PINCH → CAMERA NOT FOUND";

    return;
  }


  console.log(
    "[GestureNav] Pinch → Use Camera"
  );

  gestureTag.textContent =
    "PINCH → USE CAMERA";


  button.click();
}


// ============================================================
// 15. CAPTURE CAMERA IMAGE
// ============================================================

function clickCapture() {

  const button =
    document.getElementById(
      "scanCaptureBtn"
    );


  if (!button) {

    console.warn(
      "[GestureNav] scanCaptureBtn not found"
    );

    gestureTag.textContent =
      "PINCH → CAPTURE NOT FOUND";

    return;
  }


  console.log(
    "[GestureNav] Pinch → Capture"
  );

  gestureTag.textContent =
    "PINCH → CAPTURE";


  button.click();
}


// ============================================================
// 16. CLOSE CAMERA
// ============================================================

function clickCloseCamera() {

  const button =
    document.getElementById(
      "scanCloseCameraBtn"
    );


  if (!button) {

    console.warn(
      "[GestureNav] scanCloseCameraBtn not found"
    );

    gestureTag.textContent =
      "FIST → CANCEL NOT FOUND";

    return;
  }


  console.log(
    "[GestureNav] Fist → Cancel Camera"
  );

  gestureTag.textContent =
    "FIST → CANCEL";


  button.click();
}


// ============================================================
// 17. HISTORY
// ============================================================

function openHistory() {

  const historyNav =
    document.querySelector(
      '.nav-item[data-page="history"]'
    );


  if (!historyNav) {

    console.warn(
      "[GestureNav] History nav item not found"
    );

    gestureTag.textContent =
      "PINCH → HISTORY NOT FOUND";

    return;
  }


  console.log(
    "[GestureNav] Pinch → History"
  );

  gestureTag.textContent =
    "PINCH → HISTORY";


  historyNav.click();
}


// ============================================================
// 18. HANDLE PINCH
// ============================================================

function handlePinch() {

  /*
    Ignore pinch if already active.
    This prevents:
    
      🤏 🤏 🤏 🤏 🤏

    from clicking the same button repeatedly.
  */

  if (pinchActive) {
    return;
  }


  pinchActive = true;


  const currentPage =
    getCurrentPage();


  // ----------------------------------------------------------
  // CAMERA ALREADY OPEN
  // ----------------------------------------------------------

  if (
    isScanCameraOpen()
  ) {

    clickCapture();

    return;
  }


  // ----------------------------------------------------------
  // SCAN PAGE
  // ----------------------------------------------------------

  if (
    currentPage === "scan"
  ) {

    clickUseCamera();

    return;
  }


  // ----------------------------------------------------------
  // OTHER PAGES
  // ----------------------------------------------------------

  openHistory();
}


// ============================================================
// 19. RELEASE PINCH
// ============================================================

function releasePinch() {

  if (!pinchActive) {
    return;
  }


  pinchActive = false;

  gestureTag.textContent =
    "READY";
}


// ============================================================
// 20. HANDLE FIST WHILE CAMERA OPEN
// ============================================================

function handleCameraFist() {

  if (
    !isScanCameraOpen()
  ) {
    return false;
  }


  /*
    Fist is used as Cancel only while
    the camera interface is open.
  */

  clickCloseCamera();

  return true;
}


// ============================================================
// 21. SWIPE
// ============================================================

function detectSwipe(landmarks) {

  const wrist =
    landmarks[0];

  const now =
    performance.now();


  palmHistory.push({
    x: wrist.x,
    t: now,
  });


  if (
    palmHistory.length >
    HISTORY_LEN
  ) {
    palmHistory.shift();
  }


  if (
    palmHistory.length <
    HISTORY_LEN
  ) {
    return;
  }


  const first =
    palmHistory[0];

  const last =
    palmHistory[
      palmHistory.length - 1
    ];


  const dx =
    last.x - first.x;

  const dt =
    last.t - first.t;


  if (
    dt <= 0 ||
    dt >= 700 ||
    Math.abs(dx) <= 0.22
  ) {
    return;
  }


  if (
    now - lastSwipeAt <
    SWIPE_COOLDOWN_MS
  ) {
    return;
  }


  lastSwipeAt =
    now;


  if (dx > 0) {

    fireGesture(
      "SWIPE RIGHT"
    );

  } else {

    fireGesture(
      "SWIPE LEFT"
    );
  }


  palmHistory = [];
}


// ============================================================
// 22. GENERIC GESTURE EVENTS
// ============================================================

function fireGesture(label) {

  gestureTag.textContent =
    label;


  const eventName =
    `gnav:${label
      .toLowerCase()
      .replaceAll(" ", "-")}`;


  window.dispatchEvent(
    new CustomEvent(eventName)
  );
}


// ============================================================
// 23. FRAME CLASSIFICATION
// ============================================================

function classifyFrame(
  landmarks
) {

  const fingerCount =
    countExtendedFingers(
      landmarks
    );

  const fist =
    fingerCount === 0;

  const thumbTip =
    landmarks[4];

  const indexTip =
    landmarks[8];


  const pinchDistance =
    dist(
      thumbTip,
      indexTip
    );


  // ----------------------------------------------------------
  // PINCH
  // ----------------------------------------------------------

  if (
    pinchDistance <
    PINCH_THRESHOLD
  ) {

    handlePinch();

    palmHistory = [];

    return;
  }


  // ----------------------------------------------------------
  // PINCH RELEASE
  // ----------------------------------------------------------

  if (
    pinchActive &&
    pinchDistance >
    PINCH_RELEASE_THRESHOLD
  ) {

    releasePinch();
  }


  // ----------------------------------------------------------
  // CAMERA OPEN
  // ----------------------------------------------------------

  if (
    isScanCameraOpen()
  ) {

    /*
      Camera open:
      Only fist is used for Cancel.
      Other finger gestures are ignored.
    */

    if (
      fingerCount === 0
    ) {

      handleCameraFist();

      navCountHistory = [];

    } else {

      navCountHistory = [];
    }


    palmHistory = [];

    return;
  }


  // ----------------------------------------------------------
  // NORMAL NAVIGATION
  // ----------------------------------------------------------

  updateNavFromCount(
    fingerCount
  );


  // ----------------------------------------------------------
  // SWIPE
  // ----------------------------------------------------------

  detectSwipe(
    landmarks
  );
}


// ============================================================
// 24. DRAW LANDMARKS
// ============================================================

function drawLandmarks(
  landmarks
) {

  ctx.clearRect(
    0,
    0,
    overlay.width,
    overlay.height
  );


  ctx.fillStyle =
    "#d99a3d";

  ctx.strokeStyle =
    "rgba(217,154,61,0.5)";

  ctx.lineWidth =
    2;


  const bones = [

    [0,1],
    [1,2],
    [2,3],
    [3,4],

    [0,5],
    [5,6],
    [6,7],
    [7,8],

    [0,9],
    [9,10],
    [10,11],
    [11,12],

    [0,13],
    [13,14],
    [14,15],
    [15,16],

    [0,17],
    [17,18],
    [18,19],
    [19,20],

    [5,9],
    [9,13],
    [13,17],
  ];


  for (
    const [a, b]
    of bones
  ) {

    const p1 =
      landmarks[a];

    const p2 =
      landmarks[b];


    ctx.beginPath();

    ctx.moveTo(
      p1.x * overlay.width,
      p1.y * overlay.height
    );

    ctx.lineTo(
      p2.x * overlay.width,
      p2.y * overlay.height
    );

    ctx.stroke();
  }


  for (
    const point
    of landmarks
  ) {

    ctx.beginPath();

    ctx.arc(
      point.x * overlay.width,
      point.y * overlay.height,
      3.5,
      0,
      Math.PI * 2
    );

    ctx.fill();
  }
}


// ============================================================
// 25. MAIN LOOP
// ============================================================

async function loop() {

  if (!running) {
    return;
  }


  if (
    video.readyState >= 2
  ) {

    const result =
      handLandmarker.detectForVideo(
        video,
        performance.now()
      );


    if (
      result.landmarks &&
      result.landmarks.length > 0
    ) {

      const landmarks =
        result.landmarks[0];


      drawLandmarks(
        landmarks
      );


      classifyFrame(
        landmarks
      );

    } else {

      ctx.clearRect(
        0,
        0,
        overlay.width,
        overlay.height
      );


      palmHistory = [];
      navCountHistory = [];

      /*
        Do NOT reset pinchActive here.
        Otherwise temporarily losing the hand could
        cause weird repeated pinch behavior.
      */
    }
  }


  requestAnimationFrame(
    loop
  );
}


// ============================================================
// 26. INITIALIZE MEDIAPIPE
// ============================================================

async function initModel() {

  const vision =
    await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
    );


  handLandmarker =
    await HandLandmarker.createFromOptions(
      vision,
      {
        baseOptions: {

          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",

          delegate: "GPU",
        },

        runningMode:
          "VIDEO",

        numHands:
          1,
      }
    );
}


// ============================================================
// 27. ENABLE / DISABLE
// ============================================================

toggleBtn.addEventListener(
  "click",
  async () => {


    // --------------------------------------------------------
    // DISABLE
    // --------------------------------------------------------

    if (running) {

      running = false;


      const stream =
        video.srcObject;


      if (stream) {

        stream
          .getTracks()
          .forEach(
            track =>
              track.stop()
          );
      }


      video.srcObject =
        null;


      widget.classList.add(
        "collapsed"
      );


      toggleBtn.textContent =
        "Enable gesture nav";


      modelStatus.textContent =
        "off";


      gestureTag.textContent =
        "";


      navCountHistory = [];
      palmHistory = [];

      pinchActive = false;

      return;
    }


    // --------------------------------------------------------
    // ENABLE
    // --------------------------------------------------------

    widget.classList.remove(
      "collapsed"
    );


    toggleBtn.disabled =
      true;

    toggleBtn.textContent =
      "starting…";


    modelStatus.textContent =
      "loading model…";


    if (!handLandmarker) {

      try {

        await initModel();

      } catch (error) {

        console.error(
          "[GestureNav] Model error:",
          error
        );


        modelStatus.textContent =
          "failed to load";


        toggleBtn.disabled =
          false;


        toggleBtn.textContent =
          "Retry";


        return;
      }
    }


    // --------------------------------------------------------
    // CAMERA
    // --------------------------------------------------------

    try {

      const stream =
        await navigator.mediaDevices.getUserMedia(
          {
            video: {
              width: 480,
              height: 360,
            },
          }
        );


      video.srcObject =
        stream;


      await video.play();

    } catch (error) {

      console.error(
        "[GestureNav] Camera error:",
        error
      );


      modelStatus.textContent =
        "camera permission denied";


      toggleBtn.disabled =
        false;


      toggleBtn.textContent =
        "Retry";


      return;
    }


    overlay.width =
      video.videoWidth || 480;

    overlay.height =
      video.videoHeight || 360;


    // Reset state

    running = true;

    activeNavIndex = -1;

    navCountHistory = [];

    palmHistory = [];

    pinchActive = false;

    lastNavSwitchAt = 0;

    lastGestureAt = 0;


    toggleBtn.disabled =
      false;


    toggleBtn.textContent =
      "Disable gesture nav";


    modelStatus.textContent =
      "tracking";

    updateGestureGuide();
    showFirstTimeGuide();


    gestureTag.textContent =
      "READY";


    loop();
  }
);


// ============================================================
// 28. SHOPPING SWIPES
// ============================================================

window.addEventListener(
  "gnav:swipe-left",
  () => {

    const shoppingPage =
      document.getElementById(
        "page-shopping"
      );


    if (
      !shoppingPage ||
      !shoppingPage.classList.contains(
        "active"
      )
    ) {
      return;
    }


    if (
      typeof decideCurrentCard ===
      "function"
    ) {

      decideCurrentCard(
        "left"
      );
    }
  }
);


window.addEventListener(
  "gnav:swipe-right",
  () => {

    const shoppingPage =
      document.getElementById(
        "page-shopping"
      );


    if (
      !shoppingPage ||
      !shoppingPage.classList.contains(
        "active"
      )
    ) {
      return;
    }


    if (
      typeof decideCurrentCard ===
      "function"
    ) {

      decideCurrentCard(
        "right"
      );
    }
  }
);