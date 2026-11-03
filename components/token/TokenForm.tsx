
"use client";

import { FormEvent, useState } from "react";
import "./TokenForm.css";


type TokenFormData = {
  token: string;
  deviceId: string;
  deviceKey: string;
};

type TokenFormProps = {
  onSubmit: (data: TokenFormData) => Promise<void>;
};

export default function TokenForm({ onSubmit }: TokenFormProps) {
  const [token, setToken] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [deviceKey, setDeviceKey] = useState("");

  const [showToken, setShowToken] = useState(false);
  const [showDeviceKey, setShowDeviceKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const formData = {
      token: token.trim(),
      deviceId: deviceId.trim(),
      deviceKey: deviceKey.trim(),
    };

    if (!formData.token || !formData.deviceId || !formData.deviceKey) {
      setError("Please fill in all 3 fields.");
      return;
    }

    try {
      setLoading(true);
      await onSubmit(formData);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to verify your credentials. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rail-token">
      <div className="rail-token__card">
        <div className="rail-token__brand">
          <div className="rail-token__logo" aria-hidden="true">
            <svg
              viewBox="0 0 48 48"
              fill="none"
              width="30"
              height="30"
            >
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
          </div>

          <div>
            <p className="rail-token__eyebrow">SEATKOI</p>
            <h1>Connect your railway account</h1>
          </div>
        </div>

        <p className="rail-token__description">
          Enter your Railway session credentials to continue to train
          availability search.
        </p>

        <form onSubmit={handleSubmit} className="rail-token__form">
          <div className="rail-token__field">
            <label htmlFor="rail-token">Bearer Token</label>

            <div className="rail-token__input-wrap">
              <span className="rail-token__input-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="19" height="19" fill="none">
                  <circle
                    cx="8"
                    cy="15"
                    r="4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <path
                    d="M11 12L19 4M15 8L18 11M17 6L20 9"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </span>

              <input
                id="rail-token"
                type={showToken ? "text" : "password"}
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder="Paste your bearer token"
                autoComplete="off"
                spellCheck={false}
                required
              />

              <button
                type="button"
                className="rail-token__toggle"
                onClick={() => setShowToken((value) => !value)}
                aria-label={showToken ? "Hide token" : "Show token"}
              >
                {showToken ? "Hide" : "Show"}
              </button>
            </div>

            <p className="rail-token__hint">
              Enter the token from your authenticated Railway session.
            </p>
          </div>

          <div className="rail-token__field">
            <label htmlFor="rail-device-id">Device ID</label>

            <div className="rail-token__input-wrap">
              <span className="rail-token__input-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="19" height="19" fill="none">
                  <rect
                    x="6"
                    y="2.5"
                    width="12"
                    height="19"
                    rx="2.5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <path
                    d="M10 18h4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </span>

              <input
                id="rail-device-id"
                type="text"
                value={deviceId}
                onChange={(event) => setDeviceId(event.target.value)}
                placeholder="Enter your device ID"
                autoComplete="off"
                spellCheck={false}
                required
              />
            </div>
          </div>

          <div className="rail-token__field">
            <label htmlFor="rail-device-key">Device Key</label>

            <div className="rail-token__input-wrap">
              <span className="rail-token__input-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="19" height="19" fill="none">
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
                  />
                  <circle cx="12" cy="15" r="1.3" fill="currentColor" />
                </svg>
              </span>

              <input
                id="rail-device-key"
                type={showDeviceKey ? "text" : "password"}
                value={deviceKey}
                onChange={(event) => setDeviceKey(event.target.value)}
                placeholder="Enter your device key"
                autoComplete="off"
                spellCheck={false}
                required
              />

              <button
                type="button"
                className="rail-token__toggle"
                onClick={() => setShowDeviceKey((value) => !value)}
                aria-label={showDeviceKey ? "Hide device key" : "Show device key"}
              >
                {showDeviceKey ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          

          <button
            type="submit"
            className="rail-token__submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="rail-token__spinner" />
                Verifying credentials...
              </>
            ) : (
              <>
                Connect Railway Account
                <span aria-hidden="true">→</span>
              </>
            )}
          </button>

          {error && (
            <div className="rail-token__error" role="alert">
              <span aria-hidden="true">!</span>
              {error}
            </div>
          )}
        </form>

        <div className="rail-token__footer">
          <span className="rail-token__status-dot" />
          <span>SeatKoi · Railway seat availability finder</span>
        </div>
      </div>
    </section>
  );
}

export type { TokenFormData };
