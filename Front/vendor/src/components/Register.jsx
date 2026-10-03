
import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Register() {
  const navigate = useNavigate();

const [formData, setFormData] = useState({
  name: "",
  email: "",
  password: "",
  role: "Vendor",
  category: "",
});

  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    setError("");

try {
  const response = await fetch(
    "http://127.0.0.1:8000/auth/register",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    setError(data.detail || "Registration failed");
    return;
  }

  alert("Registration successful!");
  navigate("/login");

} catch {
  setError("Unable to connect to server");
}
  };

  return (
    <div className="register-page">

      <div className="register-card">

        <h1>Create Account</h1>

        <p>
          Register for the Vendor Reliability Intelligence Platform
        </p>

        {error && (
          <p className="error-message">
            {error}
          </p>
        )}

        <form onSubmit={handleRegister}>

          {/* NAME */}

          <div className="form-group">

            <label>Full Name</label>

            <input
              type="text"
              name="name"
              placeholder="Enter your name"
              value={formData.name}
              onChange={handleChange}
              required
            />

          </div>


          {/* EMAIL */}

          <div className="form-group">

            <label>Email Address</label>

            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              required
            />

          </div>


          {/* PASSWORD */}

          <div className="form-group">

            <label>Password</label>

            <input
              type="password"
              name="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              required
            />

          </div>


          {/* ROLE */}

          <div className="form-group">

            <label>Select Role</label>

            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
            >



              <option value="Procurement Manager">
                Procurement Manager
              </option>

              <option value="Supply Chain Manager">
                Supply Chain Manager
              </option>

              <option value="Vendor">
                Vendor
              </option>

              <option value="Finance Officer">
                Finance Officer
              </option>

              <option value="Auditor">
                Auditor
              </option>

            </select>

          </div>
          {formData.role === "Vendor" && (
  <div className="form-group">
    <label>Vendor Category</label>

    <select
      name="category"
      value={formData.category}
      onChange={handleChange}
      required
    >
      <option value="">Select Vendor Category</option>
      <option value="Raw Material Suppliers">
        Raw Material Suppliers
      </option>
      <option value="Equipment Vendors">
        Equipment Vendors
      </option>
      <option value="IT Vendors">
        IT Vendors
      </option>
      <option value="Service Providers">
        Service Providers
      </option>
      <option value="Logistics Partners">
        Logistics Partners
      </option>
      <option value="Maintenance Vendors">
        Maintenance Vendors
      </option>
    </select>
  </div>
)}


          <button
            type="submit"
            className="primary-button"
          >
            Register
          </button>

        </form>


        <div className="register-link">

          <span>
            Already have an account?
          </span>

          <button
            type="button"
            className="link-button"
            onClick={() => navigate("/login")}
          >
            Login
          </button>

        </div>

      </div>

    </div>
  );
}

export default Register;

