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

// Non-canonical IPv4 spellings ("127.1", "2130706433", "0177.0.0.1", "0x7f.1")
// are all the same address as 127.0.0.1 once the URL parser or fetch normalizes
// them, so a host MUST be canonicalized before it is classified or range-checked.
// Otherwise a spelling that fails the strict four-group test is treated as a
// public IP literal, skips DNS entirely, and reaches the internal target anyway.
const IPV4_PART = /^(0[xX][0-9a-fA-F]+|0[0-7]+|\d+)$/;

// WHATWG IPv4 parsing: 1-4 dot-separated parts, each decimal, octal (leading 0)
// or hex (0x…), where a trailing part fills the remaining bytes. Returns the
// canonical dotted-decimal form, or null when the host is not an IPv4 address.
export function canonicalIpv4(text) {
  const parts = String(text).split('.');
  if (parts.length === 0 || parts.length > 4) return null;
  const values = [];
  for (const part of parts) {
    if (!IPV4_PART.test(part)) return null;
    if (/^0[xX]/.test(part)) values.push(parseInt(part.slice(2), 16));
    else if (/^0[0-7]+$/.test(part)) values.push(parseInt(part.slice(1), 8));
    else values.push(parseInt(part, 10));
  }
  if (values.slice(0, -1).some((value) => value > 255)) return null;
  const last = values[values.length - 1];
  if (last >= Math.pow(256, 5 - values.length)) return null;
  let packed = last;
  for (let i = 0; i < values.length - 1; i++) packed += values[i] * Math.pow(256, 3 - i);
  return [(packed >>> 24) & 255, (packed >>> 16) & 255, (packed >>> 8) & 255, packed & 255].join('.');
}

// Expand an IPv6 literal into its 16 bytes, so ranges — and the embedded IPv4
// tail of IPv4-compatible/mapped addresses such as ::ffff:7f00:1 — are judged on
// the address that is actually connected to. Returns null when it is not valid.
export function ipv6Bytes(text) {
  let s = String(text).toLowerCase();
  const dotted = s.match(/(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (dotted) {
    const b = dotted[1].split('.').map((n) => parseInt(n, 10));
    if (b.some((n) => n > 255)) return null;
    s = s.slice(0, s.length - dotted[1].length) + ((b[0] << 8) | b[1]).toString(16) + ':' + ((b[2] << 8) | b[3]).toString(16);
  }
  if (!s.includes(':')) return null;
  const halves = s.includes('::') ? s.split('::') : null;
  if (halves && halves.length !== 2) return null;
  const head = (halves ? halves[0] : s).split(':').filter(Boolean);
  const tail = halves ? halves[1].split(':').filter(Boolean) : [];
  const groups = halves
    ? [...head, ...Array(Math.max(0, 8 - head.length - tail.length)).fill('0'), ...tail]
    : head;
  if (groups.length !== 8) return null;
  const bytes = [];
  for (const group of groups) {
    if (!/^[0-9a-f]{1,4}$/.test(group)) return null;
    const value = parseInt(group, 16);
    bytes.push((value >> 8) & 255, value & 255);
  }
  return bytes;
}

export function isBlockedIp(ip) {
  const v4 = canonicalIpv4(ip);
  if (v4) {
    const [a, b] = v4.split('.').map((n) => parseInt(n, 10));
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a >= 224) return true;
    return false;
  }
  const bytes = ipv6Bytes(ip);
  if (!bytes) return false;
  if (bytes[0] === 0xfe && (bytes[1] & 0xc0) === 0x80) return true; // fe80::/10 link-local
  if ((bytes[0] & 0xfe) === 0xfc) return true; // fc00::/7 unique local
  if (bytes[0] === 0xff) return true; // ff00::/8 multicast
  // Leading ten bytes zero covers ::, ::1 and the IPv4-compatible/mapped forms
  // (::ffff:8.8.8.8, ::ffff:7f00:1, ::7f00:1): the embedded IPv4 decides, so a
  // mapped public address stays usable while a mapped loopback does not.
  if (bytes.slice(0, 10).every((byte) => byte === 0)) return isBlockedIp(bytes.slice(12).join('.'));
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
  // Classify on the CANONICAL address, never on the spelling the caller used.
  const ipv4 = canonicalIpv4(host);
  if (ipv4) {
    if (isBlockedIp(ipv4)) throw new Error('blocked IP address');
    return { host: ipv4, ipLiteral: true };
  }
  // Digits and dots that are not a canonical IPv4 address (e.g. "1.2.3.4.5",
  // "999.1.1.1") are never a legitimate host, so refuse instead of resolving.
  if (/^[\d.]+$/.test(host)) throw new Error('invalid IP address');
  if (host.includes(':')) {
    // IPv6 literal, already normalized by the URL parser.
    if (!ipv6Bytes(host)) throw new Error('invalid IP address');
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
    // IP literals have no DNS step, but the canonical address is re-asserted here
    // too, so no spelling can reach a blocked target through this path either.
    if (ipLiteral) {
      if (isBlockedIp(host)) throw new Error('blocked IP address');
    } else {
      assertAddressesPublic(await resolveAddresses(host));
    }
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