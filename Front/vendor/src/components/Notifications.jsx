import { useEffect, useMemo, useState } from "react";

const API_URL = "https://vendor-intelligence-deployment.onrender.com";

function Notifications() {
  const token = localStorage.getItem("token");


  const [data, setData] = useState({
    procurements: [],
    purchaseOrders: [],
    vendors: [],
    contracts: [],
    performance: [],
  });

  const [readIds, setReadIds] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("notificationReadIds") ||
          "[]"
      );
    } catch {
      return [];
    }
  });

  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState(
    token ? "" : "Please login first"
  );

  // ============================================================
  // LOAD LIVE DATA
  // ============================================================

useEffect(() => {
  let cancelled = false;

  const loadNotifications = async () => {
    if (!token) {
      return;
    }

    try {
      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const currentUser = JSON.parse(
        localStorage.getItem("user") || "null"
      );

      const isVendor = currentUser?.role === "Vendor";

      // Requests available to all users
      const requests = [
        fetch(`${API_URL}/purchase-orders`, {
          headers,
        }),
        fetch(`${API_URL}/vendors`, {
          headers,
        }),
        fetch(`${API_URL}/contracts`, {
          headers,
        }),
        fetch(`${API_URL}/vendor-performance`, {
          headers,
        }),
      ];

      // Only non-vendors can access procurement requests
      if (!isVendor) {
        requests.unshift(
          fetch(`${API_URL}/procurements`, {
            headers,
          })
        );
      }

      const responses = await Promise.all(requests);

      let procurements = [];
      let purchaseOrders;
      let vendors;
      let contracts;
      let performance;

      if (!isVendor) {
        const procurementsResponse = responses[0];
        const purchaseOrdersResponse = responses[1];
        const vendorsResponse = responses[2];
        const contractsResponse = responses[3];
        const performanceResponse = responses[4];

        procurements = await procurementsResponse.json();
        purchaseOrders = await purchaseOrdersResponse.json();
        vendors = await vendorsResponse.json();
        contracts = await contractsResponse.json();
        performance = await performanceResponse.json();

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

        if (!contractsResponse.ok) {
          throw new Error(
            contracts.detail ||
              "Failed to load contracts"
          );
        }

        if (!performanceResponse.ok) {
          throw new Error(
            performance.detail ||
              "Failed to load performance"
          );
        }

      } else {
        // Vendor responses
        const purchaseOrdersResponse = responses[0];
        const vendorsResponse = responses[1];
        const contractsResponse = responses[2];
        const performanceResponse = responses[3];

        purchaseOrders =
          await purchaseOrdersResponse.json();

        vendors =
          await vendorsResponse.json();

        contracts =
          await contractsResponse.json();

        performance =
          await performanceResponse.json();

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

        if (!contractsResponse.ok) {
          throw new Error(
            contracts.detail ||
              "Failed to load contracts"
          );
        }

        if (!performanceResponse.ok) {
          throw new Error(
            performance.detail ||
              "Failed to load performance"
          );
        }
      }

      if (!cancelled) {
        setData({
          procurements,
          purchaseOrders,
          vendors,
          contracts,
          performance,
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

  loadNotifications();

  return () => {
    cancelled = true;
  };
}, [token]);

  // ============================================================
  // BUILD NOTIFICATIONS
  // ============================================================

  const notifications = useMemo(() => {
    const result = [];

    // ----------------------------------------------------------
    // PROCUREMENT ALERTS
    // ----------------------------------------------------------

    data.procurements.forEach((procurement) => {
      if (procurement.status === "Pending") {
        result.push({
          id: `procurement-pending-${procurement.id}`,
          type: "Procurement",
          title: "Procurement Pending",
          message: `${procurement.procurement_number} requires approval.`,
          date:
            procurement.start_date ||
            new Date().toISOString(),
        });
      }

      if (procurement.status === "Ordered") {
        result.push({
          id: `procurement-ordered-${procurement.id}`,
          type: "Procurement",
          title: "Procurement Ordered",
          message: `${procurement.procurement_number} has been ordered.`,
          date:
            procurement.start_date ||
            new Date().toISOString(),
        });
      }

      if (procurement.status === "Delivered") {
        result.push({
          id: `procurement-delivered-${procurement.id}`,
          type: "Procurement",
          title: "Procurement Delivered",
          message: `${procurement.procurement_number} has been delivered.`,
          date:
            procurement.end_date ||
            new Date().toISOString(),
        });
      }
    });

    // ----------------------------------------------------------
    // DELIVERY DELAY NOTIFICATIONS
    // ----------------------------------------------------------

    const today = new Date();

    data.purchaseOrders.forEach((po) => {
      if (
        po.delivery_date &&
        ![
          "Delivered",
          "Completed",
          "Cancelled",
        ].includes(po.status)
      ) {
        const deliveryDate =
          new Date(po.delivery_date);

        if (deliveryDate < today) {
          result.push({
            id: `delivery-delay-${po.id}`,
            type: "Delivery Delay",
            title: "Delivery Delayed",
            message: `${po.po_number} has passed its expected delivery date.`,
            date: po.delivery_date,
          });
        }
      }
    });

    // ----------------------------------------------------------
    // VENDOR APPROVAL NOTIFICATIONS
    // ----------------------------------------------------------

    data.vendors.forEach((vendor) => {
      if (vendor.status === "Pending") {
        result.push({
          id: `vendor-pending-${vendor.id}`,
          type: "Vendor Approval",
          title: "Vendor Approval Pending",
          message: `${vendor.company_name} is waiting for approval.`,
          date:
            new Date().toISOString(),
        });
      }

      if (vendor.status === "Rejected") {
        result.push({
          id: `vendor-rejected-${vendor.id}`,
          type: "Vendor Approval",
          title: "Vendor Rejected",
          message: `${vendor.company_name} has been rejected.`,
          date:
            new Date().toISOString(),
        });
      }
    });

    // ----------------------------------------------------------
    // CONTRACT EXPIRY ALERTS
    // ----------------------------------------------------------

    const thirtyDaysFromNow =
      new Date();

    thirtyDaysFromNow.setDate(
      thirtyDaysFromNow.getDate() + 30
    );

    data.contracts.forEach((contract) => {
      if (!contract.end_date) {
        return;
      }

      const endDate =
        new Date(contract.end_date);

      if (
        contract.status === "Expired" ||
        endDate < today
      ) {
        result.push({
          id: `contract-expired-${contract.id}`,
          type: "Contract",
          title: "Contract Expired",
          message: `${contract.contract_number} has expired.`,
          date: contract.end_date,
        });

        return;
      }

      if (
        contract.status === "Active" &&
        endDate <= thirtyDaysFromNow
      ) {
        result.push({
          id: `contract-expiry-${contract.id}`,
          type: "Contract",
          title: "Contract Expiry Alert",
          message: `${contract.contract_number} expires within 30 days.`,
          date: contract.end_date,
        });
      }
    });

    // ----------------------------------------------------------
    // COMPLIANCE NOTIFICATIONS
    // ----------------------------------------------------------

    data.performance.forEach((record) => {
      if (
        record.compliance_score !== null &&
        record.compliance_score !== undefined &&
        Number(record.compliance_score) < 70
      ) {
        const vendor = data.vendors.find(
          (item) =>
            item.id === record.vendor_id
        );

        result.push({
          id: `compliance-${record.id}`,
          type: "Compliance",
          title: "Compliance Alert",
          message: `${
            vendor?.company_name ||
            `Vendor #${record.vendor_id}`
          } has a compliance score below 70.`,
          date:
            record.evaluated_at ||
            new Date().toISOString(),
        });
      }
    });

    return result.sort(
      (a, b) =>
        new Date(b.date) -
        new Date(a.date)
    );
  }, [data]);

  // ============================================================
  // FILTER
  // ============================================================

  const filteredNotifications =
    filter === "All"
      ? notifications
      : notifications.filter(
          (item) =>
            item.type === filter
        );

  // ============================================================
  // READ / UNREAD
  // ============================================================

  const isRead = (id) =>
    readIds.includes(id);

  const markAsRead = (id) => {
    const updated = readIds.includes(id)
      ? readIds
      : [...readIds, id];

    setReadIds(updated);

    localStorage.setItem(
      "notificationReadIds",
      JSON.stringify(updated)
    );
  };

  const markAllAsRead = () => {
    const allIds = notifications.map(
      (item) => item.id
    );

    setReadIds(allIds);

    localStorage.setItem(
      "notificationReadIds",
      JSON.stringify(allIds)
    );
  };

  const unreadCount =
    notifications.filter(
      (item) => !isRead(item.id)
    ).length;

  // ============================================================
  // UI
  // ============================================================

  return (
    <div>

      <div className="page-header">

        <div>
          <h1>Notifications</h1>

          <p>
            Procurement, delivery, vendor,
            contract and compliance alerts.
          </p>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={markAllAsRead}
        >
          Mark All as Read
        </button>

      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* SUMMARY */}

      <div className="dashboard-grid">

        <div className="stat-card">
          <h3>Total Notifications</h3>
          <p>{notifications.length}</p>
        </div>

        <div className="stat-card">
          <h3>Unread</h3>
          <p>{unreadCount}</p>
        </div>

        <div className="stat-card">
          <h3>Delivery Delays</h3>
          <p>
            {
              notifications.filter(
                (item) =>
                  item.type ===
                  "Delivery Delay"
              ).length
            }
          </p>
        </div>

        <div className="stat-card">
          <h3>Compliance Alerts</h3>
          <p>
            {
              notifications.filter(
                (item) =>
                  item.type ===
                  "Compliance"
              ).length
            }
          </p>
        </div>

      </div>

      {/* FILTER */}

      <div className="filter-bar">

        <select
          value={filter}
          onChange={(e) =>
            setFilter(e.target.value)
          }
        >
          <option value="All">
            All Notifications
          </option>

          <option value="Procurement">
            Procurement
          </option>

          <option value="Delivery Delay">
            Delivery Delay
          </option>

          <option value="Vendor Approval">
            Vendor Approval
          </option>

          <option value="Contract">
            Contract
          </option>

          <option value="Compliance">
            Compliance
          </option>
        </select>

      </div>

      {/* LIST */}

      <div className="table-container">

        {loading ? (
          <p className="loading-text">
            Loading notifications...
          </p>
        ) : filteredNotifications.length ===
          0 ? (
          <div className="empty-state">
            <h3>
              No notifications found
            </h3>

            <p>
              There are currently no alerts
              for this category.
            </p>
          </div>
        ) : (
          <table>

            <thead>
              <tr>
                <th>Type</th>
                <th>Notification</th>
                <th>Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>

              {filteredNotifications.map(
                (notification) => {

                  const read =
                    isRead(
                      notification.id
                    );

                  return (
                    <tr
                      key={
                        notification.id
                      }
                    >

                      <td>
                        {notification.type}
                      </td>

                      <td>
                        <strong>
                          {
                            notification.title
                          }
                        </strong>

                        <br />

                        <span>
                          {
                            notification.message
                          }
                        </span>
                      </td>

                      <td>
                        {notification.date
                          ? new Date(
                              notification.date
                            ).toLocaleDateString(
                              "en-IN"
                            )
                          : "-"}
                      </td>

                      <td>
                        {read
                          ? "Read"
                          : "Unread"}
                      </td>

                      <td>
                        {!read && (
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() =>
                              markAsRead(
                                notification.id
                              )
                            }
                          >
                            Mark as Read
                          </button>
                        )}
                      </td>

                    </tr>
                  );
                }
              )}

            </tbody>

          </table>
        )}

      </div>

    </div>
  );
}

export default Notifications;