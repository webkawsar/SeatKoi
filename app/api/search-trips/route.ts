
// import { NextResponse } from "next/server";

// const TOKEN = "Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6ImF0K2p3dCJ9.eyJuYmYiOjE3OTMxMTkwMjUsImV4cCI6MTc5MzE2MjIyNSwiaXNzIjoiaHR0cDovL3RyYWluLWlhbS5zaG9ob3ouY29tIiwiYXVkIjoic2hvaG96LmlhbS50cmFpbiIsImNsaWVudF9pZCI6InRyYWluLXRpY2tldC11c2VyIiwiY2xpZW50X3RlbmFudF9pZCI6IjY3YTUxNjNjLTU2NWQtNGNhMC1iMTE3LTg3YzcwMWY2NTRmOSIsImNsaWVudF92ZXJ0aWNhbF9pZCI6IjA2OGU4MDRmLTJkYjctNDQ4OS05OTYzLTc4OWZiN2UwMmJkZiIsInN1YiI6ImEzNzAzZDhhLTQ4ZTktNDJmYi1hNTI1LTJhNzM1ZjZhOTY5YSIsImF1dGhfdGltZSI6MTc5MzExOTAyNSwiaWRwIjoibG9jYWwiLCJwaG9uZV9udW1iZXIiOiIwMTcxNTEwMzYwNiIsImVtYWlsIjoia2F3c2FyYWhtZWQuZGV2QGdtYWlsLmNvbSIsInVzZXJuYW1lIjoiMDE3MTUxMDM2MDYiLCJkaXNwbGF5X25hbWUiOiJLQVdTQVIgQUhNRUQiLCJsb2NhbGUiOiJibi1CRCIsIm5pZG4iOiI3MzUxNjc3NzU3IiwibmlkbnQiOiJOSUQiLCJyb2xlIjpbInVzZXIiLCJhbm9ueW1vdXMiXSwic2NvcGUiOlsic2hvaG96LmlhbS50cmFpbiIsIm9mZmxpbmVfYWNjZXNzIl0sImFtciI6WyJwd2QiXX0.UNKhMZABtG7c4dxMkF6_BaWCO452bDOydIQXYc4mRU3vU0mSXCXWVV7W9iPGDRNgtp9BxjesObYXajtkkQHRBQ97bTO6qEYDrFz9A8lAmZt5R6p36RFKIExDxTvUhqOgD4KXZPddejIV1ynYr8B8mv5ksDK5Q6fzrZQRXp8z_YX1JpJTdabAz83trVpHkX8VYV6uAw38jw9BMAY4qGAn7poy7QWNRccpv-MRQ9G8d331ogRruxSkYZThwjSvTo0JsYzpzHshJgo-cMCwHBZO8cOTjHJoal4tXoL2p9d4vHv5tCRNkOuMuxtt5q5GhlgoV-zsNNIIJPp6ynmDHjiDNw";
// const DEVICE_ID = "ae6c27c17c6fb3ffae4653c2ec6503c6";
// const DEVICE_KEY = "01fb64dbb5224ee9f38551ed33d9f58e24017c810a8e7abb825e0169272533356b3f627108ce6e9cef34105f742cd37e45b34d6e52e972d3a0b0bd3862efeb7e6b4d263dedb2899274e6a3170da5ce22";

// export async function GET() {
//   const params = new URLSearchParams({
//     from_city: "Dhaka",
//     to_city: "Sylhet",
//     date_of_journey: "31-Oct-2026",
//     seat_class: "F_SEAT",
//   });

//   const url =
//     "https://railspaapi.shohoz.com/v1.0/web/bookings/search-trips-v2?" +
//     params.toString();

//   try {
//     const response = await fetch(url, {
//       method: "GET",
//       headers: {
//         Accept: "application/json",
//         Authorization: `Bearer ${TOKEN}`,
//         "x-device-id": DEVICE_ID,
//         "x-device-key": DEVICE_KEY,
//         "x-requested-with": "XMLHttpRequest",
//       },
//       cache: "no-store",
//     });

//     const text = await response.text();

//     let data;
//     try {
//       data = JSON.parse(text);
//     } catch {
//       data = text;
//     }

//     return NextResponse.json(
//       {
//         status: response.status,
//         ok: response.ok,
//         data,
//       },
//       { status: 200 }
//     );
//   } catch (error) {
//     console.error("Railway API error:", error.message);

//     return NextResponse.json(
//       { error: "Could not connect to Railway API" },
//       { status: 502 }
//     );
//   }
// }




import { NextRequest, NextResponse } from "next/server";
import railwayData from "@/data/railway-data.json";

// export const runtime = "nodejs";
// export const dynamic = "force-dynamic";

type RailwayCity = {
  city_id: number;
  city_name: string;
  city_sequence: number;
  is_top_city: boolean;
  is_enable_for_from: number;
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
    const token = process.env.RAILWAY_TOKEN;
    const deviceId = process.env.RAILWAY_DEVICE_ID;
    const deviceKey = process.env.RAILWAY_DEVICE_KEY;

    if (!token || !deviceId || !deviceKey) {
      return NextResponse.json(
        {
          error:
            "Railway API credentials are not configured on the server.",
        },
        { status: 500 }
      );
    }

    const body = await request.json();

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
