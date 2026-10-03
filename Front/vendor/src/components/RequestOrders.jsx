import { useEffect, useState } from "react";

const API_URL = "http://127.0.0.1:8000";

function RequestOrders() {
  const [requests, setRequests] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [vendorChoices, setVendorChoices] = useState({});
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadQueue = async () => {
      try {
        setLoading(true);
        setError("");
        const [requestsResponse, vendorsResponse] = await Promise.all([
          fetch(`${API_URL}/public/purchase-order-requests`),
          fetch(`${API_URL}/public/vendors`),
        ]);
        const requestsData = await requestsResponse.json();
        const vendorsData = await vendorsResponse.json();

        if (!requestsResponse.ok) {
          throw new Error(requestsData.detail || "Unable to load request orders");
        }
        if (!vendorsResponse.ok) {
          throw new Error(vendorsData.detail || "Unable to load vendors");
        }

        if (!cancelled) {
          setRequests(requestsData);
          setVendors(vendorsData.filter((vendor) => vendor.status === "Active"));
          setVendorChoices(Object.fromEntries(
            requestsData.map((request) => [request.id, ""])
          ));
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadQueue();
    return () => {
      cancelled = true;
    };
  }, []);

  const assignVendor = async (request) => {
    const vendorId = vendorChoices[request.id];
    if (!vendorId) {
      setError("Select an active vendor before assigning the request.");
      return;
    }

    setAssigningId(request.id);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/public/purchase-order-requests/${request.id}/assign`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vendor_id: Number(vendorId) }),
        }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to assign vendor");
      }

      setRequests((current) => current.filter((item) => item.id !== request.id));
      setMessage(`${request.request_number} assigned as ${data.po_number}.`);
    } catch (assignError) {
      setError(assignError.message);
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <div className="request-orders-page">
      <div className="page-header">
        <div>
          <h1>Request Orders</h1>
          <p>Assign active vendors to purchase requests from Procurement.</p>
        </div>
      </div>

      {message && <div className="success-message" role="status">{message}</div>}
      {error && <div className="error-message" role="alert">{error}</div>}

      <div className="vendor-table-card">
        <div className="table-header">
          <div>
            <h2>Open Requests</h2>
            <span>Total: {requests.length}</span>
          </div>
        </div>

        {loading ? (
          <p className="loading-text">Loading request orders...</p>
        ) : requests.length === 0 ? (
          <div className="empty-state">
            <h3>No request orders waiting</h3>
            <p>New Procurement requests without a vendor will appear here.</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Request</th>
                  <th>Items</th>
                  <th>Order Date</th>
                  <th>Delivery By</th>
                  <th>Total</th>
                  <th>Assign Vendor</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id}>
                    <td>
                      <strong>{request.request_number}</strong>
                      <div className="request-order-status">{request.status}</div>
                    </td>
                    <td>
                      <div className="request-order-items">
                        {request.items.map((item) => (
                          <span key={item.id}>
                            {item.item_name} × {item.quantity}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>{request.order_date || "-"}</td>
                    <td>{request.delivery_date || "-"}</td>
                    <td>₹{Number(request.total_amount || 0).toLocaleString("en-IN")}</td>
                    <td>
                      <select
                        aria-label={`Vendor for ${request.request_number}`}
                        value={vendorChoices[request.id] || ""}
                        onChange={(event) => setVendorChoices((current) => ({
                          ...current,
                          [request.id]: event.target.value,
                        }))}
                        disabled={vendors.length === 0 || assigningId === request.id}
                      >
                        <option value="">Select vendor</option>
                        {vendors.map((vendor) => (
                          <option key={vendor.id} value={vendor.id}>
                            {vendor.company_name} · {vendor.category}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="primary-button"
                        disabled={!vendorChoices[request.id] || assigningId === request.id}
                        onClick={() => assignVendor(request)}
                      >
                        {assigningId === request.id ? "Assigning..." : "Assign"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default RequestOrders;