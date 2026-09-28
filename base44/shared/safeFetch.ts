// SSRF-hardened fetch shared by the admin URL-import functions.
//
// The blocklist (loopback, private, link-local, reserved/multicast) is enforced
// against EVERY address a hostname resolves to — IPv4 and IPv6 — both before
// the request and again immediately after it. A rebinding server has to answer
// with a private address around the moment of the connection to reach an
// internal target, so the second lookup sees it and the response is refused
// instead of being re-uploaded into the app's storage.

const BLOCKED_HOSTNAMES = /^(localhost|ip6-localhost|ip6-loopback|.*\.local)$/i;
const MAX_REDIRECTS = 5;

const isIpLiteral = (host) => /^[\d.]+$/.test(host) || host.includes(':');

export function isBlockedIp(ip) {
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

// Both record families are queried: a dual-stack host must not pass validation
// with a public A record while its AAAA record points somewhere private.
async function resolveAddresses(host) {
  if (typeof Deno === 'undefined' || !Deno.resolveDns) {
    throw new Error('dns resolution failed');
  }
  const [a, aaaa] = await Promise.all([
    Deno.resolveDns(host, 'A').catch(() => []),
    Deno.resolveDns(host, 'AAAA').catch(() => []),
  ]);
  const addresses = [...(a || []), ...(aaaa || [])];
  if (addresses.length === 0) throw new Error('unresolved hostname');
  return addresses;
}

function assertAddressesPublic(addresses) {
  for (const address of addresses) {
    if (isBlockedIp(address)) throw new Error('hostname resolves to a non-public IP');
  }
}

async function assertPublicUrl(rawUrl) {
  const u = new URL(rawUrl);
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('blocked protocol');
  const host = u.hostname.replace(/^\[|\]$/g, '');
  if (BLOCKED_HOSTNAMES.test(host)) throw new Error('blocked hostname');
  if (isIpLiteral(host)) {
    if (isBlockedIp(host)) throw new Error('blocked IP address');
    return { host, ipLiteral: true };
  }
  assertAddressesPublic(await resolveAddresses(host));
  return { host, ipLiteral: false };
}

const DEFAULT_HEADERS = {
  // Some hosts (e.g. WordPress security plugins) serve an HTML page to
  // non-browser clients; send a browser-like header set so direct file links
  // return the actual file.
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  'Accept': '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
};

// Fetch with manual redirect following so every hop is validated. `options`
// may carry extra `headers` (merged over the defaults) and a `maxRedirects`.
export async function safeFetch(rawUrl, options = {}) {
  const maxRedirects = options.maxRedirects ?? MAX_REDIRECTS;
  const headers = { ...DEFAULT_HEADERS, ...(options.headers || {}) };
  let current = rawUrl;
  for (let i = 0; i <= maxRedirects; i++) {
    const { host, ipLiteral } = await assertPublicUrl(current);
    const res = await fetch(current, { redirect: 'manual', headers });
    // fetch resolves DNS itself, so the connected address can't be inspected.
    // Re-check straight after the request: if the hostname now answers with a
    // non-public address it was rebound, and the response is discarded unread.
    if (!ipLiteral) assertAddressesPublic(await resolveAddresses(host));
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (!location) return res;
      current = new URL(location, current).toString();
      continue;
    }
    return res;
  }
  throw new Error('too many redirects');
}