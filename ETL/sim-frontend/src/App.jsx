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

// =====================================================
// LAYOUTS
// =====================================================

import AdminLayout from "./layouts/AdminLayout";
import CustomerLayout from "./layouts/CustomerLayout";

// =====================================================
// ADMIN PAGES
// =====================================================

import Dashboard from "./pages/admin/Dashboard";
import Management from "./pages/admin/Management";
import SimCenter from "./pages/admin/SimCenter";
import Registrations from "./pages/admin/Registrations";
import Reports from "./pages/admin/Reports";
import AdminSettings from "./pages/admin/AdminSettings";

// =====================================================
// CUSTOMER
// =====================================================

import CustomerRegistration from "./pages/customer/CustomerRegistration";

// =====================================================
// COMPONENT
// =====================================================

import Toast from "./components/Toast";

// =====================================================
// CONSTANTS
// =====================================================

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://eltsimu.onrender.com";

const IDLE_TIME =
  15 * 60 * 1000;

const WARNING_TIME =
  13 * 60 * 1000;

// =====================================================
// PROTECTED ROUTE
// =====================================================

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
    user.id_role ??
      user.role_id
  );

  if (
    allowedRoles &&
    !allowedRoles.includes(
      roleId
    )
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

// =====================================================
// LOGIN PAGE
// =====================================================

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

        <form
          onSubmit={
            handleLogin
          }
        >

          <label>
            Username
          </label>

          <input
            type="text"
            value={
              username
            }
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
            value={
              password
            }
            placeholder="Enter password"
            onChange={(e) =>
              setPassword(
                e.target.value
              )
            }
            required
          />

          <button
            type="submit"
          >
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

// =====================================================
// APP
// =====================================================

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

  // ===================================================
  // AUTH STATE
  // ===================================================

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
        ? JSON.parse(
            savedUser
          )
        : null;
    } catch {
      return null;
    }
  });

  // ===================================================
  // TOAST
  // ===================================================

  const showToast =
    useCallback(
      (
        toastMessage,
        type = "success"
      ) => {
        setToast({
          message:
            toastMessage,
          type,
        });
      },
      []
    );

  // ===================================================
  // CLEAR LOCAL AUTH
  // ===================================================

  const clearLocalAuth =
    useCallback(() => {
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
          "CLEAR AUTH STORAGE ERROR:",
          error
        );
      }

      setLoggedIn(false);
      setUser(null);
      setUsername("");
      setPassword("");
      setMessage("");
    }, []);

  // ===================================================
  // LOGOUT
  // ===================================================

  const logout =
    useCallback(
      async () => {
        const refreshToken =
          localStorage.getItem(
            "refresh_token"
          );

        try {
          if (
            refreshToken
          ) {
            await fetch(
              `${API_URL}/auth/logout`,
              {
                method:
                  "POST",

                headers: {
                  "Content-Type":
                    "application/json",

                  Authorization:
                    localStorage.getItem(
                      "access_token"
                    )
                      ? `Bearer ${localStorage.getItem(
                          "access_token"
                        )}`
                      : "",
                },

                body:
                  JSON.stringify({
                    refresh_token:
                      refreshToken,
                  }),
              }
            );
          }
        } catch (error) {
          console.error(
            "LOGOUT API ERROR:",
            error
          );
        } finally {
          clearLocalAuth();
        }
      },
      [clearLocalAuth]
    );

  // ===================================================
  // AUTO LOGOUT
  // ===================================================

  const idleTimerRef =
    useRef(null);

  const warningTimerRef =
    useRef(null);

  useEffect(() => {
    if (!loggedIn) {
      return;
    }

    const resetIdleTimer =
      () => {
        clearTimeout(
          idleTimerRef.current
        );

        clearTimeout(
          warningTimerRef.current
        );

        warningTimerRef.current =
          setTimeout(
            () => {
              showToast(
                "You will be logged out after 2 minutes of inactivity.",
                "warning"
              );
            },
            WARNING_TIME
          );

        idleTimerRef.current =
          setTimeout(
            () => {
              clearLocalAuth();

              showToast(
                "You have been logged out due to inactivity.",
                "warning"
              );
            },
            IDLE_TIME
          );
      };

    const events = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    events.forEach(
      (event) => {
        window.addEventListener(
          event,
          resetIdleTimer
        );
      }
    );

    resetIdleTimer();

    return () => {
      clearTimeout(
        idleTimerRef.current
      );

      clearTimeout(
        warningTimerRef.current
      );

      events.forEach(
        (event) => {
          window.removeEventListener(
            event,
            resetIdleTimer
          );
        }
      );
    };
  }, [
    loggedIn,
    clearLocalAuth,
    showToast,
  ]);

  // ===================================================
  // LOGIN
  // ===================================================

  const handleLogin =
    async (event) => {
      event.preventDefault();

      setMessage("");

      try {
        const response =
          await fetch(
            `${API_URL}/auth/login`,
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
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
          data?.data
            ?.access_token;

        const refreshToken =
          data?.data
            ?.refresh_token;

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

        if (
          refreshToken
        ) {
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

        setUser(
          userData
        );

        setLoggedIn(
          true
        );

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

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <BrowserRouter>

      <Toast
        message={
          toast.message
        }
        type={
          toast.type
        }
        onClose={() =>
          setToast({
            message: "",
            type: "success",
          })
        }
      />

      <Routes>

        {/* =================================================
            PUBLIC CUSTOMER REGISTRATION
        ================================================= */}

        <Route
          path="/customer-registration/:agentToken"
          element={
            <CustomerLayout>
              <CustomerRegistration />
            </CustomerLayout>
          }
        />

        {/* =================================================
            LOGIN
        ================================================= */}

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
                username={
                  username
                }
                password={
                  password
                }
                setUsername={
                  setUsername
                }
                setPassword={
                  setPassword
                }
                handleLogin={
                  handleLogin
                }
                message={
                  message
                }
              />
            )
          }
        />

        {/* =================================================
            DASHBOARD
        ================================================= */}

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
                onLogout={
                  logout
                }
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

        {/* =================================================
            REGISTRATIONS
        ================================================= */}

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
                onLogout={
                  logout
                }
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

        {/* =================================================
            SIM CENTER
        ================================================= */}

        <Route
          path="/sim-center"
          element={
            <ProtectedRoute
              user={user}
              allowedRoles={[
                1,
                2,
              ]}
            >
              <AdminLayout
                user={user}
                onLogout={
                  logout
                }
              >
                <SimCenter />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        {/* =================================================
            PEOPLE & ACCESS
        ================================================= */}

        <Route
          path="/management"
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
                onLogout={
                  logout
                }
              >
                <Management />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        {/* =================================================
            REPORTS
        ================================================= */}

        <Route
          path="/reports"
          element={
            <ProtectedRoute
              user={user}
              allowedRoles={[
                1,
                2,
              ]}
            >
              <AdminLayout
                user={user}
                onLogout={
                  logout
                }
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

        {/* =================================================
            SETTINGS
        ================================================= */}

        <Route
          path="/settings"
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
                onLogout={
                  logout
                }
              >
                <AdminSettings />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        {/* =================================================
            FALLBACK
        ================================================= */}

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