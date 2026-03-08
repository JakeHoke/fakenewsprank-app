// ============================================================
// app-shell.js
// Shared behavior for every protected page.
//
// Usage in a protected HTML page:
//   <script type="module">
//     import { initShell } from "./js/app-shell.js";
//     const user = await initShell();
//   </script>
//
// The page HTML must contain:
//   - id="shell-header"  — header component is fetched and injected here
//   - id="app-loading"   — shown while auth + header load
//   - id="app-content"   — hidden until everything is ready
// ============================================================

import { requireAuth } from "./auth.js";
import { logoutUser }  from "./auth.js";
import { db }          from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ── Logging flag ─────────────────────────────────────────────
const SHELL_LOGGING = true;

function log(...args) {
  if (SHELL_LOGGING) console.log("[app-shell.js]", ...args);
}

// ── fetchCredits() ────────────────────────────────────────────
// Reads credits/{uid}.credits from Firestore. Returns 0 on any failure.
async function fetchCredits(uid) {
  try {
    const snap = await getDoc(doc(db, "credits", uid));
    const balance = snap.exists() ? (snap.data().credits || 0) : 0;
    log("fetchCredits:", balance);
    return balance;
  } catch (err) {
    console.error("[app-shell.js] fetchCredits error:", err);
    return 0;
  }
}

// ── loadHeader() ──────────────────────────────────────────────
// Fetches /header.html and injects it into #shell-header.
async function loadHeader() {
  const container = document.getElementById("shell-header");
  if (!container) {
    log("loadHeader: no #shell-header found — skipping.");
    return;
  }

  try {
    const res = await fetch("/header.html");
    if (!res.ok) throw new Error(`fetch /header.html → ${res.status}`);
    container.innerHTML = await res.text();
    log("loadHeader: header.html injected.");
  } catch (err) {
    console.error("[app-shell.js] loadHeader error:", err);
  }
}

// ── hydrateHeader() ───────────────────────────────────────────
// Fills in the dynamic values (email, credits) and marks the active nav link
// after header.html has been injected into the DOM.
function hydrateHeader(userEmail, credits) {
  // User email
  const emailEl = document.getElementById("header-user-email");
  if (emailEl) {
    emailEl.textContent = userEmail;
    emailEl.title = userEmail;
  }

  // Credits balance
  const creditsEl = document.getElementById("header-credits-count");
  if (creditsEl) creditsEl.textContent = credits;

  // Active nav link — match current path segment to data-nav attribute
  const segment = window.location.pathname.replace(/^\//, "").replace(/\/$/, "") || "dashboard";
  document.querySelectorAll(".nav-link[data-nav]").forEach((link) => {
    link.classList.toggle("active", link.dataset.nav === segment);
  });

  log("hydrateHeader: email =", userEmail, "| credits =", credits, "| active =", segment);
}

// ── wireLogout() ─────────────────────────────────────────────
function wireLogout() {
  const btn = document.getElementById("logout-btn");
  if (btn) {
    btn.addEventListener("click", () => {
      log("wireLogout: clicked.");
      logoutUser();
    });
  } else {
    log("wireLogout: no #logout-btn found.");
  }
}

// ── showContent() ────────────────────────────────────────────
function showContent() {
  const loading = document.getElementById("app-loading");
  const content = document.getElementById("app-content");
  if (loading) loading.style.display = "none";
  if (content) content.style.display = "";
  log("showContent: content visible.");
}

// ── initShell() ──────────────────────────────────────────────
// Main entry point for every protected page.
// Runs auth gate, fetches header + credits in parallel, hydrates, reveals content.
// Returns the authenticated Firebase user.
export async function initShell() {
  log("initShell: starting...");

  // Auth gate — never returns if unauthenticated (redirects to /login)
  const user = await requireAuth();
  log("initShell: authenticated as", user.email);

  // Fetch header HTML and credits balance in parallel
  const [credits] = await Promise.all([
    fetchCredits(user.uid),
    loadHeader(),
  ]);

  hydrateHeader(user.email, credits);
  wireLogout();
  showContent();

  return user;
}
