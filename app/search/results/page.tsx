"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import "./ResultsPage.css";

const SEARCH_RESULT_STORAGE_KEY = "SeatKoi_search_result";

type SeatCounts = {
  online?: number;
  offline?: number;
  is_divided?: boolean;
};

type SeatType = {
  key: number;
  type: string;
  trip_id: number;
  trip_route_id: number;
  route_id: number;
  fare: string | number;
  vat_percent?: number;
  vat_amount?: number;
  origin_city_seq?: number;
  destination_city_seq?: number;
  seat_counts?: SeatCounts;
};

type BoardingPoint = {
  trip_point_id: number;
  location_id: number;
  location_name: string;
  location_time: string;
  location_date: string;
};

type Train = {
  trip_number: string;
  departure_date_time?: string;
  departure_full_date?: string;
  departure_date_time_jd?: string;
  arrival_date_time?: string;
  travel_time?: string;
  origin_city_name?: string;
  destination_city_name?: string;
  seat_types?: SeatType[];
  train_model?: string;
  is_open_for_all?: boolean;
  boarding_points?: BoardingPoint[];
};

type StoredSearch = {
  route?: {
    from?: string;
    to?: string;
    date?: string;
    seatClass?: string;
  };
  data?: unknown;
  receivedAt?: string;
};

