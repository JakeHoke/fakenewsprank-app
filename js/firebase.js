/**
 * firebase.js
 *
 * Single Firebase initialization for the entire app.
 * Import `auth` and/or `db` from this file everywhere.
 * Never call initializeApp() anywhere else.
 *
 * Firebase Console → Project Settings → Your Apps → SDK setup and configuration
 */

import { initializeApp }  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth }        from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore }   from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ── Project config ───────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyA_d3KDsA4Ib-qIDsYdpOVANM2z2pn9LeM",
  authDomain:        "fakenewsprank-44553.firebaseapp.com",
  projectId:         "fakenewsprank-44553",
  storageBucket:     "fakenewsprank-44553.firebasestorage.app",
  messagingSenderId: "197846073131",
  appId:             "1:197846073131:web:9ac698001faab45a42cf6e",
};

// ── Initialize ───────────────────────────────────────────────
const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

console.log("[firebase.js] Firebase initialized.");

export { app, auth, db };
