import { useEffect, useState } from "react";

const API_URL = "http://127.0.0.1:8000";

function Communication({ publicMode = false }) {
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [procurements, setProcurements] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    receiver_id: "",
    subject: "",
    message: "",
    related_vendor_id: "",
    related_procurement_id: "",
  });

  const token = localStorage.getItem("token");

// ==========================================
// LOAD COMMUNICATION DATA
// ==========================================

useEffect(() => {
  let cancelled = false;

  const loadData = async () => {
    try {
      if (publicMode) {
        const response = await fetch(`${API_URL}/public/communications`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || "Failed to load messages");
        }

        if (!cancelled) {
          setUsers(data.users || []);
          setMessages(data.messages || []);
          setVendors(data.vendors || []);
          setProcurements(data.procurements || []);
          setLoading(false);
        }
        return;
      }

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const userData = JSON.parse(
        localStorage.getItem("user") || "null"
      );

      const isVendor = userData?.role === "Vendor";

      // Common requests for all users
      const requests = [
        fetch(`${API_URL}/users`, { headers }),
        fetch(`${API_URL}/communications`, { headers }),
        fetch(`${API_URL}/vendors`, { headers }),
      ];

      // Vendors do not have access to /procurements
      if (!isVendor) {
        requests.push(
          fetch(`${API_URL}/procurements`, { headers })
        );
      }

      const responses = await Promise.all(requests);

      const usersResponse = responses[0];
      const messagesResponse = responses[1];
      const vendorsResponse = responses[2];
      const procurementsResponse = responses[3];

      const usersData = await usersResponse.json();
      const messagesData = await messagesResponse.json();
      const vendorsData = await vendorsResponse.json();

      if (!usersResponse.ok) {
        throw new Error(
          usersData.detail || "Failed to load users"
        );
      }

      if (!messagesResponse.ok) {
        throw new Error(
          messagesData.detail || "Failed to load messages"
        );
      }

      if (!vendorsResponse.ok) {
        throw new Error(
          vendorsData.detail || "Failed to load vendors"
        );
      }

      let procurementsData = [];

      // Only non-vendors load procurement data
      if (!isVendor && procurementsResponse) {
        procurementsData = await procurementsResponse.json();

        if (!procurementsResponse.ok) {
          throw new Error(
            procurementsData.detail ||
              "Failed to load procurements"
          );
        }
      }

      if (!cancelled) {
        setUsers(usersData);
        setMessages(messagesData);
        setVendors(vendorsData);
        setProcurements(procurementsData);
        setLoading(false);
      }
    } catch (err) {
      if (!cancelled) {
        setError(err.message);
        setLoading(false);
      }
    }
  };

if (!token && !publicMode) {
  return;
}

  loadData();

  return () => {
    cancelled = true;
  };
}, [token, publicMode]);

  // ==========================================
  // LOAD MESSAGES
  // ==========================================

  const loadMessages = async () => {
    try {
      const response = await fetch(
        `${API_URL}/communications`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to load messages"
        );
      }

      setMessages(data);
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
      receiver_id: "",
      subject: "",
      message: "",
      related_vendor_id: "",
      related_procurement_id: "",
    });

    setShowForm(false);
  };

  // ==========================================
  // SEND MESSAGE
  // ==========================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/communications`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            receiver_id: Number(
              formData.receiver_id
            ),
            subject: formData.subject || null,
            message: formData.message,
            related_vendor_id:
              formData.related_vendor_id === ""
                ? null
                : Number(formData.related_vendor_id),
            related_procurement_id:
              formData.related_procurement_id === ""
                ? null
                : Number(
                    formData.related_procurement_id
                  ),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to send message"
        );
      }

      setMessage("Message sent successfully");

      resetForm();

      await loadMessages();
    } catch (err) {
      setError(err.message);
    }
  };

  // ==========================================
  // MARK READ / UNREAD
  // ==========================================

  const updateReadStatus = async (
    communicationId,
    isRead
  ) => {
    try {
      setError("");

      const response = await fetch(
        `${API_URL}/communications/${communicationId}/read`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            is_read: isRead,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Failed to update message status"
        );
      }

      await loadMessages();
    } catch (err) {
      setError(err.message);
    }
  };

  // ==========================================
  // USER NAME
  // ==========================================

  const getUserName = (userId) => {
    const user = users.find(
      (item) => item.id === userId
    );

    return user
      ? user.name
      : `User #${userId}`;
  };

  // ==========================================
  // VENDOR NAME
  // ==========================================

  const getVendorName = (vendorId) => {
    if (!vendorId) {
      return "-";
    }

    const vendor = vendors.find(
      (item) => item.id === vendorId
    );

    return vendor
      ? vendor.company_name
      : `Vendor #${vendorId}`;
  };

  // ==========================================
  // PROCUREMENT NAME
  // ==========================================

  const getProcurementName = (procurementId) => {
    if (!procurementId) {
      return "-";
    }

    const procurement = procurements.find(
      (item) => item.id === procurementId
    );

    return procurement
      ? procurement.procurement_number
      : `Procurement #${procurementId}`;
  };

  return (
    <div>

      {/* HEADER */}

      <div className="page-header">

        <div>
          <h1>Communication</h1>

          <p>
            {publicMode
              ? "Vendor-related communication history."
              : "Send messages and manage procurement discussions."}
          </p>
        </div>

        {!publicMode && (
        <button
          type="button"
          className="primary-button"
          onClick={() => {
            setShowForm(true);
            setMessage("");
            setError("");
          }}
        >
          + New Message
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


      {/* COMPOSE MESSAGE */}

      {showForm && !publicMode && (
        <div className="vendor-form-card">

          <h2>
            New Message
          </h2>

          <form onSubmit={handleSubmit}>

            <div className="form-grid">

              <div className="form-group">

                <label htmlFor="receiver_id">
                  Recipient
                </label>

                <select
                  id="receiver_id"
                  name="receiver_id"
                  value={formData.receiver_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">
                    Select Recipient
                  </option>

                  {users.map((user) => (
                    <option
                      key={user.id}
                      value={user.id}
                    >
                      {user.name} — {user.role}
                    </option>
                  ))}

                </select>

              </div>


              <div className="form-group">

                <label htmlFor="subject">
                  Subject
                </label>

                <input
                  id="subject"
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  placeholder="Enter subject"
                />

              </div>


              <div className="form-group">

                <label htmlFor="related_vendor_id">
                  Related Vendor
                </label>

                <select
                  id="related_vendor_id"
                  name="related_vendor_id"
                  value={formData.related_vendor_id}
                  onChange={handleChange}
                >
                  <option value="">
                    None
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


{JSON.parse(
  localStorage.getItem("user") || "null"
)?.role !== "Vendor" && (
  <div className="form-group">

    <label htmlFor="related_procurement_id">
      Related Procurement
    </label>

    <select
      id="related_procurement_id"
      name="related_procurement_id"
      value={formData.related_procurement_id}
      onChange={handleChange}
    >
      <option value="">
        None
      </option>

      {procurements.map((procurement) => (
        <option
          key={procurement.id}
          value={procurement.id}
        >
          {procurement.procurement_number}
          {" - "}
          {procurement.title}
        </option>
      ))}
    </select>

  </div>
)}

            </div>


            <div className="form-group">

              <label htmlFor="message">
                Message
              </label>

              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                rows="6"
                placeholder="Enter your message"
                required
              />

            </div>


            <div className="form-actions">

              <button
                type="submit"
                className="primary-button"
              >
                Send Message
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


      {/* COMMUNICATION HISTORY */}

      <div className="vendor-table-card">

        <div className="table-header">

          <div>
            <h2>
              Communication History
            </h2>

            <span>
              Total: {messages.length}
            </span>
          </div>

        </div>


        {loading ? (
          <p className="loading-text">
            Loading messages...
          </p>
        ) : messages.length === 0 ? (
          <div className="empty-state">

            <h3>
              No messages
            </h3>

            <p>
              Your communication history will
              appear here.
            </p>

          </div>
        ) : (

          <div className="table-container">

            <table>

              <thead>

                <tr>
                  <th>Sender</th>
                  <th>Recipient</th>
                  <th>Subject</th>
                  <th>Message</th>
                  <th>Vendor</th>
                  <th>Procurement</th>
                  <th>Status</th>
                  {!publicMode && <th>Action</th>}
                </tr>

              </thead>

              <tbody>

                {messages.map((item) => (

                  <tr key={item.id}>

                    {!publicMode && <td>
                      {getUserName(
                        item.sender_id
                      )}
                    </td>}

                    <td>
                      {getUserName(
                        item.receiver_id
                      )}
                    </td>

                    <td>
                      {item.subject || "-"}
                    </td>

                    <td>
                      {item.message}
                    </td>

                    <td>
                      {getVendorName(
                        item.related_vendor_id
                      )}
                    </td>

                    <td>
                      {getProcurementName(
                        item.related_procurement_id
                      )}
                    </td>

                    <td>

                      <span
                        className={`status-badge ${
                          item.is_read
                            ? "status-approved"
                            : "status-pending"
                        }`}
                      >
                        {item.is_read
                          ? "Read"
                          : "Unread"}
                      </span>

                    </td>

                    <td>

                      {!item.is_read && (
                        <button
                          type="button"
                          className="approve-button"
                          onClick={() =>
                            updateReadStatus(
                              item.id,
                              true
                            )
                          }
                        >
                          Mark Read
                        </button>
                      )}

                      {item.is_read && (
                        <button
                          type="button"
                          className="edit-button"
                          onClick={() =>
                            updateReadStatus(
                              item.id,
                              false
                            )
                          }
                        >
                          Mark Unread
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

export default Communication;