
"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import "./SingleTrain.css";

type UnknownObject = Record<string, unknown>;

type Train = {
  trip_number?: string;
  train_model?: string | number;
  travel_time?: string;
  departure_full_date?: string;
  origin_city_name?: string;
  destination_city_name?: string;
};

type StoredAlternative = {
  route?: { from?: string; to?: string; date?: string };
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

type Combination = {
  from: string;
  to: string;
  fromId?: string;
  toId?: string;
  availableCount: number | null;
  seatClasses: SeatClass[];
  searchStatus?: "available" | "sold" | "unknown";
};

type ApiState = "idle" | "loading" | "success" | "error";
type AlternativeState = "idle" | "searching" | "complete" | "error";

type SearchApiResponse = {
  ok?: boolean;
  error?: string;
  status?: number;
  upstreamStatus?: number;
  data?: unknown;
};

function objectOf(value: unknown): UnknownObject | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownObject)
    : null;
}

function unwrap(value: unknown): unknown {
  let current = value;

  for (let i = 0; i < 6; i += 1) {
    const obj = objectOf(current);
    if (!obj || obj.data === undefined) break;
    current = obj.data;
  }

  return current;
}

function displayName(value?: string | number | null): string {
  if (value === undefined || value === null || value === "") return "—";

  return String(value)
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeName(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

function normalizeJourneyDate(value: string): string {
  const input = value.trim();
  const iso = input.match(/^(\d{4}-\d{2}-\d{2})(?:T.*)?$/);

  if (iso) return iso[1];

  const dmy = input.match(/^(\d{1,2})[- ]([A-Za-z]{3,})[- ](\d{4})$/);

  if (dmy) {
    const months = [
      "jan", "feb", "mar", "apr", "may", "jun",
      "jul", "aug", "sep", "oct", "nov", "dec",
    ];

    const month = months.indexOf(dmy[2].slice(0, 3).toLowerCase());

    if (month >= 0) {
      const day = Number(dmy[1]);
      const year = Number(dmy[3]);
      const parsed = new Date(Date.UTC(year, month, day));

      if (
        parsed.getUTCFullYear() === year &&
        parsed.getUTCMonth() === month &&
        parsed.getUTCDate() === day
      ) {
        return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      }
    }
  }

  return "";
}

function formatDate(value: string): string {
  const date = normalizeJourneyDate(value);
  if (!date) return "Date not provided";

  const parsed = new Date(`${date}T00:00:00`);

  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat("en-BD", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(parsed);
}

function getRailwayModel(...values: Array<string | number | undefined | null>) {
  for (const value of values) {
    if (value === undefined || value === null) continue;

    const text = String(value).trim();
    if (!text) continue;

    const parentheses = text.match(/\((\d+)\)\s*$/);
    if (parentheses) return parentheses[1];

    if (/^\d+$/.test(text)) return text;

    const trailingNumber = text.match(/(?:^|\s)(\d+)\s*$/);
    if (trailingNumber) return trailingNumber[1];
  }

  return "";
}

function getArray(obj: UnknownObject | null, keys: string[]): unknown[] {
  if (!obj) return [];

  for (const key of keys) {
    if (Array.isArray(obj[key])) return obj[key] as unknown[];
  }

  return [];
}

function normalizeStation(
  value: unknown,
  index: number,
): RouteStation | null {
  const obj = objectOf(value);
  if (!obj) return null;

  const city = objectOf(obj.city);

  const name = String(
    obj.station_name ??
      obj.city_name ??
      city?.city_name ??
      city?.name ??
      (typeof obj.city === "string" ? obj.city : "") ??
      obj.location_name ??
      obj.name ??
      "",
  ).trim();

  if (!name) return null;

  const rawId =
    obj.station_id ??
    obj.city_id ??
    city?.city_id ??
    city?.id ??
    obj.location_id ??
    obj.id;

  const sequence = Number(
    obj.city_sequence ??
      obj.station_sequence ??
      obj.sequence ??
      obj.order ??
      index,
  );

  return {
    id: rawId === undefined || rawId === null ? "" : String(rawId),
    name,
    sequence: Number.isFinite(sequence) ? sequence : index,
    arrival: obj.arrival_time ? String(obj.arrival_time) : undefined,
    departure: obj.departure_time ? String(obj.departure_time) : undefined,
  };
}

function normalizeSeat(value: unknown): SeatClass | null {
  const obj = objectOf(value);
  if (!obj) return null;

  const type = String(
    obj.type ?? obj.seat_type ?? obj.class_name ?? obj.name ?? "",
  );

  if (!type) return null;

  const counts = objectOf(obj.seat_counts ?? obj.counts ?? obj.availability);

  const rawCount =
    counts?.online ??
    obj.available_seats ??
    obj.available_count ??
    obj.seats_available;

  const count =
    rawCount === undefined || rawCount === null || rawCount === ""
      ? null
      : Number(rawCount);

  return {
    type,
    online:
      count !== null && Number.isFinite(count) ? Math.max(0, count) : null,
    fare: (obj.fare ?? obj.price) as string | number | undefined,
  };
}

function normalizeCombination(value: unknown): Combination | null {
  const obj = objectOf(value);
  if (!obj) return null;

  const from = String(
    obj.from_station_name ??
      obj.from_city_name ??
      obj.from_name ??
      obj.from ??
      obj.origin ??
      "",
  );

  const to = String(
    obj.to_station_name ??
      obj.to_city_name ??
      obj.to_name ??
      obj.to ??
      obj.destination ??
      "",
  );

  if (!from || !to) return null;

  const seatClasses = getArray(obj, [
    "seat_types",
    "seat_classes",
    "classes",
    "availability",
  ])
    .map(normalizeSeat)
    .filter((seat): seat is SeatClass => Boolean(seat));

  const rawCount =
    obj.available_count ??
    obj.available_seats ??
    obj.online_seats ??
    obj.total_available_seats;

  const count =
    rawCount === undefined || rawCount === null || rawCount === ""
      ? null
      : Number(rawCount);

  const knownCounts = seatClasses
    .map((seat) => seat.online)
    .filter((number): number is number => number !== null);

  const availableCount =
    count !== null && Number.isFinite(count)
      ? Math.max(0, count)
      : knownCounts.length
        ? knownCounts.reduce((sum, number) => sum + number, 0)
        : null;

  return {
    from,
    to,
    fromId: String(obj.from_station_id ?? obj.from_city_id ?? obj.from_id ?? "") || undefined,
    toId: String(obj.to_station_id ?? obj.to_city_id ?? obj.to_id ?? "") || undefined,
    availableCount,
    seatClasses,
  };
}

function extractRouteData(payload: unknown): {
  stations: RouteStation[];
  combinations: Combination[];
} {
  const root = objectOf(unwrap(payload));

  if (!root) return { stations: [], combinations: [] };

  const stations = getArray(root, [
    "stations",
    "route_stations",
    "cities",
    "stops",
    "station_list",
    "routes",
  ])
    .map(normalizeStation)
    .filter((station): station is RouteStation => Boolean(station))
    .sort((a, b) => a.sequence - b.sequence);

  const combinations = getArray(root, [
    "combinations",
    "segments",
    "journeys",
    "results",
    "available_routes",
  ])
    .map(normalizeCombination)
    .filter((item): item is Combination => Boolean(item));

  return { stations, combinations };
}

function extractTrainObjects(payload: unknown): UnknownObject[] {
  const found: UnknownObject[] = [];
  const seen = new Set<unknown>();
  const queue: Array<{ value: unknown; depth: number }> = [
    { value: payload, depth: 0 },
  ];

  while (queue.length) {
    const current = queue.shift()!;
    const { value, depth } = current;

    if (depth > 7 || value === null || value === undefined) continue;
    if (seen.has(value)) continue;

    if (typeof value === "object") seen.add(value);

    if (Array.isArray(value)) {
      for (const item of value) {
        queue.push({ value: item, depth: depth + 1 });
      }
      continue;
    }

    const obj = objectOf(value);
    if (!obj) continue;

    const hasTrainIdentity = [
      "trip_number",
      "train_number",
      "train_model",
      "train_no",
    ].some((key) => obj[key] !== undefined && obj[key] !== null);

    if (hasTrainIdentity) found.push(obj);

    for (const [key, child] of Object.entries(obj)) {
      if (
        child &&
        typeof child === "object" &&
        !["config", "headers"].includes(key)
      ) {
        queue.push({ value: child, depth: depth + 1 });
      }
    }
  }

  return found;
}

function extractAvailability(
  payload: unknown,
  selectedTrainModel: string,
): Combination | null {
  const wanted = getRailwayModel(selectedTrainModel);
  const candidates = extractTrainObjects(payload);

  for (const train of candidates) {
    const ids = [
      train.trip_number,
      train.train_number,
      train.train_model,
      train.train_no,
      train.number,
    ]
      .map((value) => getRailwayModel(value as string | number | undefined))
      .filter(Boolean);

    if (wanted && !ids.includes(wanted)) continue;

    const rawSeats = getArray(train, [
      "seat_types",
      "seat_classes",
      "classes",
    ]);

    const seatClasses = rawSeats
      .map(normalizeSeat)
      .filter((seat): seat is SeatClass => Boolean(seat));

    const counts = seatClasses
      .map((seat) => seat.online)
      .filter((count): count is number => count !== null);

    if (!counts.length) continue;

    const availableCount = counts.reduce((sum, count) => sum + count, 0);

    return {
      from: "",
      to: "",
      availableCount,
      seatClasses,
      searchStatus: availableCount > 0 ? "available" : "sold",
    };
  }

  return null;
}

function seatClassLabel(value: string): string {
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
  if (value === undefined || value === null || value === "") return "Fare not returned";

  const amount = Number(value);

  return Number.isFinite(amount)
    ? new Intl.NumberFormat("en-BD", {
        style: "currency",
        currency: "BDT",
        maximumFractionDigits: 0,
      }).format(amount)
    : String(value);
}

function AlternativeSeatsContent() {
  const params = useParams<{ trainId: string }>();
  const searchParams = useSearchParams();

  const pathTrainId = String(params?.trainId ?? "");
  const queryFrom = searchParams.get("from") ?? "";
  const queryTo = searchParams.get("to") ?? "";
  const queryDate = searchParams.get("date") ?? "";
  const queryRouteId = searchParams.get("routeId") ?? "";

  const [stored, setStored] = useState<StoredAlternative | null>(null);
  const [loadedStored, setLoadedStored] = useState(false);

  const [apiState, setApiState] = useState<ApiState>("idle");
  const [apiMessage, setApiMessage] = useState("");
  const [stations, setStations] = useState<RouteStation[]>([]);
  const [combinations, setCombinations] = useState<Combination[]>([]);

  const [fromFilter, setFromFilter] = useState("all");
  const [toFilter, setToFilter] = useState("all");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [searchText, setSearchText] = useState("");

  const [alternativeState, setAlternativeState] =
    useState<AlternativeState>("idle");
  const [alternativeMessage, setAlternativeMessage] = useState("");
  const [alternativeResults, setAlternativeResults] = useState<Combination[]>([]);
  const [currentCandidate, setCurrentCandidate] = useState("");

  useEffect(() => {
    try {
      const raw =
        sessionStorage.getItem("SeatKoi_alternative_search") ??
        sessionStorage.getItem("railkhoj-alternative-search");

      if (raw) setStored(JSON.parse(raw) as StoredAlternative);
    } catch {
      setStored(null);
    } finally {
      setLoadedStored(true);
    }
  }, []);

  const train = stored?.train;

  const from = displayName(
    queryFrom || stored?.route?.from || train?.origin_city_name,
  );

  const to = displayName(
    queryTo || stored?.route?.to || train?.destination_city_name,
  );

  const date = queryDate || stored?.route?.date || train?.departure_full_date || "";
  const journeyDate = normalizeJourneyDate(date);

  const trainId =
    pathTrainId ||
    String(stored?.trainId ?? train?.trip_number ?? train?.train_model ?? "");

  const trainModel = getRailwayModel(
    train?.trip_number,
    train?.train_model,
    stored?.trainId,
    pathTrainId,
  );

  const loadRouteData = useCallback(async () => {
    if (!trainModel) {
      setApiState("error");
      setApiMessage("Could not determine the Railway train model/number. Return to results and select the train again.");
      return;
    }

    if (!journeyDate) {
      setApiState("error");
      setApiMessage("A valid journey date is required in YYYY-MM-DD format.");
      return;
    }

    setApiState("loading");
    setApiMessage("");
    setAlternativeState("idle");
    setAlternativeResults([]);
    setAlternativeMessage("");

    try {
      const query = new URLSearchParams({
        model: trainModel,
        date: journeyDate,
      });

      if (queryFrom || stored?.route?.from) {
        query.set("from", queryFrom || stored?.route?.from || "");
      }

      if (queryTo || stored?.route?.to) {
        query.set("to", queryTo || stored?.route?.to || "");
      }

      if (queryRouteId) query.set("routeId", queryRouteId);

      const response = await fetch(
        `/api/train-route?${query.toString()}`,
        { cache: "no-store" },
      );

      const payload: unknown = await response.json();
      const envelope = objectOf(payload);

      if (!response.ok || envelope?.ok === false || envelope?.error) {
        throw new Error(
          String(envelope?.error ?? `Route API request failed (${response.status}).`),
        );
      }

      const parsed = extractRouteData(payload);

      setStations(parsed.stations);
      setCombinations(parsed.combinations);

      if (!parsed.stations.length && !parsed.combinations.length) {
        setApiState("error");
        setApiMessage("The Railway API returned no route stations or seat combinations. Verify the train model and journey date.");
        return;
      }

      setApiState("success");

      if (!parsed.combinations.length) {
        setApiMessage("Route loaded. Seat availability must be checked separately for each station pair.");
      }
    } catch (error) {
      setApiState("error");
      setApiMessage(
        error instanceof Error ? error.message : "Could not connect to the route service.",
      );
    }
  }, [
    trainModel,
    journeyDate,
    queryFrom,
    queryTo,
    queryRouteId,
    stored,
  ]);

  useEffect(() => {
    if (loadedStored) void loadRouteData();
  }, [loadedStored, loadRouteData]);

  const filteredCombinations = useMemo(() => {
    const query = searchText.trim().toLocaleLowerCase();

    return combinations.filter((item) => {
      const fromOk =
        fromFilter === "all" ||
        item.fromId === fromFilter ||
        item.from === fromFilter;

      const toOk =
        toFilter === "all" ||
        item.toId === toFilter ||
        item.to === toFilter;

      const availableOk =
        !availableOnly ||
        (item.availableCount !== null && item.availableCount > 0);

      const searchOk =
        !query ||
        `${item.from} ${item.to} ${item.seatClasses.map((seat) => seat.type).join(" ")}`
          .toLocaleLowerCase()
          .includes(query);

      return fromOk && toOk && availableOk && searchOk;
    });
  }, [combinations, fromFilter, toFilter, availableOnly, searchText]);

  const availableCount = combinations.filter(
    (item) => item.availableCount !== null && item.availableCount > 0,
  ).length;

  const soldCount = combinations.filter(
    (item) => item.availableCount === 0,
  ).length;

  const runFirstWaySearch = useCallback(async () => {
    setAlternativeState("searching");
    setAlternativeResults([]);
    setAlternativeMessage("");
    setCurrentCandidate("");

    try {
      if (!stations.length) {
        throw new Error("The route has no stations to search.");
      }

      const fromIndex = stations.findIndex(
        (station) => normalizeName(station.name) === normalizeName(from),
      );

      const toIndex = stations.findIndex(
        (station) => normalizeName(station.name) === normalizeName(to),
      );

      if (fromIndex < 0 || toIndex < 0 || fromIndex >= toIndex) {
        throw new Error(
          "The starting station and destination could not be matched to the selected train's forward route.",
        );
      }

      const startStation = stations[fromIndex];

      if (
        !startStation.id ||
        startStation.id === startStation.name
      ) {
        throw new Error(
          `The route API did not return a usable station ID for ${startStation.name}. The existing search API requires station IDs.`,
        );
      }

      // Destination-first: Sylhet, Maijgaon, Kulaura, ... in route order.
      const candidates = stations
        .slice(fromIndex + 1, toIndex + 1)
        .reverse();

      const checked: Combination[] = [];
      let foundAvailable = false;

      for (const candidate of candidates) {
        if (!candidate.id || candidate.id === candidate.name) {
          checked.push({
            from: startStation.name,
            to: candidate.name,
            fromId: startStation.id,
            toId: candidate.id || undefined,
            availableCount: null,
            seatClasses: [],
            searchStatus: "unknown",
          });
          continue;
        }

        setCurrentCandidate(`${startStation.name} → ${candidate.name}`);

        const response = await fetch("/api/search-trips", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            from_city_id: startStation.id,
            to_city_id: candidate.id,
            from_city: startStation.name,
            to_city: candidate.name,
            date_of_journey: journeyDate,
          }),
        });

        const payload = (await response.json()) as SearchApiResponse;

        if (
          !response.ok ||
          payload.ok === false ||
          Boolean(payload.error)
        ) {
          checked.push({
            from: startStation.name,
            to: candidate.name,
            fromId: startStation.id,
            toId: candidate.id,
            availableCount: null,
            seatClasses: [],
            searchStatus: "unknown",
          });
          continue;
        }

        // Only trust a result when the response contains the selected train
        // and actual seat counts. Missing counts are not treated as sold out.
        const availability = extractAvailability(
          payload.data ?? payload,
          trainModel,
        );

        if (!availability) {
          checked.push({
            from: startStation.name,
            to: candidate.name,
            fromId: startStation.id,
            toId: candidate.id,
            availableCount: null,
            seatClasses: [],
            searchStatus: "unknown",
          });
          continue;
        }

        const result: Combination = {
          ...availability,
          from: startStation.name,
          to: candidate.name,
          fromId: startStation.id,
          toId: candidate.id,
        };

        checked.push(result);

        if (
          result.availableCount !== null &&
          result.availableCount > 0
        ) {
          foundAvailable = true;
          break;
        }
      }

      setAlternativeResults(checked);
      setAlternativeState("complete");
      setCurrentCandidate("");

      if (foundAvailable) {
        setAlternativeMessage(
          "An alternative with seats was reported. Confirm the final availability before booking.",
        );
      } else if (checked.some((item) => item.searchStatus === "unknown")) {
        setAlternativeMessage(
          "Some station pairs could not be confirmed because the search response did not contain a matching train and usable seat counts. These are unknown, not confirmed sold out.",
        );
      } else {
        setAlternativeMessage(
          "No available seats were returned for the checked destinations on this train.",
        );
      }
    } catch (error) {
      setAlternativeState("error");
      setAlternativeMessage(
        error instanceof Error
          ? error.message
          : "Alternative search failed.",
      );
      setCurrentCandidate("");
    }
  }, [stations, from, to, journeyDate, trainModel]);

  if (!loadedStored) {
    return (
      <main className="rk-alt rk-alt--loading">
        <div className="rk-alt__loading-card">
          <span className="rk-alt__spinner" />
          Loading selected train…
        </div>
      </main>
    );
  }

  return (
    <main className="rk-alt">
      <header className="rk-alt__header">
        <Link href="/search" className="rk-alt__brand" aria-label="RailKhoj home">
          <span className="rk-alt__brand-mark" aria-hidden="true">▤</span>
          <span>
            <strong>RailKhoj</strong>
            <small>Bangladesh Railway</small>
          </span>
        </Link>

        <Link href="/search/results" className="rk-alt__back">
          ← Back to train results
        </Link>
      </header>

      <section className="rk-alt__hero">
        <div className="rk-alt__hero-top">
          <div>
            <span className="rk-alt__eyebrow">ALTERNATIVE SEAT FINDER</span>
            <h1>Find an alternative destination</h1>
            <p>Keep your starting station and search earlier stops on this train.</p>
          </div>

          <div className="rk-alt__train-chip">
            <span aria-hidden="true">▤</span>
            <div>
              <small>SELECTED TRAIN</small>
              <strong>{displayName(train?.trip_number || `Train ${trainId || "—"}`)}</strong>
              <em>Model: {trainModel || "—"}</em>
            </div>
          </div>
        </div>

        <div className="rk-alt__route-summary">
          <div>
            <span>STARTING STATION</span>
            <strong>{from}</strong>
            <small>Keep this station fixed</small>
          </div>
          <span className="rk-alt__route-arrow" aria-hidden="true">→</span>
          <div>
            <span>DESTINATION</span>
            <strong>{to}</strong>
            <small>Try earlier stops if needed</small>
          </div>
          <div className="rk-alt__date">
            <span>JOURNEY DATE</span>
            <strong>{formatDate(date)}</strong>
            <small>{train?.travel_time || "Selected journey"}</small>
          </div>
        </div>
      </section>

      <section className="rk-alt__content">
        <div className="rk-alt__content-heading">
          <div>
            <h2>Complete train route</h2>
            <p>Stations are loaded from the route API in journey order.</p>
          </div>
          <button
            type="button"
            className="rk-alt__refresh"
            onClick={() => void loadRouteData()}
            disabled={apiState === "loading"}
          >
            ↻ {apiState === "loading" ? "Refreshing…" : "Refresh route"}
          </button>
        </div>

        {apiState === "loading" && (
          <div className="rk-alt__notice">
            <span className="rk-alt__spinner" />
            Loading route…
          </div>
        )}

        {apiState === "error" && (
          <div className="rk-alt__notice rk-alt__notice--error">
            <strong>Could not load route</strong>
            <p>{apiMessage}</p>
            <button type="button" onClick={() => void loadRouteData()}>
              Try again
            </button>
          </div>
        )}

        {apiState === "success" && apiMessage && (
          <div className="rk-alt__notice rk-alt__notice--info">
            <span aria-hidden="true">ⓘ</span>
            <p>{apiMessage}</p>
          </div>
        )}

        {stations.length > 0 && (
          <div className="rk-alt__route-stations">
            <div className="rk-alt__route-stations-heading">
              <strong>All route stations</strong>
              <span>{stations.length} stops · Start to destination</span>
            </div>

            <div className="rk-alt__route-track">
              {stations.map((station, index) => {
                const first = normalizeName(station.name) === normalizeName(from);
                const last = normalizeName(station.name) === normalizeName(to);

                return (
                  <div
                    className={[
                      "rk-alt__station",
                      first ? "rk-alt__station--start" : "",
                      last ? "rk-alt__station--end" : "",
                    ].filter(Boolean).join(" ")}
                    key={`${station.id || station.name}-${index}`}
                  >
                    <span className="rk-alt__station-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="rk-alt__station-card">
                      <strong>{displayName(station.name)}</strong>
                      <small>
                        {station.departure
                          ? `Dep ${station.departure}`
                          : station.arrival
                            ? `Arr ${station.arrival}`
                            : "Time not returned"}
                      </small>
                      {first && <em>START</em>}
                      {last && <em>DESTINATION</em>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <section className="rk-alt__alternative">
          <div className="rk-alt__alternative-heading">
            <div>
              <span className="rk-alt__eyebrow">WAY 1</span>
              <h2>Search earlier destinations</h2>
              <p>
                Search the original destination first, then move backward
                through the route while keeping the starting station fixed.
              </p>
            </div>
            <button
              type="button"
              className="rk-alt__primary"
              onClick={() => void runFirstWaySearch()}
              disabled={
                apiState !== "success" ||
                alternativeState === "searching" ||
                !stations.length
              }
            >
              {alternativeState === "searching"
                ? "Searching…"
                : "Find alternative seats"}
            </button>
          </div>

          {alternativeState === "searching" && (
            <div className="rk-alt__progress">
              <span className="rk-alt__spinner" />
              <div>
                <strong>Checking station combinations</strong>
                <p>{currentCandidate || "Preparing route stations…"}</p>
              </div>
            </div>
          )}

          {alternativeMessage && (
            <div
              className={`rk-alt__notice ${
                alternativeState === "error"
                  ? "rk-alt__notice--error"
                  : "rk-alt__notice--info"
              }`}
            >
              <p>{alternativeMessage}</p>
            </div>
          )}

          {alternativeResults.length > 0 && (
            <div className="rk-alt__alternative-results">
              <div className="rk-alt__result-caption">
                Checked <strong>{alternativeResults.length}</strong> destination
                {alternativeResults.length === 1 ? "" : "s"}
              </div>

              {alternativeResults.map((item, index) => (
                <article
                  className={`rk-alt__result rk-alt__result--${item.searchStatus || "unknown"}`}
                  key={`${item.from}-${item.to}-${index}`}
                >
                  <div className="rk-alt__result-route">
                    <small>FROM</small>
                    <strong>{item.from}</strong>
                    <span aria-hidden="true">→</span>
                    <small>TO</small>
                    <strong>{item.to}</strong>
                  </div>

                  <div className="rk-alt__result-status">
                    {item.searchStatus === "available" && (
                      <>
                        <strong>{item.availableCount}</strong>
                        <span>seats reported</span>
                        <em>AVAILABLE</em>
                      </>
                    )}
                    {item.searchStatus === "sold" && (
                      <>
                        <strong>0</strong>
                        <span>seats reported</span>
                        <em>SOLD OUT</em>
                      </>
                    )}
                    {item.searchStatus === "unknown" && (
                      <>
                        <strong>—</strong>
                        <span>count not confirmed</span>
                        <em>UNKNOWN</em>
                      </>
                    )}
                  </div>

                  {item.seatClasses.length > 0 && (
                    <div className="rk-alt__classes">
                      {item.seatClasses.map((seat, seatIndex) => (
                        <div
                          className="rk-alt__class"
                          key={`${seat.type}-${seatIndex}`}
                        >
                          <div>
                            <strong>{seatClassLabel(seat.type)}</strong>
                            <small>{seat.type}</small>
                          </div>
                          <strong>
                            {seat.online === null ? "—" : seat.online}
                            <small> seats</small>
                          </strong>
                          <span>{money(seat.fare)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rk-alt__existing">
          <div className="rk-alt__content-heading">
            <div>
              <h2>API-returned station combinations</h2>
              <p>
                These combinations are displayed separately from the
                sequential alternative search.
              </p>
            </div>
          </div>

          <div className="rk-alt__filters">
            <label className="rk-alt__filter">
              <span>FROM STATION</span>
              <select
                value={fromFilter}
                onChange={(event) => setFromFilter(event.target.value)}
              >
                <option value="all">All starting stations</option>
                {stations.map((station, index) => (
                  <option
                    key={`${station.id}-${index}`}
                    value={station.id || station.name}
                  >
                    {station.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="rk-alt__filter">
              <span>TO STATION</span>
              <select
                value={toFilter}
                onChange={(event) => setToFilter(event.target.value)}
              >
                <option value="all">All destination stations</option>
                {stations.map((station, index) => (
                  <option
                    key={`${station.id}-${index}`}
                    value={station.id || station.name}
                  >
                    {station.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="rk-alt__filter rk-alt__filter--search">
              <span>SEARCH</span>
              <input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search station or seat class"
              />
            </label>

            <label className="rk-alt__available-toggle">
              <input
                type="checkbox"
                checked={availableOnly}
                onChange={(event) => setAvailableOnly(event.target.checked)}
              />
              <span className="rk-alt__toggle-ui" />
              <span>Available only</span>
            </label>
          </div>

          {apiState === "success" && combinations.length > 0 && (
            <div className="rk-alt__result-caption">
              <strong>{availableCount}</strong> with seats ·{" "}
              <strong>{soldCount}</strong> sold out ·{" "}
              <strong>{combinations.length}</strong> returned
            </div>
          )}

          {filteredCombinations.length > 0 && (
            <div className="rk-alt__combination-list">
              {filteredCombinations.map((item, index) => (
                <article
                  className="rk-alt__combination"
                  key={`${item.from}-${item.to}-${index}`}
                >
                  <div>
                    <small>{item.from}</small>
                    <span aria-hidden="true">→</span>
                    <strong>{item.to}</strong>
                  </div>
                  <strong>
                    {item.availableCount === null ? "—" : item.availableCount}
                    <small> seats</small>
                  </strong>
                  {item.seatClasses.length > 0 && (
                    <div className="rk-alt__classes">
                      {item.seatClasses.map((seat, seatIndex) => (
                        <div className="rk-alt__class" key={`${seat.type}-${seatIndex}`}>
                          <strong>{seatClassLabel(seat.type)}</strong>
                          <span>
                            {seat.online === null ? "—" : seat.online} seats
                          </span>
                          <span>{money(seat.fare)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}

          {apiState === "success" && combinations.length === 0 && (
            <div className="rk-alt__empty">
              <span aria-hidden="true">⌕</span>
              <h3>No combinations returned by the route API</h3>
              <p>
                The route endpoint returned station information, but no
                station-pair availability. Use the alternative search above
                to check each destination through the existing search API.
              </p>
            </div>
          )}

          {apiState === "success" &&
            combinations.length > 0 &&
            filteredCombinations.length === 0 && (
              <div className="rk-alt__empty">
                <h3>No matching combinations</h3>
                <p>Change the filters or turn off Available only.</p>
                <button
                  type="button"
                  onClick={() => {
                    setFromFilter("all");
                    setToFilter("all");
                    setAvailableOnly(false);
                    setSearchText("");
                  }}
                >
                  Clear filters
                </button>
              </div>
            )}
        </section>

        <p className="rk-alt__footnote">
          Availability can change at any time. A missing seat count is unknown,
          not sold out. Confirm final availability on the official Bangladesh
          Railway booking service.
        </p>
      </section>

      <footer className="rk-alt__footer">
        <strong>RailKhoj</strong>
        <span>Made for easier train journeys in Bangladesh.</span>
      </footer>
    </main>
  );
}

export default function AlternativeSeatsPage() {
  return (
    <Suspense
      fallback={
        <main className="rk-alt rk-alt--loading">
          <div className="rk-alt__loading-card">
            <span className="rk-alt__spinner" />
            Loading selected train…
          </div>
        </main>
      }
    >
      <AlternativeSeatsContent />
    </Suspense>
  );
}
