import { useEffect, useState } from "react";

const API_URL = "http://127.0.0.1:8000";

function VendorPerformance() {
  const token = localStorage.getItem("token");
  const user = JSON.parse(
    localStorage.getItem("user") || "null"
  );

  const [records, setRecords] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [companies, setCompanies] = useState([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [reliability, setReliability] = useState(null);

  const [formData, setFormData] = useState({
    company_id: "",
    vendor_id: "",
    rating: "",
    comments: "",
  });

  // ============================================================
  // LOAD DATA
  // ============================================================

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        const headers = {
          Authorization: `Bearer ${token}`,
        };

        const responses = await Promise.all([
          fetch(`${API_URL}/vendor-performance`, {
            headers,
          }),

          fetch(`${API_URL}/vendors`, {
            headers,
          }),

          ...(user?.role === "System Administrator"
            ? [
                fetch(`${API_URL}/companies`, {
                  headers,
                }),
              ]
            : []),
        ]);

        const performanceData =
          await responses[0].json();

        const vendorsData =
          await responses[1].json();

        if (!responses[0].ok) {
          throw new Error(
            performanceData.detail ||
              "Failed to load vendor performance"
          );
        }

        if (!responses[1].ok) {
          throw new Error(
            vendorsData.detail ||
              "Failed to load vendors"
          );
        }

        let companiesData = [];

        if (user?.role === "System Administrator") {
          companiesData =
            await responses[2].json();

          if (!responses[2].ok) {
            throw new Error(
              companiesData.detail ||
                "Failed to load companies"
            );
          }
        }

        if (!cancelled) {
          setRecords(performanceData);
          setVendors(vendorsData);

          if (
            user?.role ===
            "System Administrator"
          ) {
            setCompanies(companiesData);
          }

          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [token, user?.role]);

  // ============================================================
  // FORM CHANGE
  // ============================================================

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // ============================================================
  // RESET FORM
  // ============================================================

  const resetForm = () => {
    setFormData({
      company_id: "",
      vendor_id: "",
      rating: "",
      comments: "",
    });

    setShowForm(false);
  };

  // ============================================================
  // CREATE PERFORMANCE
  // ============================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    try {
      if (
        user?.role ===
          "System Administrator" &&
        !formData.company_id
      ) {
        setError("Please select a company");
        return;
      }

      if (!formData.vendor_id) {
        setError("Please select a vendor");
        return;
      }

      // Rating is converted automatically
      // to a 0-100 quality score.
      const rating =
        formData.rating === ""
          ? null
          : Number(formData.rating);

      const qualityScore =
        rating === null
          ? null
          : Math.round(rating * 20);

      const body = {
        ...(user?.role ===
        "System Administrator"
          ? {
              company_id: Number(
                formData.company_id
              ),
            }
          : {}),

        vendor_id: Number(
          formData.vendor_id
        ),

        rating: rating,

        quality_score: qualityScore,

        comments:
          formData.comments.trim() ||
          null,
      };

      const response = await fetch(
        `${API_URL}/vendor-performance`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Failed to create performance record"
        );
      }

      setMessage(
        "Vendor performance evaluation created successfully"
      );

      resetForm();

      window.location.reload();
    } catch (err) {
      setError(err.message);
    }
  };

  // ============================================================
  // FIND VENDOR NAME
  // ============================================================

  const getVendorName = (vendorId) => {
    const vendor = vendors.find(
      (item) => item.id === vendorId
    );

    return vendor
      ? vendor.company_name
      : `Vendor #${vendorId}`;
  };

  // ============================================================
  // VIEW RELIABILITY
  // ============================================================

  const viewReliability = async (
    vendorId
  ) => {
    try {
      setError("");

      const response = await fetch(
        `${API_URL}/vendor-reliability/${vendorId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Failed to load reliability"
        );
      }

      setReliability(data);
    } catch (err) {
      setError(err.message);
    }
  };

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="vendor-performance-page">

      {/* PAGE HEADER */}
      <div className="page-header">
        <div>
          <h1>Vendor Performance</h1>

          <p>
            Evaluate and monitor vendor performance.
          </p>
        </div>

        {[
          "System Administrator",
          "Procurement Manager",
          "Supply Chain Manager",
        ].includes(user?.role) && (
          <button
            type="button"
            className="primary-button"
            onClick={() => {
              setMessage("");
              setError("");
              setShowForm(true);
            }}
          >
            + Add Evaluation
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

      {/* FORM */}

      {showForm && (
        <div className="vendor-form-card">

          <h2>
            Add Vendor Performance Evaluation
          </h2>

          <form onSubmit={handleSubmit}>

            <div className="form-grid">

              {/* COMPANY */}

              {user?.role ===
                "System Administrator" && (
                <div className="form-group">

                  <label>
                    Company
                  </label>

                  <select
                    name="company_id"
                    value={
                      formData.company_id
                    }
                    onChange={handleChange}
                    required
                  >
                    <option value="">
                      Select Company
                    </option>

                    {companies.map(
                      (company) => (
                        <option
                          key={company.id}
                          value={company.id}
                        >
                          {company.name}
                        </option>
                      )
                    )}
                  </select>

                </div>
              )}

              {/* VENDOR */}

              <div className="form-group">

                <label>
                  Vendor
                </label>

                <select
                  name="vendor_id"
                  value={
                    formData.vendor_id
                  }
                  onChange={handleChange}
                  required
                >
                  <option value="">
                    Select Vendor
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

              </div>

              {/* RATING */}

              <div className="form-group">

                <label>
                  Quality Rating
                </label>

                <input
                  type="number"
                  name="rating"
                  min="0"
                  max="5"
                  step="0.1"
                  value={
                    formData.rating
                  }
                  onChange={handleChange}
                  placeholder="0 - 5"
                />

                <small>
                  Quality score is calculated
                  automatically from the rating.
                </small>

              </div>

              {/* COMMENTS */}

              <div className="form-group">

                <label>
                  Comments
                </label>

                <textarea
                  name="comments"
                  value={
                    formData.comments
                  }
                  onChange={handleChange}
                  placeholder="Enter comments"
                  rows="4"
                />

              </div>

            </div>

            <div className="form-actions">

              <button
                type="submit"
                className="primary-button"
              >
                Save Evaluation
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

      {/* RELIABILITY */}

      {reliability && (
        <div className="vendor-form-card">

          <h2>
            {reliability.vendor_name}
            {" - Reliability"}
          </h2>

          <p>
            Reliability Score:{" "}
            <strong>
              {reliability.reliability_score}
            </strong>
          </p>

          <p>
            Risk Level:{" "}
            <strong>
              {reliability.risk_level}
            </strong>
          </p>

          <div className="form-grid">

            <div>
              <strong>
                Delivery Score:
              </strong>{" "}
              {reliability.delivery_score}%
            </div>

            <div>
              <strong>
                Total Delivered:
              </strong>{" "}
              {reliability.total_delivered_orders}
            </div>

            <div>
              <strong>
                On-Time Deliveries:
              </strong>{" "}
              {reliability.on_time_deliveries}
            </div>

            <div>
              <strong>
                Delayed Deliveries:
              </strong>{" "}
              {reliability.delayed_deliveries}
            </div>

            <div>
              <strong>
                Quality:
              </strong>{" "}
              {reliability.quality_score}
            </div>

            <div>
              <strong>
                Contract Compliance:
              </strong>{" "}
              {reliability.compliance_score}%
            </div>

            <div>
              <strong>
                Valid Contracts:
              </strong>{" "}
              {reliability.valid_contracts}
            </div>

            <div>
              <strong>
                Total Contracts:
              </strong>{" "}
              {reliability.total_contracts}
            </div>

            <div>
              <strong>
                Communication:
              </strong>{" "}
              {reliability.communication_score}
            </div>

            <div>
              <strong>
                Purchase History:
              </strong>{" "}
              {reliability.purchase_history_score}
            </div>

            <div>
              <strong>
                Issue Resolution:
              </strong>{" "}
              {reliability.issue_resolution_score}%
            </div>

            <div>
              <strong>
                Total Issues:
              </strong>{" "}
              {reliability.total_issues}
            </div>

            <div>
              <strong>
                Resolved Issues:
              </strong>{" "}
              {reliability.resolved_issues}
            </div>

            <div>
              <strong>
                Resolved Within Agreed Time:
              </strong>{" "}
              {
                reliability
                  .issues_resolved_within_agreed_time
              }
            </div>

          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={() =>
              setReliability(null)
            }
          >
            Close
          </button>

        </div>
      )}

      {/* PERFORMANCE TABLE */}

      <div className="table-container">

        {loading ? (
          <p className="loading-text">
            Loading vendor performance...
          </p>
        ) : records.length === 0 ? (
          <div className="empty-state">

            <h3>
              No performance records found
            </h3>

            <p>
              Add a vendor evaluation to get started.
            </p>

          </div>
        ) : (
          <table>

            <thead>
              <tr>
                <th>Vendor</th>
                <th>Rating</th>
                <th>Quality Score</th>
                <th>Comments</th>
                <th>Evaluated On</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>

              {records.map(
                (record) => (
                  <tr key={record.id}>

                    <td>
                      {getVendorName(
                        record.vendor_id
                      )}
                    </td>

                    <td>
                      {record.rating ??
                        "-"}
                    </td>

                    <td>
                      {record.quality_score ??
                        "-"}
                    </td>

                    <td>
                      {record.comments ||
                        "-"}
                    </td>

                    <td>
                      {record.evaluated_at
                        ? new Date(
                            record.evaluated_at
                          ).toLocaleDateString()
                        : "-"}
                    </td>

                    <td>

                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() =>
                          viewReliability(
                            record.vendor_id
                          )
                        }
                      >
                        View Reliability
                      </button>

                    </td>

                  </tr>
                )
              )}

            </tbody>

          </table>
        )}

      </div>

    </div>
  );
}

export default VendorPerformance;