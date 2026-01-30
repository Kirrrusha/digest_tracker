import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";

import { db } from "@/lib/db";
import { clearChallenge, getChallenge, origin, rpID } from "@/lib/passkey/config";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { credential, challengeKey } = body;

  const expectedChallenge = getChallenge(challengeKey);

  if (!expectedChallenge) {
    return NextResponse.json({ error: "Challenge expired or not found" }, { status: 400 });
  }

  // Find authenticator by credential ID
  const credentialID = credential.id;
  const authenticator = await db.authenticator.findUnique({
    where: { credentialID },
    include: { user: true },
  });

  if (!authenticator) {
    return NextResponse.json({ error: "Authenticator not found" }, { status: 404 });
  }

  try {
    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      authenticator: {
        credentialID: Buffer.from(authenticator.credentialID, "base64url"),
        credentialPublicKey: Buffer.from(authenticator.credentialPublicKey, "base64url"),
        counter: Number(authenticator.counter),
        transports: authenticator.transports?.split(",") as AuthenticatorTransport[] | undefined,
      },
    });

    if (!verification.verified) {
      return NextResponse.json({ error: "Verification failed" }, { status: 400 });
    }

    // Update counter
    await db.authenticator.update({
      where: { id: authenticator.id },
      data: { counter: BigInt(verification.authenticationInfo.newCounter) },
    });

    clearChallenge(challengeKey);

    // Return user info for client-side sign in
    return NextResponse.json({
      verified: true,
      user: {
        id: authenticator.user.id,
        email: authenticator.user.email,
        name: authenticator.user.name,
      },
    });
  } catch (error) {
    console.error("Passkey login error:", error);
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}
