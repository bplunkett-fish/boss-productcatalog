import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Adds a serial number to the calling user's personal catalog, linked to a
// model_number in the Product Database. Serial numbers are globally unique
// across all catalogs — first owner locks it.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const serial = (body.serial_number || '').trim().toUpperCase();
    const modelNumber = (body.model_number || '').trim().toUpperCase();

    if (!serial) return Response.json({ error: 'Serial number is required' }, { status: 400 });
    if (!modelNumber) return Response.json({ error: 'Model number is required' }, { status: 400 });

    // Check across ALL users (service role bypasses per-user RLS) whether this
    // serial is already in someone's catalog.
    const existing = await base44.asServiceRole.entities.CatalogItem.filter({ serial_number: serial });

    if (existing && existing.length > 0) {
      const owner = existing[0];
      if (owner.created_by_id === user.id) {
        return Response.json({ status: 'already_in_catalog', id: owner.id });
      }
      return Response.json({
        status: 'already_claimed',
        message: `Serial ${serial} has already been added to another owner's catalog and is locked.`
      });
    }

    // Not claimed — create it. User-scoped create stamps created_by_id to the caller.
    const created = await base44.entities.CatalogItem.create({
      serial_number: serial,
      model_number: modelNumber
    });

    // Entities have no unique constraint, so the check above and this create
    // are not atomic — two concurrent requests for the same serial can both
    // pass the check and both create. Reconcile immediately after creating so
    // the first-owner-locks-it rule always ends up holding: the oldest claim
    // wins and every other request removes its own duplicate and reports the
    // serial as already claimed. The short pause lets a concurrent create land
    // so both contenders agree on the same winner.
    await new Promise((resolve) => setTimeout(resolve, 250));
    const claims = await base44.asServiceRole.entities.CatalogItem.filter({ serial_number: serial });
    const winner = claims.slice().sort((a, b) => {
      if (a.created_date !== b.created_date) return a.created_date < b.created_date ? -1 : 1;
      return a.id < b.id ? -1 : 1;
    })[0];

    if (winner && winner.id !== created.id) {
      // Another request claimed the serial first — undo our duplicate.
      await base44.entities.CatalogItem.delete(created.id);
      if (winner.created_by_id === user.id) {
        return Response.json({ status: 'already_in_catalog', id: winner.id });
      }
      return Response.json({
        status: 'already_claimed',
        message: `Serial ${serial} has already been added to another owner's catalog and is locked.`
      });
    }

    return Response.json({ status: 'created', id: created.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}