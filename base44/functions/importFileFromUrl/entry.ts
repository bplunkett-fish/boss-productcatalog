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

// SSRF protection: reject loopback, private, link-local, and non-public IPs.
// IPv4 blocked ranges: 0.0.0.0/8, 10.0.0.0/8, 127.0.0.0/8, 169.254.0.0/16,
// 172.16.0.0/12, 192.168.0.0/16, 224.0.0.0/4+ (multicast/reserved).
// IPv6 blocked: ::/0 unspecified, ::1 loopback, fe80::/10 link-local,
// fc00::/7 unique-local, ff00::/8 multicast, and IPv4-mapped addresses.
const BLOCKED_HOSTNAMES = /^(localhost|ip6-localhost|ip6-loopback|.*\.local)$/i;

function isBlockedIp(ip) {
  const v4 = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const a = parseInt(v4[1], 10);
    const b = parseInt(v4[2], 10);
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a >= 224) return true;
    return false;
  }
  const v6 = ip.toLowerCase();
  if (v6 === '::1' || v6 === '::') return true;
  if (v6.startsWith('fe80') || v6.startsWith('fc') || v6.startsWith('fd') || v6.startsWith('ff')) return true;
  if (v6.includes(':ffff:')) {
    const mapped = v6.split(':').pop();
    if (mapped && isBlockedIp(mapped)) return true;
  }
  return false;
}

async function assertPublicUrl(rawUrl) {
  const u = new URL(rawUrl);
  const host = u.hostname.replace(/^\[|\]$/g, '');
  if (BLOCKED_HOSTNAMES.test(host)) throw new Error('blocked hostname');
  // IP literal — check directly.
  if (/^[\d.]+$/.test(host) || host.includes(':')) {
    if (isBlockedIp(host)) throw new Error('blocked IP address');
    return;
  }
  // Hostname — resolve and reject if any address is non-public.
  let addrs;
  try {
    addrs = (typeof Deno !== 'undefined' && Deno.resolveDns)
      ? await Deno.resolveDns(host, 'A')
      : [];
  } catch { throw new Error('dns resolution failed'); }
  if (!addrs || addrs.length === 0) throw new Error('unresolved hostname');
  for (const a of addrs) {
    if (isBlockedIp(a)) throw new Error('hostname resolves to a non-public IP');
  }
}

// Fetch with manual redirect following so every hop is SSRF-validated.
async function safeFetch(rawUrl, maxRedirects = 5) {
  let current = rawUrl;
  for (let i = 0; i <= maxRedirects; i++) {
    await assertPublicUrl(current);
    const res = await fetch(current, { redirect: 'manual' });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      if (!loc) return res;
      current = new URL(loc, current).toString();
      continue;
    }
    return res;
  }
  throw new Error('too many redirects');
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

    const res = await safeFetch(url);
    if (!res.ok) return Response.json({ error: `fetch failed: ${res.status}` }, { status: 502 });
    const blob = await res.blob();
    const type = blob.type || 'application/octet-stream';
    const ext = deriveExt(type, url);
    const file = new File([blob], `resource-${Date.now()}.${ext}`, { type });
    const { file_url } = await base44.asServiceRole.integrations.Core.UploadPublicFile({ file });
    return Response.json({ file_url, file_type: ext });
  } catch (error) {
    const blocked = /blocked|non-public|unresolved|dns resolution failed/i.test(error.message || '');
    return Response.json({ error: error.message }, { status: blocked ? 400 : 500 });
  }
}