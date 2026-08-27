/**
 * LearnIQ — Error State & Global Error Handling Component
 */

/**
 * Renders an inline error state inside a given container
 */
export function renderErrorState(container, options = {}) {
  if (!container) return;

  const title = options.title || "An unexpected error occurred";
  const message = options.message || "Failed to load module. Please verify backend connectivity.";
  const showRetry = typeof options.onRetry === "function";

  container.innerHTML = `
    <div class="page-container">
      <div class="glass-panel" style="max-width: 600px; margin: 40px auto; padding: var(--space-8); text-align: center; border-color: rgba(239, 68, 68, 0.3);">
        <div style="width: 48px; height: 48px; border-radius: 50%; background: var(--coral-subtle); color: var(--coral); display: inline-flex; align-items: center; justify-content: center; margin-bottom: var(--space-4);">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <h2 style="font-size: var(--text-xl); font-weight: 700; color: var(--text-primary); margin-bottom: var(--space-2);">${title}</h2>
        <p style="font-size: var(--text-sm); color: var(--text-secondary); line-height: 1.5; margin-bottom: var(--space-6);">${message}</p>
        ${showRetry ? `<button class="btn btn-primary" id="btn-error-retry">Retry Operation</button>` : ""}
      </div>
    </div>
  `;

  if (showRetry) {
    const btn = container.querySelector("#btn-error-retry");
    if (btn) {
      btn.addEventListener("click", () => options.onRetry());
    }
  }
}

/**
 * Initializes global uncaught error and unhandled rejection listeners
 */
export function setupGlobalErrorHandlers() {
  const mount = document.getElementById("global-error-mount");

  function showGlobalToast(type, msg, stack) {
    console.error(`[Global ${type}]`, msg, stack);
    if (!mount) return;

    const toast = document.createElement("div");
    toast.className = "global-error-toast";
    toast.innerHTML = `
      <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;">
        <div>
          <strong style="color: var(--coral); font-size: var(--text-sm);">${type}</strong>
          <div style="font-size: var(--text-xs); color: var(--text-primary); margin-top: 2px;">${msg}</div>
        </div>
        <button class="btn-icon" style="padding: 2px; line-height: 1;" aria-label="Dismiss error">&times;</button>
      </div>
    `;

    const closeBtn = toast.querySelector("button");
    closeBtn.addEventListener("click", () => toast.remove());

    mount.appendChild(toast);
    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 8000);
  }

  window.addEventListener("error", (event) => {
    showGlobalToast("Frontend JavaScript Error", event.message || "Unknown error", event.error?.stack);
  });

  window.addEventListener("unhandledrejection", (event) => {
    showGlobalToast("Unhandled Promise Rejection", event.reason?.message || String(event.reason), event.reason?.stack);
  });
}
