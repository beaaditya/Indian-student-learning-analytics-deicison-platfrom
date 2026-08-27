/**
 * LearnIQ — Grounded AI Insight Detail Drawer Component
 * Student Learning Analytics & Decision Intelligence Platform
 *
 * Provides a deep diagnostic view into a specific proactive grounded insight:
 * - Category badge, severity indicator & narrative title
 * - Executive grounded summary
 * - Verified numeric metric & baseline comparative context
 * - Underlying PostgreSQL evidence table/view & sample size
 * - Affected entities (grades, schools, subjects, learner cohorts)
 * - Direct deep-link navigation button to the corresponding analytical module
 */

import { formatMonthLabel } from "../utils/formatters.js";

let modalBackdrop = null;

/**
 * Opens and renders the Insight Detail Drawer
 */
export function openInsightModal(insight) {
  if (!insight) return;

  ensureModalContainer();
  renderInsightDetails(insight);
  openDrawer();
}

/**
 * Dismisses the active modal drawer
 */
export function closeInsightModal() {
  if (!modalBackdrop) return;
  modalBackdrop.classList.remove("open");
  document.body.style.overflow = "";
}

/**
 * Ensures modal DOM container exists in document.body
 */
function ensureModalContainer() {
  if (modalBackdrop && document.getElementById("insight-modal-backdrop")) {
    return;
  }

  modalBackdrop = document.createElement("div");
  modalBackdrop.id = "insight-modal-backdrop";
  modalBackdrop.className = "drawer-backdrop";
  modalBackdrop.setAttribute("aria-hidden", "true");

  modalBackdrop.innerHTML = `
    <div class="drawer-panel" id="insight-modal-panel" role="dialog" aria-modal="true" aria-labelledby="insight-modal-title">
      <div class="drawer-header">
        <div class="drawer-title-wrap">
          <div style="display: flex; align-items: center; gap: 8px;">
            <h2 class="drawer-title" id="insight-modal-title">Grounded Intelligence Detail</h2>
            <span class="badge badge-primary font-mono" id="insight-modal-id-badge"></span>
          </div>
          <p class="drawer-subtitle" id="insight-modal-subtitle">Proactive statistical detection from learning analytics</p>
        </div>
        <button class="drawer-close-btn" id="insight-modal-close-btn" aria-label="Close Insight">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="drawer-body" id="insight-modal-body"></div>
    </div>
  `;

  document.body.appendChild(modalBackdrop);

  // Close handlers
  const closeBtn = modalBackdrop.querySelector("#insight-modal-close-btn");
  if (closeBtn) closeBtn.addEventListener("click", closeInsightModal);

  modalBackdrop.addEventListener("click", (e) => {
    if (e.target === modalBackdrop) closeInsightModal();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modalBackdrop.classList.contains("open")) {
      closeInsightModal();
    }
  });
}

function openDrawer() {
  if (!modalBackdrop) return;
  modalBackdrop.classList.add("open");
  document.body.style.overflow = "hidden";
}

/**
 * Renders insight details into modal body
 */
