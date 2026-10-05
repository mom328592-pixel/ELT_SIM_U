import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
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

  const [registrationStatus, setRegistrationStatus] =
    useState("Pending");

  const [resultLoading, setResultLoading] =
    useState(false);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    passport_number: "",
    nationality: "",
    date_of_birth: "",
    passport_expiry_date: "",
    phone_number: "",
  });



  useEffect(() => {

    if (!registrationId || !agentToken) {
        return;
    }

    let timer = null;

    const checkStatus = async () => {

        try {

            setResultLoading(true);

            const response =
                await fetch(
                    `${API_URL}/public/registration-status/${encodeURIComponent(
                        agentToken
                    )}/${registrationId}`
                );

            const data =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "Unable to check registration status"
                );
            }

            const result =
                data.data || {};

            setRegistrationStatus(
                result.status || "Pending"
            );

            if (result.sim) {
                setRegisteredSim(
                    result.sim
                );
            }

            if (
                result.status === "Approved" ||
                result.status === "Rejected"
            ) {
                return;
            }

            timer =
                setTimeout(
                    checkStatus,
                    5000
                );

        } catch (error) {

            console.error(
                "CHECK REGISTRATION STATUS ERROR:",
                error
            );

            timer =
                setTimeout(
                    checkStatus,
                    10000
                );

        } finally {

            setResultLoading(false);
        }
    };

    checkStatus();

    return () => {
        if (timer) {
            clearTimeout(timer);
        }
    };

}, [
    registrationId,
    agentToken
]);

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

      {(step === 4 || step === 5) && (
    <div className="registration-card">

        <h2>
            Registration Result
        </h2>

        <p>
            Registration ID:
            {" "}
            <strong>
                #{registrationId}
            </strong>
        </p>

        <div className="status-result-card">

            <strong>
                Status
            </strong>

            <div>
                {resultLoading
                    ? "Checking..."
                    : registrationStatus}
            </div>

        </div>


        {/* ============================================
            PENDING
        ============================================ */}

        {registrationStatus === "Pending" && (
            <div className="result-info">

                <h3>
                    Waiting for approval
                </h3>

                <p>
                    Your registration has been
                    submitted successfully.
                </p>

                <p>
                    Please keep this page open.
                    The system will check the
                    registration status automatically.
                </p>

            </div>
        )}


        {/* ============================================
            REJECTED
        ============================================ */}

        {registrationStatus === "Rejected" && (
            <div className="result-error">

                <h3>
                    Registration rejected
                </h3>

                <p>
                    Please contact the agent
                    or ETL staff for assistance.
                </p>

            </div>
        )}


        {/* ============================================
            APPROVED
        ============================================ */}

        {registrationStatus === "Approved" && (
            <div className="result-success">

                <h3>
                    Registration approved
                </h3>


                <div className="sim-result">

                    <p>
                        <strong>
                            Phone Number:
                        </strong>

                        {" "}

                        {registeredSim?.phone_number ||
                            "-"}
                    </p>


                    <p>
                        <strong>
                            IMSI:
                        </strong>

                        {" "}

                        {registeredSim?.imsi ||
                            "-"}
                    </p>


                    <p>
                        <strong>
                            ICCID:
                        </strong>

                        {" "}

                        {registeredSim?.iccid ||
                            "-"}
                    </p>


                    <p>
                        <strong>
                            SIM Type:
                        </strong>

                        {" "}

                        {registeredSim?.sim_type ||
                            "-"}
                    </p>


                    <p>
                        <strong>
                            Package:
                        </strong>

                        {" "}

                        {registeredSim?.package_name ||
                            "-"}

                    </p>

                </div>


                {/* ====================================
                    eSIM
                ==================================== */}

                {registeredSim?.sim_type
                    ?.toLowerCase()
                    .includes("esim") && (

                    <div className="qr-result">

                        <h3>
                            eSIM QR Code
                        </h3>

                        {registeredSim?.qr_code ? (

                            registeredSim.qr_code
                                .startsWith("data:image") ||
                            registeredSim.qr_code
                                .startsWith("http") ? (

                                <img
                                    src={
                                        registeredSim.qr_code
                                    }
                                    alt="eSIM QR Code"
                                    style={{
                                        width: 260,
                                        height: 260,
                                        objectFit:
                                            "contain"
                                    }}
                                />

                            ) : (

                                <QRCodeCanvas
                                    value={
                                        registeredSim.qr_code
                                    }
                                    size={260}
                                    level="M"
                                />

                            )

                        ) : (

                            <p>
                                QR code is not available.
                            </p>

                        )}

                    </div>
                )}


                {/* ====================================
                    Physical SIM
                ==================================== */}

                {!registeredSim?.sim_type
                    ?.toLowerCase()
                    .includes("esim") && (

                    <div className="physical-result">

                        <h3>
                            Physical SIM Activated
                        </h3>

                        <p>
                            Your physical SIM has
                            been approved and activated.
                        </p>

                        {registeredSim?.activation_code && (
                            <p>
                                <strong>
                                    Activation Code:
                                </strong>

                                {" "}

                                {registeredSim.activation_code}
                            </p>
                        )}

                    </div>
                )}


                <button
                    type="button"
                    className="primary-registration-button"
                    onClick={handleFinish}
                >
                    Finish
                </button>

            </div>
        )}

    </div>
)}

      

    </div>
  );
}

export default CustomerRegistration;