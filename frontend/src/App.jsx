import { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  Navigate,
} from "react-router-dom";
import Home from "./pages/Home.jsx";
import User from "./pages/User.jsx";
import Admin from "./pages/Admin.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";

function App() {
  const [token, setToken] = useState(""); // Token state for authentication
  const [role, setRole] = useState(""); // Role state (user/admin)
  const [id, setId] = useState(""); // User ID for personalized access
  const [activeTab, setActiveTab] = useState("details");

  const logout = () => {
    // Clear authentication state on logout
    setToken("");
    setRole("");
    setId("");

    // Also clear from localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("id");
  };

  // Load from localStorage on initial load
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedRole = localStorage.getItem("role");
    const storedId = localStorage.getItem("id");

    if (storedToken) {
      setToken(storedToken);
      setRole(storedRole);
      setId(storedId);
    }
  }, []);

  return (
    <Router>
      {/* Navigation Bar */}
      <nav className="flex justify-center gap-4 w-full p-4 bg-slate-800 font-bold text-white">
        <Link to="/">Home</Link>
        {!token && <Link to="/login">Login</Link>}
        {!token && <Link to="/register">Register</Link>}
        {role === "admin" && <Link to="/admin">Admin</Link>}
        {role === "user" && id && (
          <Link to={`/user/${id}`}>Go to User Page</Link>
        )}
        {role && token && (
          <button className="text-red-500" onClick={logout}>
            Logout
          </button>
        )}
      </nav>

      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/login"
          element={
            <Login setRole={setRole} setToken={setToken} setId={setId} />
          }
        />

        {/* Admin Protected Route */}
        <Route
          path="/admin"
          element={
            role === "admin" && token ? (
              <Admin token={token} role={role} id={id} />
            ) : (
              <div className="text-red-500 text-center mt-20">
                Access Denied. Please log in as an admin.
              </div>
            )
          }
        />

        {/* User Protected Route */}
        <Route
          path={`/user/${id}`}
          element={
            role === "user" && token && id ? (
              <User token={token} role={role} id={id} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* Fallback for Undefined Routes */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;



