/**
 * LearnIQ — School Diagnostic Profile Drawer / Modal Component
 * Student Learning Analytics & Decision Intelligence Platform
 *
 * Connects directly to verified backend endpoint: GET /api/schools/{school_id}
 */

import { api } from "../api.js";
import { formatNumber, formatScore, formatPercent } from "../utils/formatters.js";
import { createTrendChartSVG } from "./charts.js";

let modalContainer = null;
let activeSchoolId = null;

/**
 * Ensures modal DOM container exists on body
 */
function ensureModalMounted() {
  if (modalContainer && document.getElementById("school-diagnostic-drawer")) return;

  modalContainer = document.createElement("div");
  modalContainer.id = "school-diagnostic-drawer";
  modalContainer.className = "drawer-backdrop";
  modalContainer.innerHTML = `
    <div class="drawer-panel" role="dialog" aria-modal="true" aria-labelledby="school-modal-title">
      <div class="drawer-header">
        <div style="flex: 1; min-width: 0; padding-right: var(--space-4);">
          <h2 class="drawer-title" id="school-modal-title">Institutional Diagnostic Profile</h2>
          <div class="drawer-subtitle" id="school-modal-subtitle">Loading diagnostic metrics...</div>
        </div>
        <button class="drawer-close-btn" id="school-modal-close" aria-label="Close Diagnostic Drawer">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="drawer-body" id="school-modal-body">
        <!-- Injected asynchronously -->
      </div>
    </div>
  `;

  document.body.appendChild(modalContainer);

  const closeBtn = modalContainer.querySelector("#school-modal-close");
  if (closeBtn) {
    closeBtn.addEventListener("click", closeSchoolModal);
  }

  modalContainer.addEventListener("click", (e) => {
    if (e.target === modalContainer) {
      closeSchoolModal();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modalContainer && modalContainer.classList.contains("open")) {
      closeSchoolModal();
    }
  });
}

/**
 * Opens and renders the school diagnostic modal
 */
