/**
 * LearnIQ — Risk & Intervention Case Diagnostic Drawer Component
 * Student Learning Analytics & Decision Intelligence Platform
 *
 * Provides a deep diagnostic view into specific flagged priority cases:
 * - Severity level, risk score & identification date
 * - Root-cause evidence & rationale
 * - Recommended remediation action & assigned coordinator
 * - Direct link to comprehensive Student 360-Degree Diagnostic Profile
 */

import { formatNumber, formatScore, formatMonthLabel } from "../utils/formatters.js";
import { openStudentModal } from "./student-modal.js";

let modalBackdrop = null;

/**
 * Opens and renders the Risk Case Diagnostic Drawer
 */
export function openRiskModal(caseData) {
  if (!caseData) return;

  ensureModalContainer();
  renderCaseDetails(caseData);
  openDrawer();
}

/**
 * Dismisses the active modal drawer
 */
export function closeRiskModal() {
  if (!modalBackdrop) return;
  modalBackdrop.classList.remove("open");
  document.body.style.overflow = "";
}

/**
 * Ensures modal DOM container exists in document.body
 */
function ensureModalContainer() {
  if (modalBackdrop && document.getElementById("risk-modal-backdrop")) {
    return;
  }

  modalBackdrop = document.createElement("div");
  modalBackdrop.id = "risk-modal-backdrop";
  modalBackdrop.className = "drawer-backdrop";
  modalBackdrop.setAttribute("aria-hidden", "true");

  modalBackdrop.innerHTML = `
    <div class="drawer-panel" id="risk-modal-panel" role="dialog" aria-modal="true" aria-labelledby="risk-modal-title">
      <div class="drawer-header">
        <div class="drawer-title-wrap">
          <div style="display: flex; align-items: center; gap: 8px;">
            <h2 class="drawer-title" id="risk-modal-title">Early Warning Case Diagnostic</h2>
            <span class="badge badge-coral font-mono" id="risk-modal-id-badge"></span>
          </div>
          <p class="drawer-subtitle" id="risk-modal-subtitle">Grounded root-cause evidence and intervention tracking</p>
        </div>
        <button class="drawer-close-btn" id="risk-modal-close-btn" aria-label="Close Case">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="drawer-body" id="risk-modal-body"></div>
    </div>
  `;

  document.body.appendChild(modalBackdrop);

  // Close handlers
  const closeBtn = modalBackdrop.querySelector("#risk-modal-close-btn");
  if (closeBtn) closeBtn.addEventListener("click", closeRiskModal);

  modalBackdrop.addEventListener("click", (e) => {
    if (e.target === modalBackdrop) closeRiskModal();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modalBackdrop.classList.contains("open")) {
      closeRiskModal();
    }
  });
}

function openDrawer() {
  if (!modalBackdrop) return;
  modalBackdrop.classList.add("open");
  document.body.style.overflow = "hidden";
}

/**
 * Renders case details into modal body
 */
