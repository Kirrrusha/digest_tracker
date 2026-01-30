import { NextResponse, type NextRequest } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { clearChallenge, getChallenge, origin, rpID } from "@/lib/passkey/config";

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { credential, name } = body;

  const expectedChallenge = getChallenge(session.user.id);

  if (!expectedChallenge) {
    return NextResponse.json({ error: "Challenge expired or not found" }, { status: 400 });
  }

  try {
    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ error: "Verification failed" }, { status: 400 });
    }

    const { credentialID, credentialPublicKey, counter, credentialDeviceType, credentialBackedUp } =
      verification.registrationInfo;

    await db.authenticator.create({
      data: {
        credentialID: Buffer.from(credentialID).toString("base64url"),
        credentialPublicKey: Buffer.from(credentialPublicKey).toString("base64url"),
        counter: BigInt(counter),
        credentialDeviceType,
        credentialBackedUp,
        transports: credential.response.transports?.join(","),
        userId: session.user.id,
        name: name || "Passkey",
      },
    });

    clearChallenge(session.user.id);

    return NextResponse.json({ verified: true });
  } catch (error) {
    console.error("Passkey registration error:", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
