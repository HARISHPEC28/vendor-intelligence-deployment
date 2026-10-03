import { Link } from "react-router-dom";

function LandingPage() {
  return (
    <div className="landing-page">

      {/* NAVBAR */}

      <header className="landing-navbar">

        <div className="landing-logo">
          Vendor Intelligence
        </div>

        <div className="landing-nav-links">
          <Link to="/vendor-platform" className="landing-login">
            Vendor Platform
          </Link>

          <Link to="/login" className="landing-login">
            Login
          </Link>

          <Link to="/register" className="landing-register">
            Register
          </Link>
        </div>

      </header>


      {/* HERO SECTION */}

      <main className="landing-hero">

        <div className="landing-content">

          <div className="landing-badge">
            Vendor Reliability & Procurement Risk Management
          </div>

          <h1>
            Vendor Reliability
            <span> Intelligence Platform</span>
          </h1>

          <p className="landing-description">
            A centralized platform to evaluate vendor reliability,
            manage procurement operations, monitor supplier performance,
            track purchase orders, and manage contracts and compliance.
          </p>

          <div className="landing-buttons">

            <Link
              to="/vendor-platform"
              className="landing-primary-button"
            >
              Open Vendor Platform
            </Link>

            <Link
              to="/login"
              className="landing-secondary-button"
            >
              Get Started
            </Link>

            <Link
              to="/register"
              className="landing-secondary-button"
            >
              Create Account
            </Link>

          </div>

        </div>


        {/* FEATURE CARDS */}

        <div className="landing-features">

          <div className="feature-card">
            <div className="feature-icon">
              V
            </div>

            <h3>Vendor Management</h3>

            <p>
              Register, categorize, approve and monitor
              vendors from one centralized system.
            </p>
          </div>


          <div className="feature-card">
            <div className="feature-icon">
              P
            </div>

            <h3>Procurement Management</h3>

            <p>
              Manage procurement requests, purchase
              orders, invoices and order workflows.
            </p>
          </div>


          <div className="feature-card">
            <div className="feature-icon">
              C
            </div>

            <h3>Contracts & Compliance</h3>

            <p>
              Track contracts, renewal dates,
              compliance and vendor documentation.
            </p>
          </div>


          <div className="feature-card">
            <div className="feature-icon">
              R
            </div>

            <h3>Risk Management</h3>

            <p>
              Support better procurement decisions
              through centralized vendor information.
            </p>
          </div>

        </div>

      </main>


      {/* FOOTER */}

      <footer className="landing-footer">
        <p>
          © 2026 Vendor Reliability Intelligence Platform
        </p>
      </footer>

    </div>
  );
}

export default LandingPage;