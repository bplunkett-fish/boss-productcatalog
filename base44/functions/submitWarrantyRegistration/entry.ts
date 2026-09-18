import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

// Strip control characters (incl. newlines/tabs) and collapse whitespace so
// user-controlled values can't inject line breaks into the email subject/body
// or otherwise spoof the warranty submission. Optional `maxLen` truncates.
function sanitize(value, maxLen) {
  let v = (value == null ? '' : String(value))
    .replace(/[\u0000-\u001F\u007F\u2028\u2029]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (maxLen && v.length > maxLen) v = v.slice(0, maxLen);
  return v;
}

// Submits a lifetime warranty registration for a cataloged product.
// Today: the registration is delivered by email.
// Future: the same `registration` payload can be pushed to an external database
// (see the marked section below) without changing the form or this function's
// contract.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));

    // Product context (read-only, comes from the catalog item / product record).
    const serialNumber = sanitize(body.serial_number, 100);
    const modelNumber = sanitize(body.model_number, 100);
    const productName = sanitize(body.product_name, 200);

    // Registrant fields.
    const name = sanitize(body.name, 150);
    const email = sanitize(body.email, 254).toLowerCase();
    const phone = sanitize(body.phone, 40);
    const street = sanitize(body.street, 200);
    const city = sanitize(body.city, 100);
    const state = sanitize(body.state, 100);
    const zip = sanitize(body.zip, 20);
    const purchaseDate = sanitize(body.purchase_date, 40);
    const purchaseLocation = sanitize(body.purchase_location, 200);
    const installDate = sanitize(body.install_date, 40);
    const notes = sanitize(body.notes, 2000);

    if (!name || !email || !serialNumber || !modelNumber) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Single source of truth for the registration — reused by the email body
    // and, later, the external database push.
    const registration = {
      submitted_at: new Date().toISOString(),
      submitted_by_user_id: user.id,
      product: {
        serial_number: serialNumber,
        model_number: modelNumber,
        product_name: productName
      },
      registrant: {
        name,
        email,
        phone,
        address: { street, city, state, zip },
        purchase_date: purchaseDate,
        purchase_location: purchaseLocation,
        install_date: installDate,
        notes
      }
    };

    // --- Delivery: email -------------------------------------------------
    const recipient = (secrets.get('WARRANTY_EMAIL_TO') || user.email || '').trim();
    if (!recipient) {
      return Response.json({ error: 'No recipient address configured for warranty submissions' }, { status: 500 });
    }

    const lines = [
      `A new lifetime warranty registration was submitted.`,
      ``,
      `Product`,
      `  Name: ${productName || '—'}`,
      `  Model: ${modelNumber}`,
      `  Serial: ${serialNumber}`,
      ``,
      `Registrant`,
      `  Name: ${name}`,
      `  Email: ${email}`,
      `  Phone: ${phone || '—'}`,
      `  Address: ${street || '—'}, ${city || '—'}, ${state || '—'} ${zip || '—'}`,
      `  Purchase date: ${purchaseDate || '—'}`,
      `  Purchase location: ${purchaseLocation || '—'}`,
      `  Install date: ${installDate || '—'}`,
      ``,
      `Notes`,
      `  ${notes || '—'}`,
      ``,
      `Submitted by app user: ${user.email} (${user.id})`,
      `Submitted at: ${registration.submitted_at}`
    ];

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: recipient,
      subject: `Warranty Registration: ${productName || modelNumber} (Serial ${serialNumber})`,
      body: lines.join('\n')
    });

    // --- Future: external database --------------------------------------
    // TODO: push `registration` to the external warranty database.
    // await pushToExternalWarrantyDb(registration);

    return Response.json({ status: 'ok' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}