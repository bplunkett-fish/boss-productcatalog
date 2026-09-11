import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Adds a looked-up product to the calling user's personal catalog, but only if
// the serial number is not already claimed by another user. Serial numbers are
// globally unique across all catalogs — first owner locks it.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const product = body.product;
    if (!product || !product.serial_number) {
      return Response.json({ error: 'Product data is required' }, { status: 400 });
    }

    const serial = (product.serial_number || '').trim().toUpperCase();

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
      model_number: product.model_number,
      product_name: product.product_name,
      product_description: product.product_description,
      category: product.category,
      manufacturer: product.manufacturer,
      image_url: product.image_url,
      manuals: product.manuals || [],
      wiring_diagrams: product.wiring_diagrams || [],
      videos: product.videos || [],
      faqs: product.faqs || [],
      troubleshooting: product.troubleshooting || [],
      parts_links: product.parts_links || []
    });

    return Response.json({ status: 'created', id: created.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}