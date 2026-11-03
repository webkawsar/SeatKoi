
"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type AuthStatus = "checking" | "authenticated" | "unauthenticated";

type SessionResponse = {
  authenticated?: boolean;
  error?: string;
};

export default function Home() {
  const router = useRouter();

  const [authStatus, setAuthStatus] =
    useState<AuthStatus>("checking");

  const [authError, setAuthError] = useState("");
  const [fromStation, setFromStation] = useState("Dhaka");
  const [toStation, setToStation] = useState("Sylhet");
  const [journeyDate, setJourneyDate] = useState("");
  const [minDate, setMinDate] = useState("");
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    const today = new Date();

    setMinDate(
      [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0"),
      ].join("-")
    );

    setCurrentYear(today.getFullYear());

    let cancelled = false;

    async function checkAuthentication() {
      try {
        const response = await fetch("/api/railway/session", {
          method: "GET",
          cache: "no-store",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
          },
        });

        const data: SessionResponse = await response.json();

        if (cancelled) return;

        if (response.ok && data.authenticated === true) {
          setAuthStatus("authenticated");
          setAuthError("");
        } else {
          setAuthStatus("unauthenticated");
          setAuthError("");
        }
      } catch {
        if (cancelled) return;

        setAuthStatus("unauthenticated");
        setAuthError(
          "Could not verify your Railway session. Please try again."
        );
      }
    }

    checkAuthentication();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (authStatus !== "authenticated") {
      router.push("/token");
      return;
    }

    const from = fromStation.trim();
    const to = toStation.trim();

    if (!from || !to || !journeyDate) {
      return;
    }

    if (from.toLowerCase() === to.toLowerCase()) {
      alert("Starting station and destination must be different.");
      return;
    }

    if (minDate && journeyDate < minDate) {
      alert("Please select today or a future journey date.");
      return;
    }

    const params = new URLSearchParams({
      from,
      to,
      date: journeyDate,
    });

    router.push(`/search?${params.toString()}`);
  }

  function swapStations() {
    setFromStation(toStation);
    setToStation(fromStation);
  }

  async function retryAuthenticationCheck() {
    setAuthStatus("checking");
    setAuthError("");

    try {
      const response = await fetch("/api/railway/session", {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
        },
      });

      const data: SessionResponse = await response.json();

      if (response.ok && data.authenticated === true) {
        setAuthStatus("authenticated");
      } else {
        setAuthStatus("unauthenticated");
        setAuthError(
          data.error || "Railway account is not connected yet."
        );
      }
    } catch {
      setAuthStatus("unauthenticated");
      setAuthError(
        "Could not verify your Railway session. Please try again."
      );
    }
  }

  return (
    <main className="rk-home">
      {/* Header */}
      <header className="rk-header">
        <div className="rk-container rk-header__inner">
          <Link href="/" className="rk-brand" aria-label="SeatKoi home">
            <span className="rk-brand__icon">
              <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
                <rect
                  x="9"
                  y="5"
                  width="30"
                  height="34"
                  rx="8"
                  stroke="currentColor"
                  strokeWidth="3"
                />
                <path
                  d="M15 13H33M15 22H33M17 39L12 44M31 39L36 44"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <circle cx="17" cy="31" r="2" fill="currentColor" />
                <circle cx="31" cy="31" r="2" fill="currentColor" />
              </svg>
            </span>

            <span className="rk-brand__text">
              Seat<span>Koi</span>
              <small>YOUR JOURNEY, SIMPLIFIED</small>
            </span>
          </Link>

          <nav className="rk-nav" aria-label="Main navigation">
            <Link
              href="/"
              className="rk-nav__link rk-nav__link--active"
            >
              Home
            </Link>

            <a href="#find-trains" className="rk-nav__link">
              Find Trains
            </a>

            {authStatus === "authenticated" ? (
              <span className="rk-auth-indicator">
                <span className="rk-auth-indicator__dot" />
                Railway Connected
              </span>
            ) : (
              <Link href="/token" className="rk-nav__account">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect
                    x="4"
                    y="10"
                    width="16"
                    height="11"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <path
                    d="M8 10V7a4 4 0 018 0v3"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
                Connect Account
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="rk-hero">
        <div className="rk-hero__decoration rk-hero__decoration--one" />
        <div className="rk-hero__decoration rk-hero__decoration--two" />

        <div className="rk-container rk-hero__grid">
          <div className="rk-hero__content">
            <div className="rk-hero__badge">
              <span />
              BANGLADESH RAILWAY JOURNEY PLANNER
            </div>

            <h1>
              Your next journey
              <br />
              starts <span>here.</span>
            </h1>

            <p className="rk-hero__description">
              Find trains, explore their routes, and check seat availability
              between stations. Connect your Railway account to get started.
            </p>

            <div className="rk-hero__features">
              <div className="rk-hero__feature">
                <span className="rk-feature__icon">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle
                      cx="10.5"
                      cy="10.5"
                      r="6.5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                    <path
                      d="M15.5 15.5L21 21"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                Find trains
              </div>

              <div className="rk-hero__feature">
                <span className="rk-feature__icon">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M5 4V20M19 4V20M5 8H19M5 16H19"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="2"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                  </svg>
                </span>
                Explore routes
              </div>

              <div className="rk-hero__feature">
                <span className="rk-feature__icon">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M12 3L19 6V11C19 15.5 16 19 12 21C8 19 5 15.5 5 11V6L12 3Z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M9 12L11 14L15 10"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                Check availability
              </div>
            </div>
          </div>

          <div className="rk-hero__visual" aria-hidden="true">
            <div className="rk-visual__circle rk-visual__circle--outer" />
            <div className="rk-visual__circle rk-visual__circle--inner" />

            <div className="rk-visual__route">
              <span className="rk-visual__route-dot rk-visual__route-dot--start" />
              <span className="rk-visual__route-line" />
              <span className="rk-visual__route-dot rk-visual__route-dot--end" />
            </div>

            <div className="rk-train-art">
              <svg viewBox="0 0 340 250" fill="none">
                <ellipse
                  cx="174"
                  cy="218"
                  rx="130"
                  ry="12"
                  fill="#153B29"
                  opacity=".10"
                />
                <path
                  d="M57 52Q57 28 81 28H247Q271 28 271 52V174Q271 196 249 196H79Q57 196 57 174V52Z"
                  fill="#167D40"
                />
                <path
                  d="M69 55Q69 40 84 40H244Q259 40 259 55V112H69V55Z"
                  fill="#F8FFF9"
                />
                <path
                  d="M80 52H121V100H80V52ZM132 52H173V100H132V52ZM184 52H225V100H184V52ZM236 52H248V100H236V52Z"
                  fill="#CDEBDD"
                />
                <path
                  d="M69 119H259V165Q259 184 240 184H88Q69 184 69 165V119Z"
                  fill="#209B50"
                />
                <path
                  d="M80 130H248"
                  stroke="#B6E7C7"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <rect x="84" y="146" width="22" height="15" rx="4" fill="#F8FFF9" />
                <rect x="222" y="146" width="22" height="15" rx="4" fill="#F8FFF9" />
                <path
                  d="M88 184L76 205M240 184L252 205"
                  stroke="#536C5B"
                  strokeWidth="7"
                  strokeLinecap="round"
                />
                <rect x="103" y="190" width="124" height="12" rx="6" fill="#536C5B" />
                <circle cx="106" cy="205" r="13" fill="#203C2C" />
                <circle cx="106" cy="205" r="5" fill="#C4D9CB" />
                <circle cx="224" cy="205" r="13" fill="#203C2C" />
                <circle cx="224" cy="205" r="5" fill="#C4D9CB" />
                <path
                  d="M45 220H293"
                  stroke="#A3CBB0"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <path
                  d="M65 230H273"
                  stroke="#A3CBB0"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M115 28L125 15H203L213 28"
                  stroke="#167D40"
                  strokeWidth="5"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div className="rk-visual__floating rk-visual__floating--top">
              <span className="rk-floating__icon">↗</span>
              <span>
                <strong>Explore routes</strong>
                <small>Station by station</small>
              </span>
            </div>

            <div className="rk-visual__floating rk-visual__floating--bottom">
              <span className="rk-floating__check">✓</span>
              <span>
                <strong>Plan with confidence</strong>
                <small>Check available information</small>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Authentication gate / Search form */}
      <section className="rk-search-section" id="find-trains">
        <div className="rk-container">
          {authStatus === "checking" && (
            <div className="rk-auth-card" aria-live="polite">
              <div className="rk-auth-card__icon">
                <span className="rk-loading-spinner" />
              </div>

              <div className="rk-auth-card__content">
                <span className="rk-section-eyebrow">
                  CHECKING ACCOUNT
                </span>
                <h2>Verifying your Railway connection</h2>
                <p>
                  Please wait while SeatKoi checks your authentication status.
                </p>
              </div>
            </div>
          )}

          {authStatus === "unauthenticated" && (
            <div className="rk-auth-card" aria-live="polite">
              <div className="rk-auth-card__icon">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect
                    x="4"
                    y="10"
                    width="16"
                    height="11"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <path
                    d="M8 10V7a4 4 0 018 0v3"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M12 14V17"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              <div className="rk-auth-card__content">
                <span className="rk-section-eyebrow">
                  ACCOUNT CONNECTION REQUIRED
                </span>
                <h2>Connect your Railway account first</h2>
                <p>
                  To search for trains and check route availability, you must
                  authenticate your Railway session first.
                </p>

                {authError && (
                  <p className="rk-auth-card__error" role="alert">
                    {authError}
                  </p>
                )}

                <div className="rk-auth-card__actions">
                  <Link href="/token" className="rk-search-submit">
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <rect
                        x="4"
                        y="10"
                        width="16"
                        height="11"
                        rx="2"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      />
                      <path
                        d="M8 10V7a4 4 0 018 0v3"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </svg>
                    Connect Railway Account
                  </Link>

                  <button
                    type="button"
                    className="rk-retry-button"
                    onClick={retryAuthenticationCheck}
                  >
                    Check Again
                  </button>
                </div>
              </div>
            </div>
          )}

          {authStatus === "authenticated" && (
            <div className="rk-search-card">
              <div className="rk-search-card__heading">
                <div>
                  <span className="rk-section-eyebrow">
                    START YOUR SEARCH
                  </span>
                  <h2>Where would you like to go?</h2>
                  <p>
                    Enter your journey details to find available trains.
                  </p>
                </div>

                <div className="rk-search-card__train-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <rect
                      x="5"
                      y="2"
                      width="14"
                      height="17"
                      rx="4"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    />
                    <path
                      d="M8 7H16M8 12H16M8 19L5 22M16 19L19 22"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                    />
                    <circle cx="8.5" cy="15.5" r="1" fill="currentColor" />
                    <circle cx="15.5" cy="15.5" r="1" fill="currentColor" />
                  </svg>
                </div>
              </div>

              <form className="rk-search-form" onSubmit={handleSearch}>
                <div className="rk-search-field">
                  <label htmlFor="rk-from">Starting Station</label>
                  <div className="rk-search-input">
                    <span className="rk-search-input__marker rk-marker--start" />
                    <input
                      id="rk-from"
                      type="text"
                      placeholder="e.g. Dhaka"
                      value={fromStation}
                      onChange={(event) => setFromStation(event.target.value)}
                      autoComplete="off"
                      required
                    />
                  </div>
                </div>

                <button
                  type="button"
                  className="rk-swap-button"
                  onClick={swapStations}
                  aria-label="Swap starting station and destination"
                  title="Swap stations"
                >
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M7 4L3 8L7 12M3 8H20M17 20L21 16L17 12M21 16H4"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                <div className="rk-search-field">
                  <label htmlFor="rk-to">Ending Station</label>
                  <div className="rk-search-input">
                    <span className="rk-search-input__marker rk-marker--end" />
                    <input
                      id="rk-to"
                      type="text"
                      placeholder="e.g. Sylhet"
                      value={toStation}
                      onChange={(event) => setToStation(event.target.value)}
                      autoComplete="off"
                      required
                    />
                  </div>
                </div>

                <div className="rk-search-field rk-search-field--date">
                  <label htmlFor="rk-date">Journey Date</label>
                  <div className="rk-search-input">
                    <svg
                      className="rk-search-input__calendar"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <rect
                        x="3"
                        y="5"
                        width="18"
                        height="16"
                        rx="2"
                        stroke="currentColor"
                        strokeWidth="1.7"
                      />
                      <path
                        d="M16 3V7M8 3V7M3 10H21"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                      />
                    </svg>
                    <input
                      id="rk-date"
                      type="date"
                      value={journeyDate}
                      min={minDate || undefined}
                      onChange={(event) => setJourneyDate(event.target.value)}
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="rk-search-submit">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle
                      cx="10.5"
                      cy="10.5"
                      r="6.5"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path
                      d="M15.5 15.5L21 21"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  Find Trains
                </button>
              </form>

              <div className="rk-search-card__note">
                <span aria-hidden="true">ⓘ</span>
                Search results depend on information returned by the railway
                service. Availability must be verified.
              </div>
            </div>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="rk-how">
        <div className="rk-container">
          <div className="rk-section-heading">
            <span className="rk-section-eyebrow">SIMPLE BY DESIGN</span>
            <h2>Your journey in 3 simple steps</h2>
            <p>Connect your account, find trains, and explore their routes.</p>
          </div>

          <div className="rk-steps">
            <article className="rk-step">
              <div className="rk-step__number">01</div>
              <div className="rk-step__icon">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect
                    x="4"
                    y="10"
                    width="16"
                    height="11"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <path
                    d="M8 10V7a4 4 0 018 0v3"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <h3>Connect your account</h3>
              <p>
                Authenticate your Railway session before starting a train
                search.
              </p>
            </article>

            <article className="rk-step">
              <div className="rk-step__number">02</div>
              <div className="rk-step__icon">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle
                    cx="10.5"
                    cy="10.5"
                    r="6.5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <path
                    d="M15.5 15.5L21 21"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <h3>Search your journey</h3>
              <p>
                Choose your starting station, destination, and journey date.
              </p>
            </article>

            <article className="rk-step">
              <div className="rk-step__number">03</div>
              <div className="rk-step__icon">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M5 4V20M19 4V20M5 8H19M5 16H19"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <circle
                    cx="12"
                    cy="12"
                    r="2"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                </svg>
              </div>
              <h3>Explore train routes</h3>
              <p>
                Review matching trains, station order, and reliable
                availability information.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="rk-cta">
        <div className="rk-container rk-cta__inner">
          <div>
            <span className="rk-section-eyebrow">READY TO GET STARTED?</span>
            <h2>Your next railway journey begins with a search.</h2>
            <p>
              {authStatus === "authenticated"
                ? "Your account is connected. You can now search for trains."
                : "Connect your Railway account to unlock train search."}
            </p>
          </div>

          {authStatus === "authenticated" ? (
            <a href="#find-trains" className="rk-cta__button">
              Find Trains <span aria-hidden="true">→</span>
            </a>
          ) : (
            <Link href="/token" className="rk-cta__button">
              Connect Account <span aria-hidden="true">→</span>
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="rk-footer">
        <div className="rk-container rk-footer__inner">
          <Link href="/" className="rk-brand rk-brand--footer">
            <span className="rk-brand__icon">
              <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
                <rect
                  x="9"
                  y="5"
                  width="30"
                  height="34"
                  rx="8"
                  stroke="currentColor"
                  strokeWidth="3"
                />
                <path
                  d="M15 13H33M15 22H33M17 39L12 44M31 39L36 44"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <circle cx="17" cy="31" r="2" fill="currentColor" />
                <circle cx="31" cy="31" r="2" fill="currentColor" />
              </svg>
            </span>

            <span className="rk-brand__text">
              Seat<span>Koi</span>
              <small>YOUR JOURNEY, SIMPLIFIED</small>
            </span>
          </Link>

          <p>
            A railway journey search tool. Not an official Bangladesh Railway
            website.
          </p>

          <span className="rk-footer__copyright">
            © {currentYear ?? "SeatKoi"} SeatKoi
          </span>
        </div>
      </footer>
    </main>
  );
}
