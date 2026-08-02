import crypto from "crypto";

/**
 * 1. Stack Trace Cleaning & SHA-256 Hashing Engine
 * Dynamically cleans line numbers, column numbers, and origins so that
 * duplicate errors map to the EXACT SAME SHA-256 hash.
 */

export function computeExceptionHash(
  errorType: string,
  message: string,
  stack?: string
): string {
  const normalizedType = (errorType || "Error").trim();
  
  // Replace dynamic numbers in error message (e.g., "User ID 102 failed" -> "User ID {num} failed")
  const normalizedMsg = (message || "")
    .replace(/\b\d+\b/g, "{num}")
    .trim();
  let stackSignature = "";
  if (stack) {
    const lines = stack.split("\n");
    
    // Filter lines that represent stack frames (usually contain "at ")
    const frames = lines
      .filter((line) => line.includes("at "))
      .slice(0, 2); // Take top 2 stack frames for signature
    stackSignature = frames
      .map((f) => {
        let cleaned = f;
        // Remove line & column numbers (e.g., ":14:23" or ":102")
        cleaned = cleaned.replace(/:\d+:\d+/g, "").replace(/:\d+/g, "");
        // Remove website origins (e.g. "http://localhost:3000" or "https://myapp.com")
        cleaned = cleaned.replace(/https?:\/\/[^\/]+/g, "");
        return cleaned.trim();
      })
      .join("|");
  }
  // Combine type, normalized message, and cleaned stack signature
  const rawInput = `${normalizedType}:${normalizedMsg}:${stackSignature}`;
  
  // Generate a 64-character SHA-256 Hash
  return crypto.createHash("sha256").update(rawInput).digest("hex");
}

/**
 * 2. Lightweight User-Agent Parser
 * Parses Browser Name/Version and OS Name/Version without heavy external dependencies.
 */

export function parseUserAgent(uaString: string) {
  let browser = { name: "Unknown", version: "Unknown" };
  let os = { name: "Unknown", version: "Unknown" };
  if (!uaString) return { browser, os };
  // Parse OS
  if (uaString.indexOf("Windows NT 10.0") !== -1) os = { name: "Windows", version: "10" };
  else if (uaString.indexOf("Windows NT 6.2") !== -1) os = { name: "Windows", version: "8" };
  else if (uaString.indexOf("Windows NT 6.1") !== -1) os = { name: "Windows", version: "7" };
  else if (uaString.indexOf("Android") !== -1) {
    const match = uaString.match(/Android\s([0-9\.]+)/);
    os = { name: "Android", version: match ? match[1] : "Unknown" };
  } else if (uaString.indexOf("iPhone") !== -1 || uaString.indexOf("iPad") !== -1) {
    const match = uaString.match(/OS\s([0-9_]+)/);
    os = { name: "iOS", version: match ? match[1].replace(/_/g, ".") : "Unknown" };
  } else if (uaString.indexOf("Mac OS X") !== -1) {
    const match = uaString.match(/Mac OS X\s([0-9_\.]+)/);
    os = { name: "macOS", version: match ? match[1].replace(/_/g, ".") : "Unknown" };
  } else if (uaString.indexOf("Linux") !== -1) {
    os = { name: "Linux", version: "Unknown" };
  }
  // Parse Browser
  if (
    uaString.indexOf("Chrome") !== -1 &&
    uaString.indexOf("Safari") !== -1 &&
    uaString.indexOf("Edge") === -1 &&
    uaString.indexOf("Edg") === -1
  ) {
    const match = uaString.match(/Chrome\/([0-9\.]+)/);
    browser = { name: "Chrome", version: match ? match[1] : "Unknown" };
  } else if (uaString.indexOf("Safari") !== -1 && uaString.indexOf("Chrome") === -1) {
    const match = uaString.match(/Version\/([0-9\.]+)/);
    browser = { name: "Safari", version: match ? match[1] : "Unknown" };
  } else if (uaString.indexOf("Firefox") !== -1) {
    const match = uaString.match(/Firefox\/([0-9\.]+)/);
    browser = { name: "Firefox", version: match ? match[1] : "Unknown" };
  } else if (uaString.indexOf("Edge") !== -1 || uaString.indexOf("Edg") !== -1) {
    const match = uaString.match(/(?:Edge|Edg)\/([0-9\.]+)/);
    browser = { name: "Edge", version: match ? match[1] : "Unknown" };
  }
  return { browser, os };
}