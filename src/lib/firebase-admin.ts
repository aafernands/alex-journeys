/**
 * Firebase Admin (Firestore) — server-only.
 * Init is lazy and skips when env is missing so `next build` succeeds without secrets.
 */
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

function privateKeyFromEnv(): string | undefined {
  const raw = process.env.FIREBASE_PRIVATE_KEY?.trim();
  if (!raw) return undefined;
  // Vercel / dotenv often store newlines as literal \n
  return raw.replace(/\\n/g, "\n");
}

/** True when project id + service account credentials are present. */
export function isFirebaseConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID?.trim() &&
      process.env.FIREBASE_CLIENT_EMAIL?.trim() &&
      privateKeyFromEnv(),
  );
}

let cachedApp: App | null | undefined;
let cachedDb: Firestore | null | undefined;

function initApp(): App | null {
  if (cachedApp !== undefined) return cachedApp;

  if (!isFirebaseConfigured()) {
    cachedApp = null;
    return null;
  }

  const existing = getApps()[0];
  if (existing) {
    cachedApp = existing;
    return existing;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID!.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL!.trim();
  const privateKey = privateKeyFromEnv()!;

  try {
    cachedApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId,
    });
  } catch (err) {
    console.error("[firebase-admin] init failed:", err);
    cachedApp = null;
  }

  return cachedApp;
}

/** Initialized Admin app, or null when Firebase env is not configured. */
export function getFirebaseAdmin(): App | null {
  return initApp();
}

/** Firestore instance, or null when Firebase is not configured. */
export function getFirestoreDb(): Firestore | null {
  if (cachedDb !== undefined) return cachedDb;
  const app = initApp();
  if (!app) {
    cachedDb = null;
    return null;
  }
  cachedDb = getFirestore(app);
  return cachedDb;
}
