import dns from "dns";
import net from "net";

/**
 * SSRF protection for outbound requests that go to URLs supplied by users
 * (webhook / Slack / Teams actions). Without it, a user could make OUR server call
 * internal services such as http://localhost, a private network host, or the cloud
 * metadata address 169.254.169.254.
 *
 * For local development/testing only, set ALLOW_PRIVATE_WEBHOOK_TARGETS=true.
 */
export const allowPrivateTargets = () => process.env.ALLOW_PRIVATE_WEBHOOK_TARGETS === "true";

const isPrivateIPv4 = (ip: string): boolean => {
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 || // "this" network
    a === 10 || // private
    a === 127 || // loopback
    (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
    (a === 169 && b === 254) || // link-local + cloud metadata
    (a === 172 && b >= 16 && b <= 31) || // private
    (a === 192 && b === 168) || // private
    (a === 192 && b === 0) || // IETF protocol assignments
    (a === 198 && (b === 18 || b === 19)) || // benchmarking
    a >= 224 // multicast and reserved
  );
};

/** True if the address is loopback, private, link-local, multicast, or not an IP at all. */
export const isPrivateAddress = (input: string): boolean => {
  const addr = input.replace(/^\[|\]$/g, "").split("%")[0].toLowerCase();

  if (net.isIPv4(addr)) return isPrivateIPv4(addr);

  if (net.isIPv6(addr)) {
    if (addr === "::" || addr === "::1") return true;
    if (addr.startsWith("64:ff9b:")) return true; // NAT64 can embed private IPv4

    // IPv4-mapped (::ffff:a.b.c.d or ::ffff:aabb:ccdd): judge the embedded IPv4
    const dotted = addr.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (dotted) return isPrivateIPv4(dotted[1]);
    const hex = addr.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
    if (hex) {
      const hi = parseInt(hex[1], 16);
      const lo = parseInt(hex[2], 16);
      return isPrivateIPv4(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
    }

    const first = parseInt(addr.split(":")[0] || "0", 16);
    if ((first & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
    if ((first & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
    if ((first & 0xff00) === 0xff00) return true; // multicast
    return false;
  }

  return true; // not a valid IP: treat as unsafe
};

/** Quick check before sending: http(s) only, and no private IP written directly in the URL. */
export const assertSafeOutboundUrl = (rawUrl: string): void => {
  const url = new URL(rawUrl); // throws on invalid URLs
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http and https URLs are allowed");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(host) && isPrivateAddress(host)) {
    throw new Error("Target is a private or internal address, which is not allowed");
  }
};

/**
 * DNS lookup that refuses private addresses. Passed to axios so the check happens on
 * the address the connection will REALLY use (this also defeats DNS-rebinding tricks).
 */
export const guardedLookup: any = (hostname: string, options: any, callback: any) => {
  dns.lookup(hostname, options, (err: any, address: any, family: any) => {
    if (err) return callback(err, address, family);
    const list: { address: string }[] = Array.isArray(address) ? address : [{ address }];
    if (list.some((entry) => isPrivateAddress(entry.address))) {
      return callback(new Error(`Blocked: ${hostname} resolves to a private or internal address`));
    }
    return callback(null, address, family);
  });
};
