// What this device remembers so the app keeps working without a signal.
// Two things are kept: the signed-in user (so a dropped connection is not
// mistaken for a sign-out) and the catalog as it was last loaded, with the
// product details and warranty status already joined onto it. Everything here
// is best effort, and the whole store is emptied on sign-out.

const CATALOG_KEY = "myboss.catalog.v1";
const AUTH_KEY = "myboss.auth.v1";

function readJson(key) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function writeJson(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private browsing or a full device — caching is best effort only.
  }
}

// The catalog as the signed-in user last saw it, including the product details
// and warranty status that were joined onto each item at the time.
export function saveCachedCatalog(userId, items) {
  writeJson(`${CATALOG_KEY}.${userId || "unknown"}`, {
    savedAt: new Date().toISOString(),
    items
  });
}

// The saved catalog, or null when this device has never loaded one for the user.
export function readCachedCatalog(userId) {
  const cached = readJson(`${CATALOG_KEY}.${userId || "unknown"}`);
  if (!cached || !Array.isArray(cached.items)) return null;
  return cached;
}

// The last confirmed sign-in.
export function saveAuthSnapshot(user, publicSettings) {
  writeJson(AUTH_KEY, { user, publicSettings: publicSettings || null });
}

export function readAuthSnapshot() {
  const snapshot = readJson(AUTH_KEY);
  return snapshot && snapshot.user ? snapshot : null;
}

// A request that never reached the server carries no HTTP status; that is what
// separates "no signal" from an expired or rejected sign-in.
export function isOfflineError(error) {
  const status = error?.status ?? error?.response?.status;
  return !status;
}

// Used on sign-out: nothing this app saved on the device outlives the session.
export function clearOfflineCache() {
  try {
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith("myboss."))
      .forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Nothing to clear.
  }
}