function renderInsightDetails(ins) {
  const titleEl = modalBackdrop.querySelector("#insight-modal-title");
  const badgeEl = modalBackdrop.querySelector("#insight-modal-id-badge");
  const subEl = modalBackdrop.querySelector("#insight-modal-subtitle");
  const bodyEl = modalBackdrop.querySelector("#insight-modal-body");

  if (titleEl) titleEl.textContent = ins.title || "Intelligence Detail";
  if (badgeEl) badgeEl.textContent = ins.id || "INSIGHT";
  if (subEl) subEl.textContent = `Category: ${ins.category || "General"} · ${ins.generated_at ? ins.generated_at.slice(0, 10) : "Live"}`;

  const severity = (ins.severity || "Medium").toLowerCase();
  const isPos = severity.includes("pos");
  const isCrit = severity.includes("crit") || severity.includes("high");

  const badgeBg = isPos ? "var(--emerald-subtle)" : isCrit ? "rgba(239, 68, 68, 0.12)" : "var(--amber-subtle)";
  const badgeColor = isPos ? "#047857" : isCrit ? "var(--coral)" : "#b45309";

  bodyEl.innerHTML = `
    <!-- 1. Category & Severity Banner -->
    <div class="glass-panel" style="padding: var(--space-4) var(--space-5); margin-bottom: var(--space-4); background: rgba(248, 250, 252, 0.85);">
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="badge" style="background: var(--bg-surface-subtle); color: var(--text-primary); font-weight: 700; font-size: var(--text-xs); padding: 4px 10px;">
            ${ins.category || "Analytics"}
          </span>
          <span class="badge" style="background: ${badgeBg}; color: ${badgeColor}; font-weight: 700; font-size: var(--text-xs); padding: 4px 10px;">
            ${ins.severity || "Medium"} Severity
          </span>
        </div>
        <div style="display: flex; align-items: baseline; gap: 6px;">
          <span style="font-size: 11px; color: var(--text-muted);">${ins.metric_label || "Metric"}:</span>
          <strong style="font-size: var(--text-base); font-family: var(--font-mono); color: ${badgeColor};">${ins.metric || "—"}</strong>
        </div>
      </div>
    </div>

    <!-- 2. Grounded Executive Summary -->
    <div class="glass-panel" style="padding: var(--space-4) var(--space-5); margin-bottom: var(--space-4); border-left: 3px solid ${badgeColor};">
      <h3 style="font-size: var(--text-xs); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-primary); margin: 0 0 var(--space-2) 0;">
        Executive Intelligence Summary
      </h3>
      <p style="font-size: var(--text-xs); color: var(--text-primary); line-height: 1.6; margin: 0;">
        ${ins.summary || "No detailed summary available."}
      </p>
    </div>

    <!-- 3. Key Metric & Comparative Baseline -->
    <div class="glass-panel" style="padding: var(--space-4) var(--space-5); margin-bottom: var(--space-4);">
      <h3 style="font-size: var(--text-xs); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-primary); margin: 0 0 var(--space-3) 0;">
        Metric & Comparative Baseline
      </h3>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: var(--text-xs);">
        <div style="padding: 10px 12px; background: rgba(248, 250, 252, 0.75); border: 1px solid var(--glass-border); border-radius: var(--radius-sm);">
          <span style="color: var(--text-muted); font-size: 10px; text-transform: uppercase; font-weight: 700;">Observed Metric:</span>
          <div style="font-weight: 700; font-size: var(--text-sm); color: ${badgeColor}; font-family: var(--font-mono); margin-top: 2px;">
            ${ins.metric || "—"}
          </div>
          <span style="color: var(--text-muted); font-size: 10px;">${ins.metric_label || ""}</span>
        </div>

        <div style="padding: 10px 12px; background: rgba(248, 250, 252, 0.75); border: 1px solid var(--glass-border); border-radius: var(--radius-sm);">
          <span style="color: var(--text-muted); font-size: 10px; text-transform: uppercase; font-weight: 700;">Comparative Benchmark:</span>
          <div style="font-weight: 600; font-size: var(--text-xs); color: var(--text-primary); margin-top: 2px;">
            ${ins.comparison || "Standard Baseline"}
          </div>
        </div>
      </div>
    </div>

    <!-- 4. Verifiable PostgreSQL Evidence -->
    <div class="glass-panel" style="padding: var(--space-4) var(--space-5); margin-bottom: var(--space-4);">
      <h3 style="font-size: var(--text-xs); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-primary); margin: 0 0 var(--space-2) 0;">
        Verifiable Grounding & Source
      </h3>

      <div style="font-size: var(--text-xs); color: var(--text-secondary); line-height: 1.5; margin-bottom: 8px;">
        <span style="color: var(--text-muted); display: block; font-size: 10px; text-transform: uppercase; font-weight: 700; margin-bottom: 2px;">Dataset Citation:</span>
        <code style="font-family: var(--font-mono); font-size: 11px; background: rgba(241, 245, 249, 0.9); padding: 4px 8px; border-radius: 4px; display: block;">
          ${ins.evidence || "PostgreSQL Analytics Layer"}
        </code>
      </div>

      <div style="font-size: var(--text-xs); margin-top: 8px;">
        <span style="color: var(--text-muted); font-size: 10px; text-transform: uppercase; font-weight: 700; display: block;">Target / Affected Entities:</span>
        <strong style="color: var(--text-primary); font-size: var(--text-xs);">${ins.affected_entities || "Cross-Cohort"}</strong>
      </div>
    </div>

    <!-- 5. Deep Analysis Navigation Link -->
    <div style="text-align: center; padding-top: var(--space-2);">
      <button class="btn btn-primary" id="btn-goto-analysis-from-modal" style="width: 100%; font-size: var(--text-xs); padding: 10px 16px; display: inline-flex; align-items: center; justify-content: center; gap: 8px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        ${ins.action_label || "View Analytical Workspace"}
      </button>
    </div>
  `;

  const btnGoto = bodyEl.querySelector("#btn-goto-analysis-from-modal");
  if (btnGoto) {
    btnGoto.addEventListener("click", () => {
      closeInsightModal();
      if (ins.target_route) {
        window.location.hash = `#${ins.target_route}`;
      }
    });
  }
}
