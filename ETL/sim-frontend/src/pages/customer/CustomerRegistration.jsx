import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const API_URL = "https://eltsimu.onrender.com";

function CustomerRegistration() {
  const { agentToken } = useParams();

  const [agent, setAgent] = useState(null);
  const [simTypes, setSimTypes] = useState([]);
  const [selectedSimType, setSelectedSimType] = useState(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [error, setError] = useState("");

  const [passportFile, setPassportFile] = useState(null);
  const [passportPreview, setPassportPreview] = useState("");
  const [registeredSim, setRegisteredSim] = useState(null);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    passport_number: "",
    nationality: "",
    date_of_birth: "",
    passport_expiry_date: "",
    phone_number: "",
  });

  // Cleanup object URL ຫຼຸດ Memory leak
  useEffect(() => {
    return () => {
      if (passportPreview) {
        URL.revokeObjectURL(passportPreview);
      }
    };
  }, [passportPreview]);

  useEffect(() => {
    if (!agentToken) {
      setError("Invalid Agent registration link.");
      return;
    }
    loadRegistrationOptions();
  }, [agentToken]);

  const loadRegistrationOptions = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/public/registration-options/${agentToken}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Invalid Agent link");
      }

      setAgent(data.data?.agent || null);
      setSimTypes(data.data?.sim_types || []);
    } catch (err) {
      console.error("LOAD REGISTRATION OPTIONS ERROR:", err);
      setError(err.message || "Unable to load registration page");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSimType = (type) => {
    setSelectedSimType(type);
    setError("");
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePassportChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be smaller than 10MB.");
      return;
    }

    setError("");

    if (passportPreview) {
      URL.revokeObjectURL(passportPreview);
    }

    const preview = URL.createObjectURL(file);
    setPassportPreview(preview);
    setPassportFile(file);

    await processPassport(file);
  };

  const processPassport = async (file) => {
    try {
      setOcrLoading(true);
      setLoading(true);
      setError("");

      const formData = new FormData();
      formData.append("passport", file);

      const response = await fetch(`${API_URL}/public/passport/ocr`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Passport OCR failed");
      }

      const passport = data.data?.passport || {};

      setForm((prev) => ({
        ...prev,
        first_name: passport.first_name || prev.first_name,
        last_name: passport.last_name || prev.last_name,
        passport_number: passport.passport_number || prev.passport_number,
        nationality: passport.nationality || prev.nationality,
        date_of_birth: passport.date_of_birth || prev.date_of_birth,
      }));

      setStep(3);
    } catch (err) {
      console.error("PASSPORT OCR ERROR:", err);
      setError(err.message || "Unable to read passport");
    } finally {
      setOcrLoading(false);
      setLoading(false);
    }
  };

  const submitRegistration = async () => {
    try {
      setLoading(true);
      setError("");

      if (!agentToken) throw new Error("Invalid Agent link");
      if (!selectedSimType?.id_sim_type) throw new Error("Please select SIM type");
      if (!passportFile) throw new Error("Passport image is required");
      if (!form.first_name?.trim()) throw new Error("First name is required");
      if (!form.last_name?.trim()) throw new Error("Last name is required");
      if (!form.passport_number?.trim()) throw new Error("Passport number is required");
      if (!form.nationality?.trim()) throw new Error("Nationality is required");

      const formData = new FormData();
      formData.append("agent_token", agentToken);
      formData.append("id_sim_type", selectedSimType.id_sim_type);
      formData.append("first_name", form.first_name.trim());
      formData.append("last_name", form.last_name.trim());
      formData.append("passport_number", form.passport_number.trim());
      formData.append("nationality", form.nationality.trim());
      formData.append("date_of_birth", form.date_of_birth || "");
      formData.append("passport_expiry_date", form.passport_expiry_date || "");
      formData.append("phone_number", form.phone_number || "");
      formData.append("passport", passportFile);

      const response = await fetch(`${API_URL}/public/registrations`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed");
      }

      const sim = data.data?.sim || null;
      setRegisteredSim(sim);

      const isEsim = selectedSimType?.sim_type?.toLowerCase().includes("esim");

      if (isEsim) {
        setStep(5);
      } else {
        setStep(4);
      }
    } catch (err) {
      console.error("CUSTOMER REGISTRATION ERROR:", err);
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="registration-container">
      {error && <div className="error-banner">{error}</div>}

      {/* Step 1: Select SIM Type */}
      {step === 1 && (
        <div className="step-content">
          <div className="welcome-banner">
            <div className="banner-top">
              <span className="brand-badge">ETL</span>
              <span className="tourist-tag">TOURIST SIM</span>
            </div>
            <h2>ຍິນດີຕ້ອນຮັບສູ່ ETL</h2>
            <p>Welcome to ETL Tourist SIM Registration Portal.</p>

            {agent && (
              <div className="agent-info-card">
                <strong>Agent</strong>
                <div>{agent.agent_name}</div>
                {agent.contact_phone && <small>{agent.contact_phone}</small>}
              </div>
            )}
          </div>

          <div className="sim-type-cards">
            {simTypes.map((type) => {
              const isEsim = type.sim_type?.toLowerCase().includes("esim");
              return (
                <div
                  key={type.id_sim_type}
                  className={`sim-card ${
                    selectedSimType?.id_sim_type === type.id_sim_type
                      ? "active"
                      : ""
                  }`}
                  onClick={() => handleSelectSimType(type)}
                >
                  <div className="card-icon">{isEsim ? "QR" : "💳"}</div>
                  <div className="card-info">
                    <h3>{type.sim_type}</h3>
                    <p>
                      {type.description ||
                        (isEsim ? "eSIM profile" : "Physical SIM card")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            className="btn-primary"
            onClick={() => setStep(2)}
            disabled={loading || !selectedSimType}
          >
            ຕໍ່ໄປ <br />
            <small>Next Step</small> →
          </button>
        </div>
      )}

      {/* Step 2: Upload Passport */}
      {step === 2 && (
        <div className="registration-card">
          <button className="back-button" onClick={() => setStep(1)}>
            ← Back
          </button>

          <h1>Passport Verification</h1>
          <p>Take a clear photo of your passport</p>

          {ocrLoading && <div className="ocr-loading">Reading passport...</div>}

          {!passportPreview ? (
            <>
              <label className="passport-camera-box">
                <div className="passport-camera-icon">📷</div>
                <strong>Take Passport Photo</strong>
                <span>Place the passport inside the frame</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  hidden
                  onChange={handlePassportChange}
                />
              </label>

              <label className="passport-upload-button">
                Choose from Gallery
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handlePassportChange}
                />
              </label>
            </>
          ) : (
            <>
              <div className="passport-preview-box">
                <img
                  src={passportPreview}
                  alt="Passport"
                  className="passport-preview"
                />
              </div>

              <div className="passport-preview-actions">
                <label className="secondary-button">
                  Retake
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    hidden
                    onChange={handlePassportChange}
                  />
                </label>

                <button
                  className="primary-registration-button"
                  onClick={() => setStep(3)}
                  disabled={ocrLoading}
                >
                  Continue →
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 3: Verify Details & Confirm Form */}
      {step === 3 && (
        <div className="registration-card">
          <button className="back-button" onClick={() => setStep(2)}>
            ← Back
          </button>
          <h2>Verify Information</h2>

          <div className="input-field">
            <label>First Name</label>
            <input
              type="text"
              name="first_name"
              value={form.first_name}
              onChange={handleInputChange}
            />
          </div>

          <div className="input-field">
            <label>Last Name</label>
            <input
              type="text"
              name="last_name"
              value={form.last_name}
              onChange={handleInputChange}
            />
          </div>

          <div className="input-field">
            <label>Passport Number</label>
            <input
              type="text"
              name="passport_number"
              value={form.passport_number}
              onChange={handleInputChange}
            />
          </div>

          <div className="input-field">
            <label>Nationality</label>
            <input
              type="text"
              name="nationality"
              value={form.nationality}
              onChange={handleInputChange}
            />
          </div>

          <div className="input-field">
            <label>Phone Number</label>
            <div className="input-wrapper">
              <input
                type="text"
                name="phone_number"
                value={form.phone_number}
                onChange={handleInputChange}
                placeholder="020..."
              />
            </div>
          </div>

          <button
            type="button"
            className="primary-registration-button"
            onClick={submitRegistration}
            disabled={loading}
          >
            {loading ? "Submitting..." : "Confirm Registration →"}
          </button>
        </div>
      )}

      {/* Step 4: Physical SIM Success View */}
      {step === 4 && (
        <div className="step-content success-view">
          <div className="success-badge">✓</div>
          <h2>ສົ່ງຄຳຂໍສຳເລັດ!</h2>
          <p className="subtext">
            Your registration is waiting for administrator approval.
          </p>

          <div className="info-card">
            <div className="info-row">
              <span>Agent</span>
              <strong>{agent?.agent_name || "-"}</strong>
            </div>
            <div className="info-row">
              <span>Phone Number</span>
              <strong>{registeredSim?.phone_number || "-"}</strong>
            </div>
            <div className="info-row">
              <span>IMSI</span>
              <strong>{registeredSim?.imsi || "-"}</strong>
            </div>
            <div className="info-row">
              <span>ICCID</span>
              <strong>{registeredSim?.iccid || "-"}</strong>
            </div>
            <div className="info-row">
              <span>SIM Type</span>
              <strong>Physical SIM</strong>
            </div>
            <div className="info-row">
              <span>Status</span>
              <span className="status-pending">Pending Review</span>
            </div>
          </div>

          <div className="instructions-box">
            <strong>Instructions</strong>
            <p>
              Please wait for administrator approval. The physical SIM will be
              activated after approval.
            </p>
          </div>

          <button className="btn-primary" onClick={() => window.location.reload()}>
            Finish
          </button>
        </div>
      )}

      {/* Step 5: eSIM Success View */}
      {step === 5 && (
        <div className="step-content success-view dark-mode">
          <div className="success-badge dark">✓</div>
          <h2>ສົ່ງຄຳຂໍ eSIM ສຳເລັດ!</h2>
          <p className="subtext">
            Your eSIM registration is waiting for approval.
          </p>

          <div className="qr-container-card">
            <div className="qr-box">
              <div className="qr-dummy">
                QR Code <br />
                Available after approval
              </div>
            </div>
          </div>

          <div className="info-card dark">
            <div className="info-row">
              <span>Agent</span>
              <strong>{agent?.agent_name || "-"}</strong>
            </div>
            <div className="info-row">
              <span>Phone Number</span>
              <strong>{registeredSim?.phone_number || "-"}</strong>
            </div>
            <div className="info-row">
              <span>IMSI</span>
              <strong>{registeredSim?.imsi || "-"}</strong>
            </div>
            <div className="info-row">
              <span>SIM Type</span>
              <strong>eSIM</strong>
            </div>
            <div className="info-row">
              <span>Status</span>
              <span className="status-pending">Pending Review</span>
            </div>
          </div>

          <div className="install-guide">
            <strong>Next step</strong>
            <p>
              The eSIM QR code will be available after administrator approval.
            </p>
          </div>

          <button className="btn-primary" onClick={() => window.location.reload()}>
            Finish
          </button>
        </div>
      )}
    </div>
  );
}

export default CustomerRegistration;