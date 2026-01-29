import { NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rpID, rpName, setChallenge } from "@/lib/passkey/config";

export async function POST() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { authenticators: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const existingAuthenticators = user.authenticators.map((auth) => ({
    id: Buffer.from(auth.credentialID, "base64url"),
    type: "public-key" as const,
    transports: auth.transports?.split(",") as AuthenticatorTransport[] | undefined,
  }));

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: user.id,
    userName: user.email,
    userDisplayName: user.name || user.email,
    attestationType: "none",
    excludeCredentials: existingAuthenticators,
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  setChallenge(user.id, options.challenge);

  return NextResponse.json(options);
}
