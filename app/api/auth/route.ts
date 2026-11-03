
import { NextRequest, NextResponse } from "next/server";

const RAILWAY_PROFILE_API =
  "https://railspaapi.shohoz.com/v1.0/web/auth/profile";

type RailwayProfileResponse = {
  data?: {
    display_name?: unknown;
    email?: unknown;
    phone_number?: unknown;
  };
  extra?: {
    hash?: string;
  };
};

export async function POST(request: NextRequest) {
  try {
    // 1. Read credentials from the frontend
    const body = await request.json();

    const token =
      typeof body.token === "string" ? body.token.trim() : "";

    const deviceId =
      typeof body.deviceId === "string" ? body.deviceId.trim() : "";

    const deviceKey =
      typeof body.deviceKey === "string" ? body.deviceKey.trim() : "";

    // 2. Validate required fields
    if (!token || !deviceId || !deviceKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Token, Device ID, and Device Key are required.",
        },
        { status: 400 }
      );
    }

    // 3. Verify credentials using Railway Profile API
    const railwayResponse = await fetch(RAILWAY_PROFILE_API, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "x-device-id": deviceId,
        "x-device-key": deviceKey,
        "x-requested-with": "XMLHttpRequest",
        Referer: "https://eticket.railway.gov.bd/",
      },
      cache: "no-store",
    });

    // 4. Read the API response
    const responseText = await railwayResponse.text();

    let profile: RailwayProfileResponse | null = null;

    try {
      profile = JSON.parse(responseText) as RailwayProfileResponse;
    } catch {
      profile = null;
    }

    // 5. Handle unsuccessful HTTP responses
    if (!railwayResponse.ok) {
      if (
        railwayResponse.status === 401 ||
        railwayResponse.status === 403
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Authentication failed. Please check your credentials.",
          },
          { status: 401 }
        );
      }

      if (railwayResponse.status === 429) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Too many requests. Please wait and try again.",
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to verify your Railway credentials right now.",
        },
        { status: 502 }
      );
    }

    // 6. Validate the profile response
    const profileData = profile?.data;

    const isValidProfile =
      profileData !== null &&
      typeof profileData === "object" &&
      typeof profileData.display_name === "string" &&
      profileData.display_name.trim().length > 0 &&
      typeof profileData.email === "string" &&
      profileData.email.trim().length > 0;

    if (!isValidProfile) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Railway profile verification failed. Please check your credentials.",
        },
        { status: 401 }
      );
    }

    // 7. Authentication successful
    return NextResponse.json({
      success: true,
      message: "Railway profile verified successfully.",
      data: profileData
    });
  } catch {
    // 8. Handle unexpected errors
    return NextResponse.json(
      {
        success: false,
        error:
          "A server error occurred while verifying your credentials. Please try again.",
      },
      { status: 500 }
    );
  }
}
