import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import api from "../api";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const response = await api.post("/auth/login", {
        email,
        password,
      });

      localStorage.setItem("token", response.data.access_token);

      const userResponse = await api.get("/auth/me");

      localStorage.setItem(
        "user",
        JSON.stringify(userResponse.data)
      );

      navigate(location.state?.from?.pathname || "/dashboard");
    } catch (error) {
      setMessage(
        error.response?.data?.detail || "Login failed"
      );
    }
  };

  return (
    <div className="login-page">

      <div className="login-brand">
        <div className="brand-content">
          <h1>Vendor Intelligence</h1>

          <p>
            Manage vendors, procurement, purchase orders,
            performance and analytics in one place.
          </p>

          <div className="brand-features">
            <div>Vendor Management</div>
            <div>Procurement Tracking</div>
            <div>Performance Analytics</div>
          </div>
        </div>
      </div>

      <div className="login-section">
        <div className="login-card">

          <div className="login-header">
            <h2>Login</h2>
            <p>
              Sign in to your Vendor Intelligence account.
            </p>
          </div>

          {message && (
            <p className="error">
              {message}
            </p>
          )}

          <form onSubmit={handleLogin}>

            <div className="form-group">
              <label>Email</label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>

            <button
              type="submit"
              className="login-button"
            >
              Login
            </button>

          </form>

          <div className="register-link">
            <span>New user?</span>

            <Link to="/register">
              Register
            </Link>
          </div>

        </div>
      </div>

    </div>
  );
}

export default Login;