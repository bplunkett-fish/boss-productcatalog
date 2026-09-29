import { base44 } from "@/api/base44Client";

// Files stored in the app backend keep their original name, prefixed by a short
// random token: .../files/mp/public/<app>/<token>_<original-name>
export function storedFileName(url) {
  try {
    const last = decodeURIComponent(new URL(url).pathname.split("/").pop() || "");
    return last.replace(/^[0-9a-f]{6,}_/i, "").toLowerCase();
  } catch {
    return "";
  }
}

// Only files the app itself stores can be compared (external hosts are skipped).
export const isStoredFile = (url) => /base44\.app|base44\.com|wixstatic\.com/i.test(url || "");

async function sameContents(file, url) {
  const res = await fetch(url);
  if (!res.ok) return false;
  const existing = new Uint8Array(await res.arrayBuffer());
  const incoming = new Uint8Array(await file.arrayBuffer());
  if (existing.length !== incoming.length) return false;
  for (let i = 0; i < incoming.length; i++) {
    if (existing[i] !== incoming[i]) return false;
  }
  return true;
}

// Looks for a document with the same file name anywhere in the Product Database
// (`extraUrls` covers rows still being edited) and confirms the contents match.
// Returns the already-stored file URL, or null when nothing identical exists.
export async function findStoredDuplicate(file, extraUrls = []) {
  if (!file?.name) return null;
  try {
    const target = file.name.toLowerCase();
    const candidates = new Set(extraUrls.filter(Boolean));
    const products = await base44.entities.Product.list("-updated_date", 500);
    for (const p of products) {
      for (const key of ["manuals", "literature", "wiring_diagrams", "parts_links"]) {
        for (const row of p[key] || []) {
          if (row?.url) candidates.add(row.url);
        }
      }
    }
    for (const url of candidates) {
      if (!isStoredFile(url)) continue;
      if (storedFileName(url) !== target) continue;
      if (await sameContents(file, url)) return url;
    }
  } catch {
    // A failed check must never block a legitimate upload.
  }
  return null;
}