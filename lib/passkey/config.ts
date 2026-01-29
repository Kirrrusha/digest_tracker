// WebAuthn configuration
export const rpName = "DevDigest";
export const rpID =
  process.env.NODE_ENV === "production"
    ? process.env.WEBAUTHN_RP_ID || "devdigest.app"
    : "localhost";

export const origin =
  process.env.NODE_ENV === "production"
    ? process.env.WEBAUTHN_ORIGIN || `https://${rpID}`
    : "http://localhost:3000";

export const challengeStore = new Map<string, { challenge: string; expires: number }>();

export function setChallenge(userId: string, challenge: string) {
  // Challenge expires in 5 minutes
  challengeStore.set(userId, {
    challenge,
    expires: Date.now() + 5 * 60 * 1000,
  });
}

export function getChallenge(userId: string): string | null {
  const entry = challengeStore.get(userId);
  if (!entry) return null;

  if (Date.now() > entry.expires) {
    challengeStore.delete(userId);
    return null;
  }

  return entry.challenge;
}

export function clearChallenge(userId: string) {
  challengeStore.delete(userId);
}
