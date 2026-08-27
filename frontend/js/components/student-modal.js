/**
 * LearnIQ — Student Diagnostic Profile Drawer Component
 * Student Learning Analytics & Decision Intelligence Platform
 *
 * Renders an exhaustive 360-degree learner diagnostic profile including:
 * - Demographics, enrollment & academic metadata
 * - Overall performance & benchmark attainment scorecards
 * - Sub-skill competency mastery bars
 * - Longitudinal assessment history
 * - Monthly engagement & attendance timeline
 * - Early warning risk and intervention case tracking
 */

import { api } from "../api.js";
import { formatNumber, formatScore, formatPercent, formatMonthLabel } from "../utils/formatters.js";
import { renderErrorState } from "./error-state.js";

let modalBackdrop = null;
let currentStudentId = null;

/**
 * Opens and renders the Student Diagnostic Profile Drawer for a specific student ID
 */
export async function openStudentModal(studentId) {
  if (!studentId) return;
  currentStudentId = studentId;

  // 1. Create or retrieve modal backdrop
  ensureModalContainer();

  // 2. Render Loading Skeleton
  renderModalSkeleton(studentId);

  // 3. Open Drawer
  openDrawer();

  // 4. Fetch Deep Student Diagnostic Profile
  try {
    const data = await api.studentDetail(studentId);
    if (!data || data.status !== "success" || !data.profile) {
      throw new Error(data?.message || `Learner profile for "${studentId}" was not found.`);
    }

    renderStudentProfile(data);
  } catch (err) {
    console.error(`[Student Diagnostic Error] Failed to load student "${studentId}":`, err);
    const bodyContainer = modalBackdrop.querySelector("#student-modal-body");
    if (bodyContainer) {
      renderErrorState(bodyContainer, {
        title: "Unable to load student profile",
        message: err.message || "An unexpected error occurred while querying student diagnostics.",
        onRetry: () => openStudentModal(studentId),
      });
    }
  }
}

/**
 * Dismisses the active modal drawer
 */
export function closeStudentModal() {
  if (!modalBackdrop) return;
  modalBackdrop.classList.remove("open");
  document.body.style.overflow = "";
}

/**
 * Ensures modal DOM container exists in document.body
 */
function ensureModalContainer() {
  if (modalBackdrop && document.getElementById("student-modal-backdrop")) {
    return;
  }

  modalBackdrop = document.createElement("div");
  modalBackdrop.id = "student-modal-backdrop";
  modalBackdrop.className = "drawer-backdrop";
  modalBackdrop.setAttribute("aria-hidden", "true");

  modalBackdrop.innerHTML = `
    <div class="drawer-panel" id="student-modal-panel" role="dialog" aria-modal="true" aria-labelledby="student-modal-title">
      <div class="drawer-header">
        <div class="drawer-title-wrap">
          <div style="display: flex; align-items: center; gap: 8px;">
            <h2 class="drawer-title" id="student-modal-title">Learner Diagnostic Profile</h2>
            <span class="badge badge-primary font-mono" id="student-modal-id-badge"></span>
          </div>
          <p class="drawer-subtitle" id="student-modal-subtitle">360-degree competency, engagement, and assessment history</p>
        </div>
        <button class="drawer-close-btn" id="student-modal-close-btn" aria-label="Close Profile">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="drawer-body" id="student-modal-body"></div>
    </div>
  `;

  document.body.appendChild(modalBackdrop);

  // Close handlers
  const closeBtn = modalBackdrop.querySelector("#student-modal-close-btn");
  if (closeBtn) closeBtn.addEventListener("click", closeStudentModal);

  modalBackdrop.addEventListener("click", (e) => {
    if (e.target === modalBackdrop) closeStudentModal();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modalBackdrop.classList.contains("open")) {
      closeStudentModal();
    }
  });
}

function openDrawer() {
  if (!modalBackdrop) return;
  modalBackdrop.classList.add("open");
  document.body.style.overflow = "hidden";
}

