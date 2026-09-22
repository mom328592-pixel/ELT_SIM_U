import { useEffect, useState } from "react";

const API_URL = "https://eltsimu.onrender.com";

function CustomerRegistration() {
  const [step, setStep] = useState(1);

  const [agents, setAgents] = useState([]);
  const [simTypes, setSimTypes] = useState([]);

  const [selectedAgent, setSelectedAgent] = useState(null);
  const [selectedSimType, setSelectedSimType] = useState(null);

  const [passportFile, setPassportFile] = useState(null);
  const [passportPreview, setPassportPreview] = useState("");

  const [form, setForm] = useState({
    first_name: "JOHNATHAN",
    last_name: "SMITH",
    passport_number: "",
    nationality: "",
    date_of_birth: "",
    passport_expiry_date: "",
  });

  const [registeredSim, setRegisteredSim] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadRegistrationOptions();
  }, []);

  const loadRegistrationOptions = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(`${API_URL}/public/registration-options`);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Failed to load options");
      }

      const fetchedAgents = data.data?.agents || [];
      setAgents(fetchedAgents);

      if (fetchedAgents.length > 0) {
        setSelectedAgent(fetchedAgents[0]);
      }

      const types = data.data?.sim_types || [];
      setSimTypes(types);

      if (types.length > 0) {
        setSelectedSimType(types[0]);
      }
    } catch (err) {
      console.error("LOAD OPTIONS ERROR:", err);
      if (err.name === "TypeError" && err.message === "Failed to fetch") {
        setError("ບໍ່ສາມາດເຊື່ອມຕໍ່ຫາ Server ໄດ້ (ERR_CONNECTION_REFUSED)");
      } else {
        setError(err.message || "ບໍ່ສາມາດໂຫຼດຂໍ້ມູນໄດ້");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSimType = (type) => {
    if (!type || !type.id_sim_type) return;
    setSelectedSimType(type);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePassportChange = async (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5MB");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setPassportPreview(previewUrl);
    setPassportFile(file);

    await processPassport(file);
  };

  useEffect(() => {
    return () => {
      if (passportPreview) {
        URL.revokeObjectURL(passportPreview);
      }
    };
  }, [passportPreview]);

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
        passport_number: passport.passport_number || "",
        nationality: passport.nationality || "",
        date_of_birth: passport.date_of_birth || "",
      }));

      setPassportFile(file);
      setStep(3);
    } catch (err) {
      console.error("PASSPORT OCR ERROR:", err);
      setError(err.message || "Unable to read passport");
    } finally {
      setOcrLoading(false);
      setLoading(false);
    }
  };

  // 🟢 ດຶງ SIM ຫຼັງຈາກກົດ Confirmation / Submit (Backend ເປັນຜູ້ຈັດການ Select SIM ທີ່ວ່າງ)
  const submitRegistration = async () => {
  try {
    setLoading(true);
    setError("");

    const agentToUse = selectedAgent || agents[0];

    if (!agentToUse?.id_agent) {
      throw new Error("ບໍ່ພົບຂໍ້ມູນ Agent ໃນລະບົບ");
    }

    if (!selectedSimType?.id_sim_type) {
      throw new Error("ກະລຸນາເລືອກປະເພດ SIM ທີ່ຕ້ອງການ");
    }

    // 🟢 Step Extra: ດຶງ SIM ວ່າງ 1 ເບີກ່ອນ Submit ຖ້າ Backend ຍັງຕ້ອງການ id_sim[cite: 1]
    const simRes = await fetch(
      `${API_URL}/public/sims/available?id_sim_type=${selectedSimType.id_sim_type}`
    );
    const simData = await simRes.json();
    const availableSim = Array.isArray(simData.data) ? simData.data[0] : simData.data;

    if (!availableSim?.id_sim) {
      throw new Error("ບໍ່ມີ SIM ທີ່ວ່າງໃນລະບົບ ສຳລັບປະເພດນີ້");
    }

    if (!form.first_name?.trim()) throw new Error("ກະລຸນາກວດເບິ່ງ First Name");
    if (!form.last_name?.trim()) throw new Error("ກະລຸນາກວດເບິ່ງ Last Name");
    if (!form.passport_number?.trim()) throw new Error("ກະລຸນາກວດເບິ່ງ Passport Number");
    if (!form.nationality?.trim()) throw new Error("ກະລຸນາກວດເບິ່ງ Nationality");

    // 🟢 ແນບ id_sim ສົ່ງໄປ Backend
    const payload = {
      id_agent: Number(agentToUse.id_agent),
      id_sim: Number(availableSim.id_sim), // Send id_sim expected by backend
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      passport_number: form.passport_number.trim(),
      nationality: form.nationality.trim(),
      date_of_birth: form.date_of_birth || null,
      passport_expiry_date: form.passport_expiry_date || null,
    };

    const response = await fetch(`${API_URL}/public/registrations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "Registration failed");
    }

    setRegisteredSim(data.data?.sim || availableSim);

    const isEsim = selectedSimType?.sim_type?.toLowerCase().includes("esim");
    setStep(isEsim ? 5 : 4);
  } catch (error) {
    console.error("CUSTOMER REGISTRATION ERROR:", error);
    setError(error.message || "Failed to submit registration");
  } finally {
    setLoading(false);
  }
};
  const isDarkMode = step === 5;

  return (
    <div className={`app-viewport ${isDarkMode ? "dark-theme" : ""}`}>
      <div className="mobile-container">
        {/* TOP STATUS BAR */}
        <div className="status-bar">
          <span className="time"></span>
          <div className="status-icons">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>

        {/* STEP HEADER & PROGRESS BAR */}
        <div className="wizard-header">
          <div className="step-info">
            <span className="step-label">STEP {step > 4 ? 4 : step} OF 4</span>
            <span className="step-percent">
              {step === 1 ? "25%" : step === 2 ? "50%" : step === 3 ? "75%" : "100%"} Complete
            </span>
          </div>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${(Math.min(step, 4) / 4) * 100}%` }}
            />
          </div>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {/* STEP 1: CHOOSE SIM TYPE */}
        {step === 1 && (
          <div className="step-content">
            <div className="welcome-banner">
              <div className="banner-top">
                <span className="brand-badge">ETL</span>
                <span className="tourist-tag">TOURIST SIM</span>
              </div>
              <h2>ຍິນດີຕ້ອນຮັບສູ່ ETL</h2>
              <p>
                Welcome to ETL Tourist SIM Registration portal. Register your foreign passport to activate your internet profile instantly.
              </p>
            </div>

            <div className="section-title">
              ເລືອກປະເພດ SIM ຂອງທ່ານ / <strong>Choose Your SIM Type</strong>
            </div>

            <div className="sim-type-cards">
              <div
                className={`sim-card ${
                  selectedSimType?.sim_type?.toLowerCase().includes("physical") ||
                  selectedSimType?.sim_type?.toLowerCase().includes("ກາດ")
                    ? "active"
                    : ""
                }`}
                onClick={() => {
                  const target = simTypes.find((t) => !t.sim_type?.toLowerCase().includes("esim")) || simTypes[0];
                  if (target) handleSelectSimType(target);
                }}
              >
                <div className="card-icon">💳</div>
                <div className="card-info">
                  <h3>Physical SIM (ຊິມກາດ)</h3>
                  <p>
                    Traditional plastic SIM card. Insert directly into your mobile phone tray.
                  </p>
                </div>
              </div>

              <div
                className={`sim-card ${
                  selectedSimType?.sim_type?.toLowerCase().includes("esim")
                    ? "active"
                    : ""
                }`}
                onClick={() => {
                  const target = simTypes.find((t) => t.sim_type?.toLowerCase().includes("esim")) || simTypes[0];
                  if (target) handleSelectSimType(target);
                }}
              >
                <span className="popular-badge">POPULAR</span>
                <div className="card-icon esim-icon">
                  <span>QR</span>
                </div>
                <div className="card-info">
                  <h3>eSIM (ຊິມຝັງໃນເຄື່ອງ)</h3>
                  <p>
                    Virtual SIM installed instantly via scanning a QR code. No physical card needed.
                  </p>
                </div>
              </div>
            </div>

            <button
              className="btn-primary"
              onClick={() => setStep(2)}
              disabled={loading || !selectedSimType}
            >
              ຕໍ່ໄປ <br /> <small>Next Step</small> →
            </button>
          </div>
        )}

        {/* STEP 2: PASSPORT PHOTO */}
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
                    alt="Passport preview"
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

        {/* STEP 3: CONFIRM PERSONAL INFO */}
        {step === 3 && (
          <div className="step-content">
            <div className="nav-header">
              <button className="btn-back" onClick={() => setStep(2)}>
                ‹
              </button>
              <div className="header-title">
                <h2>ກວດສອບຂໍ້ມູນ</h2>
                <p>Confirm Personal Information</p>
              </div>
              <span className="brand-badge small">ETL</span>
            </div>

            <div className="ocr-status-card">
              <div className="ocr-thumb"></div>
              <div>
                <strong>ດຶງຂໍ້ມູນພາດສະປອດສຳເລັດ</strong>
                <p>Passport parsed successfully via OCR.</p>
              </div>
            </div>

            <div className="form-fields">
              <div className="input-field">
                <div className="label-row">
                  <label>ຊື່ (First Name)</label>
                  <span className="verified-tag">Verified ✓</span>
                </div>
                <div className="input-wrapper">
                  <input
                    name="first_name"
                    value={form.first_name}
                    onChange={handleInputChange}
                  />
                  <span className="edit-icon">✏️</span>
                </div>
              </div>

              <div className="input-field">
                <div className="label-row">
                  <label>ນາມສະກຸນ (Last Name)</label>
                  <span className="verified-tag">Verified ✓</span>
                </div>
                <div className="input-wrapper">
                  <input
                    name="last_name"
                    value={form.last_name}
                    onChange={handleInputChange}
                  />
                  <span className="edit-icon">✏️</span>
                </div>
              </div>

              <div className="input-field">
                <div className="label-row">
                  <label>ເລກທີ Passport (Passport Number)</label>
                  <span className="verified-tag">Verified ✓</span>
                </div>
                <div className="input-wrapper">
                  <input
                    name="passport_number"
                    value={form.passport_number}
                    onChange={handleInputChange}
                  />
                  <span className="edit-icon">✏️</span>
                </div>
              </div>

              <div className="input-field">
                <div className="label-row">
                  <label>ສັນຊາດ (Nationality)</label>
                  <span className="verified-tag">Verified ✓</span>
                </div>
                <div className="input-wrapper">
                  <input
                    name="nationality"
                    value={form.nationality}
                    onChange={handleInputChange}
                  />
                  <span className="edit-icon">✏️</span>
                </div>
              </div>

              <div className="input-field">
                <div className="label-row">
                  <label>Passport Expiry Date</label>
                </div>
                <div className="input-wrapper">
                  <input
                    type="date"
                    name="passport_expiry_date"
                    value={form.passport_expiry_date}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="input-field">
                <div className="label-row">
                  <label>ວັນເດືອນປີເກີດ (Date of Birth)</label>
                  <span className="verified-tag">Verified ✓</span>
                </div>
                <div className="input-wrapper">
                  <input
                    type="date"
                    name="date_of_birth"
                    value={form.date_of_birth}
                    onChange={handleInputChange}
                  />
                  <span className="edit-icon">✏️</span>
                </div>
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

        {/* STEP 4: PHYSICAL SIM SUCCESS */}
        {step === 4 && (
          <div className="step-content success-view">
            <div className="success-badge">✓</div>
            <h2>ສົ່ງຄຳຂໍລົງທະບຽນສຳເລັດ!</h2>
            <p className="subtext">Your Tourist SIM registration has been submitted for review</p>

            <div className="info-card">
              <div className="info-row">
                <span>Phone Number (ເບີໂທ)</span>
                <strong>{registeredSim?.phone_number || "20 2201 1445"}</strong>
              </div>
              <div className="info-row">
                <span>IMSI / Serial</span>
                <strong>{registeredSim?.imsi || registeredSim?.iccid || "-"}</strong>
              </div>
              <div className="info-row">
                <span>Package</span>
                <strong>{registeredSim?.package || registeredSim?.package_name || "Tourist SIM Package"}</strong>
              </div>
              <div className="info-row">
                <span>SIM Type (ປະເພດຊິມ)</span>
                <strong>Physical SIM</strong>
              </div>
              <div className="info-row">
                <span>Status (ສະຖານະ)</span>
                <span className="status-pending">Pending Review</span>
              </div>
            </div>

            <div className="instructions-box">
              <strong>ຄຳແນະນຳໃນການນຳໃຊ້ / Instructions:</strong>
              <p>
                Please wait for an administrator to review and approve your registration.
                The SIM will be activated after approval.
              </p>
            </div>

            <button className="btn-primary" onClick={() => setStep(1)}>
              ສຳເລັດ → <br />
              <small>Finish Registration</small>
            </button>

            <footer className="footer-copyright">
              © 2026 ETL Public Company. All rights reserved.
            </footer>
          </div>
        )}

        {/* STEP 5: eSIM SUCCESS (DARK THEME) */}
        {step === 5 && (
          <div className="step-content success-view dark-mode">
            <div className="success-badge dark">✓</div>
            <h2>ສົ່ງຄຳຂໍ eSIM ສຳເລັດ!</h2>
            <p className="subtext">Your eSIM registration is waiting for approval</p>

            <div className="qr-container-card">
              <div className="qr-box">
                {registeredSim?.qr_code || registeredSim?.code ? (
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=230x230&data=${encodeURIComponent(
                      registeredSim.qr_code || registeredSim.code
                    )}`}
                    alt="eSIM QR code"
                    className="qr-img"
                    style={{ width: "230px", height: "230px", objectFit: "contain" }}
                  />
                ) : (
                  <div className="qr-dummy">QR pending approval</div>
                )}
              </div>
              {registeredSim?.link_register_ && (
                <a
                  className="btn-download-qr"
                  href={registeredSim.link_register_}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open eSIM activation link
                </a>
              )}
            </div>

            <div className="info-card dark">
              <div className="info-row">
                <span>Phone Number (ເບີໂທ)</span>
                <strong>{registeredSim?.phone_number || "20 2201 1446"}</strong>
              </div>
              <div className="info-row">
                <span>Package</span>
                <strong>{registeredSim?.package || registeredSim?.package_name || "Tourist SIM Package"}</strong>
              </div>
              <div className="info-row">
                <span>SIM Type</span>
                <strong>eSIM Profile</strong>
              </div>
            </div>

            <div className="install-guide">
              <strong>Next step:</strong>
              <p>Your eSIM will be ready to install after the registration is approved.</p>
            </div>

            <button className="btn-primary" onClick={() => setStep(1)}>
              ສຳເລັດ → <br />
              <small>Finish Registration</small>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default CustomerRegistration;