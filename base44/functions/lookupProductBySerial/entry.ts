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
const SAMPLE_SAGE_MAP = {
  "SN-10045-A": "GX-4500",
  "SN-22087-B": "VF-220",
  "SN-55301-C": "AS-12"
};

async function lookupModelInSage(serialNumber) {
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

  // Stub: sample serials resolve to sample models; otherwise not found.
  return SAMPLE_SAGE_MAP[serialNumber] || null;
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

    const modelNumber = await lookupModelInSage(serialNumber);
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