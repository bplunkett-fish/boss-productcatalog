// The address the app links back to: notification links, and the claim links
// encoded into QR codes. Admins set it on the app's Settings page, so the
// address can change without touching code. Every place that builds an
// absolute link uses getAppBaseUrl rather than a hardcoded hostname.
export const DEFAULT_APP_URL = "https://hypersonic-sync-your-gear.base44.app";

// Reads the configured base address, without any trailing slash. Falls back to
// the app's default address when no address has been saved.
export async function getAppBaseUrl(svc) {
  const rows = await svc.entities.AppSetting.list("-updated_date", 1);
  const configured = (rows?.[0]?.app_base_url || "").toString().trim();
  return configured ? configured.replace(/\/+$/, "") : DEFAULT_APP_URL;
}