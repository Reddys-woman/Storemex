/* ==========================================================
   gesture-nav.js — SmartPantry / storemex
   Camera-based hand gesture navigation.

   HOW IT WORKS
   - Injects its own small floating widget (camera + toggle button)
     into the page — you don't need to add any HTML for it.
   - Counts extended fingers (1-5) to switch between the first five
     sidebar tabs, by *clicking the real nav <a> elements* — so it
     reuses your existing showPage() logic exactly as-is.
     1=Dashboard, 2=Pantry, 3=Scan, 4=Recipes, 5=Shopping.
     A closed fist (0 fingers) is ignored on purpose — it's the
     "hand not posed yet" state, not a nav command, so it doesn't
     accidentally fire a switch every time the hand relaxes.
   - Detects a fast open-hand swipe and a pinch, and dispatches them
     as normal browser CustomEvents on `window` so you (or I) can
     wire them to real pantry-card actions once those cards' markup
     is known — see the bottom of this file.

   LIMITATION: a single hand only gives 1-5, so this only reaches
   Dashboard/Pantry/Scan/Recipes/Shopping — not
   Alerts/Analytics/History/Settings. Extendable later (e.g. two-hand
   count, or fist-held-then-count) if you want all 9.

   USAGE: add this at the end of <body>, after script.js:
     <script type="module" src="gesture-nav.js"></script>
   ========================================================== */

import {
  HandLandmarker,
  FilesetResolver,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";

// ---- maps finger count (1-5) -> the data-page value on your real nav items ----
// index 0 of this array corresponds to a count of 1, not 0 — see switchToNavIndex.
const NAV_PAGE_KEYS = ["dashboard", "pantry", "scan", "recipes", "shopping"];

// ---------------------------------------------------------------
// 1. Inject the floating widget UI
// ---------------------------------------------------------------
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
  #gnav-video, #gnav-overlay {
    position: absolute; inset: 0; width: 100%; height: 100%;
    object-fit: cover; transform: scaleX(-1);
  }
  #gnav-status { display:flex; justify-content:space-between; margin-bottom:8px; }
  #gnav-tag { color: #d99a3d; font-weight: 600; }
  #gnav-toggle {
    width: 100%; padding: 8px; border-radius: 999px;
    border: 1px solid #6b9c5b; background: transparent; color: #6b9c5b;
    font-family: inherit; font-size: 11px; letter-spacing: 0.05em;
    text-transform: uppercase; cursor: pointer;
  }
  #gnav-toggle:hover { background: #6b9c5b; color: #0d120e; }
  #gnav-widget.collapsed #gnav-cam-shell,
  #gnav-widget.collapsed #gnav-status { display: none; }
`;
document.head.appendChild(style);

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
  <button id="gnav-toggle">Enable gesture nav</button>
`;
document.body.appendChild(widget);

const video = document.getElementById("gnav-video");
const overlay = document.getElementById("gnav-overlay");
const ctx = overlay.getContext("2d");
const toggleBtn = document.getElementById("gnav-toggle");
const modelStatus = document.getElementById("gnav-model-status");
const gestureTag = document.getElementById("gnav-tag");

let handLandmarker = null;
let running = false;

// ---------------------------------------------------------------
// 2. Gesture state
// ---------------------------------------------------------------
const HISTORY_LEN = 8;
let palmHistory = [];
let lastGestureAt = 0;
const GESTURE_COOLDOWN_MS = 900;

const NAV_STABLE_FRAMES = 12;
const NAV_COOLDOWN_MS = 700;
let navCountHistory = [];
let lastNavSwitchAt = 0;
let activeNavIndex = -1; // -1 so the very first stable read always fires

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function countExtendedFingers(landmarks) {
  const wrist = landmarks[0];
  const fingers = [
    { tip: 4, knuckle: 2 },
    { tip: 8, knuckle: 5 },
    { tip: 12, knuckle: 9 },
    { tip: 16, knuckle: 13 },
    { tip: 20, knuckle: 17 },
  ];
  let count = 0;
  for (const f of fingers) {
    const tipDist = dist(wrist, landmarks[f.tip]);
    const knuckleDist = dist(wrist, landmarks[f.knuckle]);
    if (tipDist > knuckleDist * 1.15) count++;
  }
  return count;
}

function switchToNavIndex(count) {
  // count is a raw finger count (1-5); the array is 0-indexed, so shift by 1.
  if (count < 1 || count > NAV_PAGE_KEYS.length) return;
  const pageKey = NAV_PAGE_KEYS[count - 1];
  const navEl = document.querySelector(`.nav-item[data-page="${pageKey}"]`);
  if (!navEl) return;
  navEl.click(); // fires the real onclick="showPage(event,...)" handler
  gestureTag.textContent = `${count} → ${pageKey}`;
}

