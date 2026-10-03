import { useEffect, useState } from "react";

const API_URL = "http://127.0.0.1:8000";



function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [orders, setOrders] = useState([]);
  const [vendors, setVendors] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    purchase_order_id: "",
    vendor_id: "",
    invoice_number: "",
    invoice_date: "",
    due_date: "",
    amount: "",
    document_url: "",
  });

  const token = localStorage.getItem("token");

  const user = JSON.parse(
    localStorage.getItem("user") || "null"
  );

  const canCreate = [
    "Administrator",
    "Procurement Manager",
    "Finance Officer",
  ].includes(user?.role);

  const canUpdateStatus = [
    "Administrator",
    "Finance Officer",
  ].includes(user?.role);

  // ==========================================
  // INITIAL LOAD
  // ==========================================

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        const headers = {
          Authorization: `Bearer ${token}`,
        };

        const [
          invoicesResponse,
          ordersResponse,
          vendorsResponse,
        ] = await Promise.all([
          fetch(`${API_URL}/invoices`, { headers }),
          fetch(`${API_URL}/purchase-orders`, { headers }),
          fetch(`${API_URL}/vendors`, { headers }),
        ]);

        const invoicesData =
          await invoicesResponse.json();

        const ordersData =
          await ordersResponse.json();

        const vendorsData =
          await vendorsResponse.json();

        if (!invoicesResponse.ok) {
          throw new Error(
            invoicesData.detail ||
              "Failed to load invoices"
          );
        }

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

        if (!cancelled) {
          setInvoices(invoicesData);
          setOrders(ordersData);
          setVendors(vendorsData);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [token]);

  // ==========================================
  // RELOAD INVOICES
  // ==========================================

  const loadInvoices = async () => {
    try {
      const response = await fetch(
        `${API_URL}/invoices`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to load invoices"
        );
      }

      setInvoices(data);
    } catch (err) {
      setError(err.message);
    }
  };

  // ==========================================
  // FORM CHANGE
  // ==========================================

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // ==========================================
  // RESET
  // ==========================================

  const resetForm = () => {
    setFormData({
      purchase_order_id: "",
      vendor_id: "",
      invoice_number: "",
      invoice_date: "",
      due_date: "",
      amount: "",
      document_url: "",
    });

    setShowForm(false);
  };

  // ==========================================
  // CREATE INVOICE
  // ==========================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/invoices`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            purchase_order_id: Number(
              formData.purchase_order_id
            ),
            vendor_id: Number(formData.vendor_id),
            invoice_number: formData.invoice_number,
            invoice_date:
              formData.invoice_date || null,
            due_date:
              formData.due_date || null,
            amount: Number(formData.amount),
            document_url:
              formData.document_url || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to create invoice"
        );
      }

      setMessage(
        `Invoice ${data.invoice_number} created successfully`
      );

      resetForm();
      await loadInvoices();
    } catch (err) {
      setError(err.message);
    }
  };

  // ==========================================
  // UPDATE STATUS
  // ==========================================

  const updateStatus = async (
    invoiceId,
    status
  ) => {
    try {
      setError("");
      setMessage("");

      const response = await fetch(
        `${API_URL}/invoices/${invoiceId}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Failed to update invoice status"
        );
      }

      setMessage(
        `Invoice status changed to ${status}`
      );

      await loadInvoices();
    } catch (err) {
      setError(err.message);
    }
  };

  // ==========================================
  // HELPERS
  // ==========================================

  const getVendorName = (vendorId) => {
    const vendor = vendors.find(
      (item) => item.id === vendorId
    );

    return vendor
      ? vendor.company_name
      : `Vendor #${vendorId}`;
  };

  const getOrderNumber = (orderId) => {
    const order = orders.find(
      (item) => item.id === orderId
    );

    return order
      ? order.po_number
      : `PO #${orderId}`;
  };

  return (
    <div>

      {/* HEADER */}

      <div className="page-header">

        <div>
          <h1>Invoice Management</h1>

          <p>
            Create, track and manage procurement invoices.
          </p>
        </div>

        {canCreate && (
          <button
            type="button"
            className="primary-button"
            onClick={() => {
              setShowForm(true);
              setError("");
              setMessage("");
            }}
          >
            + Create Invoice
          </button>
        )}

      </div>


      {/* MESSAGES */}

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


      {/* CREATE FORM */}

      {showForm && (
        <div className="vendor-form-card">

          <h2>
            Create Invoice
          </h2>

          <form onSubmit={handleSubmit}>

            <div className="form-grid">

              {/* PURCHASE ORDER */}

              <div className="form-group">

                <label htmlFor="purchase_order_id">
                  Purchase Order
                </label>

                <select
                  id="purchase_order_id"
                  name="purchase_order_id"
                  value={formData.purchase_order_id}
                  onChange={(e) => {
                    const selectedOrder =
                      orders.find(
                        (order) =>
                          order.id ===
                          Number(e.target.value)
                      );

                    setFormData({
                      ...formData,
                      purchase_order_id:
                        e.target.value,
                      vendor_id:
                        selectedOrder
                          ? String(
                              selectedOrder.vendor_id
                            )
                          : "",
                      amount:
                        selectedOrder &&
                        selectedOrder.total_amount
                          ? String(
                              selectedOrder.total_amount
                            )
                          : formData.amount,
                    });
                  }}
                  required
                >

                  <option value="">
                    Select Purchase Order
                  </option>

                  {orders.map((order) => (
                    <option
                      key={order.id}
                      value={order.id}
                    >
                      {order.po_number} - ₹
                      {Number(
                        order.total_amount || 0
                      ).toLocaleString("en-IN")}
                    </option>
                  ))}

                </select>

              </div>


              {/* VENDOR */}

              <div className="form-group">

                <label htmlFor="vendor_id">
                  Vendor
                </label>

                <select
                  id="vendor_id"
                  name="vendor_id"
                  value={formData.vendor_id}
                  onChange={handleChange}
                  required
                >

                  <option value="">
                    Select Vendor
                  </option>

                  {vendors.map((vendor) => (
                    <option
                      key={vendor.id}
                      value={vendor.id}
                    >
                      {vendor.company_name}
                    </option>
                  ))}

                </select>

              </div>


              {/* INVOICE NUMBER */}

              <div className="form-group">

                <label htmlFor="invoice_number">
                  Invoice Number
                </label>

                <input
                  id="invoice_number"
                  type="text"
                  name="invoice_number"
                  value={formData.invoice_number}
                  onChange={handleChange}
                  placeholder="INV-00001"
                  required
                />

              </div>


              {/* AMOUNT */}

              <div className="form-group">

                <label htmlFor="amount">
                  Amount
                </label>

                <input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="Enter amount"
                  required
                />

              </div>


              {/* INVOICE DATE */}

              <div className="form-group">

                <label htmlFor="invoice_date">
                  Invoice Date
                </label>

                <input
                  id="invoice_date"
                  type="date"
                  name="invoice_date"
                  value={formData.invoice_date}
                  onChange={handleChange}
                />

              </div>


              {/* DUE DATE */}

              <div className="form-group">

                <label htmlFor="due_date">
                  Due Date
                </label>

                <input
                  id="due_date"
                  type="date"
                  name="due_date"
                  value={formData.due_date}
                  onChange={handleChange}
                />

              </div>

            </div>


            {/* DOCUMENT */}

            <div className="form-group">

              <label htmlFor="document_url">
                Document URL
              </label>

              <input
                id="document_url"
                type="url"
                name="document_url"
                value={formData.document_url}
                onChange={handleChange}
                placeholder="https://..."
              />

            </div>


            <div className="form-actions">

              <button
                type="submit"
                className="primary-button"
              >
                Create Invoice
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
      )}


      {/* INVOICE TABLE */}

      <div className="vendor-table-card">

        <div className="table-header">

          <div>

            <h2>
              Invoices
            </h2>

            <span>
              Total: {invoices.length}
            </span>

          </div>

        </div>


        {loading ? (
          <p className="loading-text">
            Loading invoices...
          </p>
        ) : invoices.length === 0 ? (
          <div className="empty-state">

            <h3>
              No invoices found
            </h3>

            <p>
              Create an invoice from a purchase order.
            </p>

          </div>
        ) : (

          <div className="table-container">

            <table>

              <thead>

                <tr>
                  <th>Invoice No.</th>
                  <th>Purchase Order</th>
                  <th>Vendor</th>
                  <th>Invoice Date</th>
                  <th>Due Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>

              </thead>

              <tbody>

                {invoices.map((invoice) => (

                  <tr key={invoice.id}>

                    <td>
                      <strong>
                        {invoice.invoice_number}
                      </strong>
                    </td>

                    <td>
                      {getOrderNumber(
                        invoice.purchase_order_id
                      )}
                    </td>

                    <td>
                      {getVendorName(
                        invoice.vendor_id
                      )}
                    </td>

                    <td>
                      {invoice.invoice_date || "-"}
                    </td>

                    <td>
                      {invoice.due_date || "-"}
                    </td>

                    <td>
                      ₹
                      {Number(
                        invoice.amount || 0
                      ).toLocaleString("en-IN")}
                    </td>

                    <td>

                      <span
                        className={`status-badge status-${(
                          invoice.status ||
                          "Pending"
                        )
                          .toLowerCase()
                          .replace(/\s+/g, "-")}`}
                      >
                        {invoice.status}
                      </span>

                    </td>

                    <td>

                      {canUpdateStatus &&
                        invoice.status ===
                          "Pending" && (
                          <button
                            type="button"
                            className="approve-button"
                            onClick={() =>
                              updateStatus(
                                invoice.id,
                                "Approved"
                              )
                            }
                          >
                            Approve
                          </button>
                        )}

                      {canUpdateStatus &&
                        invoice.status ===
                          "Approved" && (
                          <button
                            type="button"
                            className="approve-button"
                            onClick={() =>
                              updateStatus(
                                invoice.id,
                                "Paid"
                              )
                            }
                          >
                            Mark Paid
                          </button>
                        )}

                      {canUpdateStatus &&
                        invoice.status !==
                          "Paid" &&
                        invoice.status !==
                          "Cancelled" && (
                          <button
                            type="button"
                            className="reject-button"
                            onClick={() =>
                              updateStatus(
                                invoice.id,
                                "Cancelled"
                              )
                            }
                          >
                            Cancel
                          </button>
                        )}

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

export default Invoices;