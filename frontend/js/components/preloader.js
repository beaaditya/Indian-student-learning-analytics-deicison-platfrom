/**
 * LearnIQ — Full-Screen Enterprise Preloader Controller
 * Manages initial data-driven loading state, progressive status rotation,
 * slow-connection guidance, accessibility, and smooth transition.
 */

const STATUS_ROTATION = [
  { text: "Connecting to analytics platform…", step: "connecting" },
  { text: "Loading performance intelligence…", step: "processing" },
  { text: "Preparing institutional benchmarks…", step: "processing" },
  { text: "Evaluating longitudinal learning trends…", step: "preparing" },
  { text: "Finalizing decision intelligence…", step: "preparing" },
];

let isDismissed = false;
let rotationIndex = 0;
let rotationTimer = null;
let slowNoticeTimer = null;

/**
 * Initializes the preloader status rotation and slow-connection timers.
 */
export function initPreloader() {
  if (isDismissed) return;

  const preloaderEl = document.getElementById("app-preloader");
  if (!preloaderEl) return;

  // Clear any existing timers
  if (rotationTimer) clearInterval(rotationTimer);
  if (slowNoticeTimer) clearTimeout(slowNoticeTimer);

  rotationIndex = 0;
  updateStatusDisplay();

  // Rotate status messages every 2.8s
  rotationTimer = setInterval(() => {
    if (isDismissed) {
      clearInterval(rotationTimer);
      return;
    }
    rotationIndex = (rotationIndex + 1) % STATUS_ROTATION.length;
    updateStatusDisplay();
  }, 2800);

  // Show reassuring message if cold database load takes longer than 7.5 seconds
  slowNoticeTimer = setTimeout(() => {
    if (!isDismissed) {
      const slowNoticeEl = document.getElementById("preloader-slow-notice");
      if (slowNoticeEl) {
        slowNoticeEl.style.display = "block";
      }
    }
  }, 7500);
}

/**
 * Updates the visible activity text and active telemetry step pill.
 */
function updateStatusDisplay() {
  const current = STATUS_ROTATION[rotationIndex];
  if (!current) return;

  const activityTextEl = document.getElementById("preloader-activity-text");
  if (activityTextEl) {
    activityTextEl.style.opacity = "0";
    setTimeout(() => {
      activityTextEl.textContent = current.text;
      activityTextEl.style.opacity = "1";
    }, 120);
  }

  // Update step indicators (connecting, processing, preparing)
  const steps = document.querySelectorAll(".preloader-step-item");
  steps.forEach((stepEl) => {
    const stepName = stepEl.getAttribute("data-step");
    if (stepName === current.step) {
      stepEl.classList.add("active");
    } else {
      stepEl.classList.remove("active");
    }
  });
}

/**
 * Dismisses the preloader smoothly with a transition once live data is rendered.
 * This is 100% data-driven and fires immediately when Executive Overview completes.
 */
export function dismissPreloader() {
  if (isDismissed) return;
  isDismissed = true;

  if (rotationTimer) {
    clearInterval(rotationTimer);
    rotationTimer = null;
  }
  if (slowNoticeTimer) {
    clearTimeout(slowNoticeTimer);
    slowNoticeTimer = null;
  }

  const preloaderEl = document.getElementById("app-preloader");
  if (!preloaderEl) return;

  // Add leaving class for smooth fade & subtle scale out (400ms)
  preloaderEl.classList.add("leaving");

  const cleanup = () => {
    preloaderEl.style.display = "none";
    preloaderEl.setAttribute("aria-hidden", "true");
    if (preloaderEl.parentNode) {
      preloaderEl.parentNode.removeChild(preloaderEl);
    }
  };

  // Listen for transition end with safety timeout
  preloaderEl.addEventListener("transitionend", cleanup, { once: true });
  setTimeout(cleanup, 450);

  console.log("[LearnIQ Preloader] Executive Overview live data rendered. Preloader dismissed.");
}

/**
 * Checks if the preloader is currently active.
 */
export function isPreloaderActive() {
  return !isDismissed;
}

/**
 * Displays a professional error state within the preloader if data retrieval fails.
 */
export function showPreloaderError({ title, message, onRetry }) {
  if (isDismissed) return;

  if (rotationTimer) {
    clearInterval(rotationTimer);
    rotationTimer = null;
  }
  if (slowNoticeTimer) {
    clearTimeout(slowNoticeTimer);
    slowNoticeTimer = null;
  }

  const loadingView = document.getElementById("preloader-loading-view");
  const errorView = document.getElementById("preloader-error-view");
  const errorTitle = document.getElementById("preloader-error-title");
  const errorDesc = document.getElementById("preloader-error-desc");
  const retryBtn = document.getElementById("preloader-retry-btn");

  if (loadingView) loadingView.style.display = "none";
  if (errorView) errorView.style.display = "block";

  if (errorTitle && title) {
    errorTitle.textContent = title;
  }
  if (errorDesc && message) {
    errorDesc.textContent = message;
  }

  if (retryBtn && typeof onRetry === "function") {
    // Replace with cloned node to eliminate stale listeners
    const freshBtn = retryBtn.cloneNode(true);
    retryBtn.parentNode.replaceChild(freshBtn, retryBtn);

    freshBtn.addEventListener("click", () => {
      // Revert to loading view and re-init
      if (errorView) errorView.style.display = "none";
      if (loadingView) loadingView.style.display = "block";
      initPreloader();
      onRetry();
    });
  }
}
