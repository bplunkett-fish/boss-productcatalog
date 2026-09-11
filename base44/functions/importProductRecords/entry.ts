import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Imports model-level records into the Product Database from an uploaded CSV or
// Excel file. Upserts by model_number — existing models are updated (scalar
// fields only; resource arrays like manuals/videos are preserved), new models
// are created. Any image_url is fetched and re-uploaded into the app's own
// public storage so the image lives within the app backend instead of
// referencing an external host. Admin only.

// Fetches an external image and re-uploads it to the app's public storage,
// returning the internal file_url. Throws on failure so the caller can fall
// back to the original external URL.
async function importExternalImage(base44, url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`image fetch failed: ${res.status}`);
  const blob = await res.blob();
  const type = blob.type || 'image/jpeg';
  const ext = (type.split('/')[1] || 'jpg').replace(/[^a-z0-9]/g, '');
  const file = new File([blob], `product-${Date.now()}.${ext}`, { type });
  const { file_url } = await base44.asServiceRole.integrations.Core.UploadPublicFile({ file });
  return file_url;
}

const isInternalUrl = (u) => /base44\.com|wixstatic\.com/i.test(u);
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const fileUrl = body.file_url;
    if (!fileUrl) return Response.json({ error: 'file_url is required' }, { status: 400 });

    const extracted = await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({
      file_url: fileUrl,
      json_schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            model_number: { type: 'string' },
            product_name: { type: 'string' },
            product_description: { type: 'string' },
            category: { type: 'string' },
            manufacturer: { type: 'string' },
            image_url: { type: 'string' }
          },
          required: ['model_number', 'product_name']
        }
      }
    });

    const raw = Array.isArray(extracted?.output) ? extracted.output
      : Array.isArray(extracted?.output?.rows) ? extracted.output.rows
      : [];

    const cleaned = raw
      .map(r => ({
        model_number: String(r.model_number || '').trim().toUpperCase(),
        product_name: String(r.product_name || '').trim(),
        product_description: String(r.product_description || '').trim(),
        category: String(r.category || '').trim(),
        manufacturer: String(r.manufacturer || '').trim(),
        image_url: String(r.image_url || '').trim()
      }))
      .filter(r => r.model_number && r.product_name);

    if (cleaned.length === 0) {
      return Response.json({ error: 'No valid rows found. Required columns: model_number, product_name' }, { status: 400 });
    }

    // Pull external images into the app's own storage. Already-internal URLs
    // are left alone; failed uploads fall back to the original external URL so
    // a single bad image never aborts the whole import.
    let imagesImported = 0;
    for (const r of cleaned) {
      if (r.image_url && !isInternalUrl(r.image_url)) {
        try {
          r.image_url = await importExternalImage(base44, r.image_url);
          imagesImported += 1;
        } catch {
          // keep the original external URL as a fallback
        }
      }
    }

    const modelNumbers = cleaned.map(r => r.model_number);
    const existing = await base44.asServiceRole.entities.Product.filter({ model_number: { $in: modelNumbers } });
    const byModel = {};
    for (const p of existing) byModel[p.model_number] = p;

    const toCreate = [];
    const toUpdate = [];
    for (const r of cleaned) {
      const ex = byModel[r.model_number];
      if (ex) {
        toUpdate.push({
          id: ex.id,
          model_number: r.model_number,
          product_name: r.product_name,
          product_description: r.product_description || ex.product_description,
          category: r.category || ex.category,
          manufacturer: r.manufacturer || ex.manufacturer,
          image_url: r.image_url || ex.image_url
        });
      } else {
        toCreate.push({
          model_number: r.model_number,
          product_name: r.product_name,
          product_description: r.product_description,
          category: r.category,
          manufacturer: r.manufacturer,
          image_url: r.image_url
        });
      }
    }

    let created = 0, updated = 0;
    if (toCreate.length) {
      await base44.asServiceRole.entities.Product.bulkCreate(toCreate);
      created = toCreate.length;
    }
    if (toUpdate.length) {
      await base44.asServiceRole.entities.Product.bulkUpdate(toUpdate);
      updated = toUpdate.length;
    }

    return Response.json({ status: 'ok', created, updated, images_imported: imagesImported, total: created + updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}