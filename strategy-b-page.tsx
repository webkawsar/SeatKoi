"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import railwayData from "@/data/railway-data.json";
import "../../../train/[trainId]/SingleTrain.css";

type Train = {
  trip_number?: string;
  train_model?: string | number;
  travel_time?: string;
  departure_full_date?: string;
  departure_date_time?: string;
  origin_city_name?: string;
  destination_city_name?: string;
};

type StoredSearch = {
  route?: { from?: string; to?: string; date?: string; seatClass?: string };
  data?: unknown;
  train?: Train;
};

type StoredAlternative = {
  route?: { from?: string; to?: string; date?: string; seatClass?: string };
  train?: Train;
  trainId?: string | number;
  train_id?: string | number;
};

type RailwayCity = {
  city_id: number;
  city_name: string;
  is_enable_for_from?: number;
};

type RouteStation = {
  id: string;
  cityId?: number;
  name: string;
  sequence: number;
  arrival?: string;
  departure?: string;
  halt?: string;
  duration?: string;
};

type SeatClass = { type: string; online: number | null; fare?: string | number };
type ResultStatus = "pending" | "loading" | "available" | "sold" | "unknown" | "error";

type AvailabilityResult = {
  fromStation: RouteStation;
  station: RouteStation;
  status: ResultStatus;
  availableCount: number | null;
  seatClasses: SeatClass[];
  message?: string;
};

type ApiState = "loading" | "success" | "error";
type UserCredentials = { token: string; deviceId: string; deviceKey: string };

const cities = (railwayData as { cities: RailwayCity[] }).cities;

function asObject(value: unknown): Record<string, any> | null {
  return value !== null && typeof value === "object" ? (value as Record<string, any>) : null;
}

function normalizeName(value: unknown): string {
  return String(value ?? "").replace(/_/g, " ").replace(/\s+/g, " ").trim().toLocaleLowerCase();
}

function displayName(value?: string | number | null): string {
  if (value === undefined || value === null || value === "") return "—";
  return String(value).replace(/_/g, " ").replace(/\s+/g, " ").trim();
}

