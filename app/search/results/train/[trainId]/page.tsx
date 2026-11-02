"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import "./SingleTrain.css";

/* ----------------------------------------
   Types
---------------------------------------- */

type Train = {
  trip_number?: string;
  train_model?: string | number;
  travel_time?: string;
  departure_full_date?: string;
  origin_city_name?: string;
  destination_city_name?: string;
};

type StoredAlternative = {
  route?: {
    from?: string;
    to?: string;
    date?: string;
  };
  train?: Train;
  trainId?: string | number;
};

type RouteStation = {
  id: string;
  name: string;
  sequence: number;
  arrival?: string;
  departure?: string;
};

type SeatClass = {
  type: string;
  online: number | null;
  fare?: string | number;
};

type AvailabilityResult = {
  status: "pending" | "available" | "sold" | "unknown" | "error";
  availableCount: number | null;
  seatClasses: SeatClass[];
  message?: string;
};

type ApiState = "loading" | "success" | "error";

/* ----------------------------------------
   Helpers
---------------------------------------- */

function asObject(value: unknown): Record<string, any> | null {
  return value !== null && typeof value === "object"
    ? (value as Record<string, any>)
    : null;
}

function unwrap(value: unknown): unknown {
  let current = value;

  for (let i = 0; i < 6; i++) {
    const obj = asObject(current);

    if (!obj || obj.data === undefined) break;

    current = obj.data;
  }

  return current;
}

