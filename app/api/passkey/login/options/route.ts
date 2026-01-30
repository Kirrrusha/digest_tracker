import { NextResponse, type NextRequest } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";

import { db } from "@/lib/db";
import { rpID, setChallenge } from "@/lib/passkey/config";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email } = body;

  // Find user by email (optional - can do usernameless auth)
  let allowCredentials: {
    id: Buffer;
    type: "public-key";
    transports?: AuthenticatorTransport[];
  }[] = [];

  if (email) {
    const user = await db.user.findUnique({
      where: { email },
      include: { authenticators: true },
    });

    if (user && user.authenticators.length > 0) {
      allowCredentials = user.authenticators.map((auth) => ({
        id: Buffer.from(auth.credentialID, "base64url"),
        type: "public-key" as const,
        transports: auth.transports?.split(",") as AuthenticatorTransport[] | undefined,
      }));
    }
  }

  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "preferred",
    allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
  });

  // Store challenge with email as key (or random key for discoverable credentials)
  const challengeKey = email || `anon_${crypto.randomUUID()}`;
  setChallenge(challengeKey, options.challenge);

  return NextResponse.json({
    ...options,
    challengeKey, // Return this for verification
  });
}
