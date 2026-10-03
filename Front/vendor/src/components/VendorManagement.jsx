import { useEffect, useMemo, useState } from "react";

const API_URL = "http://127.0.0.1:8000";

function getVendorReadUrl(path, publicMode) {
  return `${API_URL}${publicMode ? `/public${path}` : path}`;
}

function getVendorReadOptions(publicMode, token) {
  return publicMode ? {} : { headers: { Authorization: `Bearer ${token}` } };
}

const categories = [
  "Raw Material Suppliers",
  "Equipment Vendors",
  "IT Vendors",
  "Service Providers",
  "Logistics Partners",
  "Maintenance Vendors",
];

const statuses = [
  "Pending",
  "Active",
  "Inactive",
  "Suspended",
  "Rejected",
];

const emptyForm = {
  company_name: "",
  contact_person: "",
  contact_designation: "",
  contact_department: "",
  email: "",
  phone: "",
  address: "",
  category: categories[0],
  tax_gst_id: "",
  payment_terms: "",
  products_services: "",
  notes: "",
};

function VendorManagement({ pageTitle = "Vendor Management", publicMode = false }) {
  // =========================================================
  // STATE
  // =========================================================

  const [vendors, setVendors] = useState([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);

 const [selectedVendor, setSelectedVendor] = useState(null);
const [detailsTab, setDetailsTab] = useState("Profile");

const [reliability, setReliability] = useState(null);
const [statusHistory, setStatusHistory] = useState([]);
const [vendorIssues, setVendorIssues] = useState([]);

const [detailsLoading, setDetailsLoading] = useState(false);

const [reliabilityMap, setReliabilityMap] = useState({});

const [showIssueForm, setShowIssueForm] = useState(false);

const [issueForm, setIssueForm] = useState({
  title: "",
  description: "",
  purchase_order_id: "",
  agreed_resolution_hours: 48,
});

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const [formData, setFormData] = useState(emptyForm);

  // =========================================================
  // USER
  // =========================================================

  const token = localStorage.getItem("token");

  const user = JSON.parse(
    localStorage.getItem("user") || "null"
  );

  const canManage =
    Boolean(token) &&
    user &&
    [
      "System Administrator",
      "Procurement Manager",
      "Supply Chain Manager",
    ].includes(user.role);

  const canRegister = publicMode || canManage;
  const canApprove =
    Boolean(token) && user?.role === "System Administrator";

  // =========================================================
  // HEADERS
  // =========================================================

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  // =========================================================
  // LOAD VENDORS
  // =========================================================

  const loadVendors = async () => {
    try {
      setError("");

      const response = await fetch(
        getVendorReadUrl("/vendors", publicMode),
        getVendorReadOptions(publicMode, token)
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to load vendors"
        );
      }

      setVendors(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {
    let cancelled = false;

    const fetchVendors = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          getVendorReadUrl("/vendors", publicMode),
          getVendorReadOptions(publicMode, token)
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.detail || "Failed to load vendors"
          );
        }

        if (!cancelled) {
          setVendors(data);

          // Load reliability scores for all vendors for the main table.
          const reliabilityEntries = await Promise.all(
            data.map(async (vendor) => {
              try {
                const reliabilityResponse = await fetch(
                  getVendorReadUrl(`/vendor-reliability/${vendor.id}`, publicMode),
                  getVendorReadOptions(publicMode, token)
                );

                if (!reliabilityResponse.ok) {
                  return [vendor.id, null];
                }

                const reliabilityData =
                  await reliabilityResponse.json();

                return [vendor.id, reliabilityData];
              } catch {
                return [vendor.id, null];
              }
            })
          );

          if (!cancelled) {
            setReliabilityMap(
              Object.fromEntries(
                reliabilityEntries.filter(([, value]) => value)
              )
            );
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchVendors();

    return () => {
      cancelled = true;
    };
  }, [token, publicMode]);

  // =========================================================
  // FILTER VENDORS
  // =========================================================

  const filteredVendors = useMemo(() => {
    return vendors.filter((vendor) => {
      const searchText =
        search.toLowerCase().trim();

      const matchesSearch =
        !searchText ||
        vendor.company_name
          ?.toLowerCase()
          .includes(searchText) ||
        vendor.vendor_code
          ?.toLowerCase()
          .includes(searchText) ||
        vendor.contact_person
          ?.toLowerCase()
          .includes(searchText) ||
        vendor.email
          ?.toLowerCase()
          .includes(searchText);

      const matchesCategory =
        categoryFilter === "All" ||
        vendor.category === categoryFilter;

      const matchesStatus =
        statusFilter === "All" ||
        vendor.status === statusFilter;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesStatus
      );
    });
  }, [
    vendors,
    search,
    categoryFilter,
    statusFilter,
  ]);

  const vendorStatusCounts = statuses.map((status) => ({
    label: status,
    count: vendors.filter((vendor) => vendor.status === status).length,
  }));

  const vendorCategoryCounts = categories.map((category) => ({
    label: category,
    count: vendors.filter((vendor) => vendor.category === category).length,
  }));

  const chartMaximum = Math.max(
    1,
    ...vendorStatusCounts.map(({ count }) => count),
    ...vendorCategoryCounts.map(({ count }) => count)
  );

  // =========================================================
  // RESET FORM
  // =========================================================

  const resetForm = () => {
    setFormData({
      ...emptyForm,
    });

    setEditingVendor(null);
    setShowForm(false);
  };

  // =========================================================
  // OPEN REGISTER FORM
  // =========================================================

  const openRegisterForm = () => {
    setFormData({
      ...emptyForm,
    });

    setEditingVendor(null);
    setShowForm(true);

    setSelectedVendor(null);
    setMessage("");
    setError("");
  };

  // =========================================================
  // FORM CHANGE
  // =========================================================

  const handleChange = (e) => {
    setFormData((previous) => ({
      ...previous,
      [e.target.name]: e.target.value,
    }));
  };

  // =========================================================
  // SUBMIT REGISTER / UPDATE
  // =========================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    try {
      const publicApplication = publicMode && !token && !editingVendor;
      const url = editingVendor
        ? `${API_URL}/vendors/${editingVendor.id}`
        : publicApplication
          ? `${API_URL}/public/vendor-applications`
          : `${API_URL}/vendors`;

      const method = editingVendor
        ? "PUT"
        : "POST";

      const payload = {
        company_name:
          formData.company_name.trim(),

        category:
          formData.category,

        contact_person:
          formData.contact_person.trim(),

        contact_designation:
          formData.contact_designation.trim() ||
          null,

        contact_department:
          formData.contact_department.trim() ||
          null,

        email:
          formData.email.trim(),

        phone:
          formData.phone.trim(),

        address:
          formData.address.trim(),

        tax_gst_id:
          formData.tax_gst_id.trim() ||
          null,

        payment_terms:
          formData.payment_terms || null,

        products_services:
          formData.products_services.trim() ||
          null,

        notes:
          formData.notes.trim() || null,
      };

      const response = await fetch(
        url,
        {
          method,
          headers: publicApplication
            ? { "Content-Type": "application/json" }
            : authHeaders,
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Unable to save vendor"
        );
      }

      setMessage(
        editingVendor
          ? "Vendor updated successfully"
          : publicApplication
            ? "Vendor application submitted for administrator approval"
            : "Vendor registered successfully"
      );

      resetForm();

      await loadVendors();
    } catch (err) {
      setError(err.message);
    }
  };

  // =========================================================
  // EDIT VENDOR
  // =========================================================



  // =========================================================
  // APPROVAL
  // =========================================================

  const updateApproval = async (
    vendorId,
    status
  ) => {
    if (!canApprove) {
      return;
    }

    try {
      setError("");
      setMessage("");

      const response = await fetch(
        `${API_URL}/vendors/${vendorId}/approval`,
        {
          method: "PUT",
          headers: authHeaders,
          body: JSON.stringify({
            status,
            comments:
              status === "Active"
                ? "Vendor approved"
                : "Vendor rejected",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Unable to update vendor approval"
        );
      }

      setMessage(
        status === "Active"
          ? "Vendor approved successfully"
          : "Vendor rejected successfully"
      );

      await loadVendors();

setSelectedVendor(data);
setDetailsTab("Approval");

// Refresh reliability and status history
try {
  const [reliabilityResponse, historyResponse] =
    await Promise.all([
      fetch(
        getVendorReadUrl(`/vendor-reliability/${data.id}`, publicMode),
        getVendorReadOptions(publicMode, token)
      ),

      fetch(
        getVendorReadUrl(`/vendors/${data.id}/status-history`, publicMode),
        getVendorReadOptions(publicMode, token)
      ),
    ]);

  const reliabilityData =
    await reliabilityResponse.json();

  const historyData =
    await historyResponse.json();

  if (reliabilityResponse.ok) {
    setReliability(reliabilityData);

    setReliabilityMap((previous) => ({
      ...previous,
      [data.id]: reliabilityData,
    }));
  }

  if (historyResponse.ok) {
    setStatusHistory(historyData);
  }
} catch (err) {
  console.error(
    "Unable to refresh vendor details:",
    err
  );
}
    } catch (err) {
      setError(err.message);
    }
  };

  // =========================================================
  // OPEN DETAILS
  // =========================================================

const openDetails = async (vendor) => {
  setDetailsTab("Profile");
  setMessage("");
  setError("");
  setVendorIssues([]);
setShowIssueForm(false);
  setSelectedVendor(null);
  setReliability(null);
  setStatusHistory([]);
  setDetailsLoading(true);

  try {
const [
  vendorResponse,
  reliabilityResponse,
  historyResponse,
  issuesResponse,
] = await Promise.all([
  fetch(getVendorReadUrl(`/vendors/${vendor.id}`, publicMode), getVendorReadOptions(publicMode, token)),

  fetch(getVendorReadUrl(`/vendor-reliability/${vendor.id}`, publicMode), getVendorReadOptions(publicMode, token)),

  fetch(getVendorReadUrl(`/vendors/${vendor.id}/status-history`, publicMode), getVendorReadOptions(publicMode, token)),

  fetch(getVendorReadUrl(`/vendor-issues/${vendor.id}`, publicMode), getVendorReadOptions(publicMode, token)),
]);

    const vendorData = await vendorResponse.json();
    const reliabilityData = await reliabilityResponse.json();
    const historyData = await historyResponse.json();
    const issuesData = await issuesResponse.json();

    if (!issuesResponse.ok) {
  throw new Error(
    issuesData.detail ||
      "Unable to load vendor issues"
  );
}

    if (!vendorResponse.ok) {
      throw new Error(
        vendorData.detail || "Unable to load vendor details"
      );
    }

    if (!reliabilityResponse.ok) {
      throw new Error(
        reliabilityData.detail ||
          "Unable to load vendor reliability"
      );
    }

    if (!historyResponse.ok) {
      throw new Error(
        historyData.detail ||
          "Unable to load vendor status history"
      );
    }

    setSelectedVendor(vendorData);
    setReliability(reliabilityData);
    setStatusHistory(historyData);
    setVendorIssues(issuesData);

    // Save score for the main table
    setReliabilityMap((previous) => ({
      ...previous,
      [vendor.id]: reliabilityData,
    }));
  } catch (err) {
    setError(err.message);
  } finally {
    setDetailsLoading(false);
  }
};

  // =========================================================
  // STATUS CLASS
  // =========================================================

  const statusClass = (status) => {
    return `status-badge status-${(
      status || "Pending"
    )
      .toLowerCase()
      .replace(/\s+/g, "-")}`;
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="vendor-management">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="page-header">

        <div>
          <h1>{pageTitle}</h1>

          <p>
            Register, manage and monitor vendors
          </p>
        </div>

        {canRegister && (publicMode || user?.role !== "Procurement Manager") && (
          <button
            type="button"
            className="primary-button"
            onClick={openRegisterForm}
          >
            + Register Vendor
          </button>
        )}

      </div>

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

      <section className="vendor-platform-charts" aria-label="Vendor overview charts">
        <div className="vendor-platform-chart">
          <h2>Vendor Status</h2>
          {vendorStatusCounts.map(({ label, count }) => (
            <div className="vendor-chart-row" key={label}>
              <span>{label}</span>
              <div className="vendor-chart-track">
                <span
                  className={`vendor-chart-bar vendor-chart-${label.toLowerCase().replace(/\s+/g, "-")}`}
                  style={{ width: `${(count / chartMaximum) * 100}%` }}
                />
              </div>
              <strong>{count}</strong>
            </div>
          ))}
        </div>

        <div className="vendor-platform-chart">
          <h2>Vendors by Category</h2>
          {vendorCategoryCounts.map(({ label, count }) => (
            <div className="vendor-chart-row" key={label}>
              <span>{label}</span>
              <div className="vendor-chart-track">
                <span
                  className="vendor-chart-bar vendor-chart-category"
                  style={{ width: `${(count / chartMaximum) * 100}%` }}
                />
              </div>
              <strong>{count}</strong>
            </div>
          ))}
        </div>
      </section>

      {/* =====================================================
          FILTER BAR
      ===================================================== */}

      <div className="filter-bar">

        <input
          type="text"
          placeholder="Search vendors, contacts"
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
        />

        <select
          value={categoryFilter}
          onChange={(e) =>
            setCategoryFilter(e.target.value)
          }
        >
          <option value="All">
            All Categories
          </option>

          {categories.map((category) => (
            <option
              key={category}
              value={category}
            >
              {category}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value)
          }
        >
          <option value="All">
            All Status
          </option>

          {statuses.map((status) => (
            <option
              key={status}
              value={status}
            >
              {status}
            </option>
          ))}
        </select>

      </div>

      {/* =====================================================
          CATEGORY TABS
      ===================================================== */}

      <div className="category-tabs">

        <button
          type="button"
          className={
            categoryFilter === "All"
              ? "category-tab active"
              : "category-tab"
          }
          onClick={() =>
            setCategoryFilter("All")
          }
        >
          All
        </button>

        {categories.map((category) => (
          <button
            key={category}
            type="button"
            className={
              categoryFilter === category
                ? "category-tab active"
                : "category-tab"
            }
            onClick={() =>
              setCategoryFilter(category)
            }
          >
            {category}
          </button>
        ))}

      </div>

      {/* =====================================================
          VENDOR TABLE
      ===================================================== */}

      <div className="vendor-table-card">

        <div className="table-header">

          <div>
            <h2>
              Registered Vendors
            </h2>

            <span>
              Showing{" "}
              {filteredVendors.length}{" "}
              of{" "}
              {vendors.length}
            </span>
          </div>

        </div>

        {loading && (
          <p className="loading-text">
            Loading vendors...
          </p>
        )}

        {!loading &&
          filteredVendors.length === 0 && (
            <div className="empty-state">

              <h3>
                No vendors found
              </h3>

              <p>
                Try changing the search
                or filter.
              </p>

            </div>
          )}

        {!loading &&
          filteredVendors.length > 0 && (
            <div className="table-container">

              <table>

<thead>
  <tr>
    <th>Vendor</th>
    <th>Category</th>
    <th>Primary Contact</th>
    <th>Status</th>
    <th>Reliability</th>
    <th>Onboarded</th>
  </tr>
</thead>

<tbody>

  {filteredVendors.map((vendor) => (
    <tr
      key={vendor.id}
      className="vendor-table-row"
      onClick={() => openDetails(vendor)}
    >

      {/* VENDOR */}

      <td>
        <div className="vendor-name-cell">

          <strong>
            {vendor.company_name}
          </strong>

          <span>
            {vendor.vendor_code}
          </span>

        </div>
      </td>

      {/* CATEGORY */}

      <td>
        {vendor.category || "-"}
      </td>

      {/* PRIMARY CONTACT */}

      <td>
        <div>
          {vendor.contact_person || "-"}
        </div>

        <small>
          {vendor.email || "-"}
        </small>
      </td>

      {/* STATUS */}

      <td>
        <span
          className={statusClass(
            vendor.status
          )}
        >
          {vendor.status || "Pending"}
        </span>
      </td>

      {/* RELIABILITY */}

      <td>
        {reliabilityMap[vendor.id] ? (
          <strong>
            {reliabilityMap[vendor.id].reliability_score}
          </strong>
        ) : (
          "—"
        )}
      </td>

      {/* ONBOARDED */}

      <td>
        {vendor.onboarded_on
          ? vendor.onboarded_on
          : "—"}
      </td>

    </tr>
  ))}

</tbody>

              </table>

            </div>
          )}

      </div>

      {/* =====================================================
          REGISTER / EDIT RIGHT DRAWER
      ===================================================== */}

        {showForm && (
            <div
              className="vendor-register-overlay"
              onClick={resetForm}
            >
              <aside
                className="vendor-register-drawer"
                onClick={(e) =>
                  e.stopPropagation()
                }
              >

            {/* DRAWER HEADER */}

            <div className="vendor-drawer-header">

              <div>

                <h2>
                  {editingVendor
                    ? "Edit Vendor"
                    : "Register New Vendor"}
                </h2>

                <p>
                  {editingVendor
                    ? "Update vendor information"
                    : "Enter vendor business and contact information"}
                </p>

              </div>

              <button
                type="button"
                className="drawer-close-button"
                onClick={resetForm}
              >
                ×
              </button>

            </div>

            {/* FORM */}

            <form onSubmit={handleSubmit}>

              {/* ==========================================
                  BUSINESS INFORMATION
              ========================================== */}

              <h3>
                Business Information
              </h3>

              <div className="form-grid">

                {/* COMPANY */}

                <div className="form-group">

                  <label>
                    Company Name
                  </label>

                  <input
                    type="text"
                    name="company_name"
                    value={
                      formData.company_name
                    }
                    onChange={handleChange}
                    placeholder="Enter company name"
                    required
                  />

                </div>

                {/* VENDOR CODE */}

                <div className="form-group">

                  <label>
                    Vendor Code
                  </label>

                  <input
                    type="text"
                    value={
                      editingVendor
                        ? editingVendor.vendor_code ||
                          "Generated by System"
                        : "Auto-generated by System"
                    }
                    readOnly
                    disabled
                  />

                </div>

                {/* CATEGORY */}

                <div className="form-group">

                  <label>
                    Vendor Category
                  </label>

                  <select
                    name="category"
                    value={
                      formData.category
                    }
                    onChange={handleChange}
                    required
                  >

                    {categories.map(
                      (category) => (
                        <option
                          key={category}
                          value={category}
                        >
                          {category}
                        </option>
                      )
                    )}

                  </select>

                </div>

                {/* PRODUCTS / SERVICES */}

                <div className="form-group">

                  <label>
                    Products / Services
                  </label>

                  <input
                    type="text"
                    name="products_services"
                    value={
                      formData.products_services
                    }
                    onChange={handleChange}
                    placeholder="What does this vendor provide?"
                  />

                </div>

                {/* GST */}

                <div className="form-group">

                  <label>
                    Tax / GST ID
                  </label>

                  <input
                    type="text"
                    name="tax_gst_id"
                    value={
                      formData.tax_gst_id
                    }
                    onChange={handleChange}
                    placeholder="Enter GST / Tax ID"
                  />

                </div>

                {/* PAYMENT TERMS */}

                <div className="form-group">

                  <label>
                    Payment Terms
                  </label>

                  <select
                    name="payment_terms"
                    value={
                      formData.payment_terms
                    }
                    onChange={handleChange}
                  >

                    <option value="">
                      Select Payment Terms
                    </option>

                    <option value="Net 30">
                      Net 30
                    </option>

                    <option value="Net 60">
                      Net 60
                    </option>

                    <option value="Net 90">
                      Net 90
                    </option>

                  </select>

                </div>

              </div>

              {/* ==========================================
                  PRIMARY CONTACT
              ========================================== */}

              <h3>
                Primary Contact
              </h3>

              <div className="form-grid">

                {/* CONTACT NAME */}

                <div className="form-group">

                  <label>
                    Contact Name
                  </label>

                  <input
                    type="text"
                    name="contact_person"
                    value={
                      formData.contact_person
                    }
                    onChange={handleChange}
                    placeholder="Enter contact name"
                    required
                  />

                </div>

                {/* DESIGNATION */}

                <div className="form-group">

                  <label>
                    Designation
                  </label>

                  <input
                    type="text"
                    name="contact_designation"
                    value={
                      formData.contact_designation
                    }
                    onChange={handleChange}
                    placeholder="Procurement Representative"
                    required
                  />

                </div>

                {/* DEPARTMENT */}

                <div className="form-group">

                  <label>
                    Department
                  </label>

                  <input
                    type="text"
                    name="contact_department"
                    value={
                      formData.contact_department
                    }
                    onChange={handleChange}
                    placeholder="Sales / Procurement"
                  />

                </div>

                {/* EMAIL */}

                <div className="form-group">

                  <label>
                    Email
                  </label>

                  <input
                    type="email"
                    name="email"
                    value={
                      formData.email
                    }
                    onChange={handleChange}
                    placeholder="vendor@example.com"
                    required
                  />

                </div>

                {/* PHONE */}

                <div className="form-group">

                  <label>
                    Phone
                  </label>

                  <input
                    type="tel"
                    name="phone"
                    value={
                      formData.phone
                    }
                    onChange={handleChange}
                    placeholder="Enter phone number"
                    required
                  />

                </div>

              </div>

              {/* ==========================================
                  ADDRESS
              ========================================== */}

              <h3>
                Address & Notes
              </h3>

              <div className="form-group">

                <label>
                  Registered Address
                </label>

                <textarea
                  name="address"
                  value={
                    formData.address
                  }
                  onChange={handleChange}
                  rows="4"
                  placeholder="Enter complete address"
                  required
                />

              </div>

              {/* NOTES */}

              <div className="form-group">

                <label>
                  Notes
                </label>

                <textarea
                  name="notes"
                  value={
                    formData.notes
                  }
                  onChange={handleChange}
                  rows="4"
                  placeholder="Additional vendor information"
                />

              </div>

              {/* FORM ACTIONS */}

              <div className="form-actions">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={resetForm}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                >
                  {editingVendor
                    ? "Update Vendor"
                    : "Submit for Approval"}
                </button>

              </div>

            </form>

          </aside>

        </div>
      )}

      {/* =====================================================
          VENDOR DETAILS DRAWER
      ===================================================== */}

      {selectedVendor && (
        <div
          className="vendor-drawer-overlay"
          onClick={() =>
            setSelectedVendor(null)
          }
        >

          <aside
            className="vendor-drawer"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            {/* HEADER */}

            <div className="vendor-drawer-header">

              <div>

                <h2>
                  {
                    selectedVendor.company_name
                  }
                </h2>

                <p>

                  {
                    selectedVendor.vendor_code
                  }

                  {" · "}

                  {
                    selectedVendor.category ||
                    "Uncategorized"
                  }

                </p>

              </div>

              <button
                type="button"
                className="drawer-close-button"
                onClick={() =>
                  setSelectedVendor(null)
                }
              >
                ×
              </button>

            </div>

            {/* STATUS */}

            <div className="vendor-drawer-status">

              <span
                className={statusClass(
                  selectedVendor.status
                )}
              >
                {
                  selectedVendor.status
                }
              </span>

            </div>

            {/* TABS */}

            <div className="vendor-detail-tabs">

              {[
                "Profile",
                "Approval",
                "Contacts",
                "Status",
              ].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={
                    detailsTab === tab
                      ? "vendor-detail-tab active"
                      : "vendor-detail-tab"
                  }
                  onClick={() =>
                    setDetailsTab(tab)
                  }
                >
                  {tab}
                </button>
              ))}

            </div>

            {/* CONTENT */}

            <div className="vendor-detail-content">

              {/* ==========================================
    PROFILE
========================================== */}

{detailsTab === "Profile" && (
  <>
    {/* BUSINESS INFORMATION */}

    <div className="detail-section">

      <h3>
        Business Information
      </h3>

      <div className="detail-grid">

        <div>
          <span>
            Category
          </span>

          <strong>
            {selectedVendor.category || "-"}
          </strong>
        </div>

        <div>
          <span>
            Registered address
          </span>

          <strong>
            {selectedVendor.address || "-"}
          </strong>
        </div>

        <div>
          <span>
            Tax / GST ID
          </span>

          <strong>
            {selectedVendor.tax_gst_id || "-"}
          </strong>
        </div>

        <div>
          <span>
            Payment terms
          </span>

          <strong>
            {selectedVendor.payment_terms || "-"}
          </strong>
        </div>

        <div>
          <span>
            Onboarded on
          </span>

          <strong>
            {selectedVendor.onboarded_on || "—"}
          </strong>
        </div>

        <div>
          <span>
            Reliability score
          </span>

          <strong>
            {detailsLoading
              ? "Loading..."
              : reliability
              ? `${reliability.reliability_score} / 100`
              : "—"}
          </strong>
        </div>

      </div>

    </div>

    {/* PRODUCTS / SERVICES */}

    <div className="detail-section">

      <h3>
        Products / Services
      </h3>

      <p>
        {selectedVendor.products_services ||
          "No products or services information added."}
      </p>

    </div>

 {/* RELIABILITY */}

<div className="detail-section">

  <h3>
    Reliability
  </h3>

  {detailsLoading ? (
    <p>Loading reliability score...</p>
  ) : reliability ? (
    <>
      <div className="detail-grid">

        <div>
          <span>
            Overall Score
          </span>

          <strong>
            {reliability.reliability_score} / 100
          </strong>
        </div>

        <div>
          <span>
            Risk Level
          </span>

          <strong>
            {reliability.risk_level}
          </strong>
        </div>

        <div>
          <span>
            Delivery
          </span>

          <strong>
            {reliability.delivery_score}
          </strong>
        </div>

        <div>
          <span>
            Quality
          </span>

          <strong>
            {reliability.quality_score}
          </strong>
        </div>

        <div>
          <span>
            Compliance
          </span>

          <strong>
            {reliability.compliance_score}
          </strong>
        </div>

        <div>
          <span>
            Communication
          </span>

          <strong>
            {reliability.communication_score}
          </strong>
        </div>

        <div>
          <span>
            Purchase History
          </span>

          <strong>
            {reliability.purchase_history_score}
          </strong>
        </div>

        <div>
          <span>
            Contract
          </span>

          <strong>
            {reliability.contract_score}
          </strong>
        </div>

                    <div>
              <span>
                Issue Resolution
              </span>

              <strong>
                {reliability.issue_resolution_score}
              </strong>
            </div>

            <div>
              <span>
                Total Issues
              </span>

              <strong>
                {reliability.total_issues}
              </strong>
            </div>

            <div>
              <span>
                Resolved Issues
              </span>

              <strong>
                {reliability.resolved_issues}
              </strong>
            </div>

            <div>
              <span>
                Resolved Within Agreed Time
              </span>

              <strong>
                {reliability.issues_resolved_within_agreed_time}
              </strong>
            </div>

      </div>

      <p className="detail-note">
        Score is calculated from the vendor's stored
        purchase orders, performance evaluations,
        communications, contracts and issue resolution records.
      </p>
    </>
  ) : (
    <p className="detail-note">
      Reliability data is not available.
    </p>
  )}

</div>


{/* ISSUE RESOLUTION */}

<div className="detail-section">

  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: "12px",
    }}
  >
    <h3>
      Issue Resolution
    </h3>

    {canManage && (
      <button
        type="button"
        className="secondary-button"
        onClick={() =>
          setShowIssueForm((previous) => !previous)
        }
      >
        {showIssueForm
          ? "Cancel"
          : "+ Create Issue"}
      </button>
    )}
  </div>

  {showIssueForm && (
    <div className="issue-form">

      <div className="form-group">
        <label>
          Issue Title
        </label>

        <input
          type="text"
          value={issueForm.title}
          onChange={(e) =>
            setIssueForm((previous) => ({
              ...previous,
              title: e.target.value,
            }))
          }
          placeholder="Enter issue title"
          required
        />
      </div>

      <div className="form-group">
        <label>
          Description
        </label>

        <textarea
          rows="3"
          value={issueForm.description}
          onChange={(e) =>
            setIssueForm((previous) => ({
              ...previous,
              description: e.target.value,
            }))
          }
          placeholder="Describe the issue"
        />
      </div>

      <div className="form-grid">

        <div className="form-group">
          <label>
            Purchase Order ID
          </label>

          <input
            type="number"
            value={issueForm.purchase_order_id}
            onChange={(e) =>
              setIssueForm((previous) => ({
                ...previous,
                purchase_order_id: e.target.value,
              }))
            }
            placeholder="Optional"
          />
        </div>

        <div className="form-group">
          <label>
            Agreed Resolution Hours
          </label>

          <input
            type="number"
            min="1"
            value={issueForm.agreed_resolution_hours}
            onChange={(e) =>
              setIssueForm((previous) => ({
                ...previous,
                agreed_resolution_hours:
                  e.target.value,
              }))
            }
          />
        </div>

      </div>

      <button
        type="button"
        className="primary-button"
        onClick={async () => {
          try {
            setError("");

            const response = await fetch(
              `${API_URL}/vendor-issues`,
              {
                method: "POST",
                headers: authHeaders,
                body: JSON.stringify({
                  vendor_id: selectedVendor.id,
                  purchase_order_id:
                    issueForm.purchase_order_id
                      ? Number(
                          issueForm.purchase_order_id
                        )
                      : null,
                  title: issueForm.title.trim(),
                  description:
                    issueForm.description.trim() ||
                    null,
                  agreed_resolution_hours:
                    Number(
                      issueForm.agreed_resolution_hours
                    ),
                }),
              }
            );

            const data = await response.json();

            if (!response.ok) {
              throw new Error(
                data.detail ||
                  "Unable to create issue"
              );
            }

            setVendorIssues((previous) => [
              data,
              ...previous,
            ]);

            setIssueForm({
              title: "",
              description: "",
              purchase_order_id: "",
              agreed_resolution_hours: 48,
            });

            setShowIssueForm(false);

            setMessage(
              "Issue created successfully"
            );
          } catch (err) {
            setError(err.message);
          }
        }}
      >
        Create Issue
      </button>

    </div>
  )}

  {vendorIssues.length === 0 ? (
    <p className="detail-note">
      No issues recorded for this vendor.
    </p>
  ) : (
    <div className="issue-list">

      {vendorIssues.map((issue) => (
        <div
          key={issue.id}
          className="issue-card"
        >

          <div>
            <strong>
              {issue.title}
            </strong>

            <p>
              {issue.description ||
                "No description"}
            </p>
          </div>

          <div>
            <span className="status-badge">
              {issue.status}
            </span>

            <small>
              Raised:{" "}
              {new Date(
                issue.raised_at
              ).toLocaleString()}
            </small>

            {issue.resolved_at && (
              <small>
                Resolved:{" "}
                {new Date(
                  issue.resolved_at
                ).toLocaleString()}
              </small>
            )}

            {canManage &&
              issue.status !== "Resolved" &&
              issue.status !== "Closed" && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={async () => {
                    try {
                      setError("");

                      const response =
                        await fetch(
                          `${API_URL}/vendor-issues/${issue.id}/status`,
                          {
                            method: "PUT",
                            headers: authHeaders,
                            body: JSON.stringify({
                              status: "Resolved",
                            }),
                          }
                        );

                      const data =
                        await response.json();

                      if (!response.ok) {
                        throw new Error(
                          data.detail ||
                            "Unable to resolve issue"
                        );
                      }

                      setVendorIssues(
                        (previous) =>
                          previous.map(
                            (item) =>
                              item.id === data.id
                                ? data
                                : item
                          )
                      );

                      setMessage(
                        "Issue resolved successfully"
                      );
                    } catch (err) {
                      setError(err.message);
                    }
                  }}
                >
                  Mark Resolved
                </button>
              )}

          </div>

        </div>
      ))}

    </div>
  )}

</div>



    {/* NOTES */}

    {selectedVendor.notes && (
      <div className="detail-section">

        <h3>
          Notes
        </h3>

        <p>
          {selectedVendor.notes}
        </p>

      </div>
    )}

  </>
)}

              {/* ==========================================
                  APPROVAL
              ========================================== */}

              {detailsTab === "Approval" && (
                <div className="detail-section">

                  <h3>
                    Approval Status
                  </h3>

                  {/* STEP 1 */}

                  <div className="approval-step active">

                    <span>
                      1
                    </span>

                    <div>

                      <strong>
                        Registration Submitted
                      </strong>

                      <p>
                        Vendor registration is
                        stored in the system.
                      </p>

                    </div>

                  </div>

                  {/* STEP 2 */}

                  <div
                    className={
                      selectedVendor.status ===
                        "Pending"
                        ? "approval-step active"
                        : "approval-step completed"
                    }
                  >

                    <span>
                      2
                    </span>

                    <div>

                      <strong>
                        Verification
                      </strong>

                      <p>
                        {
                          selectedVendor.status ===
                            "Pending"
                            ? "Waiting for verification."
                            : "Verification stage completed."
                        }
                      </p>

                    </div>

                  </div>

                  {/* STEP 3 */}

                  <div
                    className={
                      selectedVendor.status ===
                        "Active"
                        ? "approval-step completed"
                        : "approval-step"
                    }
                  >

                    <span>
                      3
                    </span>

                    <div>

                      <strong>
                        Approval Decision
                      </strong>

                      <p>
                        {
                          selectedVendor.status ===
                            "Active"
                            ? "Vendor approved and active."
                            : selectedVendor.status ===
                              "Rejected"
                            ? "Vendor registration rejected."
                            : "Awaiting approval decision."
                        }
                      </p>

                    </div>

                  </div>

                  {/* APPROVAL BUTTONS */}

                  {canApprove &&
                    selectedVendor.status ===
                      "Pending" && (
                      <div className="form-actions">

                        <button
                          type="button"
                          className="approve-button"
                          onClick={() =>
                            updateApproval(
                              selectedVendor.id,
                              "Active"
                            )
                          }
                        >
                          Approve Vendor
                        </button>

                        <button
                          type="button"
                          className="reject-button"
                          onClick={() =>
                            updateApproval(
                              selectedVendor.id,
                              "Rejected"
                            )
                          }
                        >
                          Reject Vendor
                        </button>

                      </div>
                    )}

                </div>
              )}

              {/* ==========================================
                  CONTACTS
              ========================================== */}

              {detailsTab === "Contacts" && (
                <div className="detail-section">

                  <h3>
                    Primary Contact
                  </h3>

                  <div className="contact-card">

                    <strong>
                      {
                        selectedVendor.contact_person ||
                        "-"
                      }
                    </strong>

                    <span>
                      {
                        selectedVendor.contact_designation ||
                        "Designation not provided"
                      }
                    </span>

                    <span>
                      {
                        selectedVendor.contact_department ||
                        "Department not provided"
                      }
                    </span>

                    <span>
                      {
                        selectedVendor.email ||
                        "-"
                      }
                    </span>

                    <span>
                      {
                        selectedVendor.phone ||
                        "-"
                      }
                    </span>

                  </div>

                  <p className="detail-note">
                    Additional vendor contacts will
                    be managed through the vendor
                    contacts records.
                  </p>

                </div>
              )}

              {/* ==========================================
                  STATUS
              ========================================== */}

              {detailsTab === "Status" && (
                <div className="detail-section">

                  <h3>
                    Current Status
                  </h3>

                  <div className="current-status-card">

                    <span
                      className={statusClass(
                        selectedVendor.status
                      )}
                    >
                      {
                        selectedVendor.status
                      }
                    </span>

                    <p>
                      Current vendor status stored
                      in the vendor master record.
                    </p>

                  </div>

          <h3>
            Status History
          </h3>

          {detailsLoading ? (
            <p>Loading status history...</p>
          ) : statusHistory.length === 0 ? (
            <div className="empty-history">
              No status history records found.
            </div>
          ) : (
            <div className="status-history-list">

              {statusHistory.map((item) => (
                <div
                  key={item.id}
                  className="status-history-item"
                >

                  <div>
                    <strong>
                      {item.from_status || "Initial"}
                      {" → "}
                      {item.to_status}
                    </strong>

                    <p>
                      {item.comments || "No comments"}
                    </p>
                  </div>

                  <div>
                    <small>
                      Changed by User ID: {item.changed_by}
                    </small>

                    <br />

                    <small>
                      {item.changed_at
                        ? new Date(
                            item.changed_at
                          ).toLocaleString()
                        : "—"}
                    </small>
                  </div>

                </div>
              ))}

            </div>
          )}

                </div>
              )}

            </div>

          </aside>

        </div>
      )}

    </div>
  );
}

export default VendorManagement;