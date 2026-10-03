import {
  useCallback,
  useEffect,
  useState,
} from "react";

const API_URL = "http://127.0.0.1:8000";

function Contracts() {
  const [activeTab, setActiveTab] = useState("contracts");

  const [contracts, setContracts] = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [complianceChecks, setComplianceChecks] = useState([]);
  const [vendorDocuments, setVendorDocuments] = useState([]);

  const [vendors, setVendors] = useState([]);
  const [selectedVendorId, setSelectedVendorId] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingContract, setEditingContract] = useState(null);

  const [loading, setLoading] = useState(true);
  const [sectionLoading, setSectionLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // =========================================================
  // CONTRACT FORM
  // =========================================================

  const [contractForm, setContractForm] = useState({
    vendor_id: "",
    contract_number: "",
    title: "",
    start_date: "",
    end_date: "",
    amount: "",
    document_url: "",
  });

  // =========================================================
  // CERTIFICATION FORM
  // =========================================================

  const [certificationForm, setCertificationForm] = useState({
    name: "",
    issue_date: "",
    expiry_date: "",
    status: "Valid",
    document_url: "",
  });

  // =========================================================
  // COMPLIANCE FORM
  // =========================================================

  const [complianceForm, setComplianceForm] = useState({
    requirement: "",
    status: "Pending",
    comments: "",
  });

  // =========================================================
  // DOCUMENT FORM
  // =========================================================

  const [documentForm, setDocumentForm] = useState({
    name: "",
    document_type: "",
    document_url: "",
    expiry_date: "",
    status: "Active",
  });

  const token = localStorage.getItem("token");

  const user = JSON.parse(
    localStorage.getItem("user") || "null"
  );

  const role = user?.role?.trim();

  // =========================================================
  // PERMISSIONS
  // =========================================================

  const canManageContracts = [
    "System Administrator",
    "Procurement Manager",
    "Supply Chain Manager",
  ].includes(role);

  const canUpdateStatus = [
    "System Administrator",
    "Procurement Manager",
    "Supply Chain Manager",
    "Finance Officer",
  ].includes(role);

  const canManageCompliance = [
    "System Administrator",
    "Procurement Manager",
    "Supply Chain Manager",
  ].includes(role);

  // =========================================================
  // COMMON REQUEST
  // =========================================================

 const apiRequest = useCallback(
  async (url, options = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...(options.body
          ? {
              "Content-Type": "application/json",
            }
          : {}),
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });

    let data;

    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      throw new Error(
        data.detail ||
          data.message ||
          "Request failed"
      );
    }

    return data;
  },
  [token]
);

  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {
    let cancelled = false;

    const loadInitialData = async () => {
      try {
        setLoading(true);
        setError("");

        const [contractsData, vendorsData] =
          await Promise.all([
            apiRequest(`${API_URL}/contracts`),
            apiRequest(`${API_URL}/vendors`),
          ]);

        if (cancelled) return;

        setContracts(contractsData);
        setVendors(vendorsData);

        if (vendorsData.length > 0) {
          setSelectedVendorId(
            String(vendorsData[0].id)
          );
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

    loadInitialData();

    return () => {
      cancelled = true;
    };
  }, [apiRequest]);

  // =========================================================
  // LOAD VENDOR COMPLIANCE DATA
  // =========================================================

  useEffect(() => {
  if (!selectedVendorId) {
    return;
  }

  let cancelled = false;

  const loadVendorComplianceData = async () => {
    try {
      setSectionLoading(true);
      setError("");

      const vendorId = Number(selectedVendorId);

      const [
        certificationData,
        complianceData,
        documentData,
      ] = await Promise.all([
        apiRequest(
          `${API_URL}/certifications/${vendorId}`
        ),
        apiRequest(
          `${API_URL}/compliance-checks/${vendorId}`
        ),
        apiRequest(
          `${API_URL}/vendor-documents/${vendorId}`
        ),
      ]);

      if (cancelled) return;

      setCertifications(certificationData);
      setComplianceChecks(complianceData);
      setVendorDocuments(documentData);
    } catch (err) {
      if (!cancelled) {
        setError(err.message);
      }
    } finally {
      if (!cancelled) {
        setSectionLoading(false);
      }
    }
  };

  loadVendorComplianceData();

  return () => {
    cancelled = true;
  };
}, [selectedVendorId, apiRequest]);

  // =========================================================
  // RELOAD CONTRACTS
  // =========================================================

  const loadContracts = async () => {
    try {
      const data = await apiRequest(
        `${API_URL}/contracts`
      );

      setContracts(data);
    } catch (err) {
      setError(err.message);
    }
  };

  // =========================================================
  // RELOAD COMPLIANCE DATA
  // =========================================================

  const loadComplianceData = async () => {
    if (!selectedVendorId) return;

    try {
      setSectionLoading(true);

      const vendorId = Number(
        selectedVendorId
      );

      const [
        certificationData,
        complianceData,
        documentData,
      ] = await Promise.all([
        apiRequest(
          `${API_URL}/certifications/${vendorId}`
        ),
        apiRequest(
          `${API_URL}/compliance-checks/${vendorId}`
        ),
        apiRequest(
          `${API_URL}/vendor-documents/${vendorId}`
        ),
      ]);

      setCertifications(certificationData);
      setComplianceChecks(complianceData);
      setVendorDocuments(documentData);
    } catch (err) {
      setError(err.message);
    } finally {
      setSectionLoading(false);
    }
  };

  // =========================================================
  // FORM CHANGES
  // =========================================================

  const handleContractChange = (e) => {
    setContractForm({
      ...contractForm,
      [e.target.name]: e.target.value,
    });
  };

  const handleCertificationChange = (e) => {
    setCertificationForm({
      ...certificationForm,
      [e.target.name]: e.target.value,
    });
  };

  const handleComplianceChange = (e) => {
    setComplianceForm({
      ...complianceForm,
      [e.target.name]: e.target.value,
    });
  };

  const handleDocumentChange = (e) => {
    setDocumentForm({
      ...documentForm,
      [e.target.name]: e.target.value,
    });
  };

  // =========================================================
  // RESET CONTRACT FORM
  // =========================================================

  const resetContractForm = () => {
    setContractForm({
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


  // =========================================================
  // CREATE / UPDATE CONTRACT
  // =========================================================

  const handleContractSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    try {
      const url = editingContract
        ? `${API_URL}/contracts/${editingContract.id}`
        : `${API_URL}/contracts`;

      const method = editingContract
        ? "PUT"
        : "POST";

      await apiRequest(url, {
        method,
        body: JSON.stringify({
          vendor_id: Number(
            contractForm.vendor_id
          ),
          contract_number:
            contractForm.contract_number,
          title: contractForm.title,
          start_date:
            contractForm.start_date || null,
          end_date:
            contractForm.end_date || null,
          amount:
            contractForm.amount === ""
              ? null
              : Number(contractForm.amount),
          document_url:
            contractForm.document_url || null,
        }),
      });

      setMessage(
        editingContract
          ? "Contract updated successfully"
          : "Contract created successfully"
      );

      resetContractForm();

      await loadContracts();
    } catch (err) {
      setError(err.message);
    }
  };

  // =========================================================
  // EDIT CONTRACT
  // =========================================================

  const handleEdit = (contract) => {
    setEditingContract(contract);

    setContractForm({
      vendor_id: String(
        contract.vendor_id
      ),
      contract_number:
        contract.contract_number || "",
      title: contract.title || "",
      start_date:
        contract.start_date || "",
      end_date:
        contract.end_date || "",
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

  // =========================================================
  // CONTRACT STATUS
  // =========================================================

  const updateStatus = async (
    contractId,
    status
  ) => {
    try {
      setError("");
      setMessage("");

      await apiRequest(
        `${API_URL}/contracts/${contractId}/status`,
        {
          method: "PUT",
          body: JSON.stringify({
            status,
          }),
        }
      );

      setMessage(
        `Contract status changed to ${status}`
      );

      await loadContracts();
    } catch (err) {
      setError(err.message);
    }
  };

  // =========================================================
  // ADD CERTIFICATION
  // =========================================================

  const handleCertificationSubmit = async (
    e
  ) => {
    e.preventDefault();

    if (!selectedVendorId) {
      setError("Please select a vendor");
      return;
    }

    try {
      setError("");
      setMessage("");

      await apiRequest(
        `${API_URL}/certifications`,
        {
          method: "POST",
          body: JSON.stringify({
            vendor_id: Number(
              selectedVendorId
            ),
            name: certificationForm.name,
            issue_date:
              certificationForm.issue_date ||
              null,
            expiry_date:
              certificationForm.expiry_date ||
              null,
            status:
              certificationForm.status,
            document_url:
              certificationForm.document_url ||
              null,
          }),
        }
      );

      setMessage(
        "Certification added successfully"
      );

      setCertificationForm({
        name: "",
        issue_date: "",
        expiry_date: "",
        status: "Valid",
        document_url: "",
      });

      await loadComplianceData();
    } catch (err) {
      setError(err.message);
    }
  };

  // =========================================================
  // ADD COMPLIANCE CHECK
  // =========================================================

  const handleComplianceSubmit = async (
    e
  ) => {
    e.preventDefault();

    if (!selectedVendorId) {
      setError("Please select a vendor");
      return;
    }

    try {
      setError("");
      setMessage("");

      await apiRequest(
        `${API_URL}/compliance-checks`,
        {
          method: "POST",
          body: JSON.stringify({
            vendor_id: Number(
              selectedVendorId
            ),
            requirement:
              complianceForm.requirement,
            status:
              complianceForm.status,
            comments:
              complianceForm.comments ||
              null,
          }),
        }
      );

      setMessage(
        "Compliance check added successfully"
      );

      setComplianceForm({
        requirement: "",
        status: "Pending",
        comments: "",
      });

      await loadComplianceData();
    } catch (err) {
      setError(err.message);
    }
  };

  // =========================================================
  // ADD VENDOR DOCUMENT
  // =========================================================

  const handleDocumentSubmit = async (e) => {
    e.preventDefault();

    if (!selectedVendorId) {
      setError("Please select a vendor");
      return;
    }

    try {
      setError("");
      setMessage("");

      await apiRequest(
        `${API_URL}/vendor-documents`,
        {
          method: "POST",
          body: JSON.stringify({
            vendor_id: Number(
              selectedVendorId
            ),
            name: documentForm.name,
            document_type:
              documentForm.document_type ||
              null,
            document_url:
              documentForm.document_url ||
              null,
            expiry_date:
              documentForm.expiry_date ||
              null,
            status:
              documentForm.status,
          }),
        }
      );

      setMessage(
        "Vendor document added successfully"
      );

      setDocumentForm({
        name: "",
        document_type: "",
        document_url: "",
        expiry_date: "",
        status: "Active",
      });

      await loadComplianceData();
    } catch (err) {
      setError(err.message);
    }
  };

  // =========================================================
  // VENDOR NAME
  // =========================================================

  const getVendorName = (vendorId) => {
    const vendor = vendors.find(
      (item) => item.id === vendorId
    );

    return vendor
      ? vendor.company_name
      : `Vendor #${vendorId}`;
  };

  // =========================================================
  // TAB CHANGE
  // =========================================================

  const changeTab = (tab) => {
    setActiveTab(tab);
    setShowForm(false);
    setEditingContract(null);
    setMessage("");
    setError("");
  };

  return (
    <div>

      {/* ===================================================
          HEADER
          =================================================== */}

      <div className="page-header">

        <div>
          <h1>Contract & Compliance</h1>

          <p>
            Manage vendor contracts, renewals,
            certifications, compliance and
            vendor documents.
          </p>
        </div>

      </div>

      {/* ===================================================
          MESSAGES
          =================================================== */}

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

      {/* ===================================================
          TABS
          =================================================== */}

      <div
        className="form-actions"
        style={{
          marginBottom: "20px",
          flexWrap: "wrap",
        }}
      >

        <button
          type="button"
          className={
            activeTab === "contracts"
              ? "primary-button"
              : "secondary-button"
          }
          onClick={() =>
            changeTab("contracts")
          }
        >
          Contracts
        </button>

        <button
          type="button"
          className={
            activeTab === "certifications"
              ? "primary-button"
              : "secondary-button"
          }
          onClick={() =>
            changeTab("certifications")
          }
        >
          Certifications
        </button>

        <button
          type="button"
          className={
            activeTab === "compliance"
              ? "primary-button"
              : "secondary-button"
          }
          onClick={() =>
            changeTab("compliance")
          }
        >
          Compliance Checks
        </button>

        <button
          type="button"
          className={
            activeTab === "documents"
              ? "primary-button"
              : "secondary-button"
          }
          onClick={() =>
            changeTab("documents")
          }
        >
          Vendor Documents
        </button>

      </div>

      {/* ===================================================
          CONTRACTS TAB
          =================================================== */}

      {activeTab === "contracts" && (
        <>

          {canManageContracts && (
            <div
              style={{
                marginBottom: "20px",
              }}
            >
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  setShowForm(true);
                  setEditingContract(null);
                  setMessage("");
                  setError("");
                }}
              >
                + Add Contract
              </button>
            </div>
          )}

          {showForm && (
            <div className="vendor-form-card">

              <h2>
                {editingContract
                  ? "Edit Contract"
                  : "Add Contract"}
              </h2>

              <form
                onSubmit={handleContractSubmit}
              >

                <div className="form-grid">

                  <div className="form-group">
                    <label>
                      Vendor
                    </label>

                    <select
                      name="vendor_id"
                      value={
                        contractForm.vendor_id
                      }
                      onChange={
                        handleContractChange
                      }
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
                            {
                              vendor.company_name
                            }
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>
                      Contract Number
                    </label>

                    <input
                      type="text"
                      name="contract_number"
                      value={
                        contractForm.contract_number
                      }
                      onChange={
                        handleContractChange
                      }
                      placeholder="CON-00001"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      Contract Title
                    </label>

                    <input
                      type="text"
                      name="title"
                      value={
                        contractForm.title
                      }
                      onChange={
                        handleContractChange
                      }
                      placeholder="Enter contract title"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      Contract Amount
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      name="amount"
                      value={
                        contractForm.amount
                      }
                      onChange={
                        handleContractChange
                      }
                      placeholder="Enter amount"
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      Start Date
                    </label>

                    <input
                      type="date"
                      name="start_date"
                      value={
                        contractForm.start_date
                      }
                      onChange={
                        handleContractChange
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      End Date
                    </label>

                    <input
                      type="date"
                      name="end_date"
                      value={
                        contractForm.end_date
                      }
                      onChange={
                        handleContractChange
                      }
                    />
                  </div>

                </div>

                <div className="form-group">
                  <label>
                    Document URL
                  </label>

                  <input
                    type="url"
                    name="document_url"
                    value={
                      contractForm.document_url
                    }
                    onChange={
                      handleContractChange
                    }
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
                    onClick={
                      resetContractForm
                    }
                  >
                    Cancel
                  </button>

                </div>

              </form>
            </div>
          )}

          <div className="vendor-table-card">

            <div className="table-header">

              <div>
                <h2>Contract Repository</h2>

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
                  Add a contract to start
                  managing vendor contracts.
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

                    {contracts.map(
                      (contract) => (
                        <tr
                          key={contract.id}
                        >

                          <td>
                            <strong>
                              {
                                contract.contract_number
                              }
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
                            {contract.start_date ||
                              "-"}
                          </td>

                          <td>
                            {contract.end_date ||
                              "-"}
                          </td>

                          <td>
                            {contract.amount !==
                              null &&
                            contract.amount !==
                              undefined
                              ? `₹${Number(
                                  contract.amount
                                ).toLocaleString(
                                  "en-IN"
                                )}`
                              : "-"}
                          </td>

                          <td>
                            <span
                              className={`status-badge status-${(
                                contract.status ||
                                "Active"
                              )
                                .toLowerCase()
                                .replace(
                                  /\s+/g,
                                  "-"
                                )}`}
                            >
                              {
                                contract.status
                              }
                            </span>
                          </td>

                          <td>

                            <div className="action-buttons">

                              {canManageContracts && (
                                <button
                                  type="button"
                                  className="edit-button"
                                  onClick={() =>
                                    handleEdit(
                                      contract
                                    )
                                  }
                                >
                                  Edit
                                </button>
                              )}

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
                      )
                    )}

                  </tbody>

                </table>

              </div>
            )}

          </div>
        </>
      )}

      {/* ===================================================
          VENDOR SELECTION
          =================================================== */}

      {activeTab !== "contracts" && (
        <div
          className="vendor-form-card"
          style={{
            marginBottom: "20px",
          }}
        >

          <div className="form-group">
            <label>
              Select Vendor
            </label>

            <select
              value={selectedVendorId}
              onChange={(e) => {
                setSelectedVendorId(
                  e.target.value
                );
                setMessage("");
                setError("");
              }}
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

        </div>
      )}

      {/* ===================================================
          CERTIFICATIONS TAB
          =================================================== */}

      {activeTab === "certifications" && (
        <>

          {canManageCompliance && (
            <div
              className="vendor-form-card"
              style={{
                marginBottom: "20px",
              }}
            >

              <h2>
                Add Certification
              </h2>

              <form
                onSubmit={
                  handleCertificationSubmit
                }
              >

                <div className="form-grid">

                  <div className="form-group">
                    <label>
                      Certification Name
                    </label>

                    <input
                      type="text"
                      name="name"
                      value={
                        certificationForm.name
                      }
                      onChange={
                        handleCertificationChange
                      }
                      placeholder="ISO 9001"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      Issue Date
                    </label>

                    <input
                      type="date"
                      name="issue_date"
                      value={
                        certificationForm.issue_date
                      }
                      onChange={
                        handleCertificationChange
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      Expiry Date
                    </label>

                    <input
                      type="date"
                      name="expiry_date"
                      value={
                        certificationForm.expiry_date
                      }
                      onChange={
                        handleCertificationChange
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      Status
                    </label>

                    <select
                      name="status"
                      value={
                        certificationForm.status
                      }
                      onChange={
                        handleCertificationChange
                      }
                    >
                      <option value="Valid">
                        Valid
                      </option>

                      <option value="Expired">
                        Expired
                      </option>

                      <option value="Expiring Soon">
                        Expiring Soon
                      </option>
                    </select>
                  </div>

                </div>

                <div className="form-group">
                  <label>
                    Document URL
                  </label>

                  <input
                    type="url"
                    name="document_url"
                    value={
                      certificationForm.document_url
                    }
                    onChange={
                      handleCertificationChange
                    }
                    placeholder="https://..."
                  />
                </div>

                <button
                  type="submit"
                  className="primary-button"
                >
                  + Add Certification
                </button>

              </form>

            </div>
          )}

          <div className="vendor-table-card">

            <div className="table-header">
              <div>
                <h2>
                  Certification Management
                </h2>

                <span>
                  Total:{" "}
                  {certifications.length}
                </span>
              </div>
            </div>

            {sectionLoading ? (
              <p className="loading-text">
                Loading certifications...
              </p>
            ) : certifications.length === 0 ? (
              <div className="empty-state">

                <h3>
                  No certifications found
                </h3>

                <p>
                  Add certification details
                  for this vendor.
                </p>

              </div>
            ) : (
              <div className="table-container">

                <table>

                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Issue Date</th>
                      <th>Expiry Date</th>
                      <th>Status</th>
                      <th>Document</th>
                    </tr>
                  </thead>

                  <tbody>

                    {certifications.map(
                      (item) => (
                        <tr
                          key={item.id}
                        >

                          <td>
                            <strong>
                              {item.name}
                            </strong>
                          </td>

                          <td>
                            {item.issue_date ||
                              "-"}
                          </td>

                          <td>
                            {item.expiry_date ||
                              "-"}
                          </td>

                          <td>
                            <span
                              className={`status-badge status-${(
                                item.status ||
                                "Valid"
                              )
                                .toLowerCase()
                                .replace(
                                  /\s+/g,
                                  "-"
                                )}`}
                            >
                              {item.status}
                            </span>
                          </td>

                          <td>
                            {item.document_url ? (
                              <a
                                href={
                                  item.document_url
                                }
                                target="_blank"
                                rel="noreferrer"
                              >
                                View
                              </a>
                            ) : (
                              "-"
                            )}
                          </td>

                        </tr>
                      )
                    )}

                  </tbody>

                </table>

              </div>
            )}

          </div>
        </>
      )}

      {/* ===================================================
          COMPLIANCE CHECKS TAB
          =================================================== */}

      {activeTab === "compliance" && (
        <>

          {canManageCompliance && (
            <div
              className="vendor-form-card"
              style={{
                marginBottom: "20px",
              }}
            >

              <h2>
                Add Compliance Check
              </h2>

              <form
                onSubmit={
                  handleComplianceSubmit
                }
              >

                <div className="form-grid">

                  <div className="form-group">
                    <label>
                      Requirement
                    </label>

                    <input
                      type="text"
                      name="requirement"
                      value={
                        complianceForm.requirement
                      }
                      onChange={
                        handleComplianceChange
                      }
                      placeholder="Required compliance condition"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      Status
                    </label>

                    <select
                      name="status"
                      value={
                        complianceForm.status
                      }
                      onChange={
                        handleComplianceChange
                      }
                    >
                      <option value="Pending">
                        Pending
                      </option>

                      <option value="Passed">
                        Passed
                      </option>

                      <option value="Failed">
                        Failed
                      </option>
                    </select>
                  </div>

                </div>

                <div className="form-group">
                  <label>
                    Comments
                  </label>

                  <textarea
                    name="comments"
                    value={
                      complianceForm.comments
                    }
                    onChange={
                      handleComplianceChange
                    }
                    placeholder="Enter remarks"
                    rows="4"
                  />
                </div>

                <button
                  type="submit"
                  className="primary-button"
                >
                  + Add Compliance Check
                </button>

              </form>

            </div>
          )}

          <div className="vendor-table-card">

            <div className="table-header">

              <div>
                <h2>
                  Compliance Monitoring
                </h2>

                <span>
                  Total:{" "}
                  {complianceChecks.length}
                </span>
              </div>

            </div>

            {sectionLoading ? (
              <p className="loading-text">
                Loading compliance checks...
              </p>
            ) : complianceChecks.length ===
              0 ? (
              <div className="empty-state">

                <h3>
                  No compliance checks
                </h3>

                <p>
                  Add compliance requirements
                  for this vendor.
                </p>

              </div>
            ) : (
              <div className="table-container">

                <table>

                  <thead>
                    <tr>
                      <th>Requirement</th>
                      <th>Status</th>
                      <th>Comments</th>
                      <th>Checked At</th>
                    </tr>
                  </thead>

                  <tbody>

                    {complianceChecks.map(
                      (item) => (
                        <tr
                          key={item.id}
                        >

                          <td>
                            <strong>
                              {
                                item.requirement
                              }
                            </strong>
                          </td>

                          <td>
                            <span
                              className={`status-badge status-${(
                                item.status ||
                                "Pending"
                              )
                                .toLowerCase()
                                .replace(
                                  /\s+/g,
                                  "-"
                                )}`}
                            >
                              {item.status}
                            </span>
                          </td>

                          <td>
                            {item.comments ||
                              "-"}
                          </td>

                          <td>
                            {item.checked_at
                              ? new Date(
                                  item.checked_at
                                ).toLocaleString(
                                  "en-IN"
                                )
                              : "-"}
                          </td>

                        </tr>
                      )
                    )}

                  </tbody>

                </table>

              </div>
            )}

          </div>
        </>
      )}

      {/* ===================================================
          VENDOR DOCUMENTS TAB
          =================================================== */}

      {activeTab === "documents" && (
        <>

          {canManageCompliance && (
            <div
              className="vendor-form-card"
              style={{
                marginBottom: "20px",
              }}
            >

              <h2>
                Add Vendor Document
              </h2>

              <form
                onSubmit={
                  handleDocumentSubmit
                }
              >

                <div className="form-grid">

                  <div className="form-group">
                    <label>
                      Document Name
                    </label>

                    <input
                      type="text"
                      name="name"
                      value={
                        documentForm.name
                      }
                      onChange={
                        handleDocumentChange
                      }
                      placeholder="Business License"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      Document Type
                    </label>

                    <input
                      type="text"
                      name="document_type"
                      value={
                        documentForm.document_type
                      }
                      onChange={
                        handleDocumentChange
                      }
                      placeholder="License / Tax / Legal"
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      Expiry Date
                    </label>

                    <input
                      type="date"
                      name="expiry_date"
                      value={
                        documentForm.expiry_date
                      }
                      onChange={
                        handleDocumentChange
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      Status
                    </label>

                    <select
                      name="status"
                      value={
                        documentForm.status
                      }
                      onChange={
                        handleDocumentChange
                      }
                    >
                      <option value="Active">
                        Active
                      </option>

                      <option value="Expired">
                        Expired
                      </option>

                      <option value="Expiring Soon">
                        Expiring Soon
                      </option>
                    </select>
                  </div>

                </div>

                <div className="form-group">
                  <label>
                    Document URL
                  </label>

                  <input
                    type="url"
                    name="document_url"
                    value={
                      documentForm.document_url
                    }
                    onChange={
                      handleDocumentChange
                    }
                    placeholder="https://..."
                  />
                </div>

                <button
                  type="submit"
                  className="primary-button"
                >
                  + Add Document
                </button>

              </form>

            </div>
          )}

          <div className="vendor-table-card">

            <div className="table-header">

              <div>
                <h2>
                  Vendor Documentation
                </h2>

                <span>
                  Total:{" "}
                  {vendorDocuments.length}
                </span>
              </div>

            </div>

            {sectionLoading ? (
              <p className="loading-text">
                Loading documents...
              </p>
            ) : vendorDocuments.length ===
              0 ? (
              <div className="empty-state">

                <h3>
                  No vendor documents
                </h3>

                <p>
                  Add vendor documents to
                  maintain the repository.
                </p>

              </div>
            ) : (
              <div className="table-container">

                <table>

                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Expiry Date</th>
                      <th>Status</th>
                      <th>Document</th>
                    </tr>
                  </thead>

                  <tbody>

                    {vendorDocuments.map(
                      (item) => (
                        <tr
                          key={item.id}
                        >

                          <td>
                            <strong>
                              {item.name}
                            </strong>
                          </td>

                          <td>
                            {item.document_type ||
                              "-"}
                          </td>

                          <td>
                            {item.expiry_date ||
                              "-"}
                          </td>

                          <td>
                            <span
                              className={`status-badge status-${(
                                item.status ||
                                "Active"
                              )
                                .toLowerCase()
                                .replace(
                                  /\s+/g,
                                  "-"
                                )}`}
                            >
                              {item.status}
                            </span>
                          </td>

                          <td>
                            {item.document_url ? (
                              <a
                                href={
                                  item.document_url
                                }
                                target="_blank"
                                rel="noreferrer"
                              >
                                View
                              </a>
                            ) : (
                              "-"
                            )}
                          </td>

                        </tr>
                      )
                    )}

                  </tbody>

                </table>

              </div>
            )}

          </div>
        </>
      )}

    </div>
  );
}

export default Contracts;