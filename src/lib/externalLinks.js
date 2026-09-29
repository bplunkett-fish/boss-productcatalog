// Links that point somewhere outside the app (e.g. a parts store order page)
// should open in the user's own browser rather than inside the app shell.
//
// On the web, an ordinary new-tab link already does that. Inside the native
// mobile build the app runs in a web view, so the click is handed to the device
// (the "_system" target), which opens the default browser. Returns true when the
// click was handled, so the caller can skip the link's own default behaviour.
export function openInDefaultBrowser(url) {
  const cap = window.Capacitor;
  if (!url || !cap) return false;
  const isNative = typeof cap.isNativePlatform === "function" ? cap.isNativePlatform() : cap.platform !== "web";
  if (!isNative) return false;
  return !!window.open(url, "_system");
}