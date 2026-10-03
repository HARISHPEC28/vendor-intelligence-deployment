import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  // =========================================================
  // THEME
  // =========================================================

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("vendorTheme") === "dark";
  });

  useEffect(() => {
    localStorage.setItem(
      "vendorTheme",
      darkMode ? "dark" : "light"
    );
  }, [darkMode]);

  // =========================================================
  // USER
  // =========================================================

  const user = JSON.parse(
    localStorage.getItem("user") || "null"
  );

  const role = user?.role?.trim();

  // =========================================================
  // LOGOUT
  // =========================================================

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  // =========================================================
  // ROLE ACCESS
  // =========================================================

  const isAllowed = (roles) =>
    role === "System Administrator" || roles.includes(role);

  // =========================================================
  // PAGE TITLE
  // =========================================================

  const getPageTitle = () => {
    const titles = {
      "/dashboard": "DASHBOARD",
      "/vendors": "VENDOR MANAGEMENT",
      "/vendor-platform": "VENDOR PLATFORM",
      "/procurement": "PROCUREMENT",
      "/purchase-orders": "PURCHASE ORDERS",
      "/vendor-performance": "VENDOR PERFORMANCE",
      "/contracts": "CONTRACT & COMPLIANCE",
      "/communication": "COMMUNICATION",
      "/analytics": "ANALYTICS",
      "/reports": "REPORTS",
      "/invoices": "INVOICES",
      "/notifications": "NOTIFICATIONS",
      "/profile": "PROFILE",
    };

    return titles[location.pathname] || "DASHBOARD";
  };

  return (
    <div
      className={`app-layout ${
        darkMode ? "dark-theme" : ""
      }`}
    >

      {/* =====================================================
          SIDEBAR
          ===================================================== */}

      <aside className="sidebar">

        <div className="sidebar-logo">
          Vendor Intelligence
        </div>

        <nav>

          {/* DASHBOARD */}

          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              isActive ? "active" : ""
            }
          >
            Dashboard
          </NavLink>


          {/* VENDORS */}

          {/* VENDORS */}

        {(
          role === "System Administrator" ||
          role === "Procurement Manager" ||
          role === "Supply Chain Manager" ||
          role === "Finance Officer" ||
          role === "Auditor" ||
          role === "Vendor"
        ) && (
            <NavLink
              to="/vendors"
              className={({ isActive }) =>
                isActive ? "active" : ""
              }
            >
              Vendors
            </NavLink>
          )}


          {/* PROCUREMENT */}

          {isAllowed([
            "Procurement Manager",
            "Supply Chain Manager",
          ]) && (
            <NavLink
              to="/procurement"
              className={({ isActive }) =>
                isActive ? "active" : ""
              }
            >
              Procurement
            </NavLink>
          )}


          {/* PURCHASE ORDERS */}

          {isAllowed([
            "Procurement Manager",
            "Supply Chain Manager",
          ]) && (
            <NavLink
              to="/purchase-orders"
              className={({ isActive }) =>
                isActive ? "active" : ""
              }
            >
              Purchase Orders
            </NavLink>
          )}


          {/* PERFORMANCE */}

          {isAllowed([
            "Procurement Manager",
            "Supply Chain Manager",
            "Vendor",
          ]) && (
            <NavLink
              to="/vendor-performance"
              className={({ isActive }) =>
                isActive ? "active" : ""
              }
            >
              Performance
            </NavLink>
          )}


          {/* CONTRACTS */}

          {isAllowed([
          
            "Procurement Manager",
            "Supply Chain Manager",
            "Vendor",
            "Finance Officer",
            "Auditor",
          ]) && (
            <NavLink
              to="/contracts"
              className={({ isActive }) =>
                isActive ? "active" : ""
              }
            >
              Contracts
            </NavLink>
          )}


          {/* COMMUNICATION */}

          {isAllowed([
            "Company Administrator",
            "Procurement Manager",
            "Supply Chain Manager",
            "Vendor",
            "Finance Officer",
            "Auditor",
          ]) && (
            <NavLink
              to="/communication"
              className={({ isActive }) =>
                isActive ? "active" : ""
              }
            >
              Communication
            </NavLink>
          )}


          {/* INVOICES */}

          {isAllowed([
            "Procurement Manager",
            "Finance Officer",
            "Auditor",
          ]) && (
            <NavLink
              to="/invoices"
              className={({ isActive }) =>
                isActive ? "active" : ""
              }
            >
              Invoices
            </NavLink>
          )}


          {/* ANALYTICS */}

          {isAllowed([
            "Procurement Manager",
            "Supply Chain Manager",
            "Finance Officer",
            "Auditor",
          ]) && (
            <NavLink
              to="/analytics"
              className={({ isActive }) =>
                isActive ? "active" : ""
              }
            >
              Analytics
            </NavLink>
          )}


          {/* REPORTS */}

          {isAllowed([
            "Procurement Manager",
            "Finance Officer",
            "Auditor",
          ]) && (
            <NavLink
              to="/reports"
              className={({ isActive }) =>
                isActive ? "active" : ""
              }
            >
              Reports
            </NavLink>
          )}


          {/* PROFILE */}

          <NavLink
            to="/profile"
            className={({ isActive }) =>
              isActive ? "active" : ""
            }
          >
            Profile
          </NavLink>


          {/* NOTIFICATIONS */}

          <NavLink
            to="/notifications"
            className={({ isActive }) =>
              isActive ? "active" : ""
            }
          >
            Notifications
          </NavLink>

        </nav>

      </aside>


      {/* =====================================================
          MAIN CONTENT
          ===================================================== */}

      <main className="main-content">

        <header className="top-navbar">

          <h2>
            {getPageTitle()}
          </h2>


          <div className="top-navbar-right">

            {/* THEME SWITCH */}

            <button
              type="button"
              className={`theme-toggle ${
                darkMode ? "dark" : ""
              }`}
              onClick={() => setDarkMode(!darkMode)}
              aria-label={
                darkMode
                  ? "Switch to light theme"
                  : "Switch to dark theme"
              }
              title={
                darkMode
                  ? "Switch to light theme"
                  : "Switch to dark theme"
              }
            >

              <span className="theme-icon">
                ☀
              </span>

              <span className="theme-track">
                <span className="theme-thumb"></span>
              </span>

              <span className="theme-icon">
                ☾
              </span>

            </button>


            {/* USER */}

            <span>
              {user?.name} ({user?.role})
            </span>


            {/* LOGOUT */}

            <button
              type="button"
              className="logout-button"
              onClick={handleLogout}
            >
              Logout
            </button>

          </div>

        </header>


        <section className="page-content">
          {children}
        </section>

      </main>

    </div>
  );
}

export default Layout;