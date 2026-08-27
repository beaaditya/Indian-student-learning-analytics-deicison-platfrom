/**
 * LearnIQ — AI Student Analyst Conversational Workspace Page Module
 * Student Learning Analytics & Decision Intelligence Platform
 *
 * Connects directly to verified canonical backend endpoint:
 * POST /api/agent/query (natural-language query planner grounded in PostgreSQL)
 */

import { api } from "../api.js";
import { formatNumber } from "../utils/formatters.js";
import { renderErrorState } from "../components/error-state.js";

// Session conversation state
let sessionMessages = [];
let isQuerying = false;

// Sample suggested analytical inquiries
const SUGGESTED_QUERIES = [
  "What is the overall student reading performance across all grades?",
  "Which are the top 5 schools by benchmark attainment?",
  "Compare Grade 6 vs Grade 10 reading fluency outcomes",
  "What are the primary risk root causes for flagged learners?",
  "How effective are teacher review interventions?",
  "Show mathematics vs English performance metrics",
];

/**
 * Main export to render AI Student Analyst page
 */
export async function renderAiPage(container) {
  if (!container) return;

  // 1. Render persistent page shell
  renderAiShell(container);

  // 2. Render conversation feed
  renderConversationFeed(container);
}

/**
 * Renders the persistent shell including header, suggestions, and input bar
 */
function renderAiShell(container) {
  container.innerHTML = `
    <div class="page-container" style="max-width: 1000px; margin: 0 auto;">
      
      <!-- 1. Breadcrumb -->
      <div class="breadcrumb">
        <span class="breadcrumb-item">Intelligence</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item active">AI Student Analyst</span>
      </div>

      <!-- 2. Section Header -->
      <div class="section-header" style="margin-bottom: var(--space-4);">
        <div class="section-title-wrap">
          <h1 class="section-title">AI Student Analyst</h1>
          <p class="section-subtitle">Conversational analytics assistant grounded in PostgreSQL.</p>
        </div>
        <div style="display: flex; align-items: center; gap: var(--space-2);">
          <span class="status-pill status-pill-success">
            <span class="status-pill-dot"></span> PostgreSQL Grounded Agent
          </span>
        </div>
      </div>

      <!-- 3. Suggested Questions Chips -->
      <div class="glass-panel" id="ai-suggestions-panel" style="padding: var(--space-3) var(--space-4); margin-bottom: var(--space-4);">
        <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: var(--space-2);">
          Suggested Inquiries:
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 8px;" id="ai-chips-container">
          ${SUGGESTED_QUERIES.map((q) => `
            <button class="badge badge-secondary ai-query-chip" data-query="${q}" style="cursor: pointer; padding: 6px 12px; font-size: var(--text-xs); border: 1px solid var(--glass-border); background: #ffffff; color: var(--text-primary); text-align: left; transition: all 0.15s ease;">
              ${q}
            </button>
          `).join("")}
        </div>
      </div>

      <!-- 4. Dynamic Conversation Container -->
      <div id="ai-conversation-mount" style="min-height: 380px; margin-bottom: var(--space-4); display: flex; flex-direction: column; gap: var(--space-4);">
        <!-- Messages rendered dynamically -->
      </div>

      <!-- 5. Prompt Input Console -->
      <div class="glass-panel" style="padding: var(--space-3) var(--space-4); position: sticky; bottom: 16px; box-shadow: var(--shadow-lg); background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(12px);">
        <form id="ai-query-form" style="display: flex; gap: var(--space-2); align-items: center;">
          <input 
            type="text" 
            id="ai-query-input" 
            placeholder="Ask an analytical question about students, schools, grades, or risk..." 
            autocomplete="off"
            style="flex: 1; padding: 12px 16px; border-radius: var(--radius-sm); border: 1px solid var(--glass-border); font-size: var(--text-sm); outline: none; background: #ffffff;"
          />
          <button 
            type="submit" 
            id="ai-send-btn" 
            class="btn btn-primary" 
            style="padding: 12px 20px; font-size: var(--text-sm); display: inline-flex; align-items: center; gap: 8px; font-weight: 600;"
          >
            <span>Ask Analyst</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
          <button 
            type="button" 
            id="ai-clear-btn" 
            class="btn btn-secondary" 
            title="Clear conversation session"
            style="padding: 12px 14px; font-size: var(--text-xs);"
          >
            Clear
          </button>
        </form>
      </div>

    </div>
  `;

  // Attach event listeners
  attachAiFormListeners(container);
}

/**
 * Attaches form submit, input chips, and clear events
 */
