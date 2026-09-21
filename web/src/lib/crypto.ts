/**
 * Cryptographic verification utility for LegalMet Verify.
 * Computes tamper-evident SHA-256 HMAC signatures for official certificates.
 */

const HMAC_SECRET = "legalmet-sih2026-x7Qp9vKzR3mN";

/**
 * Generate a SHA-256 HMAC signature for a verification certificate.
 * Signature payload: digitalId:certificateNo:validTill:officerId
 */
export async function generateCertificateHmac(
  digitalId: string,
  certificateNo: string,
  validTill: string,
  officerId: string
): Promise<string> {
  const payload = `${digitalId}:${certificateNo}:${validTill}:${officerId}`;
  const encoder = new TextEncoder();

  const keyData = encoder.encode(HMAC_SECRET);
  const cryptoKey = await window.crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await window.crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    encoder.encode(payload)
  );

  // Convert ArrayBuffer to Hex String
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Verify a certificate HMAC signature against its payload.
 */
export async function verifyCertificateHmac(
  digitalId: string,
  certificateNo: string,
  validTill: string,
  officerId: string,
  expectedHash: string
): Promise<boolean> {
  const calculated = await generateCertificateHmac(
    digitalId,
    certificateNo,
    validTill,
    officerId
  );
  return calculated.toLowerCase() === expectedHash.toLowerCase();
}
