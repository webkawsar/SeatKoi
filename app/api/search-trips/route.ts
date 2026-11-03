import { NextRequest, NextResponse } from "next/server";
import railwayData from "@/data/railway-data.json";

type RailwayCity = {
  city_id: number;
  city_name: string;
  city_sequence: number;
  is_top_city: boolean;
  is_enable_for_from: number;
};

type UserCredentials = {
  token: string;
  deviceId: string;
  deviceKey: string;
};

const cities = railwayData.cities as RailwayCity[];

function formatJourneyDate(value: string): string | null {
  // Accept only YYYY-MM-DD and reject invalid calendar dates.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  return `${String(day).padStart(2, "0")}-${months[month - 1]}-${year}`;
}

function isWithinAllowedDateRange(value: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const selected = new Date(`${value}T00:00:00`);
  if (Number.isNaN(selected.getTime())) return false;

  const lastAllowed = new Date(today);
  lastAllowed.setDate(lastAllowed.getDate() + 10);

  return selected >= today && selected <= lastAllowed;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const credentials = body.credentials as UserCredentials | undefined;
    const token = credentials?.token;
    const deviceId = credentials?.deviceId;
    const deviceKey = credentials?.deviceKey;

    if (!token || !deviceId || !deviceKey) {
      return NextResponse.json(
        {
          error:
            "Railway API credentials are not configured on the server.",
        },
        { status: 500 }
      );
    }

    const fromCityId = Number(body.from_city_id);
    const toCityId = Number(body.to_city_id);
    const journeyDate = body.date_of_journey;

    if (
      !Number.isInteger(fromCityId) ||
      !Number.isInteger(toCityId) ||
      typeof journeyDate !== "string"
    ) {
      return NextResponse.json(
        { error: "Invalid search details." },
        { status: 400 }
      );
    }

    const fromCity = cities.find(
      (city) => city.city_id === fromCityId
    );

    const toCity = cities.find(
      (city) => city.city_id === toCityId
    );

    if (!fromCity || !toCity) {
      return NextResponse.json(
        { error: "Please select stations from the station suggestions." },
        { status: 400 }
      );
    }

    if (fromCity.is_enable_for_from !== 1) {
      return NextResponse.json(
        { error: "This station is not available as a starting station." },
        { status: 400 }
      );
    }

    if (fromCity.city_id === toCity.city_id) {
      return NextResponse.json(
        { error: "Starting and destination stations cannot be the same." },
        { status: 400 }
      );
    }

    const formattedDate = formatJourneyDate(journeyDate);

    if (
      !formattedDate ||
      !isWithinAllowedDateRange(journeyDate)
    ) {
      return NextResponse.json(
        {
          error:
            "Journey date must be between today and the next 10 days.",
        },
        { status: 400 }
      );
    }

    const params = new URLSearchParams({
      from_city: fromCity.city_name,
      to_city: toCity.city_name,
      date_of_journey: formattedDate,
      seat_class: "F_SEAT",
    });

    const url =
      "https://railspaapi.shohoz.com/v1.0/web/bookings/search-trips-v2?" +
      params.toString();

    const authorization = token.startsWith("Bearer ")
      ? token
      : `Bearer ${token}`;

    const railwayResponse = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: authorization,
        "x-device-id": deviceId,
        "x-device-key": deviceKey,
        "x-requested-with": "XMLHttpRequest",
        Referer: "https://eticket.railway.gov.bd/",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });

    const responseText = await railwayResponse.text();

    let responseData: unknown;

    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = {
        message: responseText.slice(0, 1000),
      };
    }

    if (!railwayResponse.ok) {
      return NextResponse.json(
        {
          error: "Railway API rejected the search request.",
          upstreamStatus: railwayResponse.status,
          details: responseData,
        },
        { status: railwayResponse.status }
      );
    }

    return NextResponse.json({
      ok: true,
      route: {
        from: fromCity.city_name,
        to: toCity.city_name,
        date: formattedDate,
        seatClass: "F_SEAT",
      },
      data: responseData,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "TimeoutError"
    ) {
      return NextResponse.json(
        { error: "Railway API request timed out. Please try again." },
        { status: 504 }
      );
    }

    console.error(
      "Railway search request failed:",
      error instanceof Error ? error.message : "Unknown error"
    );

    return NextResponse.json(
      { error: "Could not connect to the Railway API." },
      { status: 502 }
    );
  }
}
