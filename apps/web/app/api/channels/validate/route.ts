import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { ParseError, validateAndGetSourceInfo } from "@/lib/parsers";

/**
 * POST /api/channels/validate - Валидация URL канала
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const { type, info } = await validateAndGetSourceInfo(url);

    return NextResponse.json({
      valid: true,
      type,
      name: info.name,
      description: info.description,
      url: info.url,
      imageUrl: info.imageUrl,
      subscribersCount: info.subscribersCount,
    });
  } catch (error) {
    if (error instanceof ParseError) {
      return NextResponse.json(
        {
          valid: false,
          error: error.message,
          code: error.code,
        },
        { status: 400 }
      );
    }
    console.error("Error validating channel URL:", error);
    return NextResponse.json({ valid: false, error: "Internal server error" }, { status: 500 });
  }
}
