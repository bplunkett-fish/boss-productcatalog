import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

// SAGE ERP's job is simply to resolve a serial number to a model_number. The
// full product resources (manuals, videos, parts, etc.) live in the Product
// Database, keyed by model_number — so after resolving the model we pull the
// matching Product record for the caller.
//
// To connect your real SAGE ERP: set the SAGE_API_URL and SAGE_API_KEY secrets
// in dashboard settings. The endpoint should return { model_number } for a
// given serial.
//
// Until SAGE is connected, serials imported alongside models are stored in the
// ProductRecord table (serial_number → model_number) and used as the fallback
// mapping here.

async function lookupModelNumber(base44, serialNumber) {
  const sageApiUrl = secrets.get("SAGE_API_URL");
  const sageApiKey = secrets.get("SAGE_API_KEY");

  if (sageApiUrl && sageApiKey) {
    const res = await fetch(`${sageApiUrl}/serials/${encodeURIComponent(serialNumber)}`, {
      headers: { "Authorization": `Bearer ${sageApiKey}` }
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`SAGE ERP lookup failed: ${res.status}`);
    const data = await res.json();
    return (data.model_number || '').trim().toUpperCase() || null;
  }

  // Fallback (until SAGE ERP is connected): resolve from the imported
  // serial→model mapping table.
  const records = await base44.entities.ProductRecord.filter({ serial_number: serialNumber }, '-updated_date', 1);
  const rec = records && records.length > 0 ? records[0] : null;
  return rec ? (rec.model_number || '').trim().toUpperCase() || null : null;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const serialNumber = (body.serial_number || '').trim().toUpperCase();

    if (!serialNumber) {
      return Response.json({ error: 'Serial number is required' }, { status: 400 });
    }

    const modelNumber = await lookupModelNumber(base44, serialNumber);
    if (!modelNumber) {
      return Response.json({ found: false, serial_number: serialNumber });
    }

    // Pull the full product record (resources) from the Product Database by model.
    const products = await base44.entities.Product.filter({ model_number: modelNumber }, '-updated_date', 1);
    const product = products && products.length > 0 ? products[0] : null;

    return Response.json({ found: true, serial_number: serialNumber, model_number: modelNumber, product });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}