function attachAiFormListeners(container) {
  const form = container.querySelector("#ai-query-form");
  const input = container.querySelector("#ai-query-input");
  const clearBtn = container.querySelector("#ai-clear-btn");
  const chips = container.querySelectorAll(".ai-query-chip");

  // Chips click handlers
  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const q = chip.getAttribute("data-query");
      if (q && input) {
        input.value = q;
        input.focus();
        handleQuerySubmit(q, container);
      }
    });
  });

  // Form submit handler
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const query = input ? input.value.trim() : "";
      if (query) {
        handleQuerySubmit(query, container);
        if (input) input.value = "";
      }
    });
  }

  // Clear session handler
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      sessionMessages = [];
      renderConversationFeed(container);
    });
  }
}

/**
 * Handles query submission to POST /api/agent/query
 */
async function handleQuerySubmit(userQuery, container) {
  if (!userQuery || isQuerying) return;

  // Add user message to state
  const userMsgId = `usr-${Date.now()}`;
  sessionMessages.push({
    id: userMsgId,
    role: "user",
    text: userQuery,
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  });

  isQuerying = true;
  renderConversationFeed(container);

  // Focus and scroll
  const mount = container.querySelector("#ai-conversation-mount");
  if (mount) mount.scrollTop = mount.scrollHeight;

  try {
    // Build conversation context for follow-ups
    const contextList = sessionMessages
      .filter((m) => m.role === "user")
      .map((m) => m.text)
      .slice(-4);

    // Call canonical backend endpoint
    const response = await api.agentQuery(userQuery, contextList);

    if (!response) {
      throw new Error("No response received from the analytics agent.");
    }

    // Add assistant response to state
    const assistantMsgId = `ast-${Date.now()}`;
    sessionMessages.push({
      id: assistantMsgId,
      role: "assistant",
      text: response.answer || "No synthesis text provided.",
      status: response.status || "success",
      mode: response.mode || "deterministic",
      executed_sql: response.executed_sql || null,
      evidence_data: response.evidence_data || response.data || [],
      evidence_row_count: response.evidence_row_count || 0,
      metadata: response.metadata || {},
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });

  } catch (err) {
    console.error("[AI Agent Error]", err);
    sessionMessages.push({
      id: `err-${Date.now()}`,
      role: "assistant",
      isError: true,
      text: `Unable to complete analytical investigation: ${err.message || "Failed to query the database."}`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });
  } finally {
    isQuerying = false;
    renderConversationFeed(container);
  }
}

/**
 * Renders the conversation messages list
 */
