import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { safeFetch } from '../../shared/safeFetch.ts';

// Fetches a file from an external URL and re-uploads it into the app's public
// storage, returning the internal file_url (plus a derived file_type). Used by
// the admin product editor to "import" a pasted manual/diagram link so the file
// lives in the app backend instead of referencing an external host. Admin only.

const isInternalUrl = (u) => /base44\.com|wixstatic\.com/i.test(u);

const KNOWN_DOC_EXTS = new Set([
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'rtf',
  'odt', 'ods', 'odp', 'zip', 'txt', 'csv'
]);

// Map verbose MIME subtypes (e.g. application/msword) to clean file extensions.
const MIME_EXT_MAP = {
  'msword': 'doc',
  'vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'vnd.ms-excel': 'xls',
  'vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'vnd.ms-powerpoint': 'ppt',
  'vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'rtf': 'rtf',
  'pdf': 'pdf',
  'plain': 'txt',
  'csv': 'csv',
  'zip': 'zip',
  'octet-stream': '',
  'stream': '',
};

function urlPathExt(url) {
  try {
    return new URL(url).pathname.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '');
  } catch { return ''; }
}

function deriveExt(type, url) {
  const mimeSub = (type.split('/')[1] || '').replace(/[^a-z0-9.-]/g, '');
  let ext = MIME_EXT_MAP[mimeSub] !== undefined ? MIME_EXT_MAP[mimeSub] : mimeSub;
  if (!ext || ext === 'octetstream' || ext === 'stream') {
    const pe = urlPathExt(url);
    if (pe) ext = pe;
  }
  // Prefer the URL path extension for known document types — servers often
  // serve .doc/.docx with a generic or mismatched content type.
  const pe = urlPathExt(url);
  if (pe && KNOWN_DOC_EXTS.has(pe)) ext = pe;
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

    // SSRF-hardened fetch (see base44/shared/safeFetch.ts) with the document-
    // friendly headers this importer needs.
    const res = await safeFetch(url, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,application/msword,*/*;q=0.8',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
      },
    });
    if (!res.ok) return Response.json({ error: `fetch failed: ${res.status}` }, { status: 502 });
    const blob = await res.blob();
    const type = blob.type || 'application/octet-stream';
    const urlPe = urlPathExt(url);
    // A document URL that returns HTML usually means we got a preview/viewer/
    // login page, not the file. Sniff the first byte: real .doc/.docx binaries
    // don't start with '<', so only reject when the payload is actually HTML.
    if (urlPe && KNOWN_DOC_EXTS.has(urlPe) && type.startsWith('text/html')) {
      const buf = new Uint8Array(await blob.arrayBuffer());
      const firstNonSpace = buf.find(b => b !== 0x20 && b !== 0x09 && b !== 0x0a && b !== 0x0d);
      if (firstNonSpace === 0x3C) { // '<' => a real HTML page
        return Response.json(
          { error: `This URL returned an HTML page instead of a .${urlPe} file. Paste a direct download link to the file, not a preview or viewer page.` },
          { status: 422 }
        );
      }
      // Mislabeled binary — store it with the correct extension from the URL.
      const file = new File([buf], `resource-${Date.now()}.${urlPe}`, { type: 'application/octet-stream' });
      const { file_url } = await base44.asServiceRole.integrations.Core.UploadPublicFile({ file });
      return Response.json({ file_url, file_type: urlPe });
    }
    const ext = deriveExt(type, url);
    const file = new File([blob], `resource-${Date.now()}.${ext}`, { type });
    const { file_url } = await base44.asServiceRole.integrations.Core.UploadPublicFile({ file });
    return Response.json({ file_url, file_type: ext });
  } catch (error) {
    const blocked = /blocked|non-public|unresolved|dns resolution failed/i.test(error.message || '');
    return Response.json({ error: error.message }, { status: blocked ? 400 : 500 });
  }
}