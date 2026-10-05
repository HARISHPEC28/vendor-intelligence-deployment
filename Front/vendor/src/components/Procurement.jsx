import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = "https://vendor-intelligence-deployment.onrender.com";

const PRIORITIES = [
  "Low",
  "Medium",
  "High",
  "Urgent",
];

function Procurement() {
  const navigate = useNavigate();

  const [procurements, setProcurements] = useState([]);


const [showForm, setShowForm] = useState(false);
const [loading, setLoading] = useState(
  () => Boolean(localStorage.getItem("token"))
);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

const [formData, setFormData] = useState({
  title: "",
  description: "",
  quantity: "1",
  unit_price: "",
  needed_date: "",
  priority: "Medium",
});

  const token = localStorage.getItem("token");

  const user = JSON.parse(
    localStorage.getItem("user") || "null"
  );


  // ==========================================================
  // LOAD PROCUREMENT REQUESTS
  // ==========================================================

  const loadProcurements = async () => {
    try {
      setError("");

      const response = await fetch(
        `${API_URL}/procurements`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Failed to load procurements"
        );
      }

      setProcurements(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const fetchProcurements = async () => {
      try {
        const response = await fetch(
          `${API_URL}/procurements`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.detail ||
              "Failed to load procurements"
          );
        }

        if (!cancelled) {
          setProcurements(data);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

if (token) {
  fetchProcurements();
}
    return () => {
      cancelled = true;
    };
  }, [token]);

  // ==========================================================
  // FORM CHANGE
  // ==========================================================

  const handleChange = (e) => {
    setFormData((previous) => ({
      ...previous,
      [e.target.name]: e.target.value,
    }));
  };

  // ==========================================================
  // RESET FORM
  // ==========================================================

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      quantity: "",
      unit_price: "",
      needed_date: "",
      priority: "Medium",
    });

    setShowForm(false);
  };

  // ==========================================================
  // CREATE PROCUREMENT
  // ==========================================================

