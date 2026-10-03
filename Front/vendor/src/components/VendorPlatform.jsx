import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { VendorDashboard } from "./Dashboard";
import VendorManagement from "./VendorManagement";
import PurchaseOrders from "./PurchaseOrders";
import Contracts from "./Contracts";
import Communication from "./Communication";
import RequestOrders from "./RequestOrders";

const API_URL = "http://127.0.0.1:8000";
const staffRoles = [
  "System Administrator",
  "Procurement Manager",
  "Supply Chain Manager",
  "Finance Officer",
  "Auditor",
];

const sections = [
  { name: "Dashboard", icon: "▦" },
  { name: "Vendors", icon: "◉" },
  { name: "Orders", icon: "▣" },
  { name: "Request Orders", icon: "＋" },
  { name: "Contracts", icon: "▤" },
  { name: "Communication", icon: "✉" },
  { name: "Analytics", icon: "▥" },
];

const emptyDashboardData = {
  vendor: { company_name: "Vendor Network" },
  reliability: null,
  latestPerformance: null,
  vendorTrend: [],
  activeContracts: 0,
  vendorRenewalContracts: 0,
  vendorExpiredContracts: 0,
  vendorActiveContracts: 0,
  contracts: [],
  purchaseOrders: [],
  vendorOrderValue: 0,
  vendorMonthlyOrders: [],
  communicationCount: 0,
  unreadCommunications: 0,
  vendorScores: [],
};

async function fetchPlatformData(path) {
  const response = await fetch(`${API_URL}${path}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || `Unable to load ${path}`);
  }

  return data;
}

function VendorPlatform() {
  const [activeSection, setActiveSection] = useState("Dashboard");
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });
  const [dashboardData, setDashboardData] = useState(emptyDashboardData);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const isStaff = staffRoles.includes(user?.role?.trim());
  const darkMode = localStorage.getItem("vendorTheme") === "dark";

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      setLoading(true);
      setLoadError("");

      try {
        const data = await fetchPlatformData("/public/vendor-platform/dashboard");
        if (!cancelled) {
          setDashboardData(data);
        }
      } catch (loadException) {
        if (!cancelled) setLoadError(loadException.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  const dashboard = (
    <>
      {loading && <p className="vendor-platform-feedback">Loading vendor dashboard…</p>}
      {loadError && <p className="vendor-platform-error">{loadError}</p>}
      {!loading && !loadError && <VendorDashboard data={dashboardData} platform />}
    </>
  );

  const activeContent = () => {
    if (activeSection === "Dashboard") return dashboard;
    if (activeSection === "Request Orders") return <RequestOrders />;
    if (activeSection === "Vendors") return <VendorManagement publicMode />;
    if (activeSection === "Orders") return <PurchaseOrders publicMode />;
    if (activeSection === "Contracts") return <Contracts publicMode />;
    if (activeSection === "Communication") return <Communication publicMode />;
    if (activeSection === "Analytics") return <VendorDashboard data={dashboardData} platform />;
    return dashboard;
  };

  const sectionTitle = activeSection;

  return (
    <div className={`vendor-platform-workspace ${darkMode ? "dark-theme" : ""}`}>
      <aside className="vendor-platform-sidebar">
        <Link to="/" className="vendor-platform-sidebar-brand"><span>VI</span><strong>Vendor Platform</strong></Link>
        <nav aria-label="Vendor platform navigation">
          {sections.map((section) => (
            <button
              type="button"
              key={section.name}
              className={activeSection === section.name ? "active" : ""}
              onClick={() => setActiveSection(section.name)}
            >
              <span aria-hidden="true">{section.icon}</span>{section.name}
            </button>
          ))}
        </nav>
        <div className="vendor-platform-sidebar-bottom">
          {isStaff ? (
            <button type="button" onClick={() => { localStorage.removeItem("token"); localStorage.removeItem("user"); setUser(null); setActiveSection("Dashboard"); }}>Sign out</button>
          ) : null}
        </div>
      </aside>

      <main className="vendor-platform-main">
        {activeSection !== "Dashboard" && (
          <header className="vendor-platform-topbar">
            <div>
              <span>Vendor Intelligence</span>
              <h2>{sectionTitle}</h2>
            </div>
          </header>
        )}
        <section className="vendor-platform-content">{activeContent()}</section>
      </main>
    </div>
  );
}

export default VendorPlatform;