function asObject(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function extractTrains(value: unknown): Train[] {
  // Supports the Railway response itself and the local API wrapper:
  // { data: { trains: [...] } } or { data: { data: { trains: [...] } } }.
  let current: unknown = value;

  for (let depth = 0; depth < 5; depth += 1) {
    const object = asObject(current);
    if (!object) return [];

    const directData = asObject(object.data);
    if (Array.isArray(directData?.trains)) {
      return directData.trains as Train[];
    }
    if (Array.isArray(object.trains)) {
      return object.trains as Train[];
    }

    current = object.data;
  }

  return [];
}

function displayCity(value?: string): string {
  if (!value) return "Station";
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value?: string): string {
  if (!value) return "Date not provided";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("en-BD", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function money(value: string | number | undefined): string {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(amount);
}

function seatLabel(value: string): string {
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

  return labels[value] ?? value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function SeatAvailability({ seat }: { seat: SeatType }) {
  const online = Number(seat.seat_counts?.online ?? 0);
  const isAvailable = online > 0;

  return (
    <div className={`rk-results__seat ${isAvailable ? "rk-results__seat--available" : "rk-results__seat--sold"}`}>
      <div className="rk-results__seat-main">
        <div>
          <strong>{seatLabel(seat.type)}</strong>
          <span className="rk-results__seat-code">{seat.type}</span>
        </div>
        <span className={`rk-results__status ${isAvailable ? "rk-results__status--available" : "rk-results__status--sold"}`}>
          {isAvailable ? "AVAILABLE" : "SOLD OUT"}
        </span>
      </div>

      <div className="rk-results__seat-count-wrap">
        <strong className="rk-results__seat-count">{online}</strong>
        <span className="rk-results__seat-count-label">{online === 1 ? "seat available" : "seats available"}</span>
      </div>

      <div className="rk-results__fare">
        <span className="rk-results__fare-label">Fare</span>
        <strong>{money(seat.fare)}</strong>
        {Number(seat.vat_amount ?? 0) > 0 && (
          <span className="rk-results__vat">+ {money(seat.vat_amount)} VAT</span>
        )}
      </div>

      {seat.seat_counts?.is_divided && (
        <div className="rk-results__seat-meta"><span>Availability may depend on the route segment</span></div>
      )}
    </div>
  );
}

function TrainCard({
  train,
  index,
  route,
}: {
  train: Train;
  index: number;
  route: StoredSearch["route"];
}) {
  const seatTypes = train.seat_types ?? [];
  const availableCount = seatTypes.reduce(
    (total, seat) => total + Math.max(0, Number(seat.seat_counts?.online ?? 0)),
    0
  );
  const availableClasses = seatTypes.filter(
    (seat) => Number(seat.seat_counts?.online ?? 0) > 0
  ).length;
  const boardingPoint = train.boarding_points?.[0];
  const trainId = train.seat_types?.[0]?.trip_id ?? train.train_model ?? train.trip_number;

  function saveAlternativeSearch() {
    try {
      sessionStorage.setItem(
        "SeatKoi_alternative_search",
        JSON.stringify({
          route,
          train,
          trainId,
          requestedAt: new Date().toISOString(),
        })
      );
    } catch {
      // Navigation can still proceed; the destination can show a recovery message.
    }
  }

  return (
    <article className="rk-results__train-card">
      <div className="rk-results__train-heading">
        <div className="rk-results__train-title-wrap">
          <span className="rk-results__train-number">TRAIN {train.train_model ?? index + 1}</span>
          <h2>{train.trip_number || "Train name unavailable"}</h2>
        </div>
        <div className={`rk-results__availability-pill ${availableCount > 0 ? "is-available" : "is-sold"}`}>
          <strong className="rk-results__availability-number">{availableCount}</strong>
          <span className="rk-results__availability-copy">
            <strong>{availableCount > 0 ? "ONLINE SEATS" : "NO SEATS"}</strong>
            <small>{availableClasses} class{availableClasses === 1 ? "" : "es"} available</small>
          </span>
        </div>
      </div>

      <div className="rk-results__journey">
        <div className="rk-results__time-block">
          <strong>{train.departure_date_time?.split(", ").slice(-1)[0] ?? "—"}</strong>
          <span>{displayCity(train.origin_city_name)}</span>
          {boardingPoint?.location_name && (
            <small>{boardingPoint.location_name}</small>
          )}
        </div>

        <div className="rk-results__journey-line">
          <span className="rk-results__journey-duration">{train.travel_time ?? "Duration unavailable"}</span>
          <div className="rk-results__line">
            <span className="rk-results__line-dot" />
            <span className="rk-results__line-track" />
            <span className="rk-results__line-dot" />
          </div>
          <span className="rk-results__journey-caption">Direct journey</span>
        </div>

        <div className="rk-results__time-block rk-results__time-block--end">
          <strong>{train.arrival_date_time?.split(", ").slice(-1)[0] ?? "—"}</strong>
          <span>{displayCity(train.destination_city_name)}</span>
          <small>Destination</small>
        </div>
      </div>

      <div className="rk-results__boarding">
        <span className="rk-results__boarding-icon" aria-hidden="true">⌖</span>
        <span>
          <strong>Boarding point</strong>
          {boardingPoint
            ? `${boardingPoint.location_name} · ${boardingPoint.location_time}`
            : "Check the official ticket details for boarding information"}
        </span>
        <span className="rk-results__date-chip">{formatDate(train.departure_full_date)}</span>
      </div>

      <div className="rk-results__seat-section">
        <div className="rk-results__section-heading">
          <div>
            <h3>Seat availability</h3>
            <p className="rk-results__section-subtitle">Check the available seat count before choosing a class.</p>
          </div>
          <span>{availableCount} online seat{availableCount === 1 ? "" : "s"} total</span>
        </div>

        {seatTypes.length > 0 ? (
          <div className="rk-results__seat-list">
            {seatTypes.map((seat) => (
              <SeatAvailability key={`${seat.trip_id}-${seat.type}`} seat={seat} />
            ))}
          </div>
        ) : (
          <p className="rk-results__no-seats">Seat-class information was not included in the response.</p>
        )}
      </div>

      <div className={`rk-results__alternative ${availableCount === 0 ? "rk-results__alternative--priority" : ""}`}>
        <div className="rk-results__alternative-copy">
          <span className="rk-results__alternative-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 7h6a4 4 0 0 1 4 4v6" />
              <path d="m10 14 4 4 4-4" />
              <path d="M20 7h-2a4 4 0 0 0-4 4" />
            </svg>
          </span>
          <span>
            <strong>{availableCount === 0 ? "No seats on this direct route?" : "Want to check other station combinations?"}</strong>
            <small>Explore availability between stations along this train's route.</small>
          </span>
        </div>
        <Link
          href={`/search/results/train/${train.train_model}`}
          className="rk-results__alternative-button"
          onClick={saveAlternativeSearch}
          aria-label={`Find alternative seats on ${train.trip_number || "this train"}`}
        >
          Find Alternative Seats
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M5 12h14m-6-6 6 6-6 6" />
          </svg>
        </Link>
      </div>
    </article>
  );
}

export default function SearchResultsPage() {
  const [storedSearch, setStoredSearch] = useState<StoredSearch | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SEARCH_RESULT_STORAGE_KEY);
      if (raw) {
        setStoredSearch(JSON.parse(raw) as StoredSearch);
      }
    } catch {
      setStoredSearch(null);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const trains = useMemo(
    () => extractTrains(storedSearch?.data),
    [storedSearch]
  );

  const route = storedSearch?.route;
  const from = displayCity(route?.from ?? trains[0]?.origin_city_name);
  const to = displayCity(route?.to ?? trains[0]?.destination_city_name);
  const journeyDate = route?.date ?? trains[0]?.departure_full_date;

  if (!isLoaded) {
    return (
      <main className="rk-results">
        <div className="rk-results__loading">
          <span className="rk-results__spinner" />
          <p>Loading train results…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="rk-results">
      <header className="rk-results__header">
        <Link href="/search" className="rk-results__brand" aria-label="RailKhoj search">
          <span className="rk-results__brand-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="4" y="3" width="16" height="15" rx="4" />
              <path d="M7 8h10M7 12h10M8 18l-2 3m10-3 2 3M8 15h.01M16 15h.01" />
            </svg>
          </span>
          <span>
            <strong>SeatKoi</strong>
            <small>Bangladesh Railway</small>
          </span>
        </Link>

        <Link href="/search" className="rk-results__edit-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M4 7h16M4 12h10M4 17h7" />
            <path d="m17 14 3 3-3 3" />
          </svg>
          Change search
        </Link>
      </header>

      <section className="rk-results__hero">
        <div className="rk-results__eyebrow">YOUR JOURNEY, SIMPLIFIED</div>
        <h1>Train search results</h1>
        <p>Compare departure times, travel duration, seat classes and fares for your journey.</p>

        <div className="rk-results__route-summary">
          <div className="rk-results__route-city">
            <span>FROM</span>
            <strong>{from}</strong>
          </div>
          {/* <div className="rk-results__route-connector" aria-hidden="true">
            <span />
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 12h16m-6-6 6 6-6 6" />
            </svg>
            <span />
          </div> */}
          <div className="rk-results__route-city">
            <span>TO</span>
            <strong>{to}</strong>
          </div>
          <div className="rk-results__route-date">
            <span>JOURNEY DATE</span>
            <strong>{formatDate(journeyDate)}</strong>
          </div>
        </div>
      </section>

      <section className="rk-results__content">
        <div className="rk-results__list-heading">
          <div>
            <h2>Find your available seats</h2>
            <p>
              {trains.length > 0
                ? `${trains.length} train${trains.length === 1 ? "" : "s"} found. Available seat counts are highlighted below.`
                : "No train details were found in the saved response"}
            </p>
          </div>
          <span className="rk-results__result-count">{trains.length} TRAINS</span>
        </div>

        {trains.length > 0 ? (
          <div className="rk-results__train-list">
            {trains.map((train, index) => (
              <TrainCard
                key={`${train.train_model ?? train.trip_number}-${index}`}
                train={train}
                index={index}
                route={route}
              />
            ))}
          </div>
        ) : (
          <div className="rk-results__empty">
            <div className="rk-results__empty-icon" aria-hidden="true">↗</div>
            <h2>No results to display</h2>
            <p>
              Open the search page and search again. The results page expects a successful
              response saved by the search form in this browser session.
            </p>
            <Link href="/search" className="rk-results__primary-button">Search trains</Link>
          </div>
        )}

        <div className="rk-results__notice">
          <span aria-hidden="true">ⓘ</span>
          <p>
            Availability can change. A seat count of 0 means the API did not report online
            seats for that class at the time of this response. Confirm final fare and
            availability on the official Railway booking service before travelling.
          </p>
        </div>
      </section>

      <footer className="rk-results__footer">
        <strong>SeatKoi</strong>
        <span>Made for easier train journeys in Bangladesh.</span>
      </footer>
    </main>
  );
}
