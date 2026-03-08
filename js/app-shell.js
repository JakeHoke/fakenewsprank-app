// ============================================================
// app-shell.js
// Shared behavior for every protected page.
//
// Usage in a protected HTML page:
//   <script type="module">
//     import { initShell } from "./app-shell.js";
//     const user = await initShell();
//     // user is now guaranteed to be authenticated
//   </script>
//
// The page HTML should contain:
//   - An element with id="shell-header"  (shell injects nav here)
//   - An element with id="app-loading"   (shown while auth resolves)
//   - An element with id="app-content"   (hidden until auth resolves)
//   - Optionally id="logout-btn"         (wired automatically)
// ============================================================

import { requireAuth } from "./auth.js";
import { logoutUser } from "./auth.js";

// ── Logging flag ─────────────────────────────────────────────
const SHELL_LOGGING = true;

function log(...args) {
  if (SHELL_LOGGING) console.log("[app-shell.js]", ...args);
}

// ── Nav link definitions ─────────────────────────────────────
const NAV_LINKS = [
  { href: "/dashboard.html", label: "Dashboard" },
  { href: "/create.html", label: "Create" },
  { href: "/account.html", label: "Account" },
];

// ── buildHeader() ────────────────────────────────────────────
// Injects the shared app header + nav into #shell-header.
function buildHeader(userEmail) {
  const container = document.getElementById("shell-header");
  if (!container) {
    log("buildHeader: no #shell-header element found — skipping.");
    return;
  }

  // Mark the active link by comparing the current path
  const currentPath = window.location.pathname;

  const navItems = NAV_LINKS.map(({ href, label }) => {
    const isActive = currentPath.endsWith(href.replace("/", "")) ? "active" : "";
    return `<a href="${href}" class="nav-link ${isActive}">${label}</a>`;
  }).join("");

  container.innerHTML = `
    <header class="app-header">
      <div class="header-brand">
        <span class="brand-icon">📰</span>
        <span class="brand-name">FakeNewsPrank</span>
      </div>
      <nav class="header-nav">
        ${navItems}
      </nav>
      <div class="header-user">
        <span class="user-email" title="${userEmail}">${userEmail}</span>
        <button id="logout-btn" class="btn-logout">Sign Out</button>
      </div>
    </header>
  `;

  log("buildHeader: header injected for", userEmail);
}

// ── wireLogout() ─────────────────────────────────────────────
// Attaches click handler to #logout-btn (wherever it lives in the DOM).
function wireLogout() {
  // Query after header injection so the injected button is available.
  const btn = document.getElementById("logout-btn");
  if (btn) {
    btn.addEventListener("click", () => {
      log("wireLogout: logout button clicked.");
      logoutUser();
    });
  } else {
    log("wireLogout: no #logout-btn found.");
  }
}

// ── showContent() ────────────────────────────────────────────
// Hides the loading overlay and reveals app content.
function showContent() {
  const loading = document.getElementById("app-loading");
  const content = document.getElementById("app-content");

  if (loading) loading.style.display = "none";
  if (content) content.style.display = "";

  log("showContent: loading hidden, content visible.");
}

// ── initShell() ──────────────────────────────────────────────
// Main entry point. Call this at the top of every protected page.
// Handles auth gating, header injection, loading state, and logout wiring.
// Returns the authenticated Firebase user object.
export async function initShell() {
  log("initShell: starting auth gate...");

  // Auth gate — redirects to /login.html if not signed in.
  // This never returns if unauthenticated.
  const user = await requireAuth();

  log("initShell: user confirmed:", user.email);

  // Inject header now that we have the user
  buildHeader(user.email);

  // Wire logout button (may be in injected header or page HTML)
  wireLogout();

  // Reveal content
  showContent();

  return user;
}
