import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const fileUrl = (body.file_url || '').trim();
    if (!fileUrl) return Response.json({ error: 'file_url is required' }, { status: 400 });

    // Parse the uploaded CSV/Excel into structured rows
    const extract = await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({
      file_url: fileUrl,
      json_schema: {
        type: "object",
        properties: {
          serial_number: { type: "string" },
          model_number: { type: "string" },
          product_name: { type: "string" },
          product_description: { type: "string" },
          category: { type: "string" },
          manufacturer: { type: "string" },
          image_url: { type: "string" }
        },
        required: ["serial_number", "product_name"]
      }
    });

    const rows = Array.isArray(extract.output) ? extract.output : (extract.output ? [extract.output] : []);
    if (rows.length === 0) return Response.json({ error: 'No rows found in the file' }, { status: 400 });

    // Normalize and validate
    const cleaned = rows
      .map((r) => ({
        serial_number: String(r.serial_number || '').trim().toUpperCase(),
        model_number: String(r.model_number || '').trim(),
        product_name: String(r.product_name || '').trim(),
        product_description: String(r.product_description || '').trim(),
        category: String(r.category || '').trim(),
        manufacturer: String(r.manufacturer || '').trim(),
        image_url: String(r.image_url || '').trim()
      }))
      .filter((r) => r.serial_number && r.product_name);

    if (cleaned.length === 0) {
      return Response.json({ error: 'No valid rows — each row needs a serial_number and product_name' }, { status: 400 });
    }

    // Upsert against existing records (match by normalized serial)
    const existing = await base44.entities.ProductRecord.filter({});
    const bySerial = new Map(existing.map((e) => [e.serial_number, e]));

    const toCreate = [];
    const toUpdate = [];
    for (const r of cleaned) {
      const ex = bySerial.get(r.serial_number);
      if (ex) toUpdate.push({ id: ex.id, ...r });
      else toCreate.push(r);
    }

    let created = 0;
    let updated = 0;
    if (toCreate.length) {
      await base44.entities.ProductRecord.bulkCreate(toCreate);
      created = toCreate.length;
    }
    if (toUpdate.length) {
      await base44.entities.ProductRecord.bulkUpdate(toUpdate);
      updated = toUpdate.length;
    }

    return Response.json({ status: 'ok', created, updated, total: cleaned.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}