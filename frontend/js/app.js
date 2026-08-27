/**
 * LearnIQ — Main Application Bootstrap Module
 * Coordinates UI Shell, Navigation, Health Polling, and Lifecycle.
 */

import { api } from "./api.js";
import { store } from "./state.js";
import { Router } from "./router.js";
import { renderSidebar } from "./components/sidebar.js";
import { renderHeader } from "./components/header.js";
import { setupGlobalErrorHandlers } from "./components/error-state.js";
import { renderOverviewPage } from "./pages/overview.js";
import { renderSchoolsPage } from "./pages/schools.js";
import { renderGradesPage } from "./pages/grades.js";
import { renderStudentsPage } from "./pages/students.js";
import { renderRiskPage } from "./pages/risk.js";
import { renderInsightsPage } from "./pages/insights.js";
import { renderAiPage } from "./pages/ai.js";

// DOM Mount References
let sidebarMount = null;
let headerMount = null;
let contentMount = null;
let router = null;

/**
 * Syncs the shell components (header and sidebar) with current state
 */
function syncShell() {
  if (sidebarMount) {
    renderSidebar(sidebarMount);
  }
  if (headerMount) {
    renderHeader(headerMount, () => handleRefresh());
  }
}

/**
 * Checks backend health and updates connection status reactively
 */
async function checkBackendHealth() {
  try {
    const data = await api.health();
    console.log("[Health Check] Backend Response:", data);
    const isHealthy = data.status === "healthy" || data.status === "ok" || data.status === "connected";
    store.setState({
      backendStatus: isHealthy ? "healthy" : "error",
      healthData: data,
    });
  } catch (err) {
    console.warn("[Health Check] Backend health check failed:", err.message);
    store.setState({
      backendStatus: "disconnected",
      healthData: null,
    });
  }
}

/**
 * User-initiated refresh action
 */
async function handleRefresh() {
  console.log("[App] Refreshing health and current route...");
  api.clearCache();
  await checkBackendHealth();
  if (router) {
    router.handleRouteChange();
  }
}

/**
 * Application Bootstrap on DOM Ready
 */
document.addEventListener("DOMContentLoaded", async () => {
  console.log("%cLearnIQ %cDecision Intelligence Platform Shell Initializing...", "color: #4f46e5; font-weight: bold; font-size: 14px;", "color: #475569; font-size: 12px;");

  // 1. Setup Global Error Handlers
  setupGlobalErrorHandlers();

  // 2. Locate DOM Mount Containers
  sidebarMount = document.getElementById("sidebar-mount");
  headerMount = document.getElementById("header-mount");
  contentMount = document.getElementById("content-mount");

  if (!sidebarMount || !headerMount || !contentMount) {
    console.error("[Bootstrap Error] Critical DOM mount nodes missing!");
    return;
  }

  // 3. Subscribe shell components to reactive state changes
  store.subscribe(() => syncShell());

  // 4. Initial Shell Render
  syncShell();

  // 5. Initialize Router and register real pages
  router = new Router({}, "/overview");
  router.register("/overview", async (container) => {
    await renderOverviewPage(container);
  });
  router.register("/schools", async (container) => {
    await renderSchoolsPage(container);
  });
  router.register("/grades", async (container) => {
    await renderGradesPage(container);
  });
  router.register("/students", async (container) => {
    await renderStudentsPage(container);
  });
  router.register("/risk", async (container) => {
    await renderRiskPage(container);
  });
  router.register("/insights", async (container) => {
    await renderInsightsPage(container);
  });
  router.register("/ai-insight", async (container) => {
    await renderInsightsPage(container);
  });
  router.register("/ai", async (container) => {
    await renderAiPage(container);
  });
  router.init(contentMount);

  // 6. Asynchronous Non-Blocking Backend Health Check
  await checkBackendHealth();

  console.log("[App] Shell initialized and active.");
});
