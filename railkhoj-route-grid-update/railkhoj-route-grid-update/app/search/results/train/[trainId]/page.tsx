"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import "./SingleTrain.css";

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
type RouteStation = { id: string; name: string; sequence: number; arrival?: string; departure?: string; halt?: string; duration?: string };
type SeatClass = { type: string; online: number | null; fare?: string | number };
type Combination = { from: string; to: string; fromId?: string; toId?: string; availableCount: number | null; seatClasses: SeatClass[] };
type ApiState = "loading" | "success" | "error";

function asObject(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? value as Record<string, unknown> : null;
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
  if (value === undefined || value === null || value === "") return "—";
  return String(value).replace(/_/g, " ").replace(/\s+/g, " ").trim();
}
function formatDate(value?: string): string {
  if (!value) return "Date not provided";
  const raw = value.includes("T") ? value.split("T")[0] : value;
  const parsed = new Date(`${raw}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat("en-BD", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }).format(parsed);
}
function stationFrom(value: unknown, index: number): RouteStation | null {
  const obj = asObject(value);
  if (!obj) return null;
  const name = String(obj.station_name ?? obj.city_name ?? obj.city ?? obj.location_name ?? obj.name ?? "").trim();
  if (!name) return null;
  const sequence = Number(obj.city_sequence ?? obj.station_sequence ?? obj.sequence ?? obj.order ?? index);
  return {
    id: String(obj.station_id ?? obj.city_id ?? obj.location_id ?? obj.id ?? name),
    name,
    sequence: Number.isFinite(sequence) ? sequence : index,
    arrival: obj.arrival_time ? String(obj.arrival_time) : undefined,
    departure: obj.departure_time ? String(obj.departure_time) : undefined,
    halt: obj.halt ? String(obj.halt) : undefined,
    duration: obj.duration ? String(obj.duration) : undefined,
  };
}
function seatFrom(value: unknown): SeatClass | null {
  const obj = asObject(value);
  if (!obj) return null;
  const type = String(obj.type ?? obj.seat_type ?? obj.class_name ?? obj.name ?? "");
  if (!type) return null;
  const counts = asObject(obj.seat_counts ?? obj.counts ?? obj.availability);
  const raw = counts?.online ?? obj.available_seats ?? obj.available_count ?? obj.seats_available;
  const count = raw === undefined || raw === null || raw === "" ? null : Number(raw);
  return { type, online: count !== null && Number.isFinite(count) ? Math.max(0, count) : null, fare: (obj.fare ?? obj.price) as string | number | undefined };
}
function combinationFrom(value: unknown): Combination | null {
  const obj = asObject(value);
  if (!obj) return null;
  const from = String(obj.from_station_name ?? obj.from_city_name ?? obj.from_name ?? obj.from ?? obj.origin ?? "");
  const to = String(obj.to_station_name ?? obj.to_city_name ?? obj.to_name ?? obj.to ?? obj.destination ?? "");
  if (!from || !to) return null;
  const rawSeats = obj.seat_types ?? obj.seat_classes ?? obj.classes ?? obj.availability;
  const seatClasses = Array.isArray(rawSeats) ? rawSeats.map(seatFrom).filter((s): s is SeatClass => Boolean(s)) : [];
  const rawCount = obj.available_count ?? obj.available_seats ?? obj.online_seats ?? obj.total_available_seats;
  const count = rawCount === undefined || rawCount === null || rawCount === "" ? null : Number(rawCount);
  const seatCountSum = seatClasses.reduce((sum, seat) => sum + (seat.online ?? 0), 0);
  return {
    from, to,
    fromId: String(obj.from_station_id ?? obj.from_city_id ?? obj.from_id ?? "") || undefined,
    toId: String(obj.to_station_id ?? obj.to_city_id ?? obj.to_id ?? "") || undefined,
    availableCount: count !== null && Number.isFinite(count) ? Math.max(0, count) : seatClasses.some(s => s.online !== null) ? seatCountSum : null,
    seatClasses,
  };
}
function extractData(payload: unknown): { stations: RouteStation[]; combinations: Combination[]; trainName: string } {
  const root = asObject(unwrap(payload));
  if (!root) return { stations: [], combinations: [], trainName: "" };
  const routeArray = [root.routes, root.stations, root.route_stations, root.cities, root.stops, root.station_list].find(Array.isArray) as unknown[] | undefined;
  const comboArray = [root.combinations, root.segments, root.journeys, root.results, root.available_routes].find(Array.isArray) as unknown[] | undefined;
  const stations = (routeArray ?? []).map(stationFrom).filter((s): s is RouteStation => Boolean(s)).sort((a, b) => a.sequence - b.sequence);
  const combinations = (comboArray ?? []).map(combinationFrom).filter((c): c is Combination => Boolean(c));
  return { stations, combinations, trainName: String(root.train_name ?? "") };
}
function classLabel(value: string): string {
  const labels: Record<string, string> = { S_CHAIR: "Shovon Chair", SHOVAN: "Shovon", SNIGDHA: "Snigdha", F_SEAT: "First Seat", F_CHAIR: "First Chair", AC_S: "AC Seat", AC_B: "AC Berth", AC_CHAIR: "AC Chair", F_BERTH: "First Berth" };
  return labels[value] ?? displayName(value);
}
function money(value?: string | number): string {
  if (value === undefined || value === null || value === "") return "Fare not returned";
  const n = Number(value);
  return Number.isFinite(n) ? new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT", maximumFractionDigits: 0 }).format(n) : String(value);
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
  const [apiState, setApiState] = useState<ApiState>("loading");
  const [apiMessage, setApiMessage] = useState("");
  const [stations, setStations] = useState<RouteStation[]>([]);
  const [combinations, setCombinations] = useState<Combination[]>([]);
  const [fromFilter, setFromFilter] = useState("all");
  const [toFilter, setToFilter] = useState("all");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("SeatKoi_alternative_search") ?? sessionStorage.getItem("railkhoj-alternative-search");
      if (raw) setStored(JSON.parse(raw) as StoredAlternative);
    } catch { setStored(null); }
    finally { setLoadedStored(true); }
  }, []);

  const train = stored?.train;
  const from = displayName(queryFrom || stored?.route?.from || train?.origin_city_name);
  const to = displayName(queryTo || stored?.route?.to || train?.destination_city_name);
  const date = queryDate || stored?.route?.date || train?.departure_full_date || "";
  const trainId = pathTrainId || String(stored?.trainId ?? train?.trip_number ?? train?.train_model ?? "");
  const trainModel = String(train?.trip_number ?? train?.train_model ?? stored?.trainId ?? pathTrainId ?? "");

  const loadRouteData = useCallback(async () => {
    if (!trainId) {
      setApiState("error");
      setApiMessage("Train ID is missing. Return to train results and open a train again.");
      return;
    }
    setApiState("loading");
    setApiMessage("");
    try {
      const query = new URLSearchParams({ model: trainModel || trainId });
      if (queryFrom || stored?.route?.from) query.set("from", queryFrom || stored?.route?.from || "");
      if (queryTo || stored?.route?.to) query.set("to", queryTo || stored?.route?.to || "");
      if (date) query.set("date", date);
      if (queryRouteId) query.set("routeId", queryRouteId);
      const response = await fetch(`/api/train-route?${query.toString()}`, { cache: "no-store" });
      const payload: unknown = await response.json();
      const envelope = asObject(payload);
      if (!response.ok || envelope?.ok === false || envelope?.error) throw new Error(String(envelope?.error ?? `Route API request failed (${response.status}).`));
      const parsed = extractData(payload);
      setStations(parsed.stations);
      setCombinations(parsed.combinations);
      if (!parsed.stations.length && !parsed.combinations.length) {
        setApiState("error");
        setApiMessage("The API returned an empty route. Check that the API receives the Railway train model (for example, 769), not only the local page ID.");
        return;
      }
      setApiState("success");
      if (!parsed.combinations.length) setApiMessage("Route stations loaded. The route API does not return seat counts; those require a separate availability request for each station pair.");
    } catch (error) {
      setApiState("error");
      setApiMessage(error instanceof Error ? error.message : "Could not connect to the route service.");
    }
  }, [trainId, trainModel, queryFrom, queryTo, queryRouteId, date, stored]);

  useEffect(() => { if (loadedStored) void loadRouteData(); }, [loadedStored, loadRouteData]);

  const filteredCombinations = useMemo(() => {
    const query = searchText.trim().toLocaleLowerCase();
    return combinations.filter(item => {
      const fromOk = fromFilter === "all" || item.fromId === fromFilter || item.from === fromFilter;
      const toOk = toFilter === "all" || item.toId === toFilter || item.to === toFilter;
      const availableOk = !availableOnly || (item.availableCount !== null && item.availableCount > 0);
      const textOk = !query || `${item.from} ${item.to} ${item.seatClasses.map(s => s.type).join(" ")}`.toLocaleLowerCase().includes(query);
      return fromOk && toOk && availableOk && textOk;
    });
  }, [combinations, fromFilter, toFilter, availableOnly, searchText]);

  const availableCount = combinations.filter(c => c.availableCount !== null && c.availableCount > 0).length;
  const soldOutCount = combinations.filter(c => c.availableCount === 0).length;

  if (!loadedStored) return <main className="rk-alt rk-alt--loading"><div className="rk-alt__loading-card"><span className="rk-alt__loading-spinner" />Loading selected train…</div></main>;

  return (
    <main className="rk-alt">
      <header className="rk-alt__header">
        <Link href="/search" className="rk-alt__brand" aria-label="RailKhoj home">
          <span className="rk-alt__brand-mark" aria-hidden="true">▤</span><span><strong>RailKhoj</strong><small>Bangladesh Railway</small></span>
        </Link>
        <Link href="/search/results" className="rk-alt__back"><span aria-hidden="true">←</span> Back to train results</Link>
      </header>

      <section className="rk-alt__hero">
        <div className="rk-alt__hero-top">
          <div><span className="rk-alt__eyebrow">ALTERNATIVE SEAT FINDER</span><h1>Find seats along this train route</h1><p>Compare station-to-station journeys and focus on the number of seats available.</p></div>
          <div className="rk-alt__train-chip"><span className="rk-alt__train-chip-icon" aria-hidden="true">▤</span><span><small>SELECTED TRAIN</small><strong>{displayName(train?.trip_number || trainModel || `Train ${trainId || "—"}`)}</strong><em>Train model: {trainModel || trainId || "—"}</em></span></div>
        </div>
        <div className="rk-alt__route-summary">
          <div><span>SEARCH ROUTE</span><strong>{from}</strong><small>Starting station</small></div><span className="rk-alt__route-arrow" aria-hidden="true">○ ⟶ ○</span>
          <div><span>DESTINATION</span><strong>{to}</strong><small>Destination station</small></div><div className="rk-alt__date"><span>JOURNEY DATE</span><strong>{formatDate(date)}</strong><small>{train?.travel_time ? `Direct journey · ${train.travel_time}` : "Selected journey"}</small></div>
        </div>
      </section>

      <section className="rk-alt__stats" aria-label="Availability summary">
        <article className="rk-alt__stat"><span className="rk-alt__stat-icon rk-alt__stat-icon--green">✓</span><div><strong>{apiState === "success" && combinations.length ? availableCount : "—"}</strong><span>Station combinations with seats</span></div></article>
        <article className="rk-alt__stat"><span className="rk-alt__stat-icon rk-alt__stat-icon--red">×</span><div><strong>{apiState === "success" && combinations.length ? soldOutCount : "—"}</strong><span>Combinations sold out</span></div></article>
        <article className="rk-alt__stat"><span className="rk-alt__stat-icon rk-alt__stat-icon--neutral">↔</span><div><strong>{apiState === "success" && combinations.length ? combinations.length : "—"}</strong><span>Seat results returned by API</span></div></article>
      </section>

      <section className="rk-alt__content">
        <div className="rk-alt__content-heading"><div><h2>Route stations & seat availability</h2><p>First confirm the train's full route, then check seats for station pairs.</p></div><button type="button" className="rk-alt__refresh" onClick={() => void loadRouteData()} disabled={apiState === "loading"}><span aria-hidden="true">↻</span>{apiState === "loading" ? "Refreshing…" : "Refresh route"}</button></div>
        {apiState === "loading" && <div className="rk-alt__notice rk-alt__notice--loading" role="status"><span className="rk-alt__spinner" />Loading train route…</div>}
        {apiState === "error" && <div className="rk-alt__notice rk-alt__notice--error"><strong>Could not load train route</strong><p>{apiMessage}</p><button type="button" onClick={() => void loadRouteData()}>Try again</button></div>}
        {apiState === "success" && apiMessage && <div className="rk-alt__notice rk-alt__notice--info"><span aria-hidden="true">ⓘ</span><p>{apiMessage}</p></div>}

        {stations.length > 0 && <div className="rk-alt__route-stations"><div className="rk-alt__route-stations-heading"><strong>Train route</strong><span>{stations.length} stations received from the API</span></div><ol className="rk-alt__station-track" aria-label="Train route stations">{stations.map((station, index) => <li className={`rk-alt__station-stop ${index === 0 ? "is-first" : ""} ${index === stations.length - 1 ? "is-last" : ""}`} key={`${station.id}-${index}`}><span className="rk-alt__station-node" aria-hidden="true" /><span className="rk-alt__station-name" title={displayName(station.name)}>{displayName(station.name)}</span><span className="rk-alt__station-time">{station.departure || station.arrival || ""}</span></li>)}</ol></div>}

        <div className="rk-alt__filters">
          <label className="rk-alt__filter"><span>FROM STATION</span><select value={fromFilter} onChange={e => setFromFilter(e.target.value)}><option value="all">All starting stations</option>{stations.map(s => <option key={s.id} value={s.id}>{displayName(s.name)}</option>)}</select></label>
          <label className="rk-alt__filter"><span>TO STATION</span><select value={toFilter} onChange={e => setToFilter(e.target.value)}><option value="all">All destination stations</option>{stations.map(s => <option key={s.id} value={s.id}>{displayName(s.name)}</option>)}</select></label>
          <label className="rk-alt__filter rk-alt__filter--search"><span>SEARCH RESULTS</span><input value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="Search station or seat class" /></label>
          <label className="rk-alt__available-toggle"><input type="checkbox" checked={availableOnly} onChange={e => setAvailableOnly(e.target.checked)} /><span className="rk-alt__toggle-ui" /><span>Available only</span></label>
        </div>

        {apiState === "success" && combinations.length > 0 && <div className="rk-alt__result-caption">Showing <strong>{filteredCombinations.length}</strong> of <strong>{combinations.length}</strong> seat combinations returned by the API</div>}
        {apiState === "success" && filteredCombinations.length > 0 && <div className="rk-alt__combination-list">{filteredCombinations.map((item, index) => {
          const hasSeats = item.availableCount !== null && item.availableCount > 0;
          const sold = item.availableCount === 0;
          const status = hasSeats ? "available" : sold ? "sold" : "unknown";
          return <article className={`rk-alt__combination rk-alt__combination--${status}`} key={`${item.from}-${item.to}-${index}`}>
            <div className="rk-alt__combination-route"><div className="rk-alt__combination-station"><small>FROM</small><strong>{displayName(item.from)}</strong></div><div className="rk-alt__combination-line"><span /> <i aria-hidden="true">→</i> <span /></div><div className="rk-alt__combination-station rk-alt__combination-station--end"><small>TO</small><strong>{displayName(item.to)}</strong></div></div>
            <div className="rk-alt__combination-availability"><strong>{item.availableCount === null ? "—" : item.availableCount}</strong><span>{hasSeats ? "seats available" : sold ? "seats available" : "count not reported"}</span></div><span className={`rk-alt__status rk-alt__status--${status}`}>{hasSeats ? "SEATS AVAILABLE" : sold ? "NO SEATS" : "NOT REPORTED"}</span>
            {item.seatClasses.length > 0 && <div className="rk-alt__classes">{item.seatClasses.map((seat, i) => <div className={`rk-alt__class ${seat.online === null ? "rk-alt__class--unknown" : seat.online > 0 ? "rk-alt__class--available" : "rk-alt__class--sold"}`} key={`${seat.type}-${i}`}><div><strong>{classLabel(seat.type)}</strong><small>{seat.type}</small></div><strong className="rk-alt__class-count">{seat.online === null ? "—" : seat.online}<small>{seat.online === 1 ? "seat" : "seats"}</small></strong><span>{money(seat.fare)}</span></div>)}</div>}
          </article>;
        })}</div>}
        {apiState === "success" && combinations.length === 0 && <div className="rk-alt__empty"><span aria-hidden="true">⌕</span><h3>Route loaded — seat counts not returned</h3><p>The current <code>train-routes</code> response only contains station names and timings. To find tickets, the app must call the seat-availability/search API for each valid station pair and read the returned seat-class counts.</p></div>}
        {apiState === "success" && combinations.length > 0 && filteredCombinations.length === 0 && <div className="rk-alt__empty"><span aria-hidden="true">⌕</span><h3>No matching combinations</h3><p>Change the filters or turn off “Available only”.</p><button type="button" onClick={() => { setFromFilter("all"); setToFilter("all"); setAvailableOnly(false); setSearchText(""); }}>Clear filters</button></div>}
        <div className="rk-alt__footnote"><span aria-hidden="true">ⓘ</span><p>Seat availability can change at any time. A zero count means the API reported no online seats for that station pair at the time of the response. Confirm final availability on the official Bangladesh Railway booking service.</p></div>
      </section>
      <footer className="rk-alt__footer"><strong>RailKhoj</strong><span>Made for easier train journeys in Bangladesh.</span></footer>
    </main>
  );
}

function LoadingFallback() {
  return <main className="rk-alt rk-alt--loading"><div className="rk-alt__loading-card"><div className="rk-alt__loading-brand"><span className="rk-alt__loading-logo">▤</span><div><p className="rk-alt__loading-eyebrow">RAILKHOJ</p><h1>Preparing your journey</h1></div></div><div className="rk-alt__loading-progress"><span /></div><div className="rk-alt__loading-route"><div className="rk-alt__loading-station"><span className="rk-alt__loading-dot" /><div><span className="rk-alt__loading-label">DEPARTURE</span><span className="rk-alt__loading-placeholder rk-alt__loading-placeholder--station" /></div></div><div className="rk-alt__loading-track"><span className="rk-alt__loading-track-line" /><span className="rk-alt__loading-train">▤</span></div><div className="rk-alt__loading-station rk-alt__loading-station--end"><span className="rk-alt__loading-dot" /><div><span className="rk-alt__loading-label">DESTINATION</span><span className="rk-alt__loading-placeholder rk-alt__loading-placeholder--station" /></div></div></div><div className="rk-alt__loading-divider" /><div className="rk-alt__loading-section"><div className="rk-alt__loading-heading"><span className="rk-alt__loading-placeholder rk-alt__loading-placeholder--heading" /><span className="rk-alt__loading-badge">Loading</span></div><div className="rk-alt__loading-skeleton-list">{[1, 2, 3, 4].map(n => <div className="rk-alt__loading-skeleton-row" key={n}><span className="rk-alt__loading-placeholder rk-alt__loading-placeholder--number" /><span className="rk-alt__loading-placeholder rk-alt__loading-placeholder--text" /><span className="rk-alt__loading-placeholder rk-alt__loading-placeholder--time" /></div>)}</div></div><div className="rk-alt__loading-status" role="status" aria-live="polite"><span className="rk-alt__loading-spinner" /><span>Loading train route and checking journey details…</span></div></div><p className="rk-alt__loading-footer"><span className="rk-alt__loading-footer-dot" />Making your train journey easier across Bangladesh.</p></main>;
}

export default function SingleTrainPage() {
  return <Suspense fallback={<LoadingFallback />}><AlternativeSeatsContent /></Suspense>;
}
