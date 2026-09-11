import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Fetches a file from an external URL and re-uploads it into the app's public
// storage, returning the internal file_url (plus a derived file_type). Used by
// the admin product editor to "import" a pasted manual/diagram link so the file
// lives in the app backend instead of referencing an external host. Admin only.

const isInternalUrl = (u) => /base44\.com|wixstatic\.com/i.test(u);

function deriveExt(type, url) {
  let ext = (type.split('/')[1] || '').replace(/[^a-z0-9]/g, '');
  if (!ext || ext === 'octetstream' || ext === 'stream') {
    try {
      const pe = new URL(url).pathname.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '');
      if (pe) ext = pe;
    } catch { /* ignore */ }
  }
  return ext || 'bin';
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const url = (body?.url || '').trim();
    if (!url) return Response.json({ error: 'url is required' }, { status: 400 });
    if (!/^https?:\/\//i.test(url)) return Response.json({ error: 'url must start with http(s)://' }, { status: 400 });
    if (isInternalUrl(url)) return Response.json({ error: 'url is already stored internally' }, { status: 400 });

    const res = await fetch(url);
    if (!res.ok) return Response.json({ error: `fetch failed: ${res.status}` }, { status: 502 });
    const blob = await res.blob();
    const type = blob.type || 'application/octet-stream';
    const ext = deriveExt(type, url);
    const file = new File([blob], `resource-${Date.now()}.${ext}`, { type });
    const { file_url } = await base44.asServiceRole.integrations.Core.UploadPublicFile({ file });
    return Response.json({ file_url, file_type: ext });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}