/**
 * LearnIQ — Application Sidebar Component
 */

import { store } from "../state.js";

const NAV_GROUPS = [
  {
    title: "OVERVIEW",
    items: [
      {
        label: "Executive Overview",
        route: "/overview",
        icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>`,
      },
    ],
  },
  {
    title: "PERFORMANCE",
    items: [
      {
        label: "School Intelligence",
        route: "/schools",
        icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10"/><path d="M6 10h10"/><path d="M6 14h10"/><path d="M6 18h10"/></svg>`,
      },
      {
        label: "Grade & Subject",
        route: "/grades",
        icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>`,
      },
    ],
  },
  {
    title: "STUDENT OPERATIONS",
    items: [
      {
        label: "Student Intelligence",
        route: "/students",
        icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
      },
      {
        label: "Risk & Intervention",
        route: "/risk",
        icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
      },
    ],
  },
  {
    title: "AI",
    items: [
      {
        label: "AI Student Analyst",
        route: "/ai",
        icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`,
      },
      {
        label: "AI Insights",
        route: "/ai-insight",
        icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
      },
    ],
  },
];

export function renderSidebar(container) {
  if (!container) return;

  const state = store.getState();
  const currentRoute = state.currentRoute || "/overview";
  const backendStatus = state.backendStatus;
  const isHealthy = backendStatus === "healthy";

  const dbStatusHtml = isHealthy
    ? `<span class="status-pill status-pill-success" style="font-size: 11px; padding: 2px 8px;"><span class="status-pill-dot"></span> PostgreSQL Active</span>`
    : backendStatus === "pending"
    ? `<span class="status-pill status-pill-warning" style="font-size: 11px; padding: 2px 8px;"><span class="status-pill-dot"></span> Connecting...</span>`
    : `<span class="status-pill status-pill-danger" style="font-size: 11px; padding: 2px 8px;"><span class="status-pill-dot"></span> DB Offline</span>`;

  // Fast In-Place Reconciliation if already mounted
  const navContainer = container.querySelector(".sidebar-nav");
  if (navContainer) {
    const navLinks = container.querySelectorAll(".nav-item");
    navLinks.forEach((link) => {
      const linkRoute = link.getAttribute("data-route");
      if (linkRoute === currentRoute) {
        link.classList.add("active");
      } else {
        link.classList.remove("active");
      }
    });

    const dbStatusEl = container.querySelector(".sidebar-db-status");
    if (dbStatusEl) {
      dbStatusEl.innerHTML = `
        <span style="color: var(--text-muted); font-weight: 500;">Database</span>
        ${dbStatusHtml}
      `;
    }
    return;
  }

  // Initial Full Render
  container.innerHTML = `
    <div class="sidebar-header">
      <div class="sidebar-brand-icon">SLA</div>
      <div class="sidebar-brand-text">
        <span class="sidebar-brand-title">LearnIQ</span>
        <span class="sidebar-brand-subtitle">Decision Intelligence</span>
      </div>
    </div>

    <nav class="sidebar-nav" aria-label="Main Navigation">
      ${NAV_GROUPS.map(
        (group) => `
        <div class="nav-group">
          <div class="nav-group-title">${group.title}</div>
          ${group.items
            .map((item) => {
              const isActive = currentRoute === item.route;
              return `
              <a href="#${item.route}" class="nav-item ${isActive ? "active" : ""}" data-route="${item.route}">
                <span class="nav-item-icon">${item.icon}</span>
                <span>${item.label}</span>
              </a>
            `;
            })
            .join("")}
        </div>
      `
      ).join("")}
    </nav>

    <div class="sidebar-footer">
      <div class="sidebar-db-status">
        <span style="color: var(--text-muted); font-weight: 500;">Database</span>
        ${dbStatusHtml}
      </div>
    </div>
  `;

  // Attach mobile close behavior
  const navLinks = container.querySelectorAll(".nav-item");
  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      const sidebar = document.getElementById("sidebar-mount");
      const overlay = document.getElementById("sidebar-overlay");
      if (sidebar && overlay) {
        sidebar.classList.remove("open");
        overlay.classList.remove("open");
      }
    });
  });
}
