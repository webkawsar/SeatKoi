
import "./extension.css";

const EXTENSION_DOWNLOAD_URL = "https://drive.google.com/file/d/1JevPpXBkgNa9_-YNqVEt50D5G8mb5GAQ/view?usp=sharing";

const installationSteps = [
  {
    number: "01",
    title: "Download the Extension",
    description:
      "Download the SeatKoi Railway Connector ZIP file to your computer.",
  },
  {
    number: "02",
    title: "Extract the ZIP File",
    description:
      "Locate the downloaded ZIP file and extract it. Keep the extracted folder somewhere safe.",
  },
  {
    number: "03",
    title: "Open Chrome Extensions",
    description:
      "Open Google Chrome and enter chrome://extensions in the address bar.",
    code: "chrome://extensions",
  },
  {
    number: "04",
    title: "Enable Developer Mode",
    description:
      "Turn on Developer mode using the toggle in the top-right corner of the Extensions page.",
  },
  {
    number: "05",
    title: "Load the Extension",
    description:
      "Click Load unpacked and select the extracted SeatKoi Railway Connector folder.",
  },
  {
    number: "06",
    title: "You're Ready!",
    description:
      "Log in to Bangladesh Railway, then open SeatKoi. The extension will transfer your session credentials automatically.",
  },
];