/**
 * Skeleton Loader for Student Diagnostic Profile
 */
function renderModalSkeleton(studentId) {
  const titleEl = modalBackdrop.querySelector("#student-modal-title");
  const badgeEl = modalBackdrop.querySelector("#student-modal-id-badge");
  const subEl = modalBackdrop.querySelector("#student-modal-subtitle");
  const bodyEl = modalBackdrop.querySelector("#student-modal-body");

  if (titleEl) titleEl.textContent = "Loading Student Profile...";
  if (badgeEl) badgeEl.textContent = studentId;
  if (subEl) subEl.textContent = "Fetching comprehensive performance and engagement records...";

  if (bodyEl) {
    bodyEl.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: var(--space-4);">
        <!-- Banner Skeleton -->
        <div class="glass-panel" style="height: 100px; background: rgba(248, 250, 252, 0.6);"></div>
        <!-- Scorecard Skeletons -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;">
          ${[1, 2, 3, 4].map(() => `<div class="kpi-card" style="height: 80px; background: rgba(248, 250, 252, 0.6);"></div>`).join("")}
        </div>
        <!-- Table Skeletons -->
        <div class="glass-panel" style="height: 180px; background: rgba(248, 250, 252, 0.6);"></div>
      </div>
    `;
  }
}

/**
 * Renders complete student profile data
 */
function renderStudentProfile(data) {
  const p = data.profile || {};
  const history = data.assessment_history || [];
  const engagement = data.engagement_timeline || [];
  const interventions = data.interventions || [];

  const titleEl = modalBackdrop.querySelector("#student-modal-title");
  const badgeEl = modalBackdrop.querySelector("#student-modal-id-badge");
  const subEl = modalBackdrop.querySelector("#student-modal-subtitle");
  const bodyEl = modalBackdrop.querySelector("#student-modal-body");

  if (titleEl) titleEl.textContent = `Student ${p.student_id}`;
  if (badgeEl) badgeEl.textContent = p.student_id;
  if (subEl) subEl.textContent = `${p.school_name || "School"} · Grade ${p.grade || "—"} (${p.section ? `Sec ${p.section}` : ""})`;

  // Sub-skill scores dictionary
  const subSkills = [
    { label: "Reading Score", val: p.reading_score || p.average_performance, max: 100, color: "var(--primary)" },
    { label: "Fluency", val: p.fluency_score, max: 100, color: "var(--teal)" },
    { label: "Comprehension", val: p.comprehension_score, max: 100, color: "var(--blue)" },
    { label: "Vocabulary", val: p.vocabulary_score, max: 100, color: "var(--accent-violet)" },
    { label: "Grammar", val: p.grammar_score, max: 100, color: "#0284c7" },
    { label: "Pronunciation", val: p.pronunciation_score, max: 100, color: "#0d9488" },
    { label: "Accuracy", val: p.accuracy_pct, max: 100, color: "#047857", isPct: true },
  ];

  // Risk styling
  const riskStatus = (p.risk_status || "Low").toLowerCase();
  const riskColor = riskStatus.includes("crit") ? "var(--coral)" : riskStatus.includes("high") ? "var(--coral)" : riskStatus.includes("med") ? "var(--amber)" : "var(--emerald)";

  // Benchmark status styling
  const bmStatus = (p.benchmark_status || "Meets Benchmark").toLowerCase();
  const bmBg = bmStatus.includes("below") || bmStatus.includes("need") ? "var(--amber-subtle)" : "var(--emerald-subtle)";
  const bmText = bmStatus.includes("below") || bmStatus.includes("need") ? "#b45309" : "#047857";

  bodyEl.innerHTML = `
    <!-- 1. Metadata Demographics Banner -->
    <div class="glass-panel" style="padding: var(--space-4) var(--space-5); margin-bottom: var(--space-4); background: rgba(248, 250, 252, 0.85);">
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; font-size: var(--text-xs);">
        <div>
          <span style="color: var(--text-muted); display: block;">Institution</span>
          <strong style="color: var(--text-primary);">${p.school_name || "—"}</strong>
          <span style="color: var(--text-muted); font-size: 10px; display: block; font-family: var(--font-mono);">${p.school_id || ""}</span>
        </div>
        <div>
          <span style="color: var(--text-muted); display: block;">Cohort / Academic Year</span>
          <strong style="color: var(--text-primary);">Grade ${p.grade || "—"} · Section ${p.section || "—"}</strong>
          <span style="color: var(--text-muted); font-size: 10px; display: block;">${p.academic_year || "2024-2025"}</span>
        </div>
        <div>
          <span style="color: var(--text-muted); display: block;">Demographics & Access</span>
          <strong style="color: var(--text-primary);">${p.gender || "—"}${p.age ? ` · ${p.age} yrs` : ""}</strong>
          <span style="color: var(--text-muted); font-size: 10px; display: block;">${p.socioeconomic_band || "Standard"} SES · Digital: ${p.digital_access || "Yes"}</span>
        </div>
        <div>
          <span style="color: var(--text-muted); display: block;">Learning Mode & Baseline</span>
          <strong style="color: var(--text-primary);">${p.learning_mode || "Regular"} · ${p.medium || "English"}</strong>
          <span style="color: var(--text-muted); font-size: 10px; display: block;">Baseline: ${p.baseline_reading_level || "Standard"}</span>
        </div>
      </div>
    </div>

    <!-- 2. Primary KPI Performance Metric Grid -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: var(--space-3); margin-bottom: var(--space-5);">
      
      <!-- Average Performance -->
      <div class="kpi-card" style="padding: 12px; border-top: 3px solid var(--primary);">
        <div class="kpi-header" style="font-size: 11px;"><span>Avg Score</span></div>
        <div class="kpi-value" style="font-size: var(--text-xl); color: var(--primary);">${formatScore(p.average_performance || p.reading_score)}</div>
        <div class="kpi-subtext" style="font-size: 10px;">${p.performance_band || "Proficient"} band</div>
      </div>

      <!-- Benchmark Status -->
      <div class="kpi-card" style="padding: 12px; border-top: 3px solid ${bmText};">
        <div class="kpi-header" style="font-size: 11px;"><span>Benchmark</span></div>
        <div style="margin-top: 4px;">
          <span class="badge" style="background: ${bmBg}; color: ${bmText}; font-size: 11px; padding: 3px 6px;">
            ${p.benchmark_status || "Meets Benchmark"}
          </span>
        </div>
        <div class="kpi-subtext" style="font-size: 10px; margin-top: 6px;">${p.percentile ? `${formatPercent(p.percentile)} percentile` : "Standard Met"}</div>
      </div>

      <!-- Attendance -->
      <div class="kpi-card" style="padding: 12px; border-top: 3px solid var(--teal);">
        <div class="kpi-header" style="font-size: 11px;"><span>Attendance</span></div>
        <div class="kpi-value" style="font-size: var(--text-xl); color: var(--teal);">${p.attendance_pct ? formatPercent(p.attendance_pct) : "—"}</div>
        <div class="kpi-subtext" style="font-size: 10px;">Enrolled learner</div>
      </div>

      <!-- Improvement / Growth -->
      <div class="kpi-card" style="padding: 12px; border-top: 3px solid #047857;">
        <div class="kpi-header" style="font-size: 11px;"><span>Growth</span></div>
        <div class="kpi-value" style="font-size: var(--text-xl); color: #047857;">+${formatPercent(p.improvement_percentage || 0)}</div>
        <div class="kpi-subtext" style="font-size: 10px;">Longitudinal gain</div>
      </div>

      <!-- Risk Status -->
      <div class="kpi-card" style="padding: 12px; border-top: 3px solid ${riskColor};">
        <div class="kpi-header" style="font-size: 11px;"><span>Risk Level</span></div>
        <div class="kpi-value" style="font-size: var(--text-xl); color: ${riskColor};">${p.risk_status || "Low"}</div>
        <div class="kpi-subtext" style="font-size: 10px;">${p.risk_reason || "Nominal trajectory"}</div>
      </div>

    </div>

    <!-- 3. Sub-Skill Competency Mastery Bars -->
    <div class="glass-panel" style="padding: var(--space-4) var(--space-5); margin-bottom: var(--space-5);">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-3);">
        <h3 style="font-size: var(--text-xs); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-primary); margin: 0;">
          Sub-Skill Competency Breakdown
        </h3>
        <span class="badge badge-primary font-mono" style="font-size: 10px;">Accuracy: ${formatPercent(p.accuracy_pct)}</span>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
        ${subSkills.map((sk) => {
          const num = Number(sk.val || 0);
          return `
            <div style="padding: 8px 12px; background: rgba(248, 250, 252, 0.7); border: 1px solid var(--glass-border); border-radius: var(--radius-sm);">
              <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
                <span style="font-size: 11px; font-weight: 600; color: var(--text-primary);">${sk.label}</span>
                <span style="font-size: var(--text-xs); font-weight: 700; font-family: var(--font-mono); color: ${sk.color};">
                  ${sk.isPct ? formatPercent(num) : formatScore(num)}
                </span>
              </div>
              <div style="height: 5px; background: #e2e8f0; border-radius: var(--radius-full); overflow: hidden;">
                <div style="height: 100%; width: ${Math.min(100, Math.max(0, num))}%; background: ${sk.color};"></div>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    </div>

    <!-- 4. Longitudinal Assessment History -->
    <div class="glass-panel" style="padding: var(--space-4) var(--space-5); margin-bottom: var(--space-5);">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-3);">
        <h3 style="font-size: var(--text-xs); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-primary); margin: 0;">
          Assessment History
        </h3>
        <span class="badge badge-teal" style="font-size: 10px;">${history.length} Assessments</span>
      </div>

      ${history.length > 0 ? `
        <div style="max-height: 240px; overflow-y: auto; border: 1px solid var(--glass-border); border-radius: var(--radius-sm);">
          <table class="data-table" style="font-size: 11px;">
            <thead>
              <tr>
                <th>Date / Month</th>
                <th>Type</th>
                <th>Subject</th>
                <th style="text-align: right;">Reading Score</th>
                <th style="text-align: right;">Fluency</th>
                <th style="text-align: right;">Accuracy %</th>
                <th>Benchmark</th>
                <th style="text-align: right;">Growth</th>
              </tr>
            </thead>
            <tbody>
              ${history.map((h) => `
                <tr>
                  <td><strong style="color: var(--text-primary);">${h.assessment_date ? h.assessment_date.slice(0, 10) : formatMonthLabel(h.assessment_month)}</strong></td>
                  <td><span class="badge badge-neutral" style="font-size: 10px;">${h.assessment_type || "Diagnostic"}</span></td>
                  <td>${h.subject || "English"}</td>
                  <td style="text-align: right; font-family: var(--font-mono); font-weight: 700; color: var(--primary);">${formatScore(h.reading_score)}</td>
                  <td style="text-align: right; font-family: var(--font-mono);">${formatScore(h.fluency_score)}</td>
                  <td style="text-align: right; font-family: var(--font-mono);">${formatPercent(h.accuracy_pct)}</td>
                  <td>
                    <span class="badge" style="background: ${(h.benchmark_status || "").toLowerCase().includes("below") ? "var(--amber-subtle)" : "var(--emerald-subtle)"}; color: ${(h.benchmark_status || "").toLowerCase().includes("below") ? "#b45309" : "#047857"}; font-size: 9px; padding: 2px 4px;">
                      ${h.benchmark_status || "Met"}
                    </span>
                  </td>
                  <td style="text-align: right; font-family: var(--font-mono); color: #047857;">+${formatPercent(h.improvement_pct || 0)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      ` : `<div class="chart-empty-state">No historical assessment evaluations recorded.</div>`}
    </div>

    <!-- 5. Monthly Engagement Timeline -->
    ${engagement.length > 0 ? `
      <div class="glass-panel" style="padding: var(--space-4) var(--space-5); margin-bottom: var(--space-5);">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-3);">
          <h3 style="font-size: var(--text-xs); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-primary); margin: 0;">
            Monthly Engagement & Participation
          </h3>
          <span class="badge badge-neutral font-mono" style="font-size: 10px;">${engagement.length} Months Tracked</span>
        </div>

        <div style="max-height: 200px; overflow-y: auto; border: 1px solid var(--glass-border); border-radius: var(--radius-sm);">
          <table class="data-table" style="font-size: 11px;">
            <thead>
              <tr>
                <th>Month</th>
                <th style="text-align: right;">Attendance %</th>
                <th style="text-align: right;">Classes (Att / Miss)</th>
                <th style="text-align: right;">Assignments Completed</th>
                <th style="text-align: right;">Platform Time</th>
                <th>Engagement Level</th>
              </tr>
            </thead>
            <tbody>
              ${engagement.map((e) => `
                <tr>
                  <td><strong style="color: var(--text-primary);">${formatMonthLabel(e.month)}</strong></td>
                  <td style="text-align: right; font-family: var(--font-mono); font-weight: 600; color: var(--teal);">${formatPercent(e.attendance_pct)}</td>
                  <td style="text-align: right; font-family: var(--font-mono);">${e.classes_attended || 0} / <span style="color: var(--coral);">${e.classes_missed || 0}</span></td>
                  <td style="text-align: right; font-family: var(--font-mono);">${e.assignments_completed || 0} of ${e.assignments_assigned || 0} (${formatPercent(e.assignment_completion_pct)})</td>
                  <td style="text-align: right; font-family: var(--font-mono);">${e.platform_minutes || 0} mins</td>
                  <td>
                    <span class="badge" style="background: ${(e.engagement_level || "").toLowerCase() === "high" ? "var(--emerald-subtle)" : "var(--amber-subtle)"}; color: ${(e.engagement_level || "").toLowerCase() === "high" ? "#047857" : "#b45309"}; font-size: 9px; padding: 2px 4px;">
                      ${e.engagement_level || "Moderate"}
                    </span>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    ` : ""}

    <!-- 6. Intervention & Early Warning Tracking -->
    ${interventions.length > 0 ? `
      <div class="glass-panel" style="padding: var(--space-4) var(--space-5);">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-3);">
          <h3 style="font-size: var(--text-xs); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-primary); margin: 0;">
            Active Interventions & Remediation
          </h3>
          <span class="badge badge-coral" style="font-size: 10px;">${interventions.length} Cases</span>
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${interventions.map((inv) => `
            <div style="padding: 10px 12px; background: #ffffff; border: 1px solid var(--glass-border); border-left: 3px solid var(--coral); border-radius: var(--radius-sm); font-size: 11px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                <strong style="color: var(--text-primary);">${inv.risk_reason || "Remediation Plan"}</strong>
                <span class="status-pill status-pill-warning" style="font-size: 9px; padding: 1px 6px;">${inv.status || "Active"}</span>
              </div>
              <div style="color: var(--text-secondary); margin-bottom: 4px;">
                <strong>Action:</strong> ${inv.recommended_action || "Targeted sub-skill remediation"}
              </div>
              <div style="display: flex; justify-content: space-between; color: var(--text-muted); font-size: 10px;">
                <span>Identified: ${inv.identified_date ? inv.identified_date.slice(0, 10) : "—"}</span>
                <span>Assigned: ${inv.assigned_to || "Educator"}</span>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    ` : ""}
  `;
}
