import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Permanently deletes the calling user's app data (personal catalog) and a
// best-effort deletion of the user record itself. The platform owns auth, so
// the underlying auth identity may be managed by the platform — the client
// logs the user out immediately after this succeeds. Required for store
// approval (account deletion).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Remove the user's personal catalog items (runs as service role, bypasses RLS).
    await base44.asServiceRole.entities.CatalogItem.deleteMany({ created_by_id: user.id });

    // Best-effort: remove the user record. The auth identity is owned by the
    // platform, so this may not be deletable here — we still cleared app data.
    try {
      await base44.asServiceRole.entities.User.delete(user.id);
    } catch { /* auth-owned user record may not be deletable from a function */ }

    return Response.json({ status: 'ok' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}