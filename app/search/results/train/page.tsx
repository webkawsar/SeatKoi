
"use client";

import "./Design.css";

type RouteStation = {
  id: string;
  name: string;
  arrivalTime?: string;
  departureTime?: string;
};

type SingleTrainRouteProps = {
  trainName?: string;
  trainNumber?: string;
  fromStation?: string;
  toStation?: string;
  journeyDate?: string;
  stations?: RouteStation[];
};

const demoStations: RouteStation[] = [
  { id: "1", name: "Dhaka", departureTime: "02:55 PM" },
  { id: "2", name: "Biman Bandar", arrivalTime: "03:22 PM" },
  { id: "3", name: "Brahmanbaria", arrivalTime: "04:49 PM" },
  { id: "4", name: "Azampur", arrivalTime: "05:14 PM" },
  { id: "5", name: "Harashpur", arrivalTime: "05:36 PM" },
  { id: "6", name: "Shaistaganj", arrivalTime: "06:15 PM" },
  { id: "7", name: "Sreemangal", arrivalTime: "06:55 PM" },
  { id: "8", name: "Shamshernagar", arrivalTime: "07:26 PM" },
  { id: "9", name: "Kulaura", arrivalTime: "07:51 PM" },
  { id: "10", name: "Maijgaon", arrivalTime: "08:23 PM" },
  { id: "11", name: "Sylhet", arrivalTime: "09:30 PM" },
];

export default function SingleTrainRoute({
  trainName = "Selected train",
  trainNumber = "773",
  fromStation = "Dhaka",
  toStation = "Sylhet",
  journeyDate = "31 Oct 2026",
  stations = demoStations,
}: SingleTrainRouteProps) {
  const route = stations;
  const originIndex = route.findIndex(
    (station) => station.name.toLowerCase() === fromStation.toLowerCase()
  );

  const destinationIndex = route.findIndex(
    (station) => station.name.toLowerCase() === toStation.toLowerCase()
  );

  const startIndex = originIndex >= 0 ? originIndex : 0;
  const endIndex =
    destinationIndex > startIndex ? destinationIndex : route.length - 1;

  const journeyStations = route.slice(startIndex, endIndex + 1);
  const origin = journeyStations[0];
  const destinations = journeyStations.slice(1).reverse();

  const stationRows: RouteStation[][] = [];

  for (let i = 0; i < journeyStations.length; i += 6) {
    stationRows.push(journeyStations.slice(i, i + 6));
  }

  return (
    <main className="st-route-page">
      <header className="st-trip-header">
        <div className="st-trip-top">
          <div>
            <span className="st-eyebrow">TRAIN JOURNEY</span>
            <h1>{trainName}</h1>
            <p className="st-muted">Train no. {trainNumber}</p>
          </div>

          <div className="st-trip-date">
            <span>JOURNEY DATE</span>
            <strong>{journeyDate}</strong>
          </div>
        </div>

        <div className="st-trip-summary">
          <div className="st-trip-location">
            <span>STARTING STATION</span>
            <strong>{origin?.name ?? fromStation}</strong>
          </div>

          <div className="st-trip-connector" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>

          <div className="st-trip-location">
            <span>DESTINATION</span>
            <strong>{journeyStations[journeyStations.length - 1]?.name ?? toStation}</strong>
          </div>

          <div className="st-stop-count">
            <strong>{journeyStations.length}</strong>
            <span>stations</span>
          </div>
        </div>
      </header>

      <section className="st-route-panel">
        <div className="st-section-heading">
          <div>
            <span className="st-eyebrow">THE COMPLETE JOURNEY</span>
            <h2>Complete train route</h2>
            <p>Every station, displayed in the order of travel.</p>
          </div>

          <div className="st-route-badge">
            <span className="st-live-dot" />
            {journeyStations.length} stops
          </div>
        </div>

        <div className="st-route-map">
          {stationRows.map((row, rowIndex) => (
            <div
              className={`st-route-row ${
                rowIndex % 2 === 1 ? "st-route-row-reverse" : ""
              }`}
              key={`row-${rowIndex}`}
            >
              {row.map((station) => {
                const index = journeyStations.findIndex(
                  (item) => item.id === station.id
                );

                const isOrigin = index === 0;
                const isDestination = index === journeyStations.length - 1;

                return (
                  <article
                    className={`st-station ${
                      isOrigin ? "st-station-origin" : ""
                    } ${isDestination ? "st-station-destination" : ""}`}
                    key={station.id}
                  >
                    <div className="st-station-marker">
                      {String(index + 1).padStart(2, "0")}
                    </div>

                    <div className="st-station-card">
                      <span className="st-station-type">
                        {isOrigin
                          ? "START"
                          : isDestination
                          ? "DESTINATION"
                          : `STOP ${String(index + 1).padStart(2, "0")}`}
                      </span>

                      <h3>{station.name}</h3>

                      <p>
                        {station.departureTime
                          ? `Dep ${station.departureTime} BST`
                          : station.arrivalTime
                          ? `Arr ${station.arrivalTime} BST`
                          : "Time not available"}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          ))}
        </div>

        <div className="st-route-legend">
          <span>
            <i className="st-legend-origin" /> Starting station
          </span>
          <span>
            <i className="st-legend-stop" /> Intermediate station
          </span>
          <span>
            <i className="st-legend-destination" /> Destination
          </span>
        </div>
      </section>

      <section className="st-alternatives">
        <div className="st-section-heading st-alternative-heading">
          <div>
            <span className="st-eyebrow">AUTOMATIC ALTERNATIVE SEARCH</span>
            <h2>Alternative destination results</h2>
            <p>
              Keep the starting station fixed and check destinations in reverse
              route order, starting with the original destination.
            </p>
          </div>

          <div className="st-search-order-badge">
            <span className="st-live-dot" />
            Sequential search
          </div>
        </div>

        <div className="st-search-origin">
          <div className="st-origin-icon" aria-hidden="true">
            ↗
          </div>
          <div>
            <span>FIXED STARTING STATION</span>
            <strong>{origin?.name ?? fromStation}</strong>
          </div>
          <span className="st-fixed-badge">Fixed</span>
        </div>

        <div className="st-alternative-list">
          {destinations.map((station, index) => {
            const originalDestination =
              station.id === journeyStations[journeyStations.length - 1]?.id;

            return (
              <article className="st-alternative-card" key={station.id}>
                <div className="st-alternative-order">
                  {String(index + 1).padStart(2, "0")}
                </div>

                <div className="st-alternative-details">
                  <span>
                    {originalDestination
                      ? "ORIGINAL DESTINATION"
                      : "ALTERNATIVE DESTINATION"}
                  </span>

                  <h3>
                    {origin?.name ?? fromStation}
                    <span className="st-arrow">→</span>
                    {station.name}
                  </h3>

                  <p>
                    {station.arrivalTime
                      ? `Scheduled arrival: ${station.arrivalTime} BST`
                      : "Arrival time not available"}
                  </p>
                </div>

                <div className="st-result-status">
                  <span className="st-status-dot" />
                  <span>Awaiting API</span>
                </div>
              </article>
            );
          })}
        </div>

        {destinations.length === 0 && (
          <div className="st-empty-state">
            <span className="st-empty-icon">↗</span>
            <h3>No alternative destinations available</h3>
            <p>
              The route needs at least 2 stations to display alternatives.
            </p>
          </div>
        )}

        <p className="st-api-note">
          <span aria-hidden="true">ⓘ</span>
          This is a UI preview. Actual availability, search progress, and API
          errors will be connected separately. No seat availability is assumed
          by this design.
        </p>
      </section>
    </main>
  );
}