export async function openSchoolModal(schoolId) {
  if (!schoolId) return;
  activeSchoolId = schoolId;
  ensureModalMounted();

  modalContainer.classList.add("open");
  document.body.style.overflow = "hidden";

  const titleEl = modalContainer.querySelector("#school-modal-title");
  const subtitleEl = modalContainer.querySelector("#school-modal-subtitle");
  const bodyEl = modalContainer.querySelector("#school-modal-body");

  titleEl.textContent = "Loading Institutional Profile...";
  subtitleEl.innerHTML = `<span class="badge badge-neutral" style="font-family: var(--font-mono);">${schoolId}</span>`;

  // Render initial skeleton loader
  bodyEl.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-3);">
      <div class="glass-panel skeleton-shimmer" style="height: 80px; border-color: transparent;"></div>
      <div class="glass-panel skeleton-shimmer" style="height: 80px; border-color: transparent;"></div>
      <div class="glass-panel skeleton-shimmer" style="height: 80px; border-color: transparent;"></div>
      <div class="glass-panel skeleton-shimmer" style="height: 80px; border-color: transparent;"></div>
    </div>
    <div class="glass-panel skeleton-shimmer" style="height: 220px; border-color: transparent; margin-top: var(--space-4);"></div>
    <div class="glass-panel skeleton-shimmer" style="height: 180px; border-color: transparent; margin-top: var(--space-4);"></div>
  `;

  try {
    const data = await api.schoolDetail(schoolId);
    if (!data || data.status !== "success" || !data.school) {
      throw new Error(data?.message || `Failed to retrieve diagnostic data for school "${schoolId}".`);
    }

    renderModalContent(data);
  } catch (err) {
    console.error(`[School Modal Error] Failed to load school ${schoolId}:`, err);
    bodyEl.innerHTML = `
      <div class="glass-panel" style="padding: var(--space-6); text-align: center; border-color: rgba(239, 68, 68, 0.3); margin-top: var(--space-4);">
        <div style="width: 44px; height: 44px; border-radius: 50%; background: var(--coral-subtle); color: var(--coral); display: inline-flex; align-items: center; justify-content: center; margin-bottom: var(--space-3);">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <h3 style="font-size: var(--text-base); font-weight: 700; color: var(--text-primary); margin-bottom: var(--space-1);">Unable to load school diagnostic</h3>
        <p style="font-size: var(--text-xs); color: var(--text-secondary); margin-bottom: var(--space-4); line-height: 1.4;">${err.message || "Failed to connect to PostgreSQL endpoint."}</p>
        <button class="btn btn-secondary" id="school-modal-retry-btn" style="font-size: var(--text-xs); padding: 6px 14px;">
          Retry Diagnostic
        </button>
      </div>
    `;

    const retryBtn = bodyEl.querySelector("#school-modal-retry-btn");
    if (retryBtn) {
      retryBtn.addEventListener("click", () => openSchoolModal(schoolId));
    }
  }
}

/**
 * Closes the school diagnostic modal
 */
export function closeSchoolModal() {
  if (modalContainer) {
    modalContainer.classList.remove("open");
    document.body.style.overflow = "";
  }
}

/**
 * Populates verified diagnostic data into the modal view
 */
function renderModalContent(data) {
  const s = data.school || {};
  const grades = data.grade_breakdown || [];
  const subjects = data.subject_breakdown || [];
  const trends = data.monthly_trend || [];
  const risks = data.risk_summary || [];

  const titleEl = modalContainer.querySelector("#school-modal-title");
  const subtitleEl = modalContainer.querySelector("#school-modal-subtitle");
  const bodyEl = modalContainer.querySelector("#school-modal-body");

  titleEl.textContent = s.school_name || "Institutional Diagnostic";
  subtitleEl.innerHTML = `
    <span class="badge badge-primary" style="font-family: var(--font-mono);">${s.school_id}</span>
    <span>${s.district ? `${s.district}, ` : ""}${s.state || "—"}</span>
    <span class="badge badge-teal">${s.management_type || "—"}</span>
    <span class="badge badge-violet">${s.board || "—"}</span>
    <span class="badge badge-neutral">${s.urban_rural || "—"}</span>
  `;

  bodyEl.innerHTML = `
    <!-- 1. Institutional Metadata & Diagnostic KPIs Grid -->
    <div>
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-3);">
        <h3 style="font-size: var(--text-xs); font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em; margin: 0;">Institutional Scorecard</h3>
        <span class="badge badge-primary" style="font-size: 11px;">Rank #${formatNumber(s.rank)} Nationally</span>
      </div>

      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-3);">
        
        <div class="glass-panel" style="padding: var(--space-3);">
          <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--text-muted);">Avg Performance</div>
          <div style="font-size: var(--text-xl); font-weight: 800; color: var(--primary); margin-top: 2px;">${formatScore(s.average_performance || s.average_reading_score)}</div>
          <div style="font-size: 10px; color: var(--text-muted);">${formatPercent(s.average_improvement)} gain</div>
        </div>

        <div class="glass-panel" style="padding: var(--space-3);">
          <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--text-muted);">Benchmark Met</div>
          <div style="font-size: var(--text-xl); font-weight: 800; color: #047857; margin-top: 2px;">${formatPercent(s.benchmark_percentage)}</div>
          <div style="font-size: 10px; color: var(--coral);">${formatPercent(s.below_benchmark_percentage)} below</div>
        </div>

        <div class="glass-panel" style="padding: var(--space-3);">
          <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--text-muted);">Attendance</div>
          <div style="font-size: var(--text-xl); font-weight: 800; color: var(--text-primary); margin-top: 2px;">${formatPercent(s.average_attendance_pct)}</div>
          <div style="font-size: 10px; color: var(--text-muted);">Learner participation</div>
        </div>

        <div class="glass-panel" style="padding: var(--space-3);">
          <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--text-muted);">Students</div>
          <div style="font-size: var(--text-lg); font-weight: 700; color: var(--text-primary); margin-top: 2px;">${formatNumber(s.total_students)}</div>
          <div style="font-size: 10px; color: var(--text-muted);">${formatNumber(s.evaluated_students)} evaluated</div>
        </div>

        <div class="glass-panel" style="padding: var(--space-3);">
          <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--text-muted);">Faculty & Ratio</div>
          <div style="font-size: var(--text-lg); font-weight: 700; color: var(--text-primary); margin-top: 2px;">${s.student_teacher_ratio ? `${s.student_teacher_ratio}:1` : "—"}</div>
          <div style="font-size: 10px; color: var(--text-muted);">${s.teacher_count || "—"} teachers</div>
        </div>

        <div class="glass-panel" style="padding: var(--space-3);">
          <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--text-muted);">Digital / Infra</div>
          <div style="font-size: var(--text-lg); font-weight: 700; color: var(--teal); margin-top: 2px;">${formatScore(s.digital_access_score)} / 100</div>
          <div style="font-size: 10px; color: var(--text-muted);">Infra: ${formatScore(s.infrastructure_score)}</div>
        </div>

      </div>
    </div>

    <!-- 2. Sub-Skill Competency Bar Matrix -->
    <div class="glass-panel" style="padding: var(--space-4);">
      <div style="font-size: var(--text-xs); font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em; margin-bottom: var(--space-3);">
        Core Foundational Competencies
      </div>

      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-3);">
        <div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px;">
            <span style="color: var(--text-secondary); font-weight: 600;">Reading Fluency</span>
            <span style="font-weight: 700; color: var(--text-primary); font-family: var(--font-mono);">${formatScore(s.average_fluency)}</span>
          </div>
          <div style="height: 6px; background: #e2e8f0; border-radius: var(--radius-full); overflow: hidden;">
            <div style="height: 100%; width: ${Math.min(100, Math.max(0, Number(s.average_fluency || 0)))}%; background: var(--primary);"></div>
          </div>
        </div>

        <div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px;">
            <span style="color: var(--text-secondary); font-weight: 600;">Comprehension</span>
            <span style="font-weight: 700; color: var(--text-primary); font-family: var(--font-mono);">${formatScore(s.average_comprehension)}</span>
          </div>
          <div style="height: 6px; background: #e2e8f0; border-radius: var(--radius-full); overflow: hidden;">
            <div style="height: 100%; width: ${Math.min(100, Math.max(0, Number(s.average_comprehension || 0)))}%; background: var(--teal);"></div>
          </div>
        </div>

        <div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px;">
            <span style="color: var(--text-secondary); font-weight: 600;">Vocabulary</span>
            <span style="font-weight: 700; color: var(--text-primary); font-family: var(--font-mono);">${formatScore(s.average_vocabulary)}</span>
          </div>
          <div style="height: 6px; background: #e2e8f0; border-radius: var(--radius-full); overflow: hidden;">
            <div style="height: 100%; width: ${Math.min(100, Math.max(0, Number(s.average_vocabulary || 0)))}%; background: var(--blue);"></div>
          </div>
        </div>

        <div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px;">
            <span style="color: var(--text-secondary); font-weight: 600;">Grammar & Syntax</span>
            <span style="font-weight: 700; color: var(--text-primary); font-family: var(--font-mono);">${formatScore(s.average_grammar)}</span>
          </div>
          <div style="height: 6px; background: #e2e8f0; border-radius: var(--radius-full); overflow: hidden;">
            <div style="height: 100%; width: ${Math.min(100, Math.max(0, Number(s.average_grammar || 0)))}%; background: var(--accent-violet);"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 3. Longitudinal Performance Trajectory -->
    <div class="glass-panel" style="padding: var(--space-4);">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-3);">
        <div>
          <h4 style="font-size: var(--text-xs); font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin: 0; letter-spacing: 0.05em;">Longitudinal Performance Trajectory</h4>
          <p style="font-size: 11px; color: var(--text-muted); margin: 2px 0 0 0;">Monthly average assessment trends</p>
        </div>
        <span class="badge badge-primary">${trends.length} Months Tracked</span>
      </div>

      <div style="min-height: 180px;">
        ${createTrendChartSVG(trends, { height: 180, width: 560 })}
      </div>
    </div>

    <!-- 4. Grade-Level Performance Breakdown Table -->
    <div>
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-2);">
        <h4 style="font-size: var(--text-xs); font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin: 0; letter-spacing: 0.05em;">Grade-Level Cohort Diagnostics</h4>
        <span style="font-size: 11px; color: var(--text-muted);">${grades.length} Grades Evaluated</span>
      </div>

      <div class="table-container">
        <table class="data-table" style="font-size: 11px;">
          <thead>
            <tr>
              <th>Grade</th>
              <th>Students</th>
              <th>Evaluations</th>
              <th>Avg Score</th>
              <th>Benchmark %</th>
              <th>Gain %</th>
            </tr>
          </thead>
          <tbody>
            ${grades.length > 0 ? grades.map((g) => `
              <tr>
                <td><strong>Grade ${g.grade}</strong></td>
                <td>${formatNumber(g.student_count)}</td>
                <td>${formatNumber(g.assessment_count)}</td>
                <td><strong style="color: var(--primary); font-family: var(--font-mono);">${formatScore(g.average_score)}</strong></td>
                <td>
                  <span class="badge" style="background: ${Number(g.benchmark_percentage) >= 90 ? "var(--emerald-subtle)" : Number(g.benchmark_percentage) >= 75 ? "var(--amber-subtle)" : "var(--coral-subtle)"}; color: ${Number(g.benchmark_percentage) >= 90 ? "#047857" : Number(g.benchmark_percentage) >= 75 ? "#b45309" : "var(--coral)"}; font-size: 10px;">
                    ${formatPercent(g.benchmark_percentage)}
                  </span>
                </td>
                <td style="font-family: var(--font-mono);">${formatPercent(g.average_improvement)}</td>
              </tr>
            `).join("") : `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No grade breakdown data available.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>

    <!-- 5. Subject Performance Breakdown Table -->
    <div>
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-2);">
        <h4 style="font-size: var(--text-xs); font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin: 0; letter-spacing: 0.05em;">Subject-Level Competency Breakdown</h4>
        <span style="font-size: 11px; color: var(--text-muted);">${subjects.length} Subjects Evaluated</span>
      </div>

      <div class="table-container">
        <table class="data-table" style="font-size: 11px;">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Evaluations</th>
              <th>Average Score</th>
              <th>Benchmark %</th>
            </tr>
          </thead>
          <tbody>
            ${subjects.length > 0 ? subjects.map((sub) => `
              <tr>
                <td><strong>${sub.subject}</strong></td>
                <td>${formatNumber(sub.assessment_count)}</td>
                <td><strong style="color: var(--primary); font-family: var(--font-mono);">${formatScore(sub.average_score)}</strong></td>
                <td>
                  <span class="badge" style="background: ${Number(sub.benchmark_percentage) >= 90 ? "var(--emerald-subtle)" : Number(sub.benchmark_percentage) >= 75 ? "var(--amber-subtle)" : "var(--coral-subtle)"}; color: ${Number(sub.benchmark_percentage) >= 90 ? "#047857" : Number(sub.benchmark_percentage) >= 75 ? "#b45309" : "var(--coral)"}; font-size: 10px;">
                    ${formatPercent(sub.benchmark_percentage)}
                  </span>
                </td>
              </tr>
            `).join("") : `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No subject breakdown data available.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>

    <!-- 6. Early Warning Risk & Remediation Summary -->
    <div class="glass-panel" style="padding: var(--space-4); border-color: rgba(245, 158, 11, 0.3);">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-2);">
        <h4 style="font-size: var(--text-xs); font-weight: 700; text-transform: uppercase; color: var(--text-primary); margin: 0; display: flex; align-items: center; gap: 6px;">
          <span class="status-pill status-pill-warning" style="padding: 2px 6px; font-size: 10px;">Risk Profile</span>
          At-Risk Learner Summary
        </h4>
        <span style="font-size: 11px; font-weight: 700; color: #b45309;">${formatNumber(s.at_risk_student_count)} total at-risk</span>
      </div>

      <div style="display: flex; gap: var(--space-3); flex-wrap: wrap; margin-top: var(--space-2);">
        ${risks.length > 0 ? risks.map((r) => `
          <div style="padding: 6px 12px; background: #ffffff; border: 1px solid var(--glass-border); border-radius: var(--radius-sm); display: flex; align-items: center; gap: 8px;">
            <span class="status-pill-dot" style="background: ${r.risk_level === "High" ? "var(--coral)" : r.risk_level === "Medium" ? "var(--amber)" : "var(--blue)"};"></span>
            <span style="font-size: 11px; font-weight: 600; color: var(--text-primary);">${r.risk_level} Risk:</span>
            <span style="font-size: 11px; font-weight: 700; font-family: var(--font-mono);">${formatNumber(r.student_count)} students</span>
          </div>
        `).join("") : `<div style="font-size: 11px; color: var(--text-muted);">No students flagged for high risk remediation in this institution.</div>`}
      </div>
    </div>
  `;
}