function formatDate(value?: string): string {
  if (!value) return "Date not provided";
  const raw = value.includes("T") ? value.split("T")[0] : value;
  const parsed = new Date(`${raw}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat("en-BD", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(parsed);
}

function getCity(name: string): RailwayCity | undefined {
  const normalized = normalizeName(name);
  return cities.find((city) => normalizeName(city.city_name) === normalized);
}

function getTrainModel(train: Train | undefined, routeTrainId: string): string {
  if (train?.train_model !== undefined && train.train_model !== null) {
    return String(train.train_model);
  }
  const value = String(train?.trip_number ?? routeTrainId);
  const match = value.match(/\((\d+)\)/) ?? value.match(/\d+/);
  return match ? match[1] : routeTrainId;
}

function getRouteStations(payload: unknown): { stations: RouteStation[]; trainName: string } {
  const outer = asObject(payload);
  const envelope = asObject(outer?.data);
  const data = asObject(envelope?.data) ?? envelope ?? outer;
  const rawRoutes = Array.isArray(data?.routes) ? data.routes : [];

  const stations = rawRoutes
    .map((item: unknown, index: number) => {
      const row = asObject(item);
      if (!row?.city) return null;
      const name = String(row.city);
      const city = getCity(name);
      return {
        id: `${city?.city_id ?? normalizeName(name)}-${index}`,
        cityId: city?.city_id,
        name,
        sequence: index,
        arrival: row.arrival_time ? String(row.arrival_time) : undefined,
        departure: row.departure_time ? String(row.departure_time) : undefined,
        halt: row.halt ? String(row.halt) : undefined,
        duration: row.duration ? String(row.duration) : undefined,
      } satisfies RouteStation;
    })
    .filter((station: RouteStation | null): station is RouteStation => Boolean(station));

  return { stations, trainName: String(data?.train_name ?? "") };
}

function findTrainList(payload: unknown): Record<string, any>[] {
  const queue: unknown[] = [payload];
  const seen = new Set<unknown>();

  while (queue.length) {
    const current = queue.shift();
    if (!current || seen.has(current)) continue;
    seen.add(current);
    const obj = asObject(current);
    if (!obj) continue;
    if (Array.isArray(obj.trains)) {
      return obj.trains.map(asObject).filter(Boolean) as Record<string, any>[];
    }
    for (const value of Object.values(obj)) {
      if (value && typeof value === "object") queue.push(value);
    }
  }
  return [];
}

function getSeatClasses(train: Record<string, any>): SeatClass[] {
  const rows = Array.isArray(train.seat_types)
    ? train.seat_types
    : Array.isArray(train.seat_classes)
      ? train.seat_classes
      : [];

  return rows
    .map((row: unknown) => {
      const item = asObject(row);
      if (!item?.type) return null;
      const counts = asObject(item.seat_counts);
      const raw = counts?.online ?? item.available_seats ?? item.available_count;
      const count = raw === undefined || raw === null || raw === "" ? null : Number(raw);
      return {
        type: String(item.type),
        online: count !== null && Number.isFinite(count) ? Math.max(0, count) : null,
        fare: item.fare,
      } satisfies SeatClass;
    })
    .filter((item: SeatClass | null): item is SeatClass => Boolean(item));
}

// Match by train_model/model first. Segment-specific trip_id values are not reliable identifiers.
function trainMatches(item: Record<string, any>, model: string): boolean {
  const itemModel = String(item.train_model ?? item.model ?? "");
  if (itemModel) return itemModel === model;

  const tripNumber = String(item.trip_number ?? item.train_name ?? "");
  return tripNumber.includes(`(${model})`) || tripNumber === model;
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
  const pageTrainId = String(params?.trainId ?? "");
  const queryFrom = searchParams.get("from") ?? "";
  const queryTo = searchParams.get("to") ?? "";
  const queryDate = searchParams.get("date") ?? "";

  const [storedSearch, setStoredSearch] = useState<StoredSearch | null>(null);
  const [storedAlternative, setStoredAlternative] = useState<StoredAlternative | null>(null);
  const [storageReady, setStorageReady] = useState(false);
  const [routeState, setRouteState] = useState<ApiState>("loading");
  const [routeMessage, setRouteMessage] = useState("");
  const [stations, setStations] = useState<RouteStation[]>([]);
  const [results, setResults] = useState<AvailabilityResult[]>([]);
  const [completed, setCompleted] = useState(0);
  const [totalRequests, setTotalRequests] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    try {
      const searchRaw = sessionStorage.getItem("SeatKoi_search_result");
      const alternativeRaw = sessionStorage.getItem("SeatKoi_alternative_search");
      if (searchRaw) setStoredSearch(JSON.parse(searchRaw) as StoredSearch);
      if (alternativeRaw) setStoredAlternative(JSON.parse(alternativeRaw) as StoredAlternative);
    } catch (error) {
      console.error("Could not read saved train search:", error);
    } finally {
      setStorageReady(true);
    }
  }, []);

  const train = storedAlternative?.train;
  const from = displayName(
    queryFrom || storedAlternative?.route?.from || storedSearch?.route?.from || train?.origin_city_name
  );
  const to = displayName(
    queryTo || storedAlternative?.route?.to || storedSearch?.route?.to || train?.destination_city_name
  );
  const date =
    queryDate ||
    storedAlternative?.route?.date ||
    storedSearch?.route?.date ||
    train?.departure_full_date ||
    "";
  const model = getTrainModel(train, pageTrainId);
  const trainName = displayName(train?.trip_number || `Train ${model}`);

  const loadRouteAndAvailability = useCallback(async () => {
    if (!date || !model) {
      setRouteState("error");
      setRouteMessage(
        "Selected train model or journey date was not found in session storage. Please open this page from the train search results."
      );
      return;
    }

    setRouteState("loading");
    setRouteMessage("");
    setStations([]);
    setResults([]);
    setCompleted(0);
    setTotalRequests(0);

    try {
      const storedData = sessionStorage.getItem("SeatKoi_user_credentials");
      const credentials: UserCredentials | null = storedData ? JSON.parse(storedData) : null;

      const routeResponse = await fetch("/api/train-route", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        cache: "no-store",
        body: JSON.stringify({ model, date, credentials }),
      });

      const routePayload: unknown = await routeResponse.json();
      const routeEnvelope = asObject(routePayload);
      if (!routeResponse.ok || routeEnvelope?.ok === false) {
        throw new Error(
          String(routeEnvelope?.error ?? `Train route request failed (${routeResponse.status}).`)
        );
      }

      const parsed = getRouteStations(routePayload);
      if (!parsed.stations.length) throw new Error("Train route API returned no stations.");
      setStations(parsed.stations);
      setRouteState("success");

      // Strategy B: query every forward pair (station i -> every station j where j > i).
      const pairs: Array<{ fromStation: RouteStation; toStation: RouteStation }> = [];
      for (let i = 0; i < parsed.stations.length - 1; i += 1) {
        for (let j = i + 1; j < parsed.stations.length; j += 1) {
          pairs.push({ fromStation: parsed.stations[i], toStation: parsed.stations[j] });
        }
      }

      const initialResults: AvailabilityResult[] = pairs.map((pair) => {
        const valid = Boolean(pair.fromStation.cityId && pair.toStation.cityId);
        return {
          ...pair,
          status: valid ? "pending" : "error",
          availableCount: null,
          seatClasses: [],
          message: valid
            ? undefined
            : "Station city_id could not be mapped from railway-data.json.",
        };
      });

      setResults(initialResults);
      setTotalRequests(pairs.length);

      const concurrency = 3;
      let nextIndex = 0;

      const worker = async () => {
        while (nextIndex < pairs.length) {
          const currentIndex = nextIndex++;
          const pair = pairs[currentIndex];

          if (!pair.fromStation.cityId || !pair.toStation.cityId) {
            setCompleted((value) => value + 1);
            continue;
          }

          setResults((current) =>
            current.map((item, index) =>
              index === currentIndex ? { ...item, status: "loading" } : item
            )
          );

          try {
            const storedCredentials = sessionStorage.getItem("SeatKoi_user_credentials");
            const requestCredentials: UserCredentials | null = storedCredentials
              ? JSON.parse(storedCredentials)
              : null;

            const response = await fetch("/api/search-trips", {
              method: "POST",
              headers: { "Content-Type": "application/json", Accept: "application/json" },
              cache: "no-store",
              body: JSON.stringify({
                from_city_id: pair.fromStation.cityId,
                to_city_id: pair.toStation.cityId,
                date_of_journey: date,
                credentials: requestCredentials,
              }),
            });

            const payload: unknown = await response.json();
            const envelope = asObject(payload);
            if (!response.ok || envelope?.error) {
              throw new Error(
                String(envelope?.error ?? `Search request failed (${response.status}).`)
              );
            }

            const trains = findTrainList(payload);
            const matchingTrain = trains.find((item) => trainMatches(item, model));

            if (!matchingTrain) {
              setResults((current) =>
                current.map((item, index) =>
                  index === currentIndex
                    ? {
                        ...item,
                        status: "unknown",
                        availableCount: null,
                        seatClasses: [],
                        message: trains.length
                          ? "This train was not returned for this station pair."
                          : "No train data returned for this station pair.",
                      }
                    : item
                )
              );
            } else {
              const seatClasses = getSeatClasses(matchingTrain);
              const knownCounts = seatClasses
                .map((seat) => seat.online)
                .filter((count): count is number => count !== null);
              const availableCount = knownCounts.length
                ? knownCounts.reduce((sum, count) => sum + count, 0)
                : null;

              setResults((current) =>
                current.map((item, index) =>
                  index === currentIndex
                    ? {
                        ...item,
                        status:
                          availableCount === null
                            ? "unknown"
                            : availableCount > 0
                              ? "available"
                              : "sold",
                        availableCount,
                        seatClasses,
                        message:
                          availableCount === null
                            ? "The API did not return online seat counts."
                            : undefined,
                      }
                    : item
                )
              );
            }
          } catch (error) {
            setResults((current) =>
              current.map((item, index) =>
                index === currentIndex
                  ? {
                      ...item,
                      status: "error",
                      message:
                        error instanceof Error
                          ? error.message
                          : "Availability request failed.",
                    }
                  : item
              )
            );
          } finally {
            setCompleted((value) => value + 1);
          }
        }
      };

      await Promise.all(
        Array.from({ length: Math.min(concurrency, pairs.length) }, () => worker())
      );
    } catch (error) {
      setRouteState("error");
      setRouteMessage(error instanceof Error ? error.message : "Could not load train route.");
    }
  }, [date, model, refreshKey]);

  useEffect(() => {
    if (storageReady) void loadRouteAndAvailability();
  }, [storageReady, loadRouteAndAvailability]);

  const availableCount = useMemo(
    () => results.filter((item) => item.status === "available").length,
    [results]
  );
  const soldCount = useMemo(
    () => results.filter((item) => item.status === "sold").length,
    [results]
  );
  const progress = totalRequests ? Math.round((completed / totalRequests) * 100) : 0;

  if (!storageReady) {
    return (
      <main className="rk-alt rk-alt--loading">
        <div className="rk-alt__loading-card">
          <span className="rk-alt__loading-spinner" /> Loading selected train…
        </div>
      </main>
    );
  }

  return (
    <main className="rk-alt">
      <header className="rk-alt__header">
        <Link href="/search" className="rk-alt__brand" aria-label="SeatKoi home">
          <span className="rk-alt__brand-mark" aria-hidden="true">▤</span>
          <span><strong>SeatKoi</strong><small>Bangladesh Railway</small></span>
        </Link>
        <Link href="/search/results" className="rk-alt__back">
          <span aria-hidden="true">←</span> Back to train results
        </Link>
      </header>

      <section className="rk-alt__hero">
        <div className="rk-alt__hero-top">
          <div>
            <span className="rk-alt__eyebrow">STRATEGY B · ALL STATION COMBINATIONS</span>
            <h1>Complete train route</h1>
            <p>Check seat availability between every possible forward station pair on this train.</p>
          </div>
          <div className="rk-alt__train-chip">
            <span className="rk-alt__train-chip-icon" aria-hidden="true">▤</span>
            <span><small>TRAIN</small><strong>{trainName}</strong><em>Train model: {model || "—"}</em></span>
          </div>
        </div>
        <div className="rk-alt__route-summary">
          <div><span>STARTING STATION</span><strong>{from}</strong><small>Original search origin</small></div>
          <div><span>ORIGINAL DESTINATION</span><strong>{to}</strong><small>Original search destination</small></div>
          <div className="rk-alt__date">
            <span>JOURNEY DATE</span><strong>{formatDate(date)}</strong>
            <small>{train?.travel_time ? `Journey · ${train.travel_time}` : "Selected journey"}</small>
          </div>
        </div>
      </section>

      <section className="rk-alt__stats" aria-label="Availability summary">
        <article className="rk-alt__stat">
          <span className="rk-alt__stat-icon rk-alt__stat-icon--green">✓</span>
          <div><strong>{availableCount}</strong><span>Station pairs with seats</span></div>
        </article>
        <article className="rk-alt__stat">
          <span className="rk-alt__stat-icon rk-alt__stat-icon--red">×</span>
          <div><strong>{soldCount}</strong><span>Station pairs with no seats</span></div>
        </article>
        <article className="rk-alt__stat">
          <span className="rk-alt__stat-icon rk-alt__stat-icon--neutral">↔</span>
          <div><strong>{completed}/{totalRequests}</strong><span>Requests completed</span></div>
        </article>
      </section>

      <section className="rk-alt__content">
        <div className="rk-alt__content-heading">
          <div>
            <h2>All forward station combinations</h2>
            <p>Every station is paired with all stations that follow it on the route.</p>
          </div>
          <button
            type="button"
            className="rk-alt__refresh"
            onClick={() => setRefreshKey((value) => value + 1)}
            disabled={routeState === "loading" || (totalRequests > 0 && completed < totalRequests)}
          >
            <span aria-hidden="true">↻</span> Refresh search
          </button>
        </div>

        {routeState === "loading" && (
          <div className="rk-alt__notice rk-alt__notice--loading" role="status">
            <span className="rk-alt__spinner" /> Loading train route and preparing station pairs…
          </div>
        )}
        {routeState === "error" && (
          <div className="rk-alt__notice rk-alt__notice--error">
            <strong>Could not load train route</strong>
            <p>{routeMessage}</p>
            <button type="button" onClick={() => setRefreshKey((value) => value + 1)}>Try again</button>
          </div>
        )}
        {routeMessage && routeState === "success" && (
          <div className="rk-alt__notice rk-alt__notice--info"><span aria-hidden="true">ⓘ</span><p>{routeMessage}</p></div>
        )}

        {stations.length > 0 && (
          <section className="rk-alt__route-stations" aria-label="Complete train route">
            <div className="rk-alt__route-stations-heading">
              <div><strong>Complete train route</strong><p>Station order and timings received from Railway API</p></div>
              <span>{stations.length} stations · {totalRequests || (stations.length * (stations.length - 1)) / 2} possible pairs</span>
            </div>
            <ol className="rk-alt__route-map rk-alt__route-map--list">
              {stations.map((station, index) => (
                <li
                  className={`rk-alt__station-stop ${index === 0 ? "is-first" : ""} ${index === stations.length - 1 ? "is-last" : ""}`}
                  key={`${station.id}-${index}`}
                >
                  <div className="head" style={{ display: "flex", width: "100%", alignItems: "center" }}>
                    <span className="rk-alt__station-node" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                    <span className="rk-alt__station-name" style={{ margin: "0 0 0 10px" }}>{displayName(station.name)}</span>
                  </div>
                  <span className="rk-alt__station-time">
                    {station.arrival ? `Arr ${station.arrival}` : ""}
                    {station.arrival && station.departure ? " · " : ""}
                    {station.departure ? `Dep ${station.departure}` : ""}
                    {!station.arrival && !station.departure ? "Time unavailable" : ""}
                  </span>
                  {(index === 0 || index === stations.length - 1) && (
                    <span className="rk-alt__station-tag" style={{ position: "absolute", top: "10px", right: "10px" }}>
                      {index === 0 ? "START" : "DESTINATION"}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </section>
        )}

        {totalRequests > 0 && (
          <div className="rk-alt__notice rk-alt__notice--info" role="status">
            <div style={{ width: "100%" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                <strong>{completed === totalRequests ? "Availability checking completed" : "Checking seat availability…"}</strong>
                <span>{completed} of {totalRequests} requests</span>
              </div>
              <div style={{ height: 8, borderRadius: 99, background: "#dcebe5", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${progress}%`, background: "#07966f", transition: "width .2s ease" }} />
              </div>
            </div>
          </div>
        )}

        {results.length > 0 && (
          <div className="rk-alt__combination-list">
            {results.map((item, index) => {
              const status =
                item.status === "available" ? "available" :
                item.status === "sold" ? "sold" : "unknown";

              return (
                <article
                  className={`rk-alt__combination rk-alt__combination--${status}`}
                  key={`${item.fromStation.id}-${item.station.id}-${index}`}
                >
                  <div className="rk-alt__combination-route">
                    <div className="rk-alt__combination-station">
                      <small>FROM</small><strong>{displayName(item.fromStation.name)}</strong>
                    </div>
                    <div className="rk-alt__combination-line"><span /><i aria-hidden="true">→</i><span /></div>
                    <div className="rk-alt__combination-station rk-alt__combination-station--end">
                      <small>TO</small><strong>{displayName(item.station.name)}</strong>
                    </div>
                  </div>

                  <div className="rk-alt__combination-availability">
                    <strong>
                      {item.status === "loading" || item.status === "pending"
                        ? "…"
                        : item.availableCount === null ? "—" : item.availableCount}
                    </strong>
                    <span>
                      {item.status === "available" || item.status === "sold"
                        ? "seats available"
                        : item.status === "loading" || item.status === "pending"
                          ? "checking availability"
                          : "availability unknown"}
                    </span>
                  </div>

                  <span className={`rk-alt__status rk-alt__status--${status}`}>
                    {item.status === "available" ? "SEATS AVAILABLE" :
                      item.status === "sold" ? "NO SEATS" :
                      item.status === "loading" ? "CHECKING" :
                      item.status === "pending" ? "QUEUED" :
                      item.status === "error" ? "REQUEST FAILED" : "NOT REPORTED"}
                  </span>

                  {item.seatClasses.length > 0 && (
                    <div className="rk-alt__classes">
                      {item.seatClasses.map((seat, seatIndex) => (
                        <div
                          className={`rk-alt__class ${seat.online === null ? "rk-alt__class--unknown" : seat.online > 0 ? "rk-alt__class--available" : "rk-alt__class--sold"}`}
                          key={`${seat.type}-${seatIndex}`}
                        >
                          <div><strong>{classLabel(seat.type)}</strong><small>{seat.type}</small></div>
                          <strong className="rk-alt__class-count">
                            {seat.online === null ? "—" : seat.online}
                            <small>{seat.online === 1 ? "seat" : "seats"}</small>
                          </strong>
                          <span>{money(seat.fare)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {item.message && <p className="rk-alt__result-message">{item.message}</p>}
                </article>
              );
            })}
          </div>
        )}

        {routeState === "success" && stations.length > 0 && totalRequests === 0 && (
          <div className="rk-alt__empty">
            <h3>No station combinations found</h3>
            <p>The route API must return at least 2 stations to create forward station pairs.</p>
          </div>
        )}

        <div className="rk-alt__footnote">
          <span aria-hidden="true">ⓘ</span>
          <p>Seat availability can change at any time. A missing train or seat count means availability is unknown, not sold out. Confirm final availability on the official Bangladesh Railway booking service.</p>
        </div>
      </section>

      <footer className="rk-alt__footer"><strong>SeatKoi</strong><span>Made for easier train journeys in Bangladesh.</span></footer>
    </main>
  );
}

function LoadingFallback() {
  return (
    <main className="rk-alt rk-alt--loading">
      <div className="rk-alt__loading-card"><span className="rk-alt__loading-spinner" /> Preparing Strategy B station combinations…</div>
    </main>
  );
}

export default function StrategyBTrainPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AlternativeSeatsContent />
    </Suspense>
  );
}
