/**
 * LearnIQ — Global Application State Store
 * Provides lightweight reactive state management using the Observer pattern.
 */

class Store {
  constructor(initialState = {}) {
    this.state = {
      currentRoute: "/overview",
      backendStatus: "pending", // "pending" | "healthy" | "error" | "disconnected"
      healthData: null,
      sidebarOpen: false,
      pageMeta: {
        title: "Executive Overview",
        subtitle: "High-level institutional performance & KPIs",
        breadcrumb: ["Analytics", "Executive Overview"],
      },
      ...initialState,
    };
    this.listeners = [];
  }

  getState() {
    return this.state;
  }

  setState(updates) {
    this.state = { ...this.state, ...updates };
    this.notify();
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  notify() {
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch (err) {
        console.error("[State Store] Listener execution error:", err);
      }
    }
  }
}

export const store = new Store();
