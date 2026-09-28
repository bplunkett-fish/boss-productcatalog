// Shared notification category logic used by backend functions. The
// canonical category list lives here so the maintenance reminder job and the
// scheduled-notification processor agree on opt-in semantics.
export const CATEGORIES = [
  "General",
  "Product Maintenance",
  "Marketing & Advertising",
  "Important Updates"
];

// Default: a user who has never saved a choice has no preferences stored, so
// every category is enabled. Once they save a list, that list is authoritative —
// including an empty list, which means they turned every category off.
export function isOptedIn(user, category) {
  const prefs = user?.notification_preferences;
  if (!Array.isArray(prefs)) return true;
  return prefs.includes(category);
}