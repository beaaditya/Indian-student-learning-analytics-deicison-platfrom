/**
 * LearnIQ — Vanilla SVG Chart Components
 * High-performance, zero-dependency, responsive charts with tooltips and empty states.
 */

import { formatNumber, formatScore, formatPercent, formatMonthLabel } from "../utils/formatters.js";

/**
 * Generates an SVG Line/Area Trend Chart
 */
export function createTrendChartSVG(trends = [], options = {}) {
  if (!trends || trends.length === 0) {
    return `<div class="chart-empty-state">No longitudinal assessment trend data available.</div>`;
  }

  const width = options.width || 760;
  const height = options.height || 260;
  const padLeft = 46;
  const padRight = 24;
  const padTop = 20;
  const padBottom = 36;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const scores = trends.map((t) => Number(t.average_score || 0));
  const rawMin = Math.min(...scores);
  const rawMax = Math.max(...scores);

  const minY = Math.max(0, Math.floor(rawMin - 3));
  const maxY = Math.min(100, Math.ceil(rawMax + 3));
  const yRange = maxY - minY || 1;

  const points = trends.map((d, i) => {
    const x = padLeft + (i / Math.max(1, trends.length - 1)) * chartW;
    const y = padTop + chartH - ((Number(d.average_score || 0) - minY) / yRange) * chartH;
    return { x, y, data: d };
  });

  const lineD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const areaD = `${lineD} L ${points[points.length - 1].x.toFixed(1)} ${(padTop + chartH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(padTop + chartH).toFixed(1)} Z`;

  // Generate 4 Y-Axis Grid Lines
  const gridLines = [0, 0.33, 0.66, 1].map((ratio) => {
    const val = (minY + ratio * yRange).toFixed(1);
    const yPos = (padTop + chartH - ratio * chartH).toFixed(1);
    return `
      <line x1="${padLeft}" y1="${yPos}" x2="${width - padRight}" y2="${yPos}" stroke="rgba(226, 232, 240, 0.7)" stroke-dasharray="3,3" stroke-width="1"/>
      <text x="${padLeft - 8}" y="${parseFloat(yPos) + 3}" fill="#64748b" font-size="10" font-family="inherit" text-anchor="end">${val}</text>
    `;
  }).join("");

  // Generate X-Axis Month Labels
  const xLabels = points.map((p, i) => {
    // Show every nth label if too many points
    const step = trends.length > 12 ? 2 : 1;
    if (i % step !== 0 && i !== trends.length - 1) return "";
    return `
      <text x="${p.x.toFixed(1)}" y="${height - 12}" fill="#64748b" font-size="10" font-family="inherit" text-anchor="middle">
        ${formatMonthLabel(p.data.month)}
      </text>
    `;
  }).join("");

  // Data point markers
  const markers = points.map((p, idx) => `
    <g class="chart-point-group" tabindex="0" data-idx="${idx}">
      <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4.5" fill="#ffffff" stroke="#4f46e5" stroke-width="2.5" class="chart-point"/>
      <title>${formatMonthLabel(p.data.month)}: ${formatScore(p.data.average_score)} Avg Score (${formatPercent(p.data.benchmark_percentage)} Benchmark, ${formatNumber(p.data.assessment_count)} Assessments)</title>
    </g>
  `).join("");

  return `
    <div class="svg-chart-container" style="position: relative; width: 100%; overflow-x: auto;">
      <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: auto; display: block;" role="img" aria-label="Longitudinal Performance Trend Chart">
        <defs>
          <linearGradient id="trendAreaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#4f46e5" stop-opacity="0.22"/>
            <stop offset="100%" stop-color="#4f46e5" stop-opacity="0.0"/>
          </linearGradient>
        </defs>
        ${gridLines}
        <path d="${areaD}" fill="url(#trendAreaGradient)"/>
        <path d="${lineD}" fill="none" stroke="#4f46e5" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round"/>
        ${markers}
        ${xLabels}
      </svg>
    </div>
  `;
}

/**
 * Generates Performance Band Distribution Breakdown
 */
export function createBandDistributionHTML(bands = []) {
  if (!bands || bands.length === 0) {
    return `<div class="chart-empty-state">No performance band distribution data available.</div>`;
  }

  // Aggregate normalized bands
  const bandOrder = ["Excellent", "Strong", "Developing", "At Risk", "Critical"];
  const colorMap = {
    "Excellent": { bg: "#0d9488", text: "var(--teal)", label: "Excellent (80-100)" },
    "Strong": { bg: "#4f46e5", text: "var(--primary)", label: "Strong (70-79)" },
    "Developing": { bg: "#0284c7", text: "var(--blue)", label: "Developing (60-69)" },
    "At Risk": { bg: "#f59e0b", text: "var(--amber)", label: "At Risk (40-59)" },
    "Critical": { bg: "#ef4444", text: "var(--coral)", label: "Critical (<40)" },
  };

  const aggregated = {};
  for (const b of bandOrder) {
    aggregated[b] = { count: 0, percentage: 0 };
  }

  let totalCount = 0;
  for (const raw of bands) {
    const rawName = (raw.performance_band || "").trim();
    const count = Number(raw.student_count || 0);
    totalCount += count;
    
    // Normalize case
    const match = bandOrder.find((b) => b.toLowerCase() === rawName.toLowerCase());
    if (match) {
      aggregated[match].count += count;
    }
  }

  // Calculate clean percentages
  if (totalCount > 0) {
    for (const b of bandOrder) {
      aggregated[b].percentage = (aggregated[b].count / totalCount) * 100;
    }
  }

  // Stacked Progress Bar
  const stackedBarHtml = `
    <div class="distribution-stacked-bar" style="display: flex; height: 16px; width: 100%; border-radius: var(--radius-full); overflow: hidden; background: #e2e8f0; margin-bottom: var(--space-4); box-shadow: inset 0 1px 2px rgba(0,0,0,0.06);">
      ${bandOrder.map((b) => {
        const p = aggregated[b].percentage;
        if (p <= 0) return "";
        return `
          <div style="width: ${p.toFixed(2)}%; background: ${colorMap[b].bg}; transition: width 0.3s ease;" 
               title="${b}: ${formatPercent(p)} (${formatNumber(aggregated[b].count)} students)"></div>
        `;
      }).join("")}
    </div>
  `;

  // Detailed Row Breakdown
  const rowsHtml = `
    <div style="display: flex; flex-direction: column; gap: var(--space-3);">
      ${bandOrder.map((b) => {
        const item = aggregated[b];
        const cfg = colorMap[b];
        return `
          <div style="display: flex; align-items: center; justify-content: space-between; font-size: var(--text-xs);">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="width: 10px; height: 10px; border-radius: 2px; background: ${cfg.bg}; flex-shrink: 0;"></span>
              <span style="font-weight: 600; color: var(--text-primary);">${b}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="color: var(--text-muted); font-mono;">${formatNumber(item.count)} learners</span>
              <span style="font-weight: 700; color: var(--text-primary); min-width: 48px; text-align: right;">${formatPercent(item.percentage)}</span>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;

  return `
    <div>
      ${stackedBarHtml}
      ${rowsHtml}
    </div>
  `;
}
