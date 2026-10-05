import { useEffect, useState } from "react";

const API_URL = "http://127.0.0.1:8000";

function getReadUrl(path, publicMode) {
  return `${API_URL}${publicMode ? `/public${path}` : path}`;
}

function getReadOptions(publicMode, token) {
  return publicMode ? {} : { headers: { Authorization: `Bearer ${token}` } };
}

function Contracts({ publicMode = false }) {
  const [contracts, setContracts] = useState([]);
  const [vendors, setVendors] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [editingContract, setEditingContract] = useState(null);
  const [selectedContract, setSelectedContract] = useState(null);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    vendor_id: "",
    contract_number: "",
    title: "",
    start_date: "",
    end_date: "",
    amount: "",
    document_url: "",
  });

  const token = localStorage.getItem("token");

  const user = JSON.parse(
    localStorage.getItem("user") || "null"
  );

 const canManageContracts = [
  "System Administrator",
  "Procurement Manager",
  "Supply Chain Manager",
].includes(user?.role) && Boolean(token) && !publicMode;

const canUpdateStatus = [
  "System Administrator",
  "Procurement Manager",
  "Supply Chain Manager",
  "Finance Officer",
].includes(user?.role) && Boolean(token) && !publicMode;

  // ==========================================
  // INITIAL LOAD
  // ==========================================

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        const [contractsResponse, vendorsResponse] =
          await Promise.all([
            fetch(
              getReadUrl("/contracts", publicMode),
              getReadOptions(publicMode, token)
            ),
            fetch(
              getReadUrl("/vendors", publicMode),
              getReadOptions(publicMode, token)
            ),
          ]);

        const contractsData =
          await contractsResponse.json();

        const vendorsData =
          await vendorsResponse.json();

        if (!contractsResponse.ok) {
          throw new Error(
            contractsData.detail ||
              "Failed to load contracts"
          );
        }

        if (!vendorsResponse.ok) {
          throw new Error(
            vendorsData.detail ||
              "Failed to load vendors"
          );
        }

        if (!cancelled) {
          setContracts(contractsData);
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
  }, [token, publicMode]);

  // ==========================================
  // RELOAD CONTRACTS
  // ==========================================

  const loadContracts = async () => {
    try {
      const response = await fetch(
        getReadUrl("/contracts", publicMode),
        getReadOptions(publicMode, token)
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to load contracts"
        );
      }

      setContracts(data);
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
  // RESET FORM
  // ==========================================

  const resetForm = () => {
    setFormData({
      vendor_id: "",
      contract_number: "",
      title: "",
      start_date: "",
      end_date: "",
      amount: "",
      document_url: "",
    });

    setEditingContract(null);
    setShowForm(false);
  };

  // ==========================================
  // CREATE / UPDATE CONTRACT
  // ==========================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    try {
      const url = editingContract
        ? `${API_URL}/contracts/${editingContract.id}`
        : `${API_URL}/contracts`;

      const method = editingContract ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          vendor_id: Number(formData.vendor_id),
          contract_number: formData.contract_number,
          title: formData.title,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          amount:
            formData.amount === ""
              ? null
              : Number(formData.amount),
          document_url:
            formData.document_url || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to save contract"
        );
      }

      setMessage(
        editingContract
          ? "Contract updated successfully"
          : "Contract created successfully"
      );

      resetForm();
      await loadContracts();
    } catch (err) {
      setError(err.message);
    }
  };

  // ==========================================
  // EDIT
  // ==========================================

  const handleEdit = (contract) => {
    setEditingContract(contract);

    setFormData({
      vendor_id: String(contract.vendor_id),
      contract_number:
        contract.contract_number || "",
      title: contract.title || "",
      start_date: contract.start_date || "",
      end_date: contract.end_date || "",
      amount:
        contract.amount === null ||
        contract.amount === undefined
          ? ""
          : String(contract.amount),
      document_url:
        contract.document_url || "",
    });

    setShowForm(true);
    setMessage("");
    setError("");
  };

  // ==========================================
  // UPDATE STATUS
  // ==========================================

  const updateStatus = async (
    contractId,
    status
  ) => {
    try {
      setError("");
      setMessage("");

      const response = await fetch(
        `${API_URL}/contracts/${contractId}/status`,
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
            "Failed to update contract status"
        );
      }

      setMessage(
        `Contract status changed to ${status}`
      );

      await loadContracts();
    } catch (err) {
      setError(err.message);
    }
  };

  // ==========================================
  // VENDOR NAME
  // ==========================================

  const getVendorName = (vendorId) => {
    const vendor = vendors.find(
      (item) => item.id === vendorId
    );

    return vendor
      ? vendor.company_name
      : `Vendor #${vendorId}`;
  };

  return (
    <div>

      {/* HEADER */}

      <div className="page-header">

        <div>
          <h1>Contract & Compliance</h1>

          <p>
            Manage vendor contracts, renewals and
            compliance status.
          </p>
        </div>

        {canManageContracts && (
          <button
            type="button"
            className="primary-button"
            onClick={() => {
              setShowForm(true);
              setMessage("");
              setError("");
            }}
          >
            + Add Contract
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
            {editingContract
              ? "Edit Contract"
              : "Add Contract"}
          </h2>

          <form onSubmit={handleSubmit}>

            <div className="form-grid">

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


              <div className="form-group">

                <label htmlFor="contract_number">
                  Contract Number
                </label>

                <input
                  id="contract_number"
                  type="text"
                  name="contract_number"
                  value={formData.contract_number}
                  onChange={handleChange}
                  placeholder="CON-00001"
                  required
                />

              </div>


              <div className="form-group">

                <label htmlFor="title">
                  Contract Title
                </label>

                <input
                  id="title"
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Enter contract title"
                  required
                />

              </div>


              <div className="form-group">

                <label htmlFor="amount">
                  Contract Amount
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
                />

              </div>


              <div className="form-group">

                <label htmlFor="start_date">
                  Start Date
                </label>

                <input
                  id="start_date"
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleChange}
                />

              </div>


              <div className="form-group">

                <label htmlFor="end_date">
                  End Date
                </label>

                <input
                  id="end_date"
                  type="date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleChange}
                />

              </div>

            </div>


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
                {editingContract
                  ? "Update Contract"
                  : "Create Contract"}
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


      {/* CONTRACT TABLE */}

      <div className="vendor-table-card">

        <div className="table-header">

          <div>
            <h2>Contracts</h2>

            <span>
              Total: {contracts.length}
            </span>
          </div>

        </div>


        {loading ? (
          <p className="loading-text">
            Loading contracts...
          </p>
        ) : contracts.length === 0 ? (
          <div className="empty-state">

            <h3>
              No contracts found
            </h3>

            <p>
              Add a contract to start managing
              vendor compliance.
            </p>

          </div>
        ) : (

          <div className="table-container">

            <table>

              <thead>

                <tr>
                  <th>Contract No.</th>
                  <th>Vendor</th>
                  <th>Title</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>

              </thead>

              <tbody>

                {contracts.map((contract) => (

                  <tr key={contract.id}>

                    <td>
                      <strong>
                        {contract.contract_number}
                      </strong>
                    </td>

                    <td>
                      {getVendorName(
                        contract.vendor_id
                      )}
                    </td>

                    <td>
                      {contract.title}
                    </td>

                    <td>
                      {contract.start_date || "-"}
                    </td>

                    <td>
                      {contract.end_date || "-"}
                    </td>

                    <td>
                      {contract.amount !== null &&
                      contract.amount !== undefined
                        ? `₹${Number(
                            contract.amount
                          ).toLocaleString("en-IN")}`
                        : "-"}
                    </td>

                    <td>

                      <span
                        className={`status-badge status-${(
                          contract.status ||
                          "Active"
                        )
                          .toLowerCase()
                          .replace(/\s+/g, "-")}`}
                      >
                        {contract.status}
                      </span>

                    </td>

                    <td>

                      <div className="action-buttons">

                        {canManageContracts && (
                          <button
                            type="button"
                            className="edit-button"
                            onClick={() =>
                              handleEdit(contract)
                            }
                          >
                            Edit
                          </button>
                        )}

                        <button
                          type="button"
                          className="edit-button"
                          onClick={() => setSelectedContract(contract)}
                        >
                          View
                        </button>

                        {canUpdateStatus &&
                          contract.status ===
                            "Active" && (
                            <button
                              type="button"
                              className="approve-button"
                              onClick={() =>
                                updateStatus(
                                  contract.id,
                                  "Renewal Pending"
                                )
                              }
                            >
                              Renewal
                            </button>
                          )}

                        {canUpdateStatus &&
                          contract.status ===
                            "Renewal Pending" && (
                            <button
                              type="button"
                              className="approve-button"
                              onClick={() =>
                                updateStatus(
                                  contract.id,
                                  "Active"
                                )
                              }
                            >
                              Renewed
                            </button>
                          )}

                        {canUpdateStatus &&
                          contract.status !==
                            "Cancelled" && (
                            <button
                              type="button"
                              className="reject-button"
                              onClick={() =>
                                updateStatus(
                                  contract.id,
                                  "Cancelled"
                                )
                              }
                            >
                              Cancel
                            </button>
                          )}

                      </div>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

      </div>

      {selectedContract && (
        <section className="vendor-form-card contract-detail-panel">
          <div className="table-header">
            <h2>{selectedContract.contract_number}</h2>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setSelectedContract(null)}
            >
              Close
            </button>
          </div>
          <p><strong>Vendor:</strong> {getVendorName(selectedContract.vendor_id)}</p>
          <p><strong>Title:</strong> {selectedContract.title}</p>
          <p><strong>Status:</strong> {selectedContract.status}</p>
          <p><strong>Start date:</strong> {selectedContract.start_date || "-"}</p>
          <p><strong>End date:</strong> {selectedContract.end_date || "-"}</p>
          <p>
            <strong>Amount:</strong>{" "}
            {selectedContract.amount == null
              ? "-"
              : `₹${Number(selectedContract.amount).toLocaleString("en-IN")}`}
          </p>
          {selectedContract.document_url && (
            <p>
              <strong>Document:</strong>{" "}
              <a href={selectedContract.document_url} target="_blank" rel="noreferrer">
                Open contract document
              </a>
            </p>
          )}
        </section>
      )}

    </div>
  );
}

export default Contracts;