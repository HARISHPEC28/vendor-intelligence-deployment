import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import Login from "./components/Login";
import Register from "./components/Register";
import Dashboard from "./components/Dashboard";
import Layout from "./components/Layout";

import Contracts from "./components/Contracts";
import VendorManagement from "./components/VendorManagement";
import Procurement from "./components/Procurement";
import PurchaseOrders from "./components/PurchaseOrders";
import VendorPerformance from "./components/VendorPerformance";
import Reports from "./components/Reports";
import Notifications from "./components/Notifications";
import Communication from "./components/Communication";
import Invoices from "./components/Invoices";
import Profile from "./components/Profile";
import LandingPage from "./components/LandingPage";
import Compliance from "./components/Compliance";
import VendorPlatform from "./components/VendorPlatform";

import "./App.css";

function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user")) || null;
  } catch {
    return null;
  }
}

function ProtectedRoute({ children, allowedRoles = [] }) {
  const location = useLocation();
  const token = localStorage.getItem("token");
  const user = getUser();

  if (!token || !user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  const userRole = user.role?.trim();

  if (
    allowedRoles.length > 0 &&
    userRole !== "System Administrator" &&
    !allowedRoles.includes(userRole)
  ) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* LANDING PAGE */}
          <Route
            path="/"
            element={<LandingPage />}
          />

        {/* AUTH */}
        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        {/* DASHBOARD - ALL 7 ROLES */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute
                allowedRoles={[
                  "System Administrator",
                  "Company Administrator",
                  "Procurement Manager",
                  "Supply Chain Manager",
                  "Vendor",
                  "Finance Officer",
                  "Auditor",
                ]}
              >
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

            {/* VENDOR MANAGEMENT */}
            <Route
              path="/vendors"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    "Procurement Manager",
                    "Supply Chain Manager",
                    "Vendor",
                  ]}
                >
                  <Layout>
                    <VendorManagement />
                  </Layout>
                </ProtectedRoute>
              }
            />

        <Route
          path="/vendor-platform"
          element={<VendorPlatform />}
        />

        {/* PROCUREMENT */}
          <Route
            path="/procurement"
            element={
              <ProtectedRoute
                allowedRoles={[
                  "Company Administrator",
                  "Procurement Manager",
                  "Supply Chain Manager",
                ]}
              >
                <Layout>
                  <Procurement />
                </Layout>
              </ProtectedRoute>
            }
          />

        {/* PURCHASE ORDERS */}
        <Route
          path="/purchase-orders"
          element={
            <ProtectedRoute
              allowedRoles={[
                "Company Administrator",
                "Procurement Manager",
                "Supply Chain Manager",
              ]}
            >
              <Layout>
                <PurchaseOrders />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* VENDOR PERFORMANCE */}
        <Route
          path="/vendor-performance"
          element={
            <ProtectedRoute
              allowedRoles={[
                "Company Administrator",
                "Procurement Manager",
                "Supply Chain Manager",
                "Vendor",
              ]}
            >
              <Layout>
                <VendorPerformance />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* ANALYTICS */}
        <Route
          path="/analytics"
          element={
            <ProtectedRoute
              allowedRoles={[
                "Company Administrator",
                "Procurement Manager",
                "Supply Chain Manager",
                "Finance Officer",
                "Auditor",
              ]}
            >
              <Layout>
                  <Dashboard analyticsView />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* REPORTS */}
        <Route
          path="/reports"
          element={
            <ProtectedRoute
              allowedRoles={[
                "Company Administrator",
                "Procurement Manager",
                "Finance Officer",
                "Auditor",
              ]}
            >
              <Layout>
                <Reports />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* NOTIFICATIONS - ALL 6 */}
        <Route
          path="/notifications"
          element={
            <ProtectedRoute
              allowedRoles={[
                "Company Administrator",
                "Procurement Manager",
                "Supply Chain Manager",
                "Vendor",
                "Finance Officer",
                "Auditor",
              ]}
            >
              <Layout>
                <Notifications />
              </Layout>
            </ProtectedRoute>
          }
        />

{/* CONTRACT & COMPLIANCE */}
<Route
  path="/contracts"
  element={
    <ProtectedRoute
      allowedRoles={[
        "Company Administrator",
        "Procurement Manager",
        "Supply Chain Manager",
        "Vendor",
        "Finance Officer",
        "Auditor",
      ]}
    >
      <Layout>
        <Contracts />
      </Layout>
    </ProtectedRoute>
  }
/>


<Route
  path="/communication"
  element={
    <ProtectedRoute
      allowedRoles={[
        "Company Administrator",
        "Procurement Manager",
        "Supply Chain Manager",
        "Vendor",
        "Finance Officer",
        "Auditor",
      ]}
    >
      <Layout>
        <Communication />
      </Layout>
    </ProtectedRoute>
  }
/>


{/* CONTRACT & COMPLIANCE */}

<Route
  path="/contracts"
  element={
    <ProtectedRoute
      allowedRoles={[
        "Company Administrator",
        "Procurement Manager",
        "Supply Chain Manager",
        "Vendor",
        "Finance Officer",
        "Auditor",
      ]}
    >
      <Layout>
        <Contracts />
      </Layout>
    </ProtectedRoute>
  }
/>


{/* COMMUNICATION */}

<Route
  path="/communication"
  element={
    <ProtectedRoute
      allowedRoles={[
        "Company Administrator",
        "Procurement Manager",
        "Supply Chain Manager",
        "Vendor",
        "Finance Officer",
        "Auditor",
      ]}
    >
      <Layout>
        <Communication />
      </Layout>
    </ProtectedRoute>
  }
/>


{/* INVOICES */}

<Route
  path="/invoices"
  element={
    <ProtectedRoute
      allowedRoles={[
        "Company Administrator",
        "Procurement Manager",
        "Finance Officer",
        "Auditor",
      ]}
    >
      <Layout>
        <Invoices />
      </Layout>
    </ProtectedRoute>
  }
/>


<Route
  path="/invoices"
  element={
    <ProtectedRoute
      allowedRoles={[
        "Company Administrator",
        "Procurement Manager",
        "Finance Officer",
        "Auditor",
      ]}
    >
      <Layout>
        <Invoices />
      </Layout>
    </ProtectedRoute>
  }
/>



<Route
  path="/profile"
  element={
    <ProtectedRoute
      allowedRoles={[
        "Company Administrator",
        "Procurement Manager",
        "Supply Chain Manager",
        "Vendor",
        "Finance Officer",
        "Auditor",
      ]}
    >
      <Layout>
        <Profile />
      </Layout>
    </ProtectedRoute>
  }
/>



        {/* UNKNOWN ROUTE */}
        <Route
          path="*"
          element={<Navigate to="/dashboard" replace />}
        />



        <Route
        path="/compliance"
        element={
          <ProtectedRoute
            allowedRoles={[
              "System Administrator",
              "Procurement Manager",
              "Supply Chain Manager",
              "Finance Officer",
              "Auditor",
              "Vendor",
            ]}
          >
            <Compliance />
          </ProtectedRoute>
        }
      />


        

      </Routes>
    </BrowserRouter>
  );
}

export default App;