import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import "./App.css";

// =========================
// Layouts
// =========================
import AdminLayout from "./layouts/AdminLayout";
import CustomerLayout from "./layouts/CustomerLayout";

// =========================
// Admin Pages
// =========================
import Dashboard from "./pages/admin/Dashboard";
import Management from "./pages/admin/Management";
import SimCenter from "./pages/admin/SimCenter";
import Registrations from "./pages/admin/Registrations";
import Reports from "./pages/admin/Reports";

import AdminSettings from "./pages/admin/AdminSettings";

// =========================
// Customer
// =========================
import CustomerRegistration from "./pages/customer/CustomerRegistration";

// =========================
// Components
// =========================
import Toast from "./components/Toast";

// =========================
// Constants
// =========================
const IDLE_TIME = 15 * 60 * 1000;
const WARNING_TIME = 13 * 60 * 1000;


// ======================================================
// Protected Route
// ======================================================
const ProtectedRoute = ({
  user,
  allowedRoles,
  children,
}) => {
  if (!user) {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }

  const roleId = Number(
    user.id_role ?? user.role_id
  );

  if (
    allowedRoles &&
    !allowedRoles.includes(roleId)
  ) {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }

  return children;
};


// ======================================================
// Login Page
// ======================================================
const LoginPage = ({
  username,
  password,
  setUsername,
  setPassword,
  handleLogin,
  message,
}) => {
  return (
    <div className="login-page">
      <div className="login-card">

        <div className="login-icon">
          SIM
        </div>

        <h1>
          SIM Management
        </h1>

        <p className="subtitle">
          SIM Registration System
        </p>

        <form onSubmit={handleLogin}>

          <label>
            Username
          </label>

          <input
            type="text"
            value={username}
            placeholder="Enter username"
            onChange={(e) =>
              setUsername(
                e.target.value
              )
            }
            required
          />

          <label>
            Password
          </label>

          <input
            type="password"
            value={password}
            placeholder="Enter password"
            onChange={(e) =>
              setPassword(
                e.target.value
              )
            }
            required
          />

          <button type="submit">
            Login
          </button>

        </form>

        {message && (
          <div className="message">
            {message}
          </div>
        )}

      </div>
    </div>
  );
};


// ======================================================
// App
// ======================================================
function App() {
  const [
    username,
    setUsername,
  ] = useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    toast,
    setToast,
  ] = useState({
    message: "",
    type: "success",
  });

  // =========================
  // Auth
  // =========================
  const [
    loggedIn,
    setLoggedIn,
  ] = useState(() => {
    try {
      return Boolean(
        localStorage.getItem(
          "access_token"
        )
      );
    } catch {
      return false;
    }
  });

  const [
    user,
    setUser,
  ] = useState(() => {
    try {
      const savedUser =
        localStorage.getItem(
          "user"
        );

      return savedUser
        ? JSON.parse(savedUser)
        : null;
    } catch {
      return null;
    }
  });

  // =========================
  // Toast
  // =========================
  const showToast = useCallback(
    (
      toastMessage,
      type = "success"
    ) => {
      setToast({
        message: toastMessage,
        type,
      });
    },
    []
  );

  // =========================
  // Logout
  // =========================
  const logout = useCallback(() => {
    try {
      localStorage.removeItem(
        "access_token"
      );

      localStorage.removeItem(
        "refresh_token"
      );

      localStorage.removeItem(
        "user"
      );
    } catch (error) {
      console.error(
        "LOGOUT STORAGE ERROR:",
        error
      );
    }

    setLoggedIn(false);
    setUser(null);
    setUsername("");
    setPassword("");
    setMessage("");
  }, []);

  // =========================
  // Auto Logout
  // =========================
  const idleTimerRef =
    useRef(null);

  const warningTimerRef =
    useRef(null);

  useEffect(() => {
    if (!loggedIn) {
      return;
    }

    const resetIdleTimer = () => {
      clearTimeout(
        idleTimerRef.current
      );

      clearTimeout(
        warningTimerRef.current
      );

      warningTimerRef.current =
        setTimeout(() => {
          showToast(
            "You will be logged out after 2 minutes of inactivity.",
            "warning"
          );
        }, WARNING_TIME);

      idleTimerRef.current =
        setTimeout(() => {
          logout();

          showToast(
            "You have been logged out due to inactivity.",
            "warning"
          );
        }, IDLE_TIME);
    };

    const events = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    events.forEach((event) => {
      window.addEventListener(
        event,
        resetIdleTimer
      );
    });

    resetIdleTimer();

    return () => {
      clearTimeout(
        idleTimerRef.current
      );

      clearTimeout(
        warningTimerRef.current
      );

      events.forEach((event) => {
        window.removeEventListener(
          event,
          resetIdleTimer
        );
      });
    };
  }, [
    loggedIn,
    logout,
    showToast,
  ]);

  // =========================
  // Login
  // =========================
  const handleLogin = async (e) => {
    e.preventDefault();

    setMessage("");

    try {
      const response =
        await fetch(
          "https://eltsimu.onrender.com/auth/login",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              username:
                username.trim(),
              password,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        setMessage(
          data.message ||
            "Login failed"
        );

        return;
      }

      const accessToken =
        data?.data?.access_token;

      const refreshToken =
        data?.data?.refresh_token;

      const userData =
        data?.data?.user;

      if (
        !accessToken ||
        !userData
      ) {
        setMessage(
          "Invalid login response from server"
        );

        return;
      }

      localStorage.setItem(
        "access_token",
        accessToken
      );

      if (refreshToken) {
        localStorage.setItem(
          "refresh_token",
          refreshToken
        );
      }

      localStorage.setItem(
        "user",
        JSON.stringify(
          userData
        )
      );

      setUser(userData);
      setLoggedIn(true);

      setUsername("");
      setPassword("");
      setMessage("");

      showToast(
        "Login successful",
        "success"
      );

    } catch (error) {
      console.error(
        "LOGIN ERROR:",
        error
      );

      setMessage(
        error?.message ||
          "Cannot connect to API."
      );
    }
  };


  return (
    <BrowserRouter>

      {/* =========================
          GLOBAL TOAST
      ========================= */}
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() =>
          setToast({
            message: "",
            type: "success",
          })
        }
      />

      <Routes>

        {/* ==================================================
            CUSTOMER PORTAL
            Public - no Admin Login required
        ================================================== */}
        <Route
  path="/customer-registration/:agentToken"
  element={
    <CustomerLayout>
      <CustomerRegistration />
    </CustomerLayout>
  }