function renderCaseDetails(c) {
  const titleEl = modalBackdrop.querySelector("#risk-modal-title");
  const badgeEl = modalBackdrop.querySelector("#risk-modal-id-badge");
  const subEl = modalBackdrop.querySelector("#risk-modal-subtitle");
  const bodyEl = modalBackdrop.querySelector("#risk-modal-body");

  if (titleEl) titleEl.textContent = `Case ${c.intervention_id || "Details"}`;
  if (badgeEl) badgeEl.textContent = c.intervention_id || "Case";
  if (subEl) subEl.textContent = `Identified: ${c.identified_date ? c.identified_date.slice(0, 10) : "Recent"}`;

  const priority = (c.priority || "Medium").toLowerCase();
  const priorityBg = priority.includes("crit") ? "rgba(239, 68, 68, 0.15)" : priority.includes("high") ? "rgba(239, 68, 68, 0.12)" : "rgba(245, 158, 11, 0.12)";
  const priorityColor = priority.includes("crit") || priority.includes("high") ? "var(--coral)" : "var(--amber)";

  const status = (c.intervention_status || c.status || "Open").toLowerCase();
  const statusPill = status.includes("res") || status.includes("close") ? "status-pill-success" : status.includes("prog") ? "status-pill-warning" : "status-pill-danger";

  bodyEl.innerHTML = `
    <!-- 1. Priority & Status Summary Banner -->
    <div class="glass-panel" style="padding: var(--space-4) var(--space-5); margin-bottom: var(--space-4); background: rgba(248, 250, 252, 0.85);">
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="badge" style="background: ${priorityBg}; color: ${priorityColor}; font-weight: 700; font-size: var(--text-xs); padding: 4px 10px;">
            ${c.priority || "High"} Priority
          </span>
          <span class="status-pill ${statusPill}" style="font-size: var(--text-xs); padding: 3px 8px;">
            ${c.intervention_status || c.status || "Open"}
          </span>
        </div>
        <div style="display: flex; align-items: baseline; gap: 6px;">
          <span style="font-size: 11px; color: var(--text-muted);">Risk Severity Score:</span>
          <strong style="font-size: var(--text-base); font-family: var(--font-mono); color: ${priorityColor};">${formatScore(c.risk_score)}</strong>
          <span style="font-size: 10px; color: var(--text-muted);">/ 100</span>
        </div>
      </div>
    </div>

    <!-- 2. Learner & Institution Metadata Grid -->
    <div class="glass-panel" style="padding: var(--space-4) var(--space-5); margin-bottom: var(--space-4);">
      <h3 style="font-size: var(--text-xs); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-primary); margin: 0 0 var(--space-3) 0;">
        Target Learner & Institution
      </h3>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: var(--text-xs);">
        <div>
          <span style="color: var(--text-muted); display: block;">Learner Identifier</span>
          <strong style="color: var(--primary); font-family: var(--font-mono); font-size: var(--text-sm);">${c.student_id}</strong>
          <span style="color: var(--text-muted); font-size: 10px; display: block;">${c.gender || "Learner"}</span>
        </div>
        <div>
          <span style="color: var(--text-muted); display: block;">Cohort</span>
          <strong style="color: var(--text-primary);">Grade ${c.grade || "—"} · ${c.section ? `Section ${c.section}` : "Section A"}</strong>
        </div>
        <div style="grid-column: span 2; padding-top: 8px; border-top: 1px solid var(--glass-border);">
          <span style="color: var(--text-muted); display: block;">Institution</span>
          <strong style="color: var(--text-primary); font-size: var(--text-xs);">${c.school_name || "School"}</strong>
          <span style="color: var(--text-muted); font-size: 10px; font-family: var(--font-mono); display: block;">${c.school_id || ""}</span>
        </div>
      </div>
    </div>

    <!-- 3. Grounded Root-Cause Evidence -->
    <div class="glass-panel" style="padding: var(--space-4) var(--space-5); margin-bottom: var(--space-4); border-left: 3px solid ${priorityColor};">
      <h3 style="font-size: var(--text-xs); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-primary); margin: 0 0 var(--space-2) 0;">
        Primary Risk Root Cause
      </h3>
      <div style="font-size: var(--text-sm); font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">
        ${c.risk_reason || "Identified Learning Deficit"}
      </div>
      <p style="font-size: var(--text-xs); color: var(--text-secondary); line-height: 1.5; margin: 0;">
        Learner placed in priority triage queue due to flagged indicators reflecting ${c.risk_level || "elevated"} risk criteria across recent foundational performance assessments.
      </p>
    </div>

    <!-- 4. Action Plan & Remediation Assignment -->
    <div class="glass-panel" style="padding: var(--space-4) var(--space-5); margin-bottom: var(--space-5);">
      <h3 style="font-size: var(--text-xs); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-primary); margin: 0 0 var(--space-3) 0;">
        Prescribed Remediation Action
      </h3>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: var(--text-xs);">
        <div style="grid-column: span 2; padding: 10px 12px; background: rgba(248, 250, 252, 0.75); border: 1px solid var(--glass-border); border-radius: var(--radius-sm);">
          <span style="color: var(--text-muted); font-size: 10px; text-transform: uppercase; font-weight: 700;">Recommended Action:</span>
          <div style="font-weight: 700; color: var(--text-primary); font-size: var(--text-xs); margin-top: 2px;">
            ${c.recommended_action || "Targeted Teacher Review"}
          </div>
        </div>
        <div>
          <span style="color: var(--text-muted); display: block;">Assigned Coordinator</span>
          <strong style="color: var(--text-primary);">${c.assigned_to || "Academic Coordinator"}</strong>
        </div>
        <div>
          <span style="color: var(--text-muted); display: block;">Target Resolution</span>
          <strong style="color: var(--text-primary);">${c.resolution_date ? c.resolution_date.slice(0, 10) : "Open Case"}</strong>
        </div>
      </div>
    </div>

    <!-- 5. Action Link to 360-Degree Profile -->
    <div style="text-align: center; padding-top: var(--space-2);">
      <button class="btn btn-primary" id="btn-open-student-360-from-risk" style="width: 100%; font-size: var(--text-xs); padding: 10px 16px; display: inline-flex; align-items: center; justify-content: center; gap: 8px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        Inspect Full Student 360° Learning Profile
      </button>
    </div>
  `;

  const btn360 = bodyEl.querySelector("#btn-open-student-360-from-risk");
  if (btn360) {
    btn360.addEventListener("click", () => {
      closeRiskModal();
      if (c.student_id) openStudentModal(c.student_id);
    });
  }
}
