import { useEffect, useState } from "react";
import { apiFetch } from "../../api";

function Profile() {
  const [profile, setProfile] = useState(null);
  const [sessions, setSessions] =
  useState([]);

  const [loadingSessions, setLoadingSessions] =
  useState(true);

  const [form, setForm] = useState({
    fullname: "",
    email: "",
    phone_number: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadProfile = async () => {
    try {
      const response = await apiFetch("/profile");

      setProfile(response.data);

      setForm({
        fullname: response.data.fullname || "",
        email: response.data.email || "",
        phone_number:
          response.data.phone_number || "",
      });

    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
  loadProfile();
  loadSessions();
}, []);


  const updateProfile = async (e) => {
    e.preventDefault();

    try {
      setError("");
      setMessage("");

      await apiFetch("/profile", {
        method: "PUT",
        body: JSON.stringify(form),
      });

      setMessage(
        "Profile updated successfully"
      );

      await loadProfile();

      const savedUser =
        JSON.parse(
          localStorage.getItem("user") || "null"
        );

      if (savedUser) {
        localStorage.setItem(
          "user",
          JSON.stringify({
            ...savedUser,
            fullname: form.fullname,
            email: form.email,
            phone_number:
              form.phone_number,
          })
        );
      }

    } catch (err) {
      setError(err.message);
    }
  };
  const loadSessions = async () => {
  try {
    setLoadingSessions(true);

    const response =
      await apiFetch(
        "/profile/sessions"
      );

    setSessions(
      response.data || []
    );

  } catch (err) {
    console.error(
      "LOAD SESSIONS ERROR:",
      err
    );
  } finally {
    setLoadingSessions(false);
  }
};

  const changePassword = async (e) => {
    e.preventDefault();

    try {
      setError("");
      setMessage("");

      await apiFetch(
        "/profile/password",
        {
          method: "PUT",
          body: JSON.stringify(
            passwordForm
          ),
        }
      );

      setMessage(
        "Password changed successfully"
      );

      setPasswordForm({
        current_password: "",
        new_password: "",
      });

    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="page-container">

      <div className="page-header">
        <div>
          <h1>My Profile</h1>
          <p>
            Manage your account information
          </p>
        </div>
      </div>

      {message && (
        <div className="success-message">
          {message}
        </div>
      )}

      {error && (
        <div className="dashboard-error">
          {error}
        </div>
      )}

      <div className="profile-grid">

        <div className="panel">

          <h2>Account Information</h2>

          <div className="profile-user">
            <div className="profile-avatar">
              {(profile?.fullname ||
                profile?.username ||
                "U")
                .charAt(0)
                .toUpperCase()}
            </div>

            <div>
              <strong>
                {profile?.fullname ||
                  profile?.username}
              </strong>

              <span>
                @{profile?.username}
              </span>

              <span>
                {profile?.role_name}
              </span>
            </div>
          </div>

          <form onSubmit={updateProfile}>

            <div className="form-group">
              <label>Username</label>

              <input
                value={
                  profile?.username || ""
                }
                disabled
              />
            </div>

            <div className="form-group">
              <label>Full Name</label>

              <input
                value={form.fullname}
                onChange={(e) =>
                  setForm({
                    ...form,
                    fullname:
                      e.target.value,
                  })
                }
              />
            </div>

            <div className="form-group">
              <label>Email</label>

              <input
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm({
                    ...form,
                    email:
                      e.target.value,
                  })
                }
              />
            </div>

            <div className="form-group">
              <label>Phone Number</label>

              <input
                value={
                  form.phone_number
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    phone_number:
                      e.target.value,
                  })
                }
              />
            </div>

            <button
              type="submit"
              className="primary-button"
            >
              Save Profile
            </button>

          </form>
        </div>


        <div className="panel">

          <h2>Change Password</h2>

          <p className="panel-description">
            Update your account password
          </p>

          <form onSubmit={changePassword}>

            <div className="form-group">
              <label>
                Current Password
              </label>

              <input
                type="password"
                value={
                  passwordForm.current_password
                }
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    current_password:
                      e.target.value,
                  })
                }
                required
              />
            </div>

            <div className="form-group">
              <label>
                New Password
              </label>

              <input
                type="password"
                value={
                  passwordForm.new_password
                }
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    new_password:
                      e.target.value,
                  })
                }
                minLength={8}
                required
              />
            </div>

            <button
              type="submit"
              className="primary-button"
            >
              Change Password
            </button>
            <div className="panel session-panel">

  <div className="panel-header">
    <div>
      <h2>Active Sessions</h2>

      <p className="panel-description">
        Devices currently signed in to your account
      </p>
    </div>

    <button
      className="delete-button"
      onClick={async () => {
        const confirmed =
          window.confirm(
            "Logout all devices?"
          );

        if (!confirmed) return;

        try {
          await apiFetch(
            "/profile/sessions/revoke-all",
            {
              method: "POST",
            }
          );

          await loadSessions();

          alert(
            "All sessions revoked successfully"
          );

        } catch (err) {
          alert(
            err.message ||
            "Failed to revoke sessions"
          );
        }
      }}
    >
      Logout All Devices
    </button>
  </div>

  {loadingSessions ? (
    <div className="loading-box">
      Loading sessions...
    </div>
  ) : sessions.length === 0 ? (

    <div className="empty-row">
      No active sessions
    </div>

  ) : (

    <div className="session-list">

      {sessions.map(
        (session, index) => (
          <div
            className="session-item"
            key={
              session.id_refresh_token
            }
          >
        {index === 0 && (
  <span className="current-session-badge">
    Current Session
  </span>
)}
            

            <div className="session-icon">
              {index === 0
                ? "●"
                : "○"}
            </div>

            <div className="session-info">

            <strong>
  {session.device_name ||
    "Unknown Device"}
</strong>

<span>
  IP:{" "}
  {session.ip_address || "-"}
</span>

<span>
  Issued:{" "}
  {session.issued_at
    ? new Date(
        session.issued_at
      ).toLocaleString()
    : "-"}
</span>

<span>
  Last activity:{" "}
  {session.last_activity_at
    ? new Date(
        session.last_activity_at
      ).toLocaleString()
    : "-"}
</span>

<span>
  Expires:{" "}
  {session.expires_at
    ? new Date(
        session.expires_at
      ).toLocaleString()
    : "-"}
</span>

            </div>

            <button
              className="delete-button"
              onClick={async () => {
                const confirmed =
                  window.confirm(
                    "Revoke this session?"
                  );

                if (!confirmed) {
                  return;
                }

                try {
                  await apiFetch(
                    `/profile/sessions/${session.id_refresh_token}`,
                    {
                      method: "DELETE",
                    }
                  );

                  await loadSessions();

                } catch (err) {
                  alert(
                    err.message ||
                    "Failed to revoke session"
                  );
                }
              }}
            >
              Revoke
            </button>

          </div>
        )
      )}

    </div>
  )}

</div>

          </form>
        </div>

      </div>
    </div>
  );
}

export default Profile;