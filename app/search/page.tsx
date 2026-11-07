"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import StationAutocomplete, {
  type RailwayCity,
} from "@/components/search/StationAutocomplete";
import "./SearchForm.css";

type SearchResult = {
  ok?: boolean;
  status?: number;
  route?: {
    from: string;
    to: string;
    date: string;
    seatClass: string;
  };
  data?: unknown;
  error?: string;
  upstreamStatus?: number;
  details?: unknown;
};

type UserCredentials = {
  token: string;
  deviceId: string;
  deviceKey: string;
};

type UserProfile = {
  display_name: string;
  email: string;
  phone_number: string;
  alternative_mobile_number?: string|null;
  identification_type?: number;
  identification_number?: string;
  postal_code?: string;
  address?: string;
  dob?: string;
  is_email_verified?: number;
  is_email_verification_required?: boolean;
  nid_validated?: number;
};



type MessageType = "error" | "success";

const SEARCH_RESULT_STORAGE_KEY = "SeatKoi_search_result";
const RAILWAY_USER_PROFILE_KEY = "SeatKoi_user_profile";

export default function SearchPage() {
  const router = useRouter();

  // Stations must be selected from autocomplete suggestions.
  const [fromStation, setFromStation] = useState<RailwayCity | null>(null);
  const [toStation, setToStation] = useState<RailwayCity | null>(null);
  const [fromInput, setFromInput] = useState("");
  const [toInput, setToInput] = useState("");
  const [journeyDate, setJourneyDate] = useState("");
  const [minDate, setMinDate] = useState("");
  const [maxDate, setMaxDate] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<MessageType>("error");
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  function showError(text: string) {
    setMessageType("error");
    setMessage(text);
  }

  function showSuccess(text: string) {
    setMessageType("success");
    setMessage(text);
  }

  function clearMessage() {
    setMessage("");
  }

  // Allow journeys from today through 10 days from today, inclusive.
  useEffect(() => {
    function formatDate(date: Date): string {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    const today = new Date();
    const lastAllowedDate = new Date(today);
    lastAllowedDate.setDate(lastAllowedDate.getDate() + 10);

    //load user profile
    const profileData = sessionStorage.getItem(RAILWAY_USER_PROFILE_KEY);
    const profileInfo: UserProfile | null  = profileData ? JSON.parse(profileData) : null;
    setProfile(profileInfo);

    setMinDate(formatDate(today));
    setMaxDate(formatDate(lastAllowedDate));
  }, []);

  const isSearchReady =
    fromStation !== null &&
    toStation !== null &&
    fromStation.city_id !== toStation.city_id &&
    journeyDate !== "" &&
    minDate !== "" &&
    maxDate !== "" &&
    journeyDate >= minDate &&
    journeyDate <= maxDate &&
    !isLoading;

  function handleSwapStations() {
    setFromStation(toStation);
    setToStation(fromStation);
    setFromInput(toInput);
    setToInput(fromInput);
    clearMessage();
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearMessage();

    if (!fromStation || !toStation || !journeyDate) {
      showError(
        "Please select a valid starting station, destination, and journey date."
      );
      return;
    }

    if (fromStation.city_id === toStation.city_id) {
      showError("Starting and ending stations cannot be the same.");
      return;
    }

    if (
      !minDate ||
      !maxDate ||
      journeyDate < minDate ||
      journeyDate > maxDate
    ) {
      showError("Journey date must be between today and the next 10 days.");
      return;
    }

    setIsLoading(true);

    try {

      const RAILWAY_USER_CREDENTIALS_KEY = "SeatKoi_user_credentials";
      const storedData = sessionStorage.getItem(
        RAILWAY_USER_CREDENTIALS_KEY
      );
      const credentials: UserCredentials | null = storedData ? JSON.parse(storedData) : null;

      const response = await fetch("/api/search-trips", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          from_city_id: fromStation.city_id,
          to_city_id: toStation.city_id,
          from_city: fromStation.city_name,
          to_city: toStation.city_name,
          date_of_journey: journeyDate,
          credentials,
        }),
        cache: "no-store",
      });

      let result: SearchResult;
      try {
        result = (await response.json()) as SearchResult;
      } catch {
        showError("The search service returned an invalid response. Please try again.");
        return;
      }

      // The local API route may return HTTP 200 even when Railway rejected the request.
      const upstreamStatus = result.upstreamStatus ?? result.status;
      const hasError = !response.ok || result.ok === false || Boolean(result.error);

      if (hasError) {
        const apiMessage = result.error || "Unable to search for trains.";
        const statusText = upstreamStatus ? ` (Railway API status: ${upstreamStatus})` : "";
        showError(`${apiMessage}${statusText}`);
        return;
      }

      const payload = result.data ?? result;
      if (payload == null) {
        showError("Railway API returned an empty response. Please try again.");
        return;
      }

      const resultForResultsPage = {
        route: {
          from: fromStation.city_name,
          to: toStation.city_name,
          date: journeyDate,
          seatClass: "All available classes",
        },
        data: payload,
        receivedAt: new Date().toISOString(),
      };

      try {
        sessionStorage.setItem(
          SEARCH_RESULT_STORAGE_KEY,
          JSON.stringify(resultForResultsPage)
        );
  
      } catch {
        showError("Could not save the search results in this browser. Please try again.");
        return;
      }

      // The results page will display the successful search response.
      // Keep this success message as a fallback if navigation is delayed.
      showSuccess("Search successful. Opening train results…");
      router.push("/search/results");
    } catch {
      showError("Could not connect to the search service. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

const displayName = profile?.display_name?.trim() || "";
const initials = displayName
  ? displayName.split(/\s+/).length > 1
    ? displayName
        .split(/\s+/)
        .map((word) => word.charAt(0))
        .join("")
        .toUpperCase()
    : displayName.charAt(0).toUpperCase() +
      displayName.slice(-1).toUpperCase()
  : "👤";


  return (
    <main className="rail-search">
      <header className="rail-search__header">
        <Link href="/" className="rail-search__brand">
          <span className="rail-search__brand-icon" aria-hidden="true">
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
        <div className="rail-search__secure">
          <div className="profile" style={{
              border: "2px solid green",
              borderRadius: "50%",
              padding: "10px"
          }}>{initials}</div>
          {/* <span className="rail-search__secure-dot" /> */}
          {/* Railway Seat Finder */}
        </div>
      </header>

      <section className="rail-search__hero">
        <div className="rail-search__hero-content">
          <span className="rail-search__eyebrow">YOUR JOURNEY STARTS HERE</span>
          <h1>
            Find your next
            <br />
            <span>train journey.</span>
          </h1>
          <p>
            Search your route, choose your travel date, and get ready for your
            next journey across Bangladesh.
          </p>
          <div className="rail-search__features">
            <span><span aria-hidden="true">✓</span> Simple route search</span>
            <span><span aria-hidden="true">✓</span> Easy date selection</span>
          </div>
        </div>

        <div className="rail-search__illustration" aria-hidden="true">
          <div className="rail-search__sun" />
          <div className="rail-search__hill rail-search__hill--back" />
          <div className="rail-search__hill rail-search__hill--front" />
          <div className="rail-search__train">
            <div className="rail-search__train-window"><span /><span /><span /></div>
            <div className="rail-search__train-body" />
            <div className="rail-search__train-lights" />
            <div className="rail-search__train-wheel rail-search__train-wheel--one" />
            <div className="rail-search__train-wheel rail-search__train-wheel--two" />
            <div className="rail-search__train-wheel rail-search__train-wheel--three" />
          </div>
          <div className="rail-search__track" />
          <div className="rail-search__track-line" />
        </div>
      </section>

      <section className="rail-search__panel">
        <div className="rail-search__panel-heading">
          <div>
            <span className="rail-search__section-label">PLAN YOUR TRIP</span>
            <h2>Search train tickets</h2>
          </div>
          <span className="rail-search__step">01 / SEARCH</span>
        </div>

        <form className="rail-search__form" onSubmit={handleSearch} noValidate>
          <div className="rail-search__route">
            <StationAutocomplete
              label="FROM"
              placeholder="Starting station"
              inputValue={fromInput}
              onInputChange={(value) => {
                setFromInput(value);
                setFromStation(null);
                clearMessage();
              }}
              selectedCity={fromStation}
              onSelect={(city) => {
                setFromStation(city);
                clearMessage();
              }}
              fromOnly
            />

            <button
              className="rail-search__swap"
              type="button"
              onClick={handleSwapStations}
              aria-label="Swap starting and ending stations"
              title="Swap stations"
              disabled={isLoading}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M7 7h13l-3-3m3 3-3 3M17 17H4l3 3m-3-3 3-3" />
              </svg>
            </button>

            <StationAutocomplete
              label="TO"
              placeholder="Destination station"
              inputValue={toInput}
              onInputChange={(value) => {
                setToInput(value);
                setToStation(null);
                clearMessage();
              }}
              selectedCity={toStation}
              onSelect={(city) => {
                setToStation(city);
                clearMessage();
              }}
            />
          </div>

          <div className="rail-search__divider" />

          <div className="rail-search__bottom">
            <div className="rail-search__field rail-search__date-field">
              <label htmlFor="journeyDate">JOURNEY DATE</label>
              <div className="rail-search__input-wrap">
                <span className="rail-search__field-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="3" y="5" width="18" height="16" rx="2" />
                    <path d="M16 3v4M8 3v4M3 10h18" />
                  </svg>
                </span>
                <input
                  id="journeyDate"
                  name="journeyDate"
                  type="date"
                  min={minDate}
                  max={maxDate}
                  value={journeyDate}
                  onChange={(event) => {
                    setJourneyDate(event.target.value);
                    clearMessage();
                  }}
                  required
                  disabled={!minDate || isLoading}
                />
              </div>
              <small>Select your travel date (within 10 days)</small>
            </div>

            <button
              className="rail-search__submit"
              type="submit"
              disabled={!isSearchReady}
            >
              {isLoading ? "Searching..." : "Search Trains"}
              {!isLoading && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M5 12h14m-6-6 6 6-6 6" />
                </svg>
              )}
            </button>
          </div>

          {message && (
            <p
              className={`rail-search__message rail-search__message--${messageType}`}
              role={messageType === "error" ? "alert" : "status"}
              aria-live={messageType === "error" ? "assertive" : "polite"}
            >
              <span className="rail-search__message-icon" aria-hidden="true">
                {messageType === "error" ? "!" : "✓"}
              </span>
              <span>{message}</span>
            </p>
          )}
        </form>
      </section>

      <footer className="rail-search__footer">
        <span>SeatKoi</span>
        <span>Made for easier train journeys in Bangladesh.</span>
      </footer>
    </main>
  );
}
