// =============================================================================
// functions/index.js
// Firebase Cloud Function — Stripe checkout credit handler
//
// Trigger:   Eventarc custom event fired by the Stripe Firebase Extension
//            on `com.stripe.v1.checkout.session.completed`
//
// What it does:
//   1. Reads the completed Stripe checkout session from the event payload
//   2. Gets the user UID from session.client_reference_id
//      (appended to Payment Link URL in credits.html as ?client_reference_id=uid)
//   3. Gets the credit amount from session.metadata.credits
//      (set on each Payment Link in the Stripe Dashboard)
//   4. Atomically increments credits/{uid}.credits in Firestore
//
// Deploy:
//   firebase deploy --only functions
// =============================================================================

const { onCustomEventPublished } = require("firebase-functions/v2/eventarc");
const admin = require("firebase-admin");

// ── Logging flag ──────────────────────────────────────────────────────────────
const LOG_ENABLED = true;
function log(...args) {
  if (LOG_ENABLED) console.log("[handleCheckoutComplete]", ...args);
}

// ── Firebase admin init ───────────────────────────────────────────────────────
admin.initializeApp();
const db = admin.firestore();

// =============================================================================
// handleCheckoutComplete
//
// Listens for the Stripe extension's Eventarc event when a checkout session
// completes, then writes credits to Firestore.
// =============================================================================
exports.handleCheckoutComplete = onCustomEventPublished(
  {
    // Event type emitted by the Stripe Firebase Extension
    eventType: "com.stripe.v1.checkout.session.completed",
    // Eventarc channel created by the extension (us-central1 per your config)
    channel: "locations/us-central1/channels/firebase",
    region: "us-central1",
  },
  async (event) => {
    log("Event received:", event.type, event.id);

    const session = event.data;

    if (!session) {
      console.error("[handleCheckoutComplete] No session data in event payload.");
      return;
    }

    // ── Pull UID and credit amount from the session ───────────────────────────
    const uid        = session.client_reference_id;
    const creditsRaw = session.metadata?.credits;
    const creditsToAdd = parseInt(creditsRaw, 10);

    log("Session ID:", session.id);
    log("UID (client_reference_id):", uid);
    log("Credits from metadata:", creditsRaw);

    // ── Validate both required fields ─────────────────────────────────────────
    if (!uid) {
      console.error(
        "[handleCheckoutComplete] Missing client_reference_id on session:",
        session.id,
        "— user will not be credited. Make sure Payment Link URLs include ?client_reference_id=uid"
      );
      return;
    }

    if (!creditsRaw || isNaN(creditsToAdd) || creditsToAdd <= 0) {
      console.error(
        "[handleCheckoutComplete] Invalid or missing metadata.credits on session:",
        session.id,
        "— value received:",
        creditsRaw,
        "— Make sure each Payment Link has metadata key 'credits' set in Stripe Dashboard."
      );
      return;
    }

    // ── Atomically increment credits in Firestore ─────────────────────────────
    try {
      const creditsRef = db.collection("credits").doc(uid);

      await creditsRef.set(
        {
          // FieldValue.increment is atomic — safe against concurrent purchases
          credits: admin.firestore.FieldValue.increment(creditsToAdd),
          // Lightweight purchase log stored on the same document
          lastPurchase: {
            sessionId:   session.id,
            credits:     creditsToAdd,
            amountTotal: session.amount_total, // in cents
            currency:    session.currency,
            timestamp:   admin.firestore.FieldValue.serverTimestamp(),
          },
        },
        { merge: true } // creates the doc if it doesn't exist yet
      );

      log(`Successfully added ${creditsToAdd} credits to uid: ${uid}`);
    } catch (err) {
      console.error("[handleCheckoutComplete] Firestore write failed:", err);
      throw err; // re-throw so Eventarc knows the event wasn't processed
    }
  }
);
