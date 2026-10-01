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
  const [successMessage, setSuccessMessage] = useState("");

  const [passportFile, setPassportFile] = useState(null);
  const [passportPreview, setPassportPreview] = useState("");

  const [registeredSim, setRegisteredSim] = useState(null);
  const [registrationId, setRegistrationId] = useState(null);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    passport_number: "",
    nationality: "",
    date_of_birth: "",
    passport_expiry_date: "",
    phone_number: "",
  });

  // =====================================================
  // CLEANUP PASSPORT PREVIEW
  // =====================================================

  useEffect(() => {
    return () => {
      if (passportPreview) {
        URL.revokeObjectURL(passportPreview);
      }
    };
  }, [passportPreview]);

  // =====================================================
  // LOAD AGENT + SIM TYPES
  // =====================================================

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
        `${API_URL}/public/registration-options/${encodeURIComponent(
          agentToken
        )}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Invalid Agent registration link."
        );
      }

      setAgent(data.data?.agent || null);
      setSimTypes(data.data?.sim_types || []);
    } catch (err) {
      console.error(
        "LOAD REGISTRATION OPTIONS ERROR:",
        err
      );

      setError(
        err.message ||
          "Unable to load registration page."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // SELECT SIM TYPE
  // =====================================================

  const handleSelectSimType = (type) => {
    setSelectedSimType(type);
    setError("");
    setSuccessMessage("");
  };

  // =====================================================
  // INPUT CHANGE
  // =====================================================

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setError("");
  };

  // =====================================================
  // PASSPORT IMAGE
  // =====================================================

  const handlePassportChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    // Check file type
    if (!file.type.startsWith("image/")) {
      setError(
        "Please select a valid image file."
      );
      return;
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      setError(
        "Passport image must be smaller than 10MB."
      );
      return;
    }

    setError("");
    setSuccessMessage("");

    // Remove old preview
    if (passportPreview) {
      URL.revokeObjectURL(passportPreview);
    }

    // Create preview
    const preview = URL.createObjectURL(file);

    setPassportPreview(preview);
    setPassportFile(file);

    // Run OCR
    await processPassport(file);
  };

  // =====================================================
  // PASSPORT OCR
  // =====================================================

  const processPassport = async (file) => {
    try {
      setOcrLoading(true);
      setLoading(true);
      setError("");

      const formData = new FormData();

      formData.append(
        "passport",
        file
      );

      const response = await fetch(
        `${API_URL}/public/passport/ocr`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Passport OCR failed."
        );
      }

      const passport =
        data.data?.passport || {};

      // Fill form using OCR result
      setForm((prev) => ({
        ...prev,

        first_name:
          passport.first_name ||
          prev.first_name,

        last_name:
          passport.last_name ||
          prev.last_name,

        passport_number:
          passport.passport_number ||
          prev.passport_number,

        nationality:
          passport.nationality ||
          prev.nationality,

        date_of_birth:
          passport.date_of_birth ||
          prev.date_of_birth,
      }));

      setStep(3);
    } catch (err) {
      console.error(
        "PASSPORT OCR ERROR:",
        err
      );

      setError(
        err.message ||
          "Unable to read passport."
      );
    } finally {
      setOcrLoading(false);
      setLoading(false);
    }
  };

  // =====================================================
  // VALIDATE FORM
  // =====================================================

  const validateForm = () => {
    if (!agentToken) {
      throw new Error(
        "Invalid Agent registration link."
      );
    }

    if (!selectedSimType?.id_sim_type) {
      throw new Error(
        "Please select a SIM type."
      );
    }

    if (!passportFile) {
      throw new Error(
        "Passport image is required."
      );
    }

    if (!form.first_name?.trim()) {
      throw new Error(
        "First name is required."
      );
    }

    if (!form.last_name?.trim()) {
      throw new Error(
        "Last name is required."
      );
    }

    if (!form.passport_number?.trim()) {
      throw new Error(
        "Passport number is required."
      );
    }

    if (!form.nationality?.trim()) {
      throw new Error(
        "Nationality is required."
      );
    }

    return true;
  };

  // =====================================================
  // SUBMIT REGISTRATION
  // =====================================================

  const submitRegistration = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccessMessage("");

      validateForm();

      const formData = new FormData();

      // Agent token
      formData.append(
        "agent_token",
        agentToken
      );

      // SIM type
      formData.append(
        "id_sim_type",
        selectedSimType.id_sim_type
      );

      // Customer
      formData.append(
        "first_name",
        form.first_name.trim()
      );

      formData.append(
        "last_name",
        form.last_name.trim()
      );

      formData.append(
        "passport_number",
        form.passport_number.trim()
      );

      formData.append(
        "nationality",
        form.nationality.trim()
      );

      formData.append(
        "date_of_birth",
        form.date_of_birth || ""
      );

      formData.append(
        "passport_expiry_date",
        form.passport_expiry_date || ""
      );

      formData.append(
        "phone_number",
        form.phone_number?.trim() || ""
      );

      // Passport image
      formData.append(
        "passport",
        passportFile
      );

      const response = await fetch(
        `${API_URL}/public/registrations`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Registration failed."
        );
      }

      const registration =
        data.data || {};

      const sim =
        registration.sim || null;

      setRegisteredSim(sim);

      setRegistrationId(
        registration.id_registration ||
          null
      );

      setSuccessMessage(
        data.message ||
          "Registration submitted successfully."
      );

      // Check eSIM
      const isEsim =
        selectedSimType?.sim_type
          ?.toLowerCase()
          .includes("esim");

      if (isEsim) {
        setStep(5);
      } else {
        setStep(4);
      }
    } catch (err) {
      console.error(
        "CUSTOMER REGISTRATION ERROR:",
        err
      );

      setError(
        err.message ||
          "Registration failed."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // FINISH
  // =====================================================

  const handleFinish = () => {
    window.location.reload();
  };

  // =====================================================
  // GO BACK
  // =====================================================

  const goBack = (targetStep) => {
    setError("");
    setSuccessMessage("");
    setStep(targetStep);
  };

  // =====================================================
  // SIM TYPE
  // =====================================================

  const isSelectedEsim =
    selectedSimType?.sim_type
      ?.toLowerCase()
      .includes("esim");

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="registration-container">

      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}

      {/* =================================================
          SUCCESS MESSAGE
      ================================================= */}

      {successMessage &&
        step !== 4 &&
        step !== 5 && (
          <div className="success-banner">
            {successMessage}
          </div>
        )}

      {/* =================================================
          LOADING
      ================================================= */}

      {loading &&
        step === 1 && (
          <div className="loading-box">
            Loading registration portal...
          </div>
        )}

      {/* =================================================
          STEP 1
          SELECT SIM TYPE
      ================================================= */}

      {step === 1 && (
        <div className="step-content">

          {/* Welcome */}
          <div className="welcome-banner">

            <div className="banner-top">

              <span className="brand-badge">
                ETL
              </span>

              <span className="tourist-tag">
                TOURIST SIM
              </span>

            </div>

            <h2>
              ຍິນດີຕ້ອນຮັບສູ່ ETL
            </h2>

            <p>
              Welcome to ETL Tourist SIM
              Registration Portal.
            </p>

            {/* Agent */}
            {agent && (
              <div className="agent-info-card">

                <strong>
                  Agent
                </strong>

                <div>
                  {agent.agent_name}
                </div>

                {agent.contact_phone && (
                  <small>
                    {agent.contact_phone}
                  </small>
                )}

                {agent.contact_email && (
                  <small>
                    {agent.contact_email}
                  </small>
                )}

              </div>
            )}

          </div>

          {/* SIM Types */}
          <div className="sim-type-cards">

            {simTypes.length === 0 &&
              !loading && (
                <div className="empty-state">
                  No SIM types available.
                </div>
              )}

            {simTypes.map((type) => {

              const isEsim =
                type.sim_type
                  ?.toLowerCase()
                  .includes("esim");

              const isActive =
                selectedSimType
                  ?.id_sim_type ===
                type.id_sim_type;

              return (
                <div
                  key={
                    type.id_sim_type
                  }
                  className={`sim-card ${
                    isActive
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    handleSelectSimType(
                      type
                    )
                  }
                >

                  <div className="card-icon">
                    {isEsim
                      ? "QR"
                      : "💳"}
                  </div>

                  <div className="card-info">

                    <h3>
                      {type.sim_type}
                    </h3>

                    <p>
                      {type.description ||
                        (isEsim
                          ? "eSIM profile"
                          : "Physical SIM card")}
                    </p>

                  </div>

                </div>
              );
            })}

          </div>

          {/* Next */}
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setError("");
              setStep(2);
            }}
            disabled={
              loading ||
              !selectedSimType
            }
          >
            ຕໍ່ໄປ
            <br />
            <small>
              Next Step
            </small>{" "}
            →
          </button>

        </div>
      )}

      {/* =================================================
          STEP 2
          PASSPORT
      ================================================= */}

      {step === 2 && (
        <div className="registration-card">

          <button
            type="button"
            className="back-button"
            onClick={() => goBack(1)}
            disabled={ocrLoading}
          >
            ← Back
          </button>

          <h1>
            Passport Verification
          </h1>

          <p>
            Take a clear photo of your passport
          </p>

          {/* OCR Loading */}
          {ocrLoading && (
            <div className="ocr-loading">
              <strong>
                Reading passport...
              </strong>

              <p>
                Please wait while we
                extract passport information.
              </p>
            </div>
          )}

          {/* No image */}
          {!passportPreview ? (
            <>
              {/* Camera */}
              <label className="passport-camera-box">

                <div className="passport-camera-icon">
                  📷
                </div>

                <strong>
                  Take Passport Photo
                </strong>

                <span>
                  Place the passport
                  inside the frame
                </span>

                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  hidden
                  disabled={ocrLoading}
                  onChange={
                    handlePassportChange
                  }
                />

              </label>

              {/* Gallery */}
              <label className="passport-upload-button">

                Choose from Gallery

                <input
                  type="file"
                  accept="image/*"
                  hidden
                  disabled={ocrLoading}
                  onChange={
                    handlePassportChange
                  }
                />

              </label>
            </>
          ) : (
            <>
              {/* Preview */}
              <div className="passport-preview-box">

                <img
                  src={passportPreview}
                  alt="Passport preview"
                  className="passport-preview"
                />

              </div>

              {/* Actions */}
              <div className="passport-preview-actions">

                <label className="secondary-button">

                  Retake

                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    hidden
                    disabled={ocrLoading}
                    onChange={
                      handlePassportChange
                    }
                  />

                </label>

                <button
                  type="button"
                  className="primary-registration-button"
                  onClick={() => {
                    setError("");
                    setStep(3);
                  }}
                  disabled={
                    ocrLoading ||
                    !passportFile
                  }
                >
                  Continue →
                </button>

              </div>
            </>
          )}

        </div>
      )}

      {/* =================================================
          STEP 3
          VERIFY CUSTOMER INFORMATION
      ================================================= */}

      {step === 3 && (
        <div className="registration-card">

          <button
            type="button"
            className="back-button"
            onClick={() => goBack(2)}
            disabled={loading}
          >
            ← Back
          </button>

          <h2>
            Verify Information
          </h2>

          <p>
            Please check the information
            extracted from your passport.
          </p>

          {/* First Name */}
          <div className="input-field">

            <label>
              First Name *
            </label>

            <input
              type="text"
              name="first_name"
              value={form.first_name}
              onChange={
                handleInputChange
              }
              placeholder="First name"
              disabled={loading}
            />

          </div>

          {/* Last Name */}
          <div className="input-field">

            <label>
              Last Name *
            </label>

            <input
              type="text"
              name="last_name"
              value={form.last_name}
              onChange={
                handleInputChange
              }
              placeholder="Last name"
              disabled={loading}
            />

          </div>

          {/* Passport Number */}
          <div className="input-field">

            <label>
              Passport Number *
            </label>

            <input
              type="text"
              name="passport_number"
              value={
                form.passport_number
              }
              onChange={
                handleInputChange
              }
              placeholder="Passport number"
              disabled={loading}
            />

          </div>

          {/* Nationality */}
          <div className="input-field">

            <label>
              Nationality *
            </label>

            <input
              type="text"
              name="nationality"
              value={form.nationality}
              onChange={
                handleInputChange
              }
              placeholder="Nationality"
              disabled={loading}
            />

          </div>

          {/* Date of Birth */}
          <div className="input-field">

            <label>
              Date of Birth
            </label>

            <input
              type="date"
              name="date_of_birth"
              value={
                form.date_of_birth
              }
              onChange={
                handleInputChange
              }
              disabled={loading}
            />

          </div>

          {/* Passport Expiry */}
          <div className="input-field">

            <label>
              Passport Expiry Date
            </label>

            <input
              type="date"
              name="passport_expiry_date"
              value={
                form.passport_expiry_date
              }
              onChange={
                handleInputChange
              }
              disabled={loading}
            />

          </div>

          {/* Phone */}
          <div className="input-field">

            <label>
              Phone Number
            </label>

            <div className="input-wrapper">

              <input
                type="tel"
                name="phone_number"
                value={
                  form.phone_number
                }
                onChange={
                  handleInputChange
                }
                placeholder="020..."
                disabled={loading}
              />

            </div>

          </div>

          {/* Selected SIM */}
          <div className="selected-sim-info">

            <span>
              Selected SIM Type
            </span>

            <strong>
              {selectedSimType?.sim_type ||
                "-"}
            </strong>

          </div>

          {/* Submit */}
          <button
            type="button"
            className="primary-registration-button"
            onClick={
              submitRegistration
            }
            disabled={loading}
          >

            {loading
              ? "Submitting..."
              : "Confirm Registration →"}

          </button>

        </div>
      )}

      {/* =================================================
          STEP 4
          PHYSICAL SIM SUCCESS
      ================================================= */}

      {step === 4 && (
        <div className="step-content success-view">

          <div className="success-badge">
            ✓
          </div>

          <h2>
            ສົ່ງຄຳຂໍສຳເລັດ!
          </h2>

          <p className="subtext">
            Your registration is waiting
            for administrator approval.
          </p>

          {/* Registration ID */}
          {registrationId && (
            <div className="registration-number">
              Registration ID:{" "}
              <strong>
                #{registrationId}
              </strong>
            </div>
          )}

          {/* Info */}
          <div className="info-card">

            <div className="info-row">
              <span>
                Agent
              </span>

              <strong>
                {agent?.agent_name || "-"}
              </strong>
            </div>

            <div className="info-row">
              <span>
                Phone Number
              </span>

              <strong>
                {registeredSim?.phone_number ||
                  "-"}
              </strong>
            </div>

            <div className="info-row">
              <span>
                IMSI
              </span>

              <strong>
                {registeredSim?.imsi ||
                  "-"}
              </strong>
            </div>

            <div className="info-row">
              <span>
                ICCID
              </span>

              <strong>
                {registeredSim?.iccid ||
                  "-"}
              </strong>
            </div>

            <div className="info-row">
              <span>
                SIM Type
              </span>

              <strong>
                {registeredSim?.sim_type ||
                  "Physical SIM"}
              </strong>
            </div>

            <div className="info-row">
              <span>
                Status
              </span>

              <span className="status-pending">
                Pending Review
              </span>
            </div>

          </div>

          {/* Instructions */}
          <div className="instructions-box">

            <strong>
              Instructions
            </strong>

            <p>
              Please wait for administrator
              approval. The physical SIM will
              be activated after approval.
            </p>

          </div>

          <button
            type="button"
            className="btn-primary"
            onClick={handleFinish}
          >
            Finish
          </button>

        </div>
      )}

      {/* =================================================
          STEP 5
          eSIM SUCCESS
      ================================================= */}

      {step === 5 && (
        <div className="step-content success-view dark-mode">

          <div className="success-badge dark">
            ✓
          </div>

          <h2>
            ສົ່ງຄຳຂໍ eSIM ສຳເລັດ!
          </h2>

          <p className="subtext">
            Your eSIM registration is waiting
            for administrator approval.
          </p>

          {/* Registration ID */}
          {registrationId && (
            <div className="registration-number">
              Registration ID:{" "}
              <strong>
                #{registrationId}
              </strong>
            </div>
          )}

          {/* QR */}
          <div className="qr-container-card">

            <div className="qr-box">

              <div className="qr-dummy">

                <div className="qr-icon">
                  QR
                </div>

                <strong>
                  QR Code
                </strong>

                <span>
                  Available after approval
                </span>

              </div>

            </div>

          </div>

          {/* eSIM information */}
          <div className="info-card dark">

            <div className="info-row">
              <span>
                Agent
              </span>

              <strong>
                {agent?.agent_name || "-"}
              </strong>
            </div>

            <div className="info-row">
              <span>
                Phone Number
              </span>

              <strong>
                {registeredSim?.phone_number ||
                  "-"}
              </strong>
            </div>

            <div className="info-row">
              <span>
                IMSI
              </span>

              <strong>
                {registeredSim?.imsi ||
                  "-"}
              </strong>
            </div>

            <div className="info-row">
              <span>
                ICCID
              </span>

              <strong>
                {registeredSim?.iccid ||
                  "-"}
              </strong>
            </div>

            <div className="info-row">
              <span>
                SIM Type
              </span>

              <strong>
                eSIM
              </strong>
            </div>

            <div className="info-row">
              <span>
                Status
              </span>

              <span className="status-pending">
                Pending Review
              </span>
            </div>

          </div>

          {/* Install Guide */}
          <div className="install-guide">

            <strong>
              Next step
            </strong>

            <p>
              The eSIM QR code will be
              available after administrator
              approval.
            </p>

            <p>
              Please wait for the administrator
              to approve your registration.
            </p>

          </div>

          <button
            type="button"
            className="btn-primary"
            onClick={handleFinish}
          >
            Finish
          </button>

        </div>
      )}

    </div>
  );
}

export default CustomerRegistration;