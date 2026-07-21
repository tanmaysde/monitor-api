import tls from "tls";
import { URL } from "url";

/**
 * Interface defining the structure of the SSL certificate status returned by our service.
 */
export interface ISSLInfo {
  isHttps: boolean;       // True if URL uses HTTPS protocol, false if HTTP
  validTo?: Date;         // The exact expiration date and time of the certificate
  validFrom?: Date;       // The date the certificate became active
  daysRemaining?: number; // Number of days left before the certificate expires
  issuer?: string;        // The Certificate Authority (CA) that issued the cert (e.g., Let's Encrypt, DigiCert)
  isValid?: boolean;      // True if certificate is currently valid (not expired)
  isExpired?: boolean;    // True if current date is past validTo date
  error?: string;         // Error message if SSL inspection failed (e.g., connection timeout)
}

/**
 * Inspects a given target URL to read its SSL/TLS certificate details.
 * 
 * @param targetUrl - Full URL to check (e.g., "https://google.com")
 * @returns A Promise resolving to ISSLInfo object
 */
export const checkSslCertificate = (targetUrl: string): Promise<ISSLInfo> => {
  // We return a new Promise to bridge Node's event-driven tls socket API with async/await
  return new Promise((resolve) => {
    try {
      // Step 1: Parse the string URL into a structured URL object
      const parsedUrl = new URL(targetUrl);

      // Step 2: SSL/TLS certificates ONLY exist on HTTPS connections
      if (parsedUrl.protocol !== "https:") {
        // Resolve early for HTTP URLs (no error, just not HTTPS)
        return resolve({ isHttps: false });
      }

      // Extract hostname (e.g., "api.example.com") and port (default HTTPS port is 443)
      const hostname = parsedUrl.hostname;
      const port = parsedUrl.port ? parseInt(parsedUrl.port, 10) : 443;

      // Step 3: Open a low-level TLS TCP socket connection to port 443
      const socket = tls.connect(
        {
          host: hostname,
          port: port,
          servername: hostname,      // SNI (Server Name Indication): tells reverse proxies which cert to serve
          rejectUnauthorized: false, // Don't throw a crash error on expired/self-signed certs so we can inspect them
        },
        () => {
          // Callback fired when TLS handshake successfully completes!

          // Step 4: Extract the remote server's SSL certificate details
          // Pass false to get object format instead of detailed raw buffer
          const cert = socket.getPeerCertificate(false);

          // Check if server failed to provide a valid certificate
          if (!cert || Object.keys(cert).length === 0) {
            socket.destroy(); // Always close connection socket to free resources
            return resolve({
              isHttps: true,
              isValid: false,
              error: "No SSL certificate provided by target host",
            });
          }

          // Step 5: Parse certificate dates into JavaScript Date objects
          const validTo = new Date(cert.valid_to);
          const validFrom = new Date(cert.valid_from);
          const now = new Date();

          // Step 6: Calculate days remaining until expiration
          // (Difference in milliseconds converted to days)
          const diffInMs = validTo.getTime() - now.getTime();
          const daysRemaining = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
          
          const isExpired = daysRemaining <= 0;
          
          // socket.authorized is a Node tls property: true if certificate authority is trusted
          const isValid = socket.authorized && !isExpired;

          // Step 7: Identify the Certificate Issuer Organization or Common Name
          const rawIssuer = cert.issuer?.O || cert.issuer?.CN;
          const issuer = Array.isArray(rawIssuer) ? rawIssuer[0] : (rawIssuer || "Unknown Issuer");

          // Step 8: Close the socket connection immediately (we got what we needed!)
          socket.destroy();

          // Step 9: Resolve the Promise with parsed SSL information
          resolve({
            isHttps: true,
            validTo,
            validFrom,
            daysRemaining,
            issuer,
            isValid,
            isExpired,
          });
        }
      );

      // Step 10: Set a 5-second socket timeout so our checker never hangs indefinitely
      socket.setTimeout(5000, () => {
        socket.destroy(); // Force close socket on timeout
        resolve({
          isHttps: true,
          isValid: false,
          error: "TLS Connection Timed Out (5s)",
        });
      });

      // Step 11: Handle socket connection network errors (e.g. DNS failure, port closed)
      socket.on("error", (err) => {
        socket.destroy(); // Force close socket on error
        resolve({
          isHttps: true,
          isValid: false,
          error: err.message,
        });
      });
    } catch (err: any) {
      // Catch invalid URL string errors (e.g. "not-a-valid-url")
      resolve({
        isHttps: true,
        isValid: false,
        error: err.message || "Invalid URL format",
      });
    }
  });
};