/>


        {/* ==================================================
            LOGIN
        ================================================== */}
        <Route
          path="/"
          element={
            loggedIn ? (
              <Navigate
                to="/dashboard"
                replace
              />
            ) : (
              <LoginPage
                username={username}
                password={password}
                setUsername={
                  setUsername
                }
                setPassword={
                  setPassword
                }
                handleLogin={
                  handleLogin
                }
                message={message}
              />
            )
          }
        />


        {/* ==================================================
            DASHBOARD
        ================================================== */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute
              user={user}
              allowedRoles={[
                1,
                2,
                3,
              ]}
            >
              <AdminLayout
                user={user}
                onLogout={logout}
              >
                <Dashboard
                  showToast={
                    showToast
                  }
                />
              </AdminLayout>
            </ProtectedRoute>
          }
        />


        {/* ==================================================
            REGISTRATIONS
        ================================================== */}
        <Route
          path="/registrations"
          element={
            <ProtectedRoute
              user={user}
              allowedRoles={[
                1,
                2,
                3,
              ]}
            >
              <AdminLayout
                user={user}
                onLogout={logout}
              >
                <Registrations
                  showToast={
                    showToast
                  }
                />
              </AdminLayout>
            </ProtectedRoute>
          }
        />



        {/* ==================================================
            SIM CENTER
        ================================================== */}
        <Route
          path="/sim-center"
          element={
            <ProtectedRoute user={user} allowedRoles={[1, 2]}>
              <AdminLayout user={user} onLogout={logout}>
                <SimCenter />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        {/* ==================================================
            PEOPLE & ACCESS
        ================================================== */}
        <Route
          path="/management"
          element={
            <ProtectedRoute user={user} allowedRoles={[1, 2, 3]}>
              <AdminLayout user={user} onLogout={logout}>
                <Management />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        {/* ==================================================
            REPORTS
        ================================================== */}
        <Route
          path="/reports"
          element={
            <ProtectedRoute
              user={user}
              allowedRoles={[1, 2]}
            >
              <AdminLayout
                user={user}
                onLogout={logout}
              >
                <Reports
                  showToast={
                    showToast
                  }
                />
              </AdminLayout>
            </ProtectedRoute>
          }
        />


        {/* ==================================================
            SETTINGS
        ================================================== */}
        <Route
          path="/settings"
          element={
            <ProtectedRoute
              user={user}
              allowedRoles={[1, 2, 3]}
            >
              <AdminLayout
                user={user}
                onLogout={logout}
              >
                <AdminSettings />
              </AdminLayout>
            </ProtectedRoute>
          }
        />


        {/* ==================================================
            FALLBACK
        ================================================== */}
        <Route
          path="*"
          element={
            <Navigate
              to={
                loggedIn
                  ? "/dashboard"
                  : "/"
              }
              replace
            />
          }
        />

      </Routes>

    </BrowserRouter>
  );
}

export default App;