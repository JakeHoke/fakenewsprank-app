// ============================================================
// auth.js
// Shared authentication utilities.
// All pages import from here — never call Firebase Auth directly
// in page scripts.
// ============================================================

import { auth } from "./firebase.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ── Logging flag ─────────────────────────────────────────────
const AUTH_LOGGING = true;

function log(...args) {
  if (AUTH_LOGGING) console.log("[auth.js]", ...args);
}

// ── waitForAuth() ────────────────────────────────────────────
// Returns a Promise that resolves with the current user (or null)
// once Firebase has finished its initial auth-state check.
// This prevents any protected content from flashing before we know
// whether the user is signed in.
export function waitForAuth() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe(); // stop listening after the first emission
      log("waitForAuth resolved. user:", user ? user.email : "null");
      resolve(user);
    });
  });
}

// ── requireAuth() ────────────────────────────────────────────
// Call at the top of every protected page.
// If no user is signed in, redirects immediately to /login.html.
// Returns the authenticated user so pages can use it directly.
export async function requireAuth() {
  const user = await waitForAuth();
  if (!user) {
    log("requireAuth: not authenticated — redirecting to /login.html");
    window.location.replace("/login.html");
    // Return a never-resolving promise so the rest of the page
    // script does not execute while the redirect fires.
    return new Promise(() => {});
  }
  log("requireAuth: authenticated as", user.email);
  return user;
}

// ── redirectIfAuthenticated() ────────────────────────────────
// Call at the top of login.html and signup.html.
// If a user IS already signed in, redirect them to /dashboard.html
// so they never land on the auth forms unnecessarily.
export async function redirectIfAuthenticated() {
  const user = await waitForAuth();
  if (user) {
    log(
      "redirectIfAuthenticated: already signed in — redirecting to /dashboard.html"
    );
    window.location.replace("/dashboard.html");
    return new Promise(() => {});
  }
  log("redirectIfAuthenticated: no existing session.");
}

// ── logoutUser() ─────────────────────────────────────────────
// Signs the user out of Firebase and redirects to /login.html.
export async function logoutUser() {
  try {
    await signOut(auth);
    log("logoutUser: signed out successfully.");
  } catch (err) {
    console.error("[auth.js] logoutUser error:", err);
  }
  window.location.replace("/login.html");
}

// ── mapAuthError() ───────────────────────────────────────────
// Converts raw Firebase error codes into human-readable messages.
export function mapAuthError(code) {
  const messages = {
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/user-not-found": "No account found with that email.",
    "auth/wrong-password": "Incorrect password. Please try again.",
    "auth/invalid-credential":
      "Invalid email or password. Please try again.",
    "auth/email-already-in-use":
      "An account with this email already exists.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/too-many-requests":
      "Too many failed attempts. Please try again later.",
    "auth/network-request-failed":
      "Network error. Please check your connection.",
  };
  return messages[code] || "Something went wrong. Please try again.";
}