function updateNavFromCount(count) {
  navCountHistory.push(count);
  if (navCountHistory.length > NAV_STABLE_FRAMES) navCountHistory.shift();
  if (navCountHistory.length < NAV_STABLE_FRAMES) return;
  if (!navCountHistory.every((c) => c === count)) return;

  // 0 fingers (closed fist / hand relaxing) is not a nav command — ignore it
  // so it doesn't reset activeNavIndex and re-fire the same tab when the
  // hand re-forms the same count a moment later.
  if (count < 1 || count > NAV_PAGE_KEYS.length) return;

  const now = performance.now();
  if (now - lastNavSwitchAt < NAV_COOLDOWN_MS) return;
  if (count === activeNavIndex) return;

  activeNavIndex = count;
  lastNavSwitchAt = now;
  switchToNavIndex(count);
}

function fireGesture(label) {
  const now = performance.now();
  if (now - lastGestureAt < GESTURE_COOLDOWN_MS) return;
  lastGestureAt = now;
  gestureTag.textContent = label;

  // Broadcast so real pantry-card swipe/pinch handlers can listen for this
  // once you tell me the card markup — e.g.:
  //   window.addEventListener('gnav:swipe', e => { ...consume item... })
  window.dispatchEvent(new CustomEvent(`gnav:${label.toLowerCase().replace(" ", "-")}`));
}

function classifyFrame(landmarks) {
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const wrist = landmarks[0];

  updateNavFromCount(countExtendedFingers(landmarks));

  const pinchDist = dist(thumbTip, indexTip);
  if (pinchDist < 0.045) {
    fireGesture("PINCH");
    palmHistory = [];
    return;
  }

  const now = performance.now();
  palmHistory.push({ x: wrist.x, t: now });
  if (palmHistory.length > HISTORY_LEN) palmHistory.shift();

  if (palmHistory.length >= HISTORY_LEN) {
    const first = palmHistory[0];
    const last = palmHistory[palmHistory.length - 1];
    const dx = last.x - first.x;
    const dt = last.t - first.t;
    if (dt > 0 && dt < 700 && Math.abs(dx) > 0.22) {
      if (dx > 0) fireGesture("SWIPE LEFT");
      else fireGesture("SWIPE RIGHT");
      palmHistory = [];
    }
  }
}

function drawLandmarks(landmarks) {
  ctx.clearRect(0, 0, overlay.width, overlay.height);
  ctx.fillStyle = "#d99a3d";
  ctx.strokeStyle = "rgba(217,154,61,0.5)";
  ctx.lineWidth = 2;
  const bones = [
    [0,1],[1,2],[2,3],[3,4],
    [0,5],[5,6],[6,7],[7,8],
    [0,9],[9,10],[10,11],[11,12],
    [0,13],[13,14],[14,15],[15,16],
    [0,17],[17,18],[18,19],[19,20],
    [5,9],[9,13],[13,17]
  ];
  for (const [a, b] of bones) {
    const p1 = landmarks[a], p2 = landmarks[b];
    ctx.beginPath();
    ctx.moveTo(p1.x * overlay.width, p1.y * overlay.height);
    ctx.lineTo(p2.x * overlay.width, p2.y * overlay.height);
    ctx.stroke();
  }
  for (const p of landmarks) {
    ctx.beginPath();
    ctx.arc(p.x * overlay.width, p.y * overlay.height, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

async function loop() {
  if (!running) return;
  if (video.readyState >= 2) {
    const result = handLandmarker.detectForVideo(video, performance.now());
    if (result.landmarks && result.landmarks.length > 0) {
      drawLandmarks(result.landmarks[0]);
      classifyFrame(result.landmarks[0]);
    } else {
      ctx.clearRect(0, 0, overlay.width, overlay.height);
      palmHistory = [];
      navCountHistory = [];
    }
  }
  requestAnimationFrame(loop);
}

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
    numHands: 1,
  });
}

toggleBtn.addEventListener("click", async () => {
  if (running) {
    // turn off
    running = false;
    const stream = video.srcObject;
    if (stream) stream.getTracks().forEach((t) => t.stop());
    widget.classList.add("collapsed");
    toggleBtn.textContent = "Enable gesture nav";
    modelStatus.textContent = "off";
    return;
  }

  widget.classList.remove("collapsed");
  toggleBtn.disabled = true;
  toggleBtn.textContent = "starting…";
  modelStatus.textContent = "loading model…";

  if (!handLandmarker) {
    try {
      await initModel();
    } catch (err) {
      modelStatus.textContent = "failed to load — check connection";
      toggleBtn.disabled = false;
      toggleBtn.textContent = "Retry";
      console.error(err);
      return;
    }
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: 480, height: 360 },
  });
  video.srcObject = stream;
  await video.play();
  overlay.width = video.videoWidth || 480;
  overlay.height = video.videoHeight || 360;

  running = true;
  activeNavIndex = -1;
  toggleBtn.disabled = false;
  toggleBtn.textContent = "Disable gesture nav";
  modelStatus.textContent = "tracking";
  loop();
});