function displayName(value?: string | number | null): string {
  if (value === undefined || value === null || value === "") {
    return "—";
  }

  return String(value)
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDate(value?: string): string {
  if (!value) return "";

  const date = value.includes("T")
    ? value.split("T")[0]
    : value;

  return /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? date
    : "";
}

function formatDate(value?: string): string {
  if (!value) return "Date not provided";

  const raw = normalizeDate(value);

  if (!raw) return value;

  const parsed = new Date(`${raw}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("en-BD", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function formatTime(station: RouteStation): string {
  return station.departure || station.arrival || "";
}

function stationFrom(
  value: unknown,
  index: number
): RouteStation | null {
  const obj = asObject(value);

  if (!obj) return null;

  const name = String(
    obj.station_name ??
    obj.city_name ??
    obj.city ??
    obj.location_name ??
    obj.name ??
    ""
  ).trim();

  if (!name) return null;

  const sequence = Number(
    obj.city_sequence ??
    obj.station_sequence ??
    obj.sequence ??
    obj.order ??
    index
  );

  return {
    id: String(
      obj.city_id ??
      obj.station_id ??
      obj.location_id ??
      obj.id ??
      name
    ),
    name,
    sequence: Number.isFinite(sequence) ? sequence : index,
    arrival: obj.arrival_time
      ? String(obj.arrival_time)
      : undefined,
    departure: obj.departure_time
      ? String(obj.departure_time)
      : undefined,
  };
}

function extractStations(payload: unknown): RouteStation[] {
  const root = asObject(unwrap(payload));

  if (!root) return [];

  const routeArray = [
    root.routes,
    root.stations,
    root.route_stations,
    root.cities,
    root.stops,
    root.station_list,
  ].find(Array.isArray) as unknown[] | undefined;

  return (routeArray ?? [])
    .map(stationFrom)
    .filter((station): station is RouteStation => Boolean(station))
    .sort((a, b) => a.sequence - b.sequence);
}

/* ----------------------------------------
   Shohoz API response parsing
---------------------------------------- */

function findTrainRecords(
  value: unknown,
  output: Record<string, any>[] = [],
  depth = 0
): Record<string, any>[] {
  if (depth > 9 || value === null || value === undefined) {
    return output;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      findTrainRecords(item, output, depth + 1);
    }

    return output;
  }

  const obj = asObject(value);

  if (!obj) return output;

  const hasTrainIdentifier =
    obj.train_model !== undefined ||
    obj.train_number !== undefined ||
    obj.trip_number !== undefined;

  if (
    hasTrainIdentifier &&
    (
      Array.isArray(obj.seat_types) ||
      Array.isArray(obj.seat_classes) ||
      obj.route_id !== undefined
    )
  ) {
    output.push(obj);
  }

  for (const [key, child] of Object.entries(obj)) {
    if (
      child &&
      typeof child === "object" &&
      key !== "meta"
    ) {
      findTrainRecords(child, output, depth + 1);
    }
  }

  return output;
}

function seatFrom(value: unknown): SeatClass | null {
  const obj = asObject(value);

  if (!obj) return null;

  const type = String(
    obj.type ??
    obj.seat_type ??
    obj.class_name ??
    obj.name ??
    ""
  );

  if (!type) return null;

  const counts = asObject(
    obj.seat_counts ??
    obj.counts ??
    obj.availability
  );

  const raw =
    counts?.online ??
    obj.available_seats ??
    obj.available_count ??
    obj.seats_available;

  const count =
    raw === undefined || raw === null || raw === ""
      ? null
      : Number(raw);

  return {
    type,
    online:
      count !== null && Number.isFinite(count)
        ? Math.max(0, count)
        : null,
    fare: obj.fare ?? obj.price,
  };
}

function classLabel(value: string): string {
  const labels: Record<string, string> = {
    S_CHAIR: "Shovon Chair",
    SHOVAN: "Shovon",
    SNIGDHA: "Snigdha",
    F_SEAT: "First Seat",
    F_CHAIR: "First Chair",
    AC_S: "AC Seat",
    AC_B: "AC Berth",
    AC_CHAIR: "AC Chair",
    F_BERTH: "First Berth",
  };

  return labels[value] ?? displayName(value);
}

function money(value?: string | number): string {
  if (value === undefined || value === null || value === "") {
    return "Fare not returned";
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? new Intl.NumberFormat("en-BD", {
        style: "currency",
        currency: "BDT",
        maximumFractionDigits: 0,
      }).format(number)
    : String(value);
}

function getTrainModel(record: Record<string, any>): string {
  return String(
    record.train_model ??
    record.train_number ??
    ""
  );
}

function extractSingleTrainAvailability(
  payload: unknown,
  expectedModel: string
): {
  availableCount: number | null;
  seatClasses: SeatClass[];
} | null {
  const records = findTrainRecords(payload);

  const expected = String(expectedModel).trim();

  const matchingTrain = records.find((record) => {
    return getTrainModel(record).trim() === expected;
  });

  if (!matchingTrain) return null;

  const rawSeats =
    matchingTrain.seat_types ??
    matchingTrain.seat_classes ??
    [];

  const seatClasses = Array.isArray(rawSeats)
    ? rawSeats
        .map(seatFrom)
        .filter((seat): seat is SeatClass => Boolean(seat))
    : [];

  const rawCount =
    matchingTrain.available_count ??
    matchingTrain.available_seats ??
    matchingTrain.online_seats ??
    matchingTrain.total_available_seats;

  const total = seatClasses.reduce(
    (sum, seat) => sum + (seat.online ?? 0),
    0
  );

  const availableCount =
    rawCount !== undefined &&
    rawCount !== null &&
    rawCount !== ""
      ? Number(rawCount)
      : seatClasses.some((seat) => seat.online !== null)
        ? total
        : null;

  return {
    availableCount:
      availableCount !== null &&
      Number.isFinite(availableCount)
        ? Math.max(0, availableCount)
        : null,
    seatClasses,
  };
}

/* ----------------------------------------
   Main Single Train Page
---------------------------------------- */

function AlternativeSeatsContent() {
  const params = useParams<{ trainId: string }>();
  const searchParams = useSearchParams();

  const pathTrainId = String(params?.trainId ?? "");

  const queryFrom = searchParams.get("from") ?? "";
  const queryTo = searchParams.get("to") ?? "";
  const queryDate = searchParams.get("date") ?? "";
  const queryRouteId = searchParams.get("routeId") ?? "";

  const queryModel =
    searchParams.get("trainModel") ??
    searchParams.get("model") ??
    "";

  const [stored, setStored] =
    useState<StoredAlternative | null>(null);

  const [loadedStored, setLoadedStored] = useState(false);

  const [apiState, setApiState] =
    useState<ApiState>("loading");

  const [apiMessage, setApiMessage] = useState("");

  const [stations, setStations] =
    useState<RouteStation[]>([]);

  const [availability, setAvailability] =
    useState<Record<string, AvailabilityResult>>({});

  const [completedRequests, setCompletedRequests] =
    useState(0);

  const [totalRequests, setTotalRequests] =
    useState(0);

  const [isChecking, setIsChecking] = useState(false);

  /* ----------------------------------------
     Read existing sessionStorage
  ---------------------------------------- */

  useEffect(() => {
    try {
      const raw =
        sessionStorage.getItem("SeatKoi_alternative_search") ??
        sessionStorage.getItem("SeatKoi_alternative_search");

      if (raw) {
        setStored(JSON.parse(raw) as StoredAlternative);
      }
    } catch {
      setStored(null);
    } finally {
      setLoadedStored(true);
    }
  }, []);

  const train = stored?.train;

  const from = displayName(
    queryFrom ||
    stored?.route?.from ||
    train?.origin_city_name
  );

  const to = displayName(
    queryTo ||
    stored?.route?.to ||
    train?.destination_city_name
  );

  const date =
    queryDate ||
    stored?.route?.date ||
    train?.departure_full_date ||
    "";

  const trainId =
    pathTrainId ||
    String(stored?.trainId ?? "");

  // Railway train_model is preferred over the local page ID.
  const trainModel = String(
    queryModel ||
    train?.train_model ||
    stored?.trainId ||
    pathTrainId ||
    ""
  );

  const trainName = displayName(
    train?.trip_number || `Train ${trainId}`
  );

  /* ----------------------------------------
     Strategy A: Availability Search

     Starting station remains fixed.
     Destinations are searched backwards
     from the final station.
  ---------------------------------------- */

  const runAvailabilitySearch = useCallback(
    async (routeStations: RouteStation[]) => {
      if (routeStations.length < 2) {
        setApiMessage("Not enough route stations to search availability.");
        return;
      }

      const journeyDate = normalizeDate(date);

      if (!journeyDate) {
        setApiMessage(
          "Journey date is missing or invalid. Please provide YYYY-MM-DD in the page URL."
        );
        return;
      }

      const startingStation = routeStations[0];

      /*
       * Strategy A:
       *
       * Dhaka → Sylhet
       * Dhaka → Maijgaon
       * Dhaka → Kulaura
       * Dhaka → Bhanugach
       * Dhaka → Sreemangal
       *
       * Reverse destination order.
       */

      const destinations = routeStations
        .slice(1)
        .reverse();

      const initialResults: Record<string, AvailabilityResult> = {};

      for (const station of destinations) {
        initialResults[station.id] = {
          status: "pending",
          availableCount: null,
          seatClasses: [],
        };
      }

      setAvailability(initialResults);
      setCompletedRequests(0);
      setTotalRequests(destinations.length);
      setIsChecking(true);

      let completed = 0;
      let nextIndex = 0;

      // Maximum 3 simultaneous API requests.
      const CONCURRENCY = 3;

      const worker = async () => {
        while (nextIndex < destinations.length) {
          const currentIndex = nextIndex++;
          const destination = destinations[currentIndex];

          try {
            const fromCityId = Number(startingStation.id);
            const toCityId = Number(destination.id);

            if (
              !Number.isInteger(fromCityId) ||
              !Number.isInteger(toCityId)
            ) {
              throw new Error(
                "Station ID is not a valid city_id. Check the train-route API response."
              );
            }

            if (fromCityId === toCityId) {
              throw new Error("Starting and destination stations are identical.");
            }

            /*
             * Existing API:
             * POST /api/search-trips
             *
             * Do not call Shohoz directly from the browser.
             */

            const response = await fetch("/api/search-trips", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              cache: "no-store",
              body: JSON.stringify({
                from_city_id: fromCityId,
                to_city_id: toCityId,
                date_of_journey: journeyDate,
              }),
            });

            const payload: unknown = await response.json();

            const envelope = asObject(payload);

            if (!response.ok || envelope?.error) {
              throw new Error(
                String(
                  envelope?.error ??
                  `Availability request failed (${response.status}).`
                )
              );
            }

            /*
             * Filter only the selected train.
             */

            const result = extractSingleTrainAvailability(
              payload,
              trainModel
            );

            if (!result) {
              setAvailability((previous) => ({
                ...previous,
                [destination.id]: {
                  status: "unknown",
                  availableCount: null,
                  seatClasses: [],
                  message: "Selected train not found in API response.",
                },
              }));
            } else {
              const status =
                result.availableCount === null
                  ? "unknown"
                  : result.availableCount > 0
                    ? "available"
                    : "sold";

              /*
               * Update UI immediately when this
               * individual API request completes.
               */

              setAvailability((previous) => ({
                ...previous,
                [destination.id]: {
                  status,
                  availableCount: result.availableCount,
                  seatClasses: result.seatClasses,
                },
              }));
            }
          } catch (error) {
            setAvailability((previous) => ({
              ...previous,
              [destination.id]: {
                status: "error",
                availableCount: null,
                seatClasses: [],
                message:
                  error instanceof Error
                    ? error.message
                    : "Availability request failed.",
              },
            }));
          } finally {
            completed += 1;
            setCompletedRequests(completed);
          }
        }
      };

      await Promise.all(
        Array.from(
          {
            length: Math.min(CONCURRENCY, destinations.length),
          },
          () => worker()
        )
      );

      setIsChecking(false);
    },
    [date, trainModel]
  );

  /* ----------------------------------------
     Load Route API
  ---------------------------------------- */

  const loadRouteData = useCallback(async () => {
    if (!trainId) {
      setApiState("error");
      setApiMessage("Train ID is missing.");
      return;
    }

    setApiState("loading");
    setApiMessage("");
    setStations([]);
    setAvailability({});
    setCompletedRequests(0);
    setTotalRequests(0);

    try {
      const query = new URLSearchParams({
        model: trainId,
      });

      if (queryFrom || stored?.route?.from) {
        query.set(
          "from",
          queryFrom || stored?.route?.from || ""
        );
      }

      if (queryTo || stored?.route?.to) {
        query.set(
          "to",
          queryTo || stored?.route?.to || ""
        );
      }

      if (date) {
        query.set("date", date);
      }

      if (queryRouteId) {
        query.set("routeId", queryRouteId);
      }

      const response = await fetch(
        `/api/train-route?${query.toString()}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const payload: unknown = await response.json();

      const envelope = asObject(payload);

      if (
        !response.ok ||
        envelope?.ok === false ||
        envelope?.error
      ) {
        throw new Error(
          String(
            envelope?.error ??
            `Route API request failed (${response.status}).`
          )
        );
      }

      const routeStations = extractStations(payload);

      if (routeStations.length < 2) {
        throw new Error(
          "The route API did not return enough stations."
        );
      }

      /*
       * Show route immediately.
       * Availability requests run afterwards.
       */

      setStations(routeStations);
      setApiState("success");

      /*
       * Start Strategy A automatically.
       */

      void runAvailabilitySearch(routeStations);

    } catch (error) {
      setApiState("error");

      setApiMessage(
        error instanceof Error
          ? error.message
          : "Could not load train route."
      );

      setIsChecking(false);
    }
  }, [
    trainId,
    trainModel,
    queryFrom,
    queryTo,
    queryRouteId,
    date,
    stored,
    runAvailabilitySearch,
  ]);

  useEffect(() => {
    if (loadedStored) {
      void loadRouteData();
    }
  }, [loadedStored, loadRouteData]);

  /* ----------------------------------------
     Summary
  ---------------------------------------- */

  const availableCount = Object.values(availability).filter(
    (item) => item.status === "available"
  ).length;

  const soldCount = Object.values(availability).filter(
    (item) => item.status === "sold"
  ).length;

  const failedCount = Object.values(availability).filter(
    (item) => item.status === "error"
  ).length;

  const destinationStations = stations.slice(1);

  if (!loadedStored) {
    return (
      <main className="rk-alt rk-alt--loading">
        <div className="rk-alt__loading-card">
          <span className="rk-alt__loading-spinner" />
          Loading selected train…
        </div>
      </main>
    );
  }

  /* ----------------------------------------
     UI
  ---------------------------------------- */

  return (
    <main className="rk-alt">

      {/* Header */}

      <header className="rk-alt__header">
        <Link
          href="/search"
          className="rk-alt__brand"
          aria-label="RailKhoj home"
        >
          <span className="rk-alt__brand-mark">▤</span>

          <span>
            <strong>RailKhoj</strong>
            <small>Bangladesh Railway</small>
          </span>
        </Link>

        <Link
          href="/search/results"
          className="rk-alt__back"
        >
          <span>←</span>
          Back to train results
        </Link>
      </header>

      {/* Train Information */}

      <section className="rk-alt__hero">

        <div className="rk-alt__hero-top">
          <div>
            <span className="rk-alt__eyebrow">
              SINGLE TRAIN SEAT AVAILABILITY
            </span>

            <h1>{trainName}</h1>

            <p>
              Explore available seats from your starting
              station to every intermediate station.
            </p>
          </div>

          <div className="rk-alt__train-chip">
            <span className="rk-alt__train-chip-icon">
              ▤
            </span>

            <span>
              <small>SELECTED TRAIN</small>
              <strong>{trainName}</strong>
              <em>Train model: {trainModel}</em>
            </span>
          </div>
        </div>

        <div className="rk-alt__route-summary">

          <div>
            <span>STARTING STATION</span>
            <strong>{from}</strong>
            <small>Fixed starting point</small>
          </div>

          <span className="rk-alt__route-arrow">
            ○ ⟶ ○
          </span>

          <div>
            <span>DESTINATION</span>
            <strong>{to}</strong>
            <small>Original destination</small>
          </div>

          <div className="rk-alt__date">
            <span>JOURNEY DATE</span>
            <strong>{formatDate(date)}</strong>
            <small>
              {train?.travel_time
                ? `Journey · ${train.travel_time}`
                : "Selected journey"}
            </small>
          </div>

        </div>
      </section>

      {/* Availability Summary */}

      <section className="rk-alt__stats">

        <article className="rk-alt__stat">
          <span className="rk-alt__stat-icon rk-alt__stat-icon--green">
            ✓
          </span>

          <div>
            <strong>{availableCount}</strong>
            <span>Station combinations with seats</span>
          </div>
        </article>

        <article className="rk-alt__stat">
          <span className="rk-alt__stat-icon rk-alt__stat-icon--red">
            ×
          </span>

          <div>
            <strong>{soldCount}</strong>
            <span>Combinations sold out</span>
          </div>
        </article>

        <article className="rk-alt__stat">
          <span className="rk-alt__stat-icon rk-alt__stat-icon--neutral">
            ↔
          </span>

          <div>
            <strong>
              {completedRequests}/{totalRequests}
            </strong>
            <span>Availability requests completed</span>
          </div>
        </article>

      </section>

      {/* Main Route Section */}

      <section className="rk-alt__content">

        <div className="rk-alt__content-heading">

          <div>
            <h2>Complete train route</h2>

            <p>
              Follow every stop and check seat availability
              from {from} to each station.
            </p>
          </div>

          <button
            type="button"
            className="rk-alt__refresh"
            onClick={() => void loadRouteData()}
            disabled={apiState === "loading" || isChecking}
          >
            <span>↻</span>
            {apiState === "loading" || isChecking
              ? "Checking…"
              : "Refresh route"}
          </button>

        </div>

        {/* Route Loading */}

        {apiState === "loading" && (
          <div className="rk-alt__notice rk-alt__notice--loading">
            <span className="rk-alt__spinner" />
            Loading complete train route…
          </div>
        )}

        {/* Route Error */}

        {apiState === "error" && (
          <div className="rk-alt__notice rk-alt__notice--error">
            <strong>Could not load train route</strong>

            <p>{apiMessage}</p>

            <button
              type="button"
              onClick={() => void loadRouteData()}
            >
              Try again
            </button>
          </div>
        )}

        {/* Route Progress */}

        {apiState === "success" && (
          <>
            <div className="rk-alt__progress">
              <div className="rk-alt__progress-info">
                <strong>
                  {isChecking
                    ? "Checking seat availability"
                    : "Availability checking completed"}
                </strong>

                <span>
                  {completedRequests} of {totalRequests} requests
                </span>
              </div>

              <div className="rk-alt__progress-track">
                <span
                  style={{
                    width:
                      totalRequests > 0
                        ? `${(completedRequests / totalRequests) * 100}%`
                        : "0%",
                  }}
                />
              </div>
            </div>

            {/* Complete Station List */}

            <div className="rk-alt__route-stations">

              <div className="rk-alt__route-stations-heading">
                <strong>Train route & seat availability</strong>

                <span>
                  {stations.length} stations received from API
                </span>
              </div>

              {/* Starting Station */}

              <div className="rk-alt__starting-station">
                <div className="rk-alt__station-number">
                  01
                </div>

                <div className="rk-alt__starting-info">
                  <span>STARTING STATION</span>

                  <strong>
                    {displayName(stations[0]?.name)}
                  </strong>

                  <small>
                    {formatTime(stations[0]) || "Departure time not available"}
                  </small>
                </div>

                <span className="rk-alt__starting-badge">
                  START
                </span>
              </div>

              <div className="rk-alt__station-grid">

                {destinationStations.map((station, index) => {
                  const result = availability[station.id];

                  const status = result?.status ?? "pending";

                  return (
                    <article
                      className={`rk-alt__station-card rk-alt__station-card--${status}`}
                      key={`${station.id}-${index}`}
                    >

                      {/* Station Heading */}

                      <div className="rk-alt__station-card-top">

                        <span className="rk-alt__station-number">
                          {String(index + 2).padStart(2, "0")}
                        </span>

                        <span
                          className={`rk-alt__station-badge rk-alt__station-badge--${status}`}
                        >
                          {status === "pending" && "Checking"}
                          {status === "available" && "Available"}
                          {status === "sold" && "Sold out"}
                          {status === "unknown" && "Unknown"}
                          {status === "error" && "Failed"}
                        </span>

                      </div>

                      {/* Station Information */}

                      <div className="rk-alt__station-info">

                        <strong title={displayName(station.name)}>
                          {displayName(station.name)}
                        </strong>

                        <span>
                          {formatTime(station) || "Time not available"}
                        </span>

                      </div>

                      {/* Journey Pair */}

                      <div className="rk-alt__station-journey">

                        <div>
                          <small>FROM</small>
                          <strong>{from}</strong>
                        </div>

                        <span>→</span>

                        <div>
                          <small>TO</small>
                          <strong>{displayName(station.name)}</strong>
                        </div>

                      </div>

                      {/* Availability */}

                      <div className="rk-alt__availability">

                        {status === "pending" && (
                          <div className="rk-alt__checking">
                            <span className="rk-alt__spinner" />
                            <span>Checking availability…</span>
                          </div>
                        )}

                        {status === "available" && (
                          <div className="rk-alt__availability-count">
                            <strong>
                              {result.availableCount ?? "—"}
                            </strong>

                            <span>Seats available</span>
                          </div>
                        )}

                        {status === "sold" && (
                          <div className="rk-alt__availability-count rk-alt__availability-count--sold">
                            <strong>0</strong>
                            <span>No seats available</span>
                          </div>
                        )}

                        {status === "unknown" && (
                          <div className="rk-alt__unknown">
                            Seat count not reported
                          </div>
                        )}

                        {status === "error" && (
                          <div className="rk-alt__error-text">
                            {result.message || "Request failed"}
                          </div>
                        )}

                      </div>

                      {/* Seat Classes */}

                      {result?.seatClasses &&
                        result.seatClasses.length > 0 && (
                          <div className="rk-alt__classes">

                            {result.seatClasses.map((seat, seatIndex) => {

                              const seatStatus =
                                seat.online === null
                                  ? "unknown"
                                  : seat.online > 0
                                    ? "available"
                                    : "sold";

                              return (
                                <div
                                  className={`rk-alt__class rk-alt__class--${seatStatus}`}
                                  key={`${seat.type}-${seatIndex}`}
                                >

                                  <div>
                                    <strong>
                                      {classLabel(seat.type)}
                                    </strong>

                                    <small>{seat.type}</small>
                                  </div>

                                  <strong className="rk-alt__class-count">
                                    {seat.online === null
                                      ? "—"
                                      : seat.online}

                                    <small>
                                      {seat.online === 1
                                        ? "seat"
                                        : "seats"}
                                    </small>
                                  </strong>

                                  <span>{money(seat.fare)}</span>

                                </div>
                              );
                            })}

                          </div>
                        )}

                    </article>
                  );
                })}

              </div>

            </div>

            {/* Completion Message */}

            {!isChecking && totalRequests > 0 && (
              <div className="rk-alt__completion">
                <span>✓</span>

                <div>
                  <strong>Availability checking finished</strong>

                  <p>
                    {availableCount} available,
                    {" "}{soldCount} sold out,
                    {" "}{failedCount} failed or unavailable results.
                  </p>
                </div>
              </div>
            )}

            {isChecking && (
              <div className="rk-alt__notice rk-alt__notice--info">
                <span className="rk-alt__spinner" />

                <p>
                  Results are updating automatically as individual
                  API requests complete.
                </p>
              </div>
            )}

          </>
        )}

        <div className="rk-alt__footnote">
          <span>ⓘ</span>

          <p>
            Seat availability can change at any time.
            A missing seat count does not mean sold out.
            Confirm final availability on the official
            Bangladesh Railway booking service.
          </p>
        </div>

      </section>

      <footer className="rk-alt__footer">
        <strong>RailKhoj</strong>

        <span>
          Made for easier train journeys in Bangladesh.
        </span>
      </footer>

    </main>
  );
}

/* ----------------------------------------
   Suspense Fallback
---------------------------------------- */

function LoadingFallback() {
  return (
    <main className="rk-alt rk-alt--loading">
      <div className="rk-alt__loading-card">
        <span className="rk-alt__loading-spinner" />

        <h2>Preparing your journey</h2>

        <p>Loading train information…</p>
      </div>
    </main>
  );
}

/* ----------------------------------------
   Page Export
---------------------------------------- */

export default function SingleTrainPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AlternativeSeatsContent />
    </Suspense>
  );
}