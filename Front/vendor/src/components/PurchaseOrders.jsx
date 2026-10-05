import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

const API_URL = "https://vendor-intelligence-deployment.onrender.com";

function getReadUrl(path, publicMode) {
  return `${API_URL}${publicMode ? `/public${path}` : path}`;
}

function getReadOptions(publicMode, token) {
  return publicMode ? {} : { headers: { Authorization: `Bearer ${token}` } };
}

const statuses = [
  "Pending",
  "Approved",
  "Ordered",
  "Delivered",
  "Completed",
  "Cancelled",
];

const paymentTermsOptions = [
  "Net 15",
  "Net 30",
  "Net 45",
  "Net 60",
];

function PurchaseOrders({ publicMode = false }) {
  const location = useLocation();

  // ==========================================================
  // PROCUREMENT ID PASSED FROM PROCUREMENT PAGE
  // ==========================================================

  const procurementIdFromNavigation =
    location.state?.procurementId || "";

  // ==========================================================
  // STATES
  // ==========================================================

  const [orders, setOrders] = useState([]);
  const [requestOrders, setRequestOrders] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [activeList, setActiveList] = useState("orders");

  const [search, setSearch] = useState("");
  const [vendorFilter, setVendorFilter] =
    useState("All Vendors");
  const [statusFilter, setStatusFilter] =
    useState("All Status");

  const [showForm, setShowForm] = useState(
    Boolean(procurementIdFromNavigation)
  );

  const [formMode, setFormMode] = useState("purchase-order");

 

  const [selectedOrder, setSelectedOrder] =
    useState(null);

  const [loading, setLoading] = useState(
    () => publicMode || Boolean(localStorage.getItem("token"))
  );

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // ==========================================================
  // FORM DATA
  // ==========================================================

  const [formData, setFormData] = useState({
    vendor_id: "",
    procurement_id: procurementIdFromNavigation,
    delivery_date: "",
    payment_terms: "Net 15",
    items: [
      {
        item_name: "",
        quantity: 1,
        unit_price: "",
      },
    ],
  });

  const token = localStorage.getItem("token");

  const user = JSON.parse(
    localStorage.getItem("user") || "null"
  );

  // ==========================================================
  // PERMISSIONS
  // ==========================================================

  const canCreate = [
    "System Administrator",
    "Procurement Manager",
    "Supply Chain Manager",
  ].includes(user?.role) && !publicMode;

  const canUpdateStatus = [
    "System Administrator",
    "Procurement Manager",
    "Supply Chain Manager",
  ].includes(user?.role) && !publicMode;

  const canViewRequests = [
    "System Administrator",
    "Procurement Manager",
  ].includes(user?.role) && !publicMode;

  // ==========================================================
  // LOAD ORDERS + VENDORS
  // ==========================================================

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        setLoading(true);
        setError("");

        if (!token && !publicMode) {
          if (!cancelled) {
            setLoading(false);
          }
          return;
        }

        const [ordersResponse, vendorsResponse, requestsResponse] =
          await Promise.all([
            fetch(
              getReadUrl("/purchase-orders", publicMode),
              getReadOptions(publicMode, token)
            ),
            fetch(
              getReadUrl("/vendors", publicMode),
              getReadOptions(publicMode, token)
            ),
            canViewRequests
              ? fetch(`${API_URL}/purchase-order-requests`, {
                  headers: { Authorization: `Bearer ${token}` },
                })
              : Promise.resolve(null),
          ]);

        const ordersData =
          await ordersResponse.json();

        const vendorsData =
          await vendorsResponse.json();
        const requestsData = requestsResponse
          ? await requestsResponse.json()
          : [];

        if (!ordersResponse.ok) {
          throw new Error(
            ordersData.detail ||
              "Failed to load purchase orders"
          );
        }

        if (!vendorsResponse.ok) {
          throw new Error(
            vendorsData.detail ||
              "Failed to load vendors"
          );
        }

        if (requestsResponse && !requestsResponse.ok) {
          throw new Error(
            requestsData.detail || "Failed to load request orders"
          );
        }

        if (!cancelled) {
          setOrders(
            Array.isArray(ordersData)
              ? ordersData
              : []
          );

          setVendors(
            Array.isArray(vendorsData)
              ? vendorsData
              : []
          );

          setRequestOrders(
            Array.isArray(requestsData) ? requestsData : []
          );

          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.message ||
              "Failed to load purchase order data"
          );
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [token, publicMode, canViewRequests]);



  useEffect(() => {
  const loadLinkedProcurement = async () => {
    if (publicMode || !procurementIdFromNavigation) {
      
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/procurements/${procurementIdFromNavigation}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to load procurement request"
        );
      }

    

      setFormData((previous) => ({
        ...previous,

        procurement_id: data.id,

        // Auto-select vendor only if the procurement
        // already has one assigned.
        vendor_id: data.vendor_id
          ? String(data.vendor_id)
          : "",

        // Procurement item becomes PO line item.
        items: [
          {
            item_name: data.title || "",
            description: data.description || "",
            quantity: Number(data.quantity || 1),
            unit_price: Number(data.unit_price || 0),
          },
        ],

        // Procurement needed date becomes
        // PO expected delivery date.
        delivery_date: data.needed_date || "",

        payment_terms: previous.payment_terms || "Net 15",
      }));

      setError("");
    } catch (err) {
     setError(err.message);
    }
  };

  loadLinkedProcurement();
}, [procurementIdFromNavigation, publicMode]);

  // ==========================================================
  // RELOAD PURCHASE ORDERS
  // ==========================================================

  const loadOrders = async () => {
    try {
      const response = await fetch(
        getReadUrl("/purchase-orders", publicMode),
        getReadOptions(publicMode, token)
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Failed to load purchase orders"
        );
      }

      setOrders(
        Array.isArray(data) ? data : []
      );
    } catch (err) {
      setError(
        err.message ||
          "Failed to load purchase orders"
      );
    }
  };

  // ==========================================================
  // ITEM CHANGE
  // ==========================================================

  const handleItemChange = (
    index,
    field,
    value
  ) => {
    const updatedItems = [...formData.items];

    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value,
    };

    setFormData({
      ...formData,
      items: updatedItems,
    });
  };

  // ==========================================================
  // ADD ITEM
  // ==========================================================

  const addItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          item_name: "",
          quantity: 1,
          unit_price: "",
        },
      ],
    });
  };

  // ==========================================================
  // REMOVE ITEM
  // ==========================================================

  const removeItem = (index) => {
    if (formData.items.length === 1) {
      return;
    }

    setFormData({
      ...formData,
      items: formData.items.filter(
        (_, itemIndex) =>
          itemIndex !== index
      ),
    });
  };

  // ==========================================================
  // RESET FORM
  // ==========================================================

  const resetForm = () => {
    setFormData({
      vendor_id: "",
      procurement_id: "",
      delivery_date: "",
      payment_terms: "Net 15",
      items: [
        {
          item_name: "",
          quantity: 1,
          unit_price: "",
        },
      ],
    });

    setShowForm(false);
    setFormMode("purchase-order");
    setError("");
  };

  // ==========================================================
  // OPEN NEW STANDALONE PO FORM
  // ==========================================================

  const openCreateForm = () => {
    setFormData({
      vendor_id: "",
      procurement_id: "",
      delivery_date: "",
      payment_terms: "Net 15",
      items: [
        {
          item_name: "",
          quantity: 1,
          unit_price: "",
        },
      ],
    });

    setSelectedOrder(null);
    setFormMode("purchase-order");
    setShowForm(true);
    setMessage("");
    setError("");
  };

  const openRequestForm = () => {
    setFormData({
      vendor_id: "",
      procurement_id: "",
      delivery_date: "",
      payment_terms: "Net 15",
      items: [
        {
          item_name: "",
          quantity: 1,
          unit_price: "",
        },
      ],
    });
    setSelectedOrder(null);
    setFormMode("request-order");
    setShowForm(true);
    setMessage("");
    setError("");
  };

  // ==========================================================
  // CALCULATE TOTAL
  // ==========================================================

  const calculatedTotal =
    formData.items.reduce(
      (total, item) => {
        const quantity =
          Number(item.quantity) || 0;

        const unitPrice =
          Number(item.unit_price) || 0;

        return (
          total +
          quantity * unitPrice
        );
      },
      0
    );

  // ==========================================================
  // CREATE PURCHASE ORDER
  // ==========================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    // --------------------------------------------------------
    // VENDOR VALIDATION
    // --------------------------------------------------------

    if (formMode === "purchase-order" && !formData.vendor_id) {
      setError(
        "Please assign an active vendor"
      );
      return;
    }

    // --------------------------------------------------------
    // DELIVERY DATE VALIDATION
    // --------------------------------------------------------

    if (!formData.delivery_date) {
      setError(
        "Please select the expected delivery date"
      );
      return;
    }

    const today =
      new Date()
        .toISOString()
        .split("T")[0];

    if (
      formData.delivery_date < today
    ) {
      setError(
        "Expected delivery date cannot be in the past"
      );
      return;
    }

    // --------------------------------------------------------
    // ITEM VALIDATION
    // --------------------------------------------------------

    if (formData.items.length === 0) {
      setError(
        "Please add at least one line item"
      );
      return;
    }

    const invalidItem =
      formData.items.some((item) => {
        const itemName =
          String(item.item_name || "").trim();

        const quantity =
          Number(item.quantity);

        const unitPrice =
          Number(item.unit_price);

        return (
          !itemName ||
          !Number.isFinite(quantity) ||
          quantity <= 0 ||
          item.unit_price === "" ||
          !Number.isFinite(unitPrice) ||
          unitPrice < 0
        );
      });

    if (invalidItem) {
      setError(
        "Please enter valid item, quantity and unit price values"
      );
      return;
    }

    // ========================================================
    // CREATE PO REQUEST
    // ========================================================

    try {
      const isRequestOrder = formMode === "request-order";
      const payload = {
        ...(isRequestOrder ? {} : {
          vendor_id: Number(formData.vendor_id),
          procurement_id: formData.procurement_id
            ? Number(formData.procurement_id)
            : null,
        }),
        order_date: new Date().toISOString().split("T")[0],
        delivery_date: formData.delivery_date,
        payment_terms: formData.payment_terms,
        total_amount: calculatedTotal,
        items: formData.items.map((item) => ({
          item_name: String(item.item_name).trim(),
          description: null,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
        })),
      };

      const response = await fetch(
        `${API_URL}${isRequestOrder ? "/purchase-order-requests" : "/purchase-orders"}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Failed to create purchase order"
        );
      }

      setMessage(
        isRequestOrder
          ? `Request Order ${data.request_number} submitted`
          : `Purchase Order ${data.po_number} created successfully`
      );

      if (isRequestOrder) {
        setRequestOrders((current) => [data, ...current]);
        setActiveList("requests");
      }

      setFormData({
        vendor_id: "",
        procurement_id: "",
        delivery_date: "",
        payment_terms: "Net 15",
        items: [
          {
            item_name: "",
            quantity: 1,
            unit_price: "",
          },
        ],
      });

      setShowForm(false);
      setFormMode("purchase-order");
      setSelectedOrder(null);
      if (!isRequestOrder) await loadOrders();
    } catch (err) {
      setError(
        err.message ||
          "Failed to create purchase order"
      );
    }
  };

  // ==========================================================
  // UPDATE PO STATUS
  // ==========================================================

  const updateStatus = async (
    purchaseOrderId,
    status,
    actualDeliveryDate = null
  ) => {
    try {
      setError("");
      setMessage("");

      // Actual date is mandatory for Delivered
      if (
        status === "Delivered" &&
        !actualDeliveryDate
      ) {
        setError(
          "Actual delivery date is required"
        );
        return;
      }

      const response = await fetch(
        `${API_URL}/purchase-orders/${purchaseOrderId}/status`,
        {
          method: "PUT",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${token}`,
          },

          body: JSON.stringify({
            status,

            ...(status === "Delivered"
              ? {
                  actual_delivery_date:
                    actualDeliveryDate,
                }
              : {}),
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Failed to update purchase order"
        );
      }

      setMessage(
        `Purchase Order status changed to ${status}`
      );

      await loadOrders();
    } catch (err) {
      setError(
        err.message ||
          "Failed to update purchase order"
      );
    }
  };

  // ==========================================================
  // FILTER ORDERS
  // ==========================================================

  const filteredOrders =
    orders.filter((order) => {
      const matchesSearch =
        String(
          order.po_number || ""
        )
          .toLowerCase()
          .includes(
            search.toLowerCase()
          );

      const matchesVendor =
        vendorFilter ===
          "All Vendors" ||
        String(order.vendor_id) ===
          String(vendorFilter);

      const matchesStatus =
        statusFilter ===
          "All Status" ||
        order.status ===
          statusFilter;

      return (
        matchesSearch &&
        matchesVendor &&
        matchesStatus
      );
    });

  // ==========================================================
  // FIND VENDOR
  // ==========================================================

  const getVendor = (vendorId) => {
    return vendors.find(
      (vendor) =>
        String(vendor.id) ===
        String(vendorId)
    );
  };

  const getVendorName = (vendorId) => {
    const vendor =
      getVendor(vendorId);

    return vendor
      ? vendor.company_name
      : `Vendor #${vendorId}`;
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div>
      {/* =====================================================
          HEADER
          ===================================================== */}

      <div className="page-header">
        <div>
          <h1>
            Purchase Orders
          </h1>

          <p>
            Create and manage purchase orders.
          </p>
        </div>

        {canCreate && (
          <div className="po-header-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={openRequestForm}
            >
              + Request Order
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={openCreateForm}
            >
              + Create Purchase Order
            </button>
          </div>
        )}
      </div>

      {canViewRequests && (
        <div className="po-list-tabs" role="tablist" aria-label="Purchase order views">
          <button
            type="button"
            role="tab"
            aria-selected={activeList === "orders"}
            className={activeList === "orders" ? "active" : ""}
            onClick={() => setActiveList("orders")}
          >
            Purchase Orders
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeList === "requests"}
            className={activeList === "requests" ? "active" : ""}
            onClick={() => setActiveList("requests")}
          >
            Request Orders ({requestOrders.length})
          </button>
        </div>
      )}

      {/* =====================================================
          MESSAGES
          ===================================================== */}

      {message && (
        <div className="success-message">
          {message}
        </div>
      )}

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* =====================================================
          CREATE PO FORM
          ===================================================== */}

      {showForm && (
        <div className="po-form-modal">
          <div className="po-form-card">
            {/* FORM HEADER */}

            <div className="po-form-header">
              <div>
                <h2>{formMode === "request-order" ? "Create Request Order" : "Create purchase order"}</h2>

                <p>{formMode === "request-order" ? "Submit order details for vendor assignment." : "Assign an active vendor and add line items."}</p>

                {formData.procurement_id && (
                  <p className="form-helper-text">
                    Linked procurement request:
                    {" "}
                    <strong>
                      #{formData.procurement_id}
                    </strong>
                  </p>
                )}

                {!formData.procurement_id && (
                  <p className="form-helper-text">
                    {formMode === "request-order" ? "A vendor will be assigned from the Vendor Platform." : "Standalone purchase order"}
                  </p>
                )}
              </div>

              <button
                type="button"
                className="po-close-button"
                onClick={resetForm}
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
            >
              {/* =================================================
                  ASSIGN ACTIVE VENDOR
                  ================================================= */}

              {formMode === "purchase-order" && <div className="po-section">
                <label className="po-section-label">
                  Assign an active vendor
                </label>

                <div className="po-vendor-chips">
                  {vendors
                    .filter(
                      (vendor) =>
                        vendor.status ===
                        "Active"
                    )
                    .map((vendor) => (
                      <button
                        key={vendor.id}
                        type="button"
                        className={`po-vendor-chip ${
                          String(
                            formData.vendor_id
                          ) ===
                          String(vendor.id)
                            ? "active"
                            : ""
                        }`}
                        onClick={() =>
                          setFormData({
                            ...formData,
                            vendor_id:
                              vendor.id,
                          })
                        }
                      >
                        <span className="po-vendor-name">
                          {
                            vendor.company_name
                          }
                        </span>

                        <span className="po-vendor-type">
                          {
                            vendor.category ||
                            "Vendor"
                          }
                        </span>
                      </button>
                    ))}
                </div>

                {vendors.filter(
                  (vendor) =>
                    vendor.status ===
                    "Active"
                ).length === 0 && (
                  <p className="form-helper-text">
                    No active vendors are available.
                  </p>
                )}
              </div>}

              {/* =================================================
                  LINE ITEMS
                  ================================================= */}

              <div className="po-section">
                <label className="po-section-label">
                  Line items
                </label>

                <div className="po-item-header">
                  <span>
                    Item
                  </span>

                  <span>
                    Qty
                  </span>

                  <span>
                    Unit price (₹)
                  </span>

                  <span></span>
                </div>

                {formData.items.map(
                  (item, index) => (
                    <div
                      key={index}
                      className="po-item-row"
                    >
                      <input
                        type="text"
                        placeholder="Item name"
                        value={
                          item.item_name
                        }
                        onChange={(e) =>
                          handleItemChange(
                            index,
                            "item_name",
                            e.target.value
                          )
                        }
                        required
                      />

                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={
                          item.quantity
                        }
                        onChange={(e) =>
                          handleItemChange(
                            index,
                            "quantity",
                            e.target.value
                          )
                        }
                        required
                      />

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0"
                        value={
                          item.unit_price
                        }
                        onChange={(e) =>
                          handleItemChange(
                            index,
                            "unit_price",
                            e.target.value
                          )
                        }
                        required
                      />

                      {formData.items
                        .length > 1 ? (
                        <button
                          type="button"
                          className="po-remove-item"
                          onClick={() =>
                            removeItem(
                              index
                            )
                          }
                        >
                          ×
                        </button>
                      ) : (
                        <span></span>
                      )}
                    </div>
                  )
                )}

                <button
                  type="button"
                  className="po-add-item"
                  onClick={addItem}
                >
                  + Add line item
                </button>
              </div>

              {/* =================================================
                  TOTAL
                  ================================================= */}

              <div className="po-total-row">
                <span>
                  Total
                </span>

                <strong>
                  ₹
                  {calculatedTotal.toLocaleString(
                    "en-IN",
                    {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2,
                    }
                  )}
                </strong>
              </div>

              {/* =================================================
                  DELIVERY DATE + PAYMENT TERMS
                  ================================================= */}

              <div className="po-details-grid">
                <div className="form-group">
                  <label
                    htmlFor="delivery_date"
                  >
                    Expected delivery date
                  </label>

                  <input
                    id="delivery_date"
                    type="date"
                    value={
                      formData.delivery_date
                    }
                    min={
                      new Date()
                        .toISOString()
                        .split("T")[0]
                    }
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        delivery_date:
                          e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label
                    htmlFor="payment_terms"
                  >
                    Payment terms
                  </label>

                  <select
                    id="payment_terms"
                    value={
                      formData.payment_terms
                    }
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        payment_terms:
                          e.target.value,
                      })
                    }
                  >
                    {paymentTermsOptions.map(
                      (term) => (
                        <option
                          key={term}
                          value={term}
                        >
                          {term}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              {/* =================================================
                  ACTIONS
                  ================================================= */}

              <div className="po-form-actions">
                <button
                  type="submit"
                  className="primary-button"
                >
                  {formMode === "request-order" ? "Submit request" : "Create order"}
                </button>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={resetForm}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          FILTERS
          ===================================================== */}

      {activeList === "orders" && <>
      <div className="filter-bar">
        <input
          type="text"
          placeholder="Search PO"
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
        />

        <select
          value={vendorFilter}
          onChange={(e) =>
            setVendorFilter(
              e.target.value
            )
          }
        >
          <option value="All Vendors">
            All Vendors
          </option>

          {vendors.map(
            (vendor) => (
              <option
                key={vendor.id}
                value={vendor.id}
              >
                {vendor.company_name}
              </option>
            )
          )}
        </select>

        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(
              e.target.value
            )
          }
        >
          <option value="All Status">
            All Status
          </option>

          {statuses.map(
            (status) => (
              <option
                key={status}
                value={status}
              >
                {status}
              </option>
            )
          )}
        </select>
      </div>

      </>}

      {canViewRequests && activeList === "requests" && (
        <div className="table-container request-orders-table">
          {loading ? (
            <p className="loading-text">Loading request orders...</p>
          ) : requestOrders.length === 0 ? (
            <div className="empty-state">
              <h3>No request orders found</h3>
              <p>Use Request Order to submit an order before assigning a vendor.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Request</th>
                  <th>Items</th>
                  <th>Order Date</th>
                  <th>Delivery Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Assigned Vendor</th>
                  <th>Purchase Order</th>
                </tr>
              </thead>
              <tbody>
                {requestOrders.map((request) => (
                  <tr key={request.id}>
                    <td><strong>{request.request_number}</strong></td>
                    <td>{request.items.map((item) => `${item.item_name} × ${item.quantity}`).join(", ")}</td>
                    <td>{request.order_date || "-"}</td>
                    <td>{request.delivery_date || "-"}</td>
                    <td>₹{Number(request.total_amount || 0).toLocaleString("en-IN")}</td>
                    <td>
                      <span className={`status-badge status-${String(request.status || "Open").toLowerCase()}`}>
                        {request.status}
                      </span>
                    </td>
                    <td>{request.assigned_vendor_name || "Awaiting vendor"}</td>
                    <td>{request.po_number || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* =====================================================
          PURCHASE ORDER TABLE
          ===================================================== */}

        {activeList === "orders" && (
      <div className="table-container">
        {loading ? (
          <p className="loading-text">
            Loading purchase orders...
          </p>
        ) : filteredOrders.length === 0 ? (
          <div className="empty-state">
            <h3>
              No purchase orders found
            </h3>

            <p>
              Create a purchase order to
              get started.
            </p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>
                  PO ID
                </th>

                <th>
                  Vendor
                </th>

                <th>
                  Date
                </th>

                <th>
                  Amount
                </th>

                <th>
                  Status
                </th>

                <th>
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredOrders.map(
                (order) => (
                  <tr
                    key={order.id}
                  >
                    <td>
                      {order.po_number}
                    </td>

                    <td>
                      {getVendorName(
                        order.vendor_id
                      )}
                    </td>

                    <td>
                      {order.order_date ||
                        "-"}
                    </td>

                    <td>
                      ₹
                      {Number(
                        order.total_amount ||
                          0
                      ).toLocaleString(
                        "en-IN"
                      )}
                    </td>

                    <td>
                      <span
                        className={`status-badge status-${(
                          order.status ||
                          "Pending"
                        )
                          .toLowerCase()
                          .replace(
                            /\s+/g,
                            "-"
                          )}`}
                      >
                        {order.status}
                      </span>
                    </td>

                    <td>
                      <div className="action-buttons">
                        {/* VIEW */}

                        <button
                          type="button"
                          className="edit-button"
                          onClick={() =>
                            setSelectedOrder(
                              order
                            )
                          }
                        >
                          View
                        </button>

                        {/* APPROVE */}

                        {canUpdateStatus &&
                          order.status ===
                            "Pending" && (
                            <button
                              type="button"
                              className="approve-button"
                              onClick={() =>
                                updateStatus(
                                  order.id,
                                  "Approved"
                                )
                              }
                            >
                              Approve
                            </button>
                          )}

                        {/* MARK ORDERED */}

                        {canUpdateStatus &&
                          order.status ===
                            "Approved" && (
                            <button
                              type="button"
                              className="approve-button"
                              onClick={() =>
                                updateStatus(
                                  order.id,
                                  "Ordered"
                                )
                              }
                            >
                              Mark Ordered
                            </button>
                          )}

                        {/* MARK DELIVERED */}

                        {canUpdateStatus &&
                          order.status ===
                            "Ordered" && (
                            <button
                              type="button"
                              className="approve-button"
                              onClick={() => {
                                const today =
                                  new Date()
                                    .toISOString()
                                    .split(
                                      "T"
                                    )[0];

                                const actualDate =
                                  window.prompt(
                                    "Enter actual delivery date (YYYY-MM-DD):",
                                    today
                                  );

                                if (
                                  !actualDate
                                ) {
                                  return;
                                }

                                updateStatus(
                                  order.id,
                                  "Delivered",
                                  actualDate
                                );
                              }}
                            >
                              Mark Delivered
                            </button>
                          )}

                        {/* COMPLETE */}

                        {canUpdateStatus &&
                          order.status ===
                            "Delivered" && (
                            <button
                              type="button"
                              className="approve-button"
                              onClick={() =>
                                updateStatus(
                                  order.id,
                                  "Completed"
                                )
                              }
                            >
                              Complete
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        )}
      </div>
      )}

      {/* =====================================================
          VIEW PURCHASE ORDER
          ===================================================== */}

      {selectedOrder && (
        <div className="vendor-form-card">
          <div className="table-header">
            <h2>
              {selectedOrder.po_number}
            </h2>

            <button
              type="button"
              className="secondary-button"
              onClick={() =>
                setSelectedOrder(null)
              }
            >
              Close
            </button>
          </div>

          <p>
            <strong>
              Vendor:
            </strong>{" "}
            {getVendorName(
              selectedOrder.vendor_id
            )}
          </p>

          <p>
            <strong>
              Procurement ID:
            </strong>{" "}
            {selectedOrder.procurement_id
              ? `#${selectedOrder.procurement_id}`
              : "Standalone Purchase Order"}
          </p>

          <p>
            <strong>
              Order Date:
            </strong>{" "}
            {selectedOrder.order_date ||
              "-"}
          </p>

          <p>
            <strong>
              Expected Delivery Date:
            </strong>{" "}
            {selectedOrder.delivery_date ||
              "-"}
          </p>

          <p>
            <strong>
              Actual Delivery Date:
            </strong>{" "}
            {selectedOrder.actual_delivery_date ||
              "-"}
          </p>

          <p>
            <strong>
              Payment Terms:
            </strong>{" "}
            {selectedOrder.payment_terms ||
              "Net 15"}
          </p>

          <p>
            <strong>
              Total:
            </strong>{" "}
            ₹
            {Number(
              selectedOrder.total_amount ||
                0
            ).toLocaleString(
              "en-IN"
            )}
          </p>

          <p>
            <strong>
              Status:
            </strong>{" "}
            {selectedOrder.status}
          </p>
        </div>
      )}
    </div>
  );
}

export default PurchaseOrders;