const handleSubmit = async (e) => {
  e.preventDefault();

  setError("");
  setMessage("");

  try {
    const payload = {
      vendor_id: null,
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      quantity: Number(formData.quantity),
      unit_price: Number(formData.unit_price),
      needed_date:
        formData.needed_date === ""
          ? null
          : formData.needed_date,
      priority: formData.priority,
    };

    const response = await fetch(
      `${API_URL}/procurements`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.detail || "Failed to create procurement"
      );
    }

    setMessage(
      "Procurement request created successfully"
    );

    setFormData({
      title: "",
      description: "",
      quantity: "1",
      unit_price: "",
      needed_date: "",
      priority: "Medium",
    });

    setShowForm(false);

    await loadProcurements();
  } catch (error) {
    setError(error.message);
  }
};

  // ==========================================================
  // UPDATE PROCUREMENT STATUS
  // ==========================================================

  const updateStatus = async (
    procurementId,
    status
  ) => {
    try {
      setError("");
      setMessage("");

      const response = await fetch(
        `${API_URL}/procurements/${procurementId}/status`,
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
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Failed to update status"
        );
      }

      setMessage(
        `Procurement status changed to ${status}`
      );

      await loadProcurements();
    } catch (err) {
      setError(err.message);
    }
  };

  // ==========================================================
  // PERMISSIONS
  // ==========================================================

  const canCreate = [
    "System Administrator",
    "Procurement Manager",
    "Supply Chain Manager",
  ].includes(user?.role);

  const canManage = [
    "System Administrator",
    "Procurement Manager",
    "Supply Chain Manager",
  ].includes(user?.role);

  // ==========================================================
  // APPROVAL / PLACE ORDER PERMISSION
  // ==========================================================

  const canApprove = [
    "System Administrator",
    "Procurement Manager",
    "Supply Chain Manager",
  ].includes(user?.role);

  // ==========================================================
  // ESTIMATED TOTAL
  // ==========================================================

  const estimatedTotal =
    Number(formData.quantity || 0) *
    Number(formData.unit_price || 0);

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="procurement-management">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="page-header">

        <div>
          <h1>
            Procurement Management
          </h1>

          <p>
            Create, monitor and manage
            procurement requests
          </p>
        </div>

        {canCreate && (
          <button
            type="button"
            className="primary-button"
            onClick={() => {
              setMessage("");
              setError("");
              setShowForm(true);
            }}
          >
            + New Procurement
          </button>
        )}

      </div>

      {/* ======================================================
          MESSAGES
      ====================================================== */}

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

      {/* ======================================================
          CREATE FORM
      ====================================================== */}

      {showForm && (
        <div className="procurement-form-card">

          <h2>
            New procurement request
          </h2>

          <p className="form-helper-text">
            Requests enter as Pending until submitted for approval.
          </p>

          <form onSubmit={handleSubmit}>

            <div className="form-grid">

              {/* ITEM / SERVICE */}

              <div className="form-group">

                <label htmlFor="title">
                  Item or service description
                </label>

                <input
                  id="title"
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g. 20 tonnes packaging film"
                  required
                />

              </div>

              {/* UNIT PRICE */}

              <div className="form-group">

                <label htmlFor="unit_price">
                  Unit price (₹)
                </label>

                <input
                  id="unit_price"
                  type="number"
                  name="unit_price"
                  min="0"
                  step="0.01"
                  value={formData.unit_price}
                  onChange={handleChange}
                  placeholder="Enter unit price"
                  required
                />

              </div>

              {/* QUANTITY */}

              <div className="form-group">

                <label htmlFor="quantity">
                  Quantity
                </label>

                <input
                  id="quantity"
                  type="number"
                  name="quantity"
                  min="1"
                  step="1"
                  value={formData.quantity}
                  onChange={handleChange}
                  placeholder="e.g. 20"
                  required
                />

              </div>

              {/* NEEDED BY */}

              <div className="form-group">

                <label htmlFor="needed_date">
                  Needed by
                </label>

                <input
                  id="needed_date"
                  type="date"
                  name="needed_date"
                  value={formData.needed_date}
                  onChange={handleChange}
                  required
                />

              </div>

            </div>

            {/* PRIORITY */}

            <div className="form-group">

              <label>
                Priority
              </label>

              <div className="priority-options">

                {PRIORITIES.map(
                  (priority) => (
                    <button
                      key={priority}
                      type="button"
                      className={`priority-option ${
                        formData.priority ===
                        priority
                          ? "active"
                          : ""
                      }`}
                      onClick={() =>
                        setFormData(
                          (previous) => ({
                            ...previous,
                            priority,
                          })
                        )
                      }
                    >
                      {priority}
                    </button>
                  )
                )}

              </div>

            </div>

            {/* JUSTIFICATION */}

            <div className="form-group">

              <label htmlFor="description">
                Justification
              </label>

              <textarea
                id="description"
                name="description"
                rows="4"
                value={formData.description}
                onChange={handleChange}
                placeholder="Why is this procurement required?"
              />

            </div>

            {/* AUTO CALCULATED TOTAL */}

            <div className="procurement-total">

              <span>
                Estimated Total
              </span>

              <strong>
                ₹
                {estimatedTotal.toLocaleString(
                  "en-IN"
                )}
              </strong>

            </div>

            {/* FORM ACTIONS */}

            <div className="form-actions">

              <button
                type="submit"
                className="primary-button"
              >
                Submit for approval
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

      {/* ======================================================
          PROCUREMENT LIST
      ====================================================== */}

      <div className="procurement-table-card">

        <div className="table-header">

          <div>

            <h2>
              Procurement Requests
            </h2>

            <span>
              Total: {procurements.length}
            </span>

          </div>

        </div>

        {/* LOADING */}

        {loading && (
          <p className="loading-text">
            Loading procurement requests...
          </p>
        )}

        {/* EMPTY */}

        {!loading &&
          procurements.length === 0 && (

            <div className="empty-state">

              <h3>
                No procurement requests
              </h3>

              <p>
                Create a new procurement
                request to get started.
              </p>

            </div>

          )}

        {/* TABLE */}

        {!loading &&
          procurements.length > 0 && (

            <div className="table-container">

              <table>

                <thead>

                  <tr>

                    <th>
                      PR Number
                    </th>

                    <th>
                      Vendor
                    </th>

                    <th>
                      Item / Service
                    </th>

                    <th>
                      Quantity
                    </th>

                    <th>
                      Unit Price
                    </th>

                    <th>
                      Total
                    </th>

                    <th>
                      Priority
                    </th>

                    <th>
                      Needed By
                    </th>

                    <th>
                      Status
                    </th>

                    <th>
                      Actions
                    </th>

                  </tr>

                </thead>

                <tbody>

                 {procurements.map(
                  (procurement) => {

                    return (

                        <tr
                          key={
                            procurement.id
                          }
                        >

                          {/* PR NUMBER */}

                          <td>

                            <strong>
                              {
                                procurement.procurement_number
                              }
                            </strong>

                          </td>

                          {/* VENDOR */}

                       <td>
  —
</td>

                          {/* ITEM / SERVICE */}

                          <td>

                            {procurement.title}

                          </td>

                          {/* QUANTITY */}

                          <td>

                            {
                              procurement.quantity
                            }

                          </td>

                          {/* UNIT PRICE */}

                          <td>

                            ₹
                            {Number(
                              procurement.unit_price ||
                                0
                            ).toLocaleString(
                              "en-IN"
                            )}

                          </td>

                          {/* TOTAL */}

                          <td>

                            ₹
                            {(
                              Number(
                                procurement.quantity ||
                                  0
                              ) *
                              Number(
                                procurement.unit_price ||
                                  0
                              )
                            ).toLocaleString(
                              "en-IN"
                            )}

                          </td>

                          {/* PRIORITY */}

                          <td>

                            <span
                              className={`priority-badge priority-${(
                                procurement.priority ||
                                "Medium"
                              ).toLowerCase()}`}
                            >
                              {
                                procurement.priority ||
                                "Medium"
                              }
                            </span>

                          </td>

                          {/* NEEDED BY */}

                          <td>

                            {
                              procurement.needed_date ||
                              "-"
                            }

                          </td>

                          {/* STATUS */}

                          <td>

                            <span
                              className={`status-badge status-${(
                                procurement.status ||
                                "Pending"
                              )
                                .toLowerCase()
                                .replace(
                                  /\s+/g,
                                  "-"
                                )}`}
                            >
                              {
                                procurement.status
                              }
                            </span>

                          </td>

                          {/* ACTIONS */}

                          <td>

                            {/* PENDING */}

                            {canManage &&
                              procurement.status ===
                                "Pending" && (

                                <div className="action-buttons">

                                  <button
                                    type="button"
                                    className="approve-button"
                                    onClick={() =>
                                      updateStatus(
                                        procurement.id,
                                        "Approved"
                                      )
                                    }
                                  >
                                    Approve
                                  </button>

                                  <button
                                    type="button"
                                    className="reject-button"
                                    onClick={() =>
                                      updateStatus(
                                        procurement.id,
                                        "Cancelled"
                                      )
                                    }
                                  >
                                    Cancel
                                  </button>

                                </div>

                              )}

                            {/* APPROVED */}

                            {canApprove &&
                              procurement.status ===
                                "Approved" && (

                                <button
                                  type="button"
                                  className="approve-button"
                                  onClick={() => {
                                    setMessage("");
                                    setError("");

                                    navigate(
                                      "/purchase-orders",
                                      {
                                        state: {
                                          procurementId:
                                            procurement.id,
                                        },
                                      }
                                    );
                                  }}
                                >
                                  Place Order
                                </button>

                              )}

                            {/* ORDERED */}

                            {canManage &&
                              procurement.status ===
                                "Ordered" && (

                                <button
                                  type="button"
                                  className="approve-button"
                                  onClick={() =>
                                    updateStatus(
                                      procurement.id,
                                      "Delivered"
                                    )
                                  }
                                >
                                  Mark Delivered
                                </button>

                              )}

                            {/* DELIVERED */}

                            {canManage &&
                              procurement.status ===
                                "Delivered" && (

                                <button
                                  type="button"
                                  className="approve-button"
                                  onClick={() =>
                                    updateStatus(
                                      procurement.id,
                                      "Completed"
                                    )
                                  }
                                >
                                  Complete
                                </button>

                              )}

                            {/* COMPLETED / CANCELLED */}

                            {[
                              "Completed",
                              "Cancelled",
                            ].includes(
                              procurement.status
                            ) && (

                              <span>
                                —
                              </span>

                            )}

                          </td>

                        </tr>

                      );
                    }
                  )}

                </tbody>

              </table>

            </div>

          )}

      </div>

    </div>
  );
}

export default Procurement;