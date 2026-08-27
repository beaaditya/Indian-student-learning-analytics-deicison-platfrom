/**
 * LearnIQ — Centralized API Client Module
 * Student Learning Analytics & Decision Intelligence Platform
 *
 * Centralizes all backend REST communication with standard error handling.
 */

const API_BASE = "http://127.0.0.1:8000";
const CACHE_TTL_MS = 60000; // 60-second in-memory client cache

const responseCache = new Map();
const inFlightRequests = new Map();

/**
 * Standard fetch helper with error handling, in-memory caching, and in-flight deduplication
 */
async function request(endpoint, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const url = `${API_BASE}${endpoint}`;
  const isGet = method === "GET";
  const cacheKey = `${method}:${url}`;

  // 1. Check in-memory cache for GET requests
  if (isGet && !options.bypassCache) {
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() < cached.expiry) {
      return cached.data;
    }
  }

  // 2. In-flight request deduplication for concurrent identical GET requests
  if (isGet && !options.bypassCache && inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey);
  }

  const config = {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  };

  const fetchPromise = (async () => {
    try {
      const response = await fetch(url, config);
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const error = new Error(errorBody.detail || errorBody.message || `HTTP ${response.status}: ${response.statusText}`);
        error.status = response.status;
        error.data = errorBody;
        throw error;
      }
      const data = await response.json();

      // Store in memory cache if GET
      if (isGet && !options.bypassCache) {
        responseCache.set(cacheKey, {
          data,
          expiry: Date.now() + CACHE_TTL_MS,
        });
      }

      return data;
    } catch (err) {
      console.error(`[API Client Error] ${method} ${endpoint}:`, err);
      throw err;
    } finally {
      if (isGet) {
        inFlightRequests.delete(cacheKey);
      }
    }
  })();

  if (isGet && !options.bypassCache) {
    inFlightRequests.set(cacheKey, fetchPromise);
  }

  return fetchPromise;
}

/**
 * Builds URL query string from parameters object
 */
function buildQuery(params = {}) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") {
      q.append(k, v);
    }
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

export const api = {
  baseUrl: API_BASE,

  /**
   * Clears the entire client-side in-memory response cache
   */
  clearCache() {
    responseCache.clear();
    inFlightRequests.clear();
  },

  /**
   * Invalidates cached responses matching a given endpoint prefix
   */
  invalidateCache(endpointPrefix) {
    for (const key of responseCache.keys()) {
      if (key.includes(endpointPrefix)) {
        responseCache.delete(key);
      }
    }
  },

  /**
   * GET /health - System & Database Health Check (always live, bypassCache: true)
   */
  async health() {
    return request("/health", { bypassCache: true });
  },

  /**
   * GET /api/overview - Executive Overview Analytics
   */
  async overview(params = {}) {
    return request(`/api/overview${buildQuery(params)}`);
  },

  /**
   * GET /api/schools - School Intelligence Directory & Rankings
   */
  async schools(params = {}) {
    return request(`/api/schools${buildQuery(params)}`);
  },

  /**
   * GET /api/schools/{school_id} - Single School Deep Diagnostic
   */
  async schoolDetail(schoolId) {
    return request(`/api/schools/${encodeURIComponent(schoolId)}`);
  },

  /**
   * GET /api/grades - Grade Intelligence Analytics
   */
  async grades(params = {}) {
    return request(`/api/grades${buildQuery(params)}`);
  },

  /**
   * GET /api/subjects - Subject Intelligence Diagnostics
   */
  async subjects(params = {}) {
    return request(`/api/subjects${buildQuery(params)}`);
  },

  /**
   * GET /api/students - Student Directory
   */
  async students(params = {}) {
    return request(`/api/students${buildQuery(params)}`);
  },

  /**
   * GET /api/students/{student_id} - Student 360-Degree Profile
   */
  async studentDetail(studentId) {
    return request(`/api/students/${encodeURIComponent(studentId)}`);
  },

  /**
   * GET /api/risk - Risk & Early Warning Intelligence
   */
  async risk(params = {}) {
    return request(`/api/risk${buildQuery(params)}`);
  },

  /**
   * GET /api/interventions - Remediation & Interventions
   */
  async interventions(params = {}) {
    return request(`/api/interventions${buildQuery(params)}`);
  },

  /**
   * GET /api/insights - Proactive Grounded AI Insights
   */
  async insights(params = {}) {
    return request(`/api/insights${buildQuery(params)}`);
  },

  /**
   * POST /api/insights/generate - Trigger Fresh Grounded Insight Detection
   */
  async generateInsights(params = {}) {
    return request("/api/insights/generate", {
      method: "POST",
      body: JSON.stringify(params),
    });
  },

  /**
   * POST /api/agent/query - AI Student Learning Analyst
   */
  async agentQuery(question, context = []) {
    return request("/api/agent/query", {
      method: "POST",
      body: JSON.stringify({ question, context }),
    });
  },
};
