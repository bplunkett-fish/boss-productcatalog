// Shared notification category logic used by backend functions. The
// canonical category list lives here so the maintenance reminder job and the
// scheduled-notification processor agree on opt-in semantics.
export const CATEGORIES = [
  "General",
  "Product Maintenance",
  "Marketing & Advertising",
  "Important Updates"
];

// A user receives a category when they have no preferences set (default = all)
// or when the category is explicitly in their preferences list.
export function isOptedIn(user, category) {
  const prefs = user?.notification_preferences;
  return !prefs || !Array.isArray(prefs) || prefs.length === 0 || prefs.includes(category);
}