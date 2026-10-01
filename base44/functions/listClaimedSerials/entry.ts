import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Lists every serial claimed across all users, for the admin-only Claimed
// Serials screen. Runs with the service role: the per-user row rules on
// CatalogItem only expose a signed-in owner's own items, so an admin reading
// the entity directly would not see other people's claims.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const [items, users, products] = await Promise.all([
      base44.asServiceRole.entities.CatalogItem.list('-created_date', 500),
      base44.asServiceRole.entities.User.list(),
      base44.asServiceRole.entities.Product.list('-updated_date', 500)
    ]);

    return Response.json({
      items: items || [],
      users: users || [],
      products: products || []
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}