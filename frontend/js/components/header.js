/**
 * LearnIQ — Top Header Component
 */

import { store } from "../state.js";

export function renderHeader(container, onRefresh) {
  if (!container) return;

  const state = store.getState();
  const pageMeta = state.pageMeta || {
    title: "Executive Overview",
    subtitle: "High-level institutional performance & KPIs",
  };
  const backendStatus = state.backendStatus;
  const isHealthy = backendStatus === "healthy";

  const statusHtml = isHealthy
    ? `<span class="status-pill status-pill-success" id="header-status-pill" title="Backend and PostgreSQL are active"><span class="status-pill-dot"></span> System Operational</span>`
    : backendStatus === "pending"
    ? `<span class="status-pill status-pill-warning" id="header-status-pill" title="Checking server status"><span class="status-pill-dot"></span> Verifying...</span>`
    : `<span class="status-pill status-pill-danger" id="header-status-pill" title="Backend is unreachable"><span class="status-pill-dot"></span> System Offline</span>`;

  // Fast In-Place Reconciliation if already mounted
  const titleWrap = container.querySelector(".header-title-wrap");
  if (titleWrap) {
    const titleEl = titleWrap.querySelector(".header-title");
    const subEl = titleWrap.querySelector(".header-subtitle");
    if (titleEl && titleEl.textContent !== pageMeta.title) {
      titleEl.textContent = pageMeta.title;
    }
    if (subEl && subEl.textContent !== pageMeta.subtitle) {
      subEl.textContent = pageMeta.subtitle;
    }

    const pillEl = container.querySelector("#header-status-pill");
    if (pillEl) {
      pillEl.outerHTML = statusHtml;
    }
    return;
  }

  // Initial Full Render
  container.innerHTML = `
    <div class="header-left">
      <button class="btn-icon mobile-nav-toggle" id="btn-mobile-nav" aria-label="Toggle Navigation">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>
        </svg>
      </button>

      <div class="header-title-wrap">
        <div class="header-title">${pageMeta.title}</div>
        <div class="header-subtitle">${pageMeta.subtitle}</div>
      </div>
    </div>

    <div class="header-right">
      <!-- Search Input Visual Control -->
      <div class="search-control">
        <span class="search-icon">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </span>
        <input type="text" class="search-input" placeholder="Search analytics..." aria-label="Global Search">
      </div>

      <!-- Real Backend Connection Indicator -->
      ${statusHtml}

      <!-- Refresh Button -->
      <button class="btn btn-secondary btn-icon" id="btn-header-refresh" title="Refresh Application Data" aria-label="Refresh Data">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
          <path d="M3 3v5h5"/>
          <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
          <path d="M16 21h5v-5"/>
        </svg>
      </button>

      <!-- User Profile Badge -->
      <div class="user-profile-badge">
        <div class="user-avatar">AD</div>
        <span style="font-weight: 500;">Admin</span>
      </div>
    </div>
  `;

  // Attach event handlers
  const refreshBtn = container.querySelector("#btn-header-refresh");
  if (refreshBtn && typeof onRefresh === "function") {
    refreshBtn.addEventListener("click", () => onRefresh());
  }

  const mobileBtn = container.querySelector("#btn-mobile-nav");
  if (mobileBtn) {
    mobileBtn.addEventListener("click", () => {
      const sidebar = document.getElementById("sidebar-mount");
      const overlay = document.getElementById("sidebar-overlay");
      if (sidebar && overlay) {
        sidebar.classList.toggle("open");
        overlay.classList.toggle("open");
      }
    });
  }
}