export default function ExtensionPage() {
  return (
    <main className="extension-page">
      {/* Hero Section */}
      <section className="extension-hero">
        <div className="extension-container">
          <div className="extension-hero-content">
            <span className="extension-eyebrow">
              SEATKOI BROWSER EXTENSION
            </span>

            <h1>
              Connect your railway account.
              <span> Without the manual work.</span>
            </h1>

            <p className="extension-hero-description">
              SeatKoi Railway Connector makes connecting your
              Bangladesh Railway account easier. No need to
              manually copy and paste your session credentials.
            </p>

            <div className="extension-hero-actions">
              <a
                href={EXTENSION_DOWNLOAD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="extension-primary-button"
              >
                <span aria-hidden="true">↓</span>
                Download Extension
              </a>

              <a
                href="#installation"
                className="extension-secondary-button"
              >
                Installation Guide <span aria-hidden="true">↓</span>
              </a>
            </div>

            <div className="extension-hero-meta">
              <span>✓ Free to use</span>
              <span>✓ Google Chrome</span>
              <span>✓ Easy setup</span>
            </div>
          </div>

          {/* Extension Preview */}
          <div className="extension-hero-visual">
            <div className="extension-preview-card">
              <div className="extension-preview-logo">S</div>

              <div className="extension-preview-info">
                <strong>SeatKoi Railway Connector</strong>
                <span>Browser Extension</span>
              </div>

              <span className="extension-version">v1.3.0</span>

              <div className="extension-connection-flow">
                <div className="extension-flow-item">
                  <span className="extension-flow-icon">🚆</span>

                  <div className="extension-flow-info">
                    <strong>Bangladesh Railway</strong>
                    <small>Authenticated session</small>
                  </div>

                  <span className="extension-flow-check">✓</span>
                </div>

                <div className="extension-flow-line" />

                <div className="extension-flow-item">
                  <span className="extension-flow-icon">🔗</span>

                  <div className="extension-flow-info">
                    <strong>SeatKoi Connector</strong>
                    <small>Credential transfer</small>
                  </div>

                  <span className="extension-flow-check">✓</span>
                </div>

                <div className="extension-flow-line" />

                <div className="extension-flow-item">
                  <span className="extension-flow-icon">🎟️</span>

                  <div className="extension-flow-info">
                    <strong>SeatKoi</strong>
                    <small>Ready to connect</small>
                  </div>

                  <span className="extension-flow-check">✓</span>
                </div>
              </div>

              <div className="extension-connection-status">
                <span />
                Designed for a simpler connection
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="extension-benefits">
        <div className="extension-container">
          <div className="extension-section-heading">
            <span>WHY USE THE EXTENSION?</span>
            <h2>Less copying. Easier connection.</h2>
            <p>
              Connect your railway account to SeatKoi without
              manually handling session credentials.
            </p>
          </div>

          <div className="extension-benefit-grid">
            <article className="extension-benefit-card">
              <span className="extension-benefit-icon">⚡</span>

              <h3>Automatic Transfer</h3>

              <p>
                Transfers the required Railway session credentials
                to SeatKoi automatically.
              </p>
            </article>

            <article className="extension-benefit-card">
              <span className="extension-benefit-icon">⌨️</span>

              <h3>No Manual Copying</h3>

              <p>
                No need to manually copy your token, Device ID,
                or Device Key.
              </p>
            </article>

            <article className="extension-benefit-card">
              <span className="extension-benefit-icon">✓</span>

              <h3>Simple Setup</h3>

              <p>
                Install once and use the extension whenever
                you connect to SeatKoi.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* Installation Guide */}
      <section
        className="extension-installation"
        id="installation"
      >
        <div className="extension-container">
          <div className="extension-section-heading">
            <span>GETTING STARTED</span>
            <h2>Install in 6 simple steps.</h2>
            <p>
              Follow the instructions below to install
              SeatKoi Railway Connector in Google Chrome.
            </p>
          </div>

          <div className="extension-steps">
            {installationSteps.map((step) => (
              <article
                className="extension-step"
                key={step.number}
              >
                <div className="extension-step-number">
                  {step.number}
                </div>

                <div className="extension-step-content">
                  <h3>{step.title}</h3>

                  <p>{step.description}</p>

                  {step.code && (
                    <code className="extension-code">
                      {step.code}
                    </code>
                  )}

                  {step.number === "01" && (
                    <a
                      href={EXTENSION_DOWNLOAD_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="extension-step-download"
                    >
                      Download Extension →
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="extension-how-it-works">
        <div className="extension-container">
          <div className="extension-section-heading">
            <span>HOW IT WORKS</span>
            <h2>From Railway to SeatKoi.</h2>
          </div>

          <div className="extension-workflow">
            <div className="extension-workflow-item">
              <span className="extension-workflow-number">
                01
              </span>

              <div className="extension-workflow-icon">🚆</div>

              <h3>Login to Railway</h3>

              <p>
                Sign in to your Bangladesh Railway account
                using Google Chrome.
              </p>
            </div>

            <div
              className="extension-workflow-arrow"
              aria-hidden="true"
            >
              →
            </div>

            <div className="extension-workflow-item">
              <span className="extension-workflow-number">
                02
              </span>

              <div className="extension-workflow-icon">🔗</div>

              <h3>Open SeatKoi</h3>

              <p>
                Open SeatKoi in Chrome. The extension transfers
                your available session credentials.
              </p>
            </div>

            <div
              className="extension-workflow-arrow"
              aria-hidden="true"
            >
              →
            </div>

            <div className="extension-workflow-item">
              <span className="extension-workflow-number">
                03
              </span>

              <div className="extension-workflow-icon">🎟️</div>

              <h3>Connect & Continue</h3>

              <p>
                Check your credentials on the connection page
                and click Connect Railway Account.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Security Notice */}
      <section className="extension-security">
        <div className="extension-container">
          <div className="extension-security-card">
            <div
              className="extension-security-icon"
              aria-hidden="true"
            >
              🔒
            </div>

            <div>
              <h2>Your account credentials matter.</h2>

              <p>
                The extension handles sensitive Railway session
                credentials to transfer them to SeatKoi. Only
                install it from the official SeatKoi download
                source. Never share your Railway password or
                session credentials with anyone.
              </p>

              <p className="extension-security-note">
                Review the extension permissions and SeatKoi
                Privacy Policy before installation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="extension-final-cta">
        <div className="extension-container">
          <h2>Ready to connect?</h2>

          <p>
            Install SeatKoi Railway Connector and simplify
            your railway account connection.
          </p>

          <a
            href={EXTENSION_DOWNLOAD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="extension-primary-button"
          >
            <span aria-hidden="true">↓</span>
            Download Extension
          </a>
        </div>
      </section>
    </main>
  );
}