function renderConversationFeed(container) {
  const mount = container.querySelector("#ai-conversation-mount");
  const sendBtn = container.querySelector("#ai-send-btn");
  const input = container.querySelector("#ai-query-input");

  if (!mount) return;

  // Toggle input loading state
  if (sendBtn) {
    sendBtn.disabled = isQuerying;
    sendBtn.innerHTML = isQuerying
      ? `<span class="spinner" style="width: 14px; height: 14px; border-width: 2px;"></span><span>Analyzing...</span>`
      : `<span>Ask Analyst</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`;
  }
  if (input) input.disabled = isQuerying;

  // Welcome state if empty
  if (sessionMessages.length === 0 && !isQuerying) {
    mount.innerHTML = `
      <div class="glass-panel" style="padding: var(--space-8) var(--space-6); text-align: center; margin: var(--space-4) 0;">
        <div style="width: 48px; height: 48px; border-radius: 50%; background: rgba(79, 70, 229, 0.1); color: var(--primary); display: inline-flex; align-items: center; justify-content: center; margin-bottom: var(--space-3);">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
        </div>
        <h2 style="font-size: var(--text-base); font-weight: 700; color: var(--text-primary); margin: 0 0 var(--space-2) 0;">
          AI Student Learning Analyst
        </h2>
        <p style="font-size: var(--text-xs); color: var(--text-secondary); max-width: 500px; margin: 0 auto var(--space-4); line-height: 1.6;">
          Ask natural-language analytical questions. The analyst translates your questions into safe, allowlisted PostgreSQL queries and synthesizes grounded insights directly from verified learning data.
        </p>
        <div style="display: inline-flex; gap: 8px; font-size: 11px; color: var(--text-muted);">
          <span>🔒 Read-Only SQL Guardrails</span> · <span>📊 98,000+ Evaluated Students</span> · <span>🏫 989 Monitored Schools</span>
        </div>
      </div>
    `;
    return;
  }

  // Render message history
  mount.innerHTML = sessionMessages.map((msg) => {
    if (msg.role === "user") {
      return `
        <!-- User Query Bubble -->
        <div style="display: flex; justify-content: flex-end; margin-bottom: var(--space-3);">
          <div style="max-width: 80%; background: var(--primary); color: #ffffff; padding: 12px 16px; border-radius: 12px 12px 2px 12px; box-shadow: var(--shadow-sm);">
            <div style="font-size: var(--text-sm); line-height: 1.5; font-weight: 500;">
              ${escapeHtml(msg.text)}
            </div>
            <div style="font-size: 10px; color: rgba(255, 255, 255, 0.7); text-align: right; margin-top: 4px;">
              ${msg.timestamp}
            </div>
          </div>
        </div>
      `;
    }

    // Assistant Response Card
    const isError = msg.isError || msg.status === "error" || msg.status === "blocked";
    const modePill = msg.mode === "ai_grounded"
      ? `<span class="badge badge-primary font-mono" style="font-size: 10px;">AI Grounded</span>`
      : `<span class="badge" style="background: var(--emerald-subtle); color: #047857; font-size: 10px; font-weight: 700;">Deterministic Verified</span>`;

    const evidenceRows = msg.evidence_data || [];
    const hasEvidence = evidenceRows.length > 0;
    const hasSql = !!msg.executed_sql;

    return `
      <!-- Assistant Response Card -->
      <div class="glass-panel" style="padding: var(--space-5); margin-bottom: var(--space-4); border-left: 3px solid ${isError ? 'var(--coral)' : 'var(--primary)'};">
        
        <!-- Top Metadata Header -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-3); flex-wrap: wrap; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 24px; height: 24px; border-radius: 50%; background: rgba(79, 70, 229, 0.1); color: var(--primary); display: flex; align-items: center; justify-content: center;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
            </div>
            <strong style="font-size: var(--text-xs); color: var(--text-primary);">Learning Analytics Analyst</strong>
            ${modePill}
          </div>
          <span style="font-size: 10px; color: var(--text-muted);">${msg.timestamp}</span>
        </div>

        <!-- Synthesized Analytical Explanation -->
        <div style="font-size: var(--text-sm); color: var(--text-primary); line-height: 1.6; margin-bottom: var(--space-4); white-space: pre-line;">
          ${formatAnswerMarkdown(msg.text)}
        </div>

        <!-- Collapsible Evidence & SQL Panels -->
        ${hasSql || hasEvidence ? `
          <div style="display: flex; flex-direction: column; gap: var(--space-2); border-top: 1px solid var(--glass-border); padding-top: var(--space-3);">
            
            ${hasSql ? `
              <details style="font-size: var(--text-xs);">
                <summary style="cursor: pointer; color: var(--text-secondary); font-weight: 600; padding: 4px 0; user-select: none;">
                  🔍 View Executed SQL Query
                </summary>
                <div style="margin-top: 6px; padding: 8px 12px; background: rgba(241, 245, 249, 0.85); border-radius: var(--radius-sm); border: 1px solid var(--glass-border);">
                  <code style="font-family: var(--font-mono); font-size: 11px; color: var(--text-primary); display: block; white-space: pre-wrap; word-break: break-all;">
                    ${escapeHtml(msg.executed_sql)}
                  </code>
                </div>
              </details>
            ` : ""}

            ${hasEvidence ? `
              <details style="font-size: var(--text-xs);">
                <summary style="cursor: pointer; color: var(--text-secondary); font-weight: 600; padding: 4px 0; user-select: none;">
                  📊 View Underlying Evidence Data (${evidenceRows.length} rows)
                </summary>
                <div style="margin-top: 6px; overflow-x: auto; max-height: 220px; border: 1px solid var(--glass-border); border-radius: var(--radius-sm);">
                  <table class="data-table" style="font-size: 11px;">
                    <thead>
                      <tr>
                        ${Object.keys(evidenceRows[0] || {}).map((k) => `<th>${escapeHtml(k)}</th>`).join("")}
                      </tr>
                    </thead>
                    <tbody>
                      ${evidenceRows.slice(0, 10).map((row) => `
                        <tr>
                          ${Object.values(row).map((v) => `<td>${escapeHtml(String(v ?? "—"))}</td>`).join("")}
                        </tr>
                      `).join("")}
                    </tbody>
                  </table>
                </div>
              </details>
            ` : ""}

          </div>
        ` : ""}

      </div>
    `;
  }).join("");

  // Thinking / Typing Skeleton if Querying
  if (isQuerying) {
    mount.innerHTML += `
      <div class="glass-panel" style="padding: var(--space-4) var(--space-5); margin-bottom: var(--space-4); border-left: 3px solid var(--primary);">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div class="spinner" style="width: 14px; height: 14px; border-width: 2px;"></div>
          <span style="font-size: var(--text-xs); color: var(--text-secondary); font-weight: 600;">
            Translating analytical question into SQL & synthesizing grounded explanation...
          </span>
        </div>
      </div>
    `;
  }

  // Scroll to bottom
  window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
}

/**
 * Basic markdown / bullet / bold formatting
 */
function formatAnswerMarkdown(text) {
  if (!text) return "";
  let formatted = escapeHtml(text);

  // Bold **text**
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  // Bullet points
  formatted = formatted.replace(/^[•*-]\s+(.*)$/gm, "<li style='margin-left: 16px;'>$1</li>");

  return formatted;
}

/**
 * Simple HTML escape helper
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
