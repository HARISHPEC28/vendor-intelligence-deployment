import { useEffect, useState } from "react";

const API_URL = "https://vendor-intelligence-deployment.onrender.com";

function Analytics() {
  const token = localStorage.getItem("token");

  const [data, setData] = useState({
    procurements: [],
    purchaseOrders: [],
    vendors: [],
    performance: [],
    contracts: [],
    communications: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadAnalytics = async () => {
      try {
        const headers = {
          Authorization: `Bearer ${token}`,
        };

        const [
          procurementsResponse,
          purchaseOrdersResponse,
          vendorsResponse,
          performanceResponse,
          contractsResponse,
          communicationsResponse,
        ] = await Promise.all([
          fetch(`${API_URL}/procurements`, { headers }),
          fetch(`${API_URL}/purchase-orders`, { headers }),
          fetch(`${API_URL}/vendors`, { headers }),
          fetch(`${API_URL}/vendor-performance`, { headers }),
          fetch(`${API_URL}/contracts`, { headers }),
          fetch(`${API_URL}/communications`, { headers }),
        ]);

        const procurements =
          await procurementsResponse.json();

        const purchaseOrders =
          await purchaseOrdersResponse.json();

        const vendors =
          await vendorsResponse.json();

        const performance =
          await performanceResponse.json();

        const contracts =
          await contractsResponse.json();

        const communications =
          await communicationsResponse.json();

        if (!procurementsResponse.ok) {
          throw new Error(
            procurements.detail ||
              "Failed to load procurements"
          );
        }

        if (!purchaseOrdersResponse.ok) {
          throw new Error(
            purchaseOrders.detail ||
              "Failed to load purchase orders"
          );
        }

        if (!vendorsResponse.ok) {
          throw new Error(
            vendors.detail ||
              "Failed to load vendors"
          );
        }

        if (!performanceResponse.ok) {
          throw new Error(
            performance.detail ||
              "Failed to load vendor performance"
          );
        }

        if (!contractsResponse.ok) {
          throw new Error(
            contracts.detail ||
              "Failed to load contracts"
          );
        }

        if (!communicationsResponse.ok) {
          throw new Error(
            communications.detail ||
              "Failed to load communications"
          );
        }

        if (!cancelled) {
          setData({
            procurements,
            purchaseOrders,
            vendors,
            performance,
            contracts,
            communications,
          });

          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    loadAnalytics();

    return () => {
      cancelled = true;
    };
  }, [token]);

  // ============================================================
  // PROCUREMENT ANALYTICS
  // ============================================================

  const totalRequests = data.procurements.length;

  const pendingRequests = data.procurements.filter(
    (item) => item.status === "Pending"
  ).length;

  const approvedRequests = data.procurements.filter(
    (item) => item.status === "Approved"
  ).length;

  const completedRequests = data.procurements.filter(
    (item) => item.status === "Completed"
  ).length;

  const procurementValue = data.procurements.reduce(
    (total, item) =>
      total + Number(item.budget || 0),
    0
  );

  const completionRate =
    totalRequests > 0
      ? (completedRequests / totalRequests) * 100
      : 0;

  // ============================================================
  // PURCHASE ORDER ANALYTICS
  // ============================================================

  const activePOs = data.purchaseOrders.filter(
    (po) =>
      ![
        "Completed",
        "Cancelled",
      ].includes(po.status)
  ).length;

  const orderedPOs = data.purchaseOrders.filter(
    (po) =>
      po.status === "Ordered"
  ).length;

  const deliveredPOs = data.purchaseOrders.filter(
    (po) =>
      po.status === "Delivered"
  ).length;

  const purchaseOrderValue = data.purchaseOrders.reduce(
    (total, po) =>
      total + Number(po.total_amount || 0),
    0
  );

  const today = new Date();

  const overduePOs = data.purchaseOrders.filter(
    (po) => {
      if (
        !po.delivery_date ||
        [
          "Delivered",
          "Completed",
          "Cancelled",
        ].includes(po.status)
      ) {
        return false;
      }

      return (
        new Date(po.delivery_date) < today
      );
    }
  ).length;

  // ============================================================
  // CONTRACT ANALYTICS
  // ============================================================

  const activeContracts =
    data.contracts.filter(
      (contract) =>
        contract.status === "Active"
    ).length;

  const expiredContracts =
    data.contracts.filter(
      (contract) =>
        contract.status === "Expired"
    ).length;

  // ============================================================
  // VENDOR PERFORMANCE
  // ============================================================

  const performanceByVendor =
    data.vendors.map((vendor) => {
      const vendorRecords =
        data.performance.filter(
          (record) =>
            record.vendor_id === vendor.id
        );

      const latest =
        vendorRecords.length > 0
          ? vendorRecords[
              vendorRecords.length - 1
            ]
          : null;

      return {
        ...vendor,
        rating: latest?.rating ?? null,
        quality: latest?.quality_score ?? null,
        delivery:
          latest?.delivery_score ?? null,
        compliance:
          latest?.compliance_score ?? null,
      };
    });

  const ratedVendors =
    performanceByVendor.filter(
      (vendor) =>
        vendor.rating !== null
    );

  const averageVendorRating =
    ratedVendors.length > 0
      ? ratedVendors.reduce(
          (sum, vendor) =>
            sum + Number(vendor.rating),
          0
        ) / ratedVendors.length
      : 0;

  return (
    <div>

      {/* HEADER */}

      <div className="page-header">
        <div>
          <h1>Analytics Dashboard</h1>

          <p>
            Real-time procurement and vendor
            intelligence.
          </p>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {loading ? (
        <p className="loading-text">
          Loading analytics...
        </p>
      ) : (
        <>
          {/* PROCUREMENT */}

          <h2>Procurement Overview</h2>

          <div className="dashboard-grid">

            <div className="stat-card">
              <h3>Total Requests</h3>
              <p>{totalRequests}</p>
            </div>

            <div className="stat-card">
              <h3>Pending Requests</h3>
              <p>{pendingRequests}</p>
            </div>

            <div className="stat-card">
              <h3>Approved Requests</h3>
              <p>{approvedRequests}</p>
            </div>

            <div className="stat-card">
              <h3>Completed Requests</h3>
              <p>{completedRequests}</p>
            </div>

            <div className="stat-card">
              <h3>Procurement Value</h3>
              <p>
                ₹
                {procurementValue.toLocaleString(
                  "en-IN",
                  {
                    maximumFractionDigits: 2,
                  }
                )}
              </p>
            </div>

            <div className="stat-card">
              <h3>Completion Rate</h3>
              <p>
                {completionRate.toFixed(2)}%
              </p>
            </div>

          </div>

          {/* PURCHASE ORDERS */}

          <h2>Purchase Order Overview</h2>

          <div className="dashboard-grid">

            <div className="stat-card">
              <h3>Active POs</h3>
              <p>{activePOs}</p>
            </div>

            <div className="stat-card">
              <h3>Ordered POs</h3>
              <p>{orderedPOs}</p>
            </div>

            <div className="stat-card">
              <h3>Delivered POs</h3>
              <p>{deliveredPOs}</p>
            </div>

            <div className="stat-card">
              <h3>Overdue POs</h3>
              <p>{overduePOs}</p>
            </div>

            <div className="stat-card">
              <h3>PO Value</h3>
              <p>
                ₹
                {purchaseOrderValue.toLocaleString(
                  "en-IN",
                  {
                    maximumFractionDigits: 2,
                  }
                )}
              </p>
            </div>

          </div>

          {/* VENDOR SUMMARY */}

          <h2>Vendor Performance Summary</h2>

          <div className="dashboard-grid">

            <div className="stat-card">
              <h3>Total Vendors</h3>
              <p>{data.vendors.length}</p>
            </div>

            <div className="stat-card">
              <h3>Rated Vendors</h3>
              <p>{ratedVendors.length}</p>
            </div>

            <div className="stat-card">
              <h3>Average Rating</h3>
              <p>
                {averageVendorRating.toFixed(2)}
              </p>
            </div>

            <div className="stat-card">
              <h3>Active Contracts</h3>
              <p>{activeContracts}</p>
            </div>

            <div className="stat-card">
              <h3>Expired Contracts</h3>
              <p>{expiredContracts}</p>
            </div>

          </div>

          {/* VENDOR TABLE */}

          <div className="table-container">

            <h2>Vendor Performance Details</h2>

            {performanceByVendor.length === 0 ? (
              <div className="empty-state">
                <h3>
                  No vendor data available
                </h3>
              </div>
            ) : (
              <table>

                <thead>
                  <tr>
                    <th>Vendor</th>
                    <th>Rating</th>
                    <th>Quality</th>
                    <th>Delivery</th>
                    <th>Compliance</th>
                  </tr>
                </thead>

                <tbody>
                  {performanceByVendor.map(
                    (vendor) => (
                      <tr key={vendor.id}>

                        <td>
                          {vendor.company_name}
                        </td>

                        <td>
                          {vendor.rating ?? "-"}
                        </td>

                        <td>
                          {vendor.quality ?? "-"}
                        </td>

                        <td>
                          {vendor.delivery ?? "-"}
                        </td>

                        <td>
                          {vendor.compliance ?? "-"}
                        </td>

                      </tr>
                    )
                  )}
                </tbody>

              </table>
            )}

          </div>

          {/* DELIVERY STATUS */}

          <div className="table-container">

            <h2>Delivery Status</h2>

            <table>

              <thead>
                <tr>
                  <th>Status</th>
                  <th>Count</th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td>Ordered</td>
                  <td>{orderedPOs}</td>
                </tr>

                <tr>
                  <td>Delivered</td>
                  <td>{deliveredPOs}</td>
                </tr>

                <tr>
                  <td>Overdue</td>
                  <td>{overduePOs}</td>
                </tr>

              </tbody>

            </table>

          </div>

          {/* COMMUNICATION */}

          <div className="table-container">

            <h2>Communication Activity</h2>

            <p>
              Total communications:{" "}
              <strong>
                {data.communications.length}
              </strong>
            </p>

          </div>

        </>
      )}

    </div>
  );
}

export default Analytics;