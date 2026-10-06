import { useCallback, useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { apiFetch } from "../../api";

const API_URL = "https://eltsimu.onrender.com";

function SimImport() {
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState("");

  const [file, setFile] = useState(null);
  const [previewRows, setPreviewRows] = useState([]);

  const [loadingAgents, setLoadingAgents] = useState(true);
  const [readingFile, setReadingFile] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  // =========================
  // LOAD AGENTS
  // =========================
  const loadAgents = useCallback(async () => {
    try {
      setLoadingAgents(true);

      const response = await apiFetch("/agents");

      setAgents(response.data || []);
    } catch (err) {
      console.error("LOAD AGENTS ERROR:", err);
      setError(err.message);
    } finally {
      setLoadingAgents(false);
    }
  }, []);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  // =========================
  // CHECK ROW
  // =========================
  const validateRows = (rows) => {
    const iccidSet = new Set();
    const imsiSet = new Set();

    return rows.map((row, index) => {
      const rowNumber = index + 2;

      const iccid =
        row.iccid !== null &&
        row.iccid !== undefined
          ? String(row.iccid).trim()
          : "";

      const imsi =
        row.imsi !== null &&
        row.imsi !== undefined
          ? String(row.imsi).trim()
          : "";

      const phone =
        row.phone_number !== null &&
        row.phone_number !== undefined
          ? String(row.phone_number).trim()
          : "";

      const errors = [];

      if (!iccid) {
        errors.push("Missing ICCID");
      }

      if (!imsi) {
        errors.push("Missing IMSI");
      }

      if (iccidSet.has(iccid) && iccid) {
        errors.push("Duplicate ICCID in file");
      }

      if (imsiSet.has(imsi) && imsi) {
        errors.push("Duplicate IMSI in file");
      }

      if (iccid) {
        iccidSet.add(iccid);
      }

      if (imsi) {
        imsiSet.add(imsi);
      }

      return {
        rowNumber,
        iccid,
        imsi,
        phone_number: phone,
        id_sim_type:
          row.id_sim_type || 2,
        id_sim_status:
          row.id_sim_status || 1,
        id_package: row.id_package || "",
        qr_code: row.qr_code || "",
        link_url: row.link_url || "",
        errors,
        valid: errors.length === 0,
      };
    });
  };

  // =========================
  // READ EXCEL
  // =========================
  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0];

    setError("");
    setMessage("");
    setResult(null);
    setPreviewRows([]);

    if (!selectedFile) {
      setFile(null);
      return;
    }

    const fileName =
      selectedFile.name.toLowerCase();

    const allowedExtensions = [
      ".xlsx",
      ".xls",
      ".csv",
    ];

    const allowed =
      allowedExtensions.some((ext) =>
        fileName.endsWith(ext)
      );

    if (!allowed) {
      setFile(null);
      setError(
        "Only .xlsx, .xls and .csv files are allowed"
      );
      return;
    }

    if (
      selectedFile.size >
      5 * 1024 * 1024
    ) {
      setFile(null);
      setError(
        "File size must not exceed 5 MB"
      );
      return;
    }

    try {
      setReadingFile(true);

      setFile(selectedFile);

      const buffer =
        await selectedFile.arrayBuffer();

      const workbook = XLSX.read(buffer, {
        type: "array",
      });

      const sheetName =
        workbook.SheetNames[0];

      if (!sheetName) {
        throw new Error(
          "File does not contain a worksheet"
        );
      }

      const worksheet =
        workbook.Sheets[sheetName];

      const rows =
        XLSX.utils.sheet_to_json(
          worksheet,
          {
            defval: null,
          }
        );

      if (!rows.length) {
        throw new Error(
          "File contains no data"
        );
      }

      const validatedRows =
        validateRows(rows);

      setPreviewRows(validatedRows);

    } catch (err) {
      console.error(
        "READ EXCEL ERROR:",
        err
      );

      setFile(null);
      setPreviewRows([]);

      setError(
        err.message ||
          "Unable to read Excel file"
      );
    } finally {
      setReadingFile(false);
    }
  };

  // =========================
  // IMPORT
  // =========================
  const handleUpload = async () => {
    setMessage("");
    setError("");
    setResult(null);

    if (!selectedAgent) {
      setError("Please select an agent");
      return;
    }

    if (!file) {
      setError(
        "Please choose an Excel or CSV file"
      );
      return;
    }

    if (!previewRows.length) {
      setError("No preview data");
      return;
    }

    const invalidRows =
      previewRows.filter(
        (row) => !row.valid
      );

    if (invalidRows.length > 0) {
      setError(
        "Please fix all invalid rows before importing"
      );
      return;
    }

    try {
      setUploading(true);

      const token =
        localStorage.getItem(
          "access_token"
        );

      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );

      formData.append(
        "id_agent",
        selectedAgent
      );

      const response =
        await fetch(
          `${API_URL}/sim-files/upload`,
          {
            method: "POST",
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
            body: formData,
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Upload failed"
        );
      }

      setResult(data.data);

      setMessage(
        "File uploaded and SIMs imported successfully"
      );

      setFile(null);
      setPreviewRows([]);

      const fileInput =
        document.getElementById(
          "sim-import-file"
        );

      if (fileInput) {
        fileInput.value = "";
      }

    } catch (err) {
      console.error(
        "UPLOAD ERROR:",
        err
      );

      setError(
        err.message ||
          "Upload failed"
      );
    } finally {
      setUploading(false);
    }
  };

  const validCount =
    previewRows.filter(
      (row) => row.valid
    ).length;

  const invalidCount =
    previewRows.filter(
      (row) => !row.valid
    ).length;

  return (
    <div className="page-container">

      {/* HEADER */}
      <div className="page-header">
        <div>
          <h1>SIM Import</h1>
          <p>
            Preview and import SIM cards
            from Excel or CSV
          </p>
        </div>
      </div>


      {/* IMPORT FORM */}
      <div className="import-grid">

        <div className="panel import-card">

          <div className="panel-header">
            <div>
              <h2>
                Select File
              </h2>

              <p className="panel-description">
                Supported: XLSX, XLS, CSV
              </p>
            </div>
          </div>

          <div className="form-group">
            <label>
              Agent *
            </label>

            <select
              value={selectedAgent}
              onChange={(e) =>
                setSelectedAgent(
                  e.target.value
                )
              }
            >
              <option value="">
                {loadingAgents
                  ? "Loading agents..."
                  : "Select agent"}
              </option>

              {agents.map((agent) => (
                <option
                  key={agent.id_agent}
                  value={agent.id_agent}
                >
                  {agent.agent_name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>
              Excel / CSV *
            </label>

            <input
              id="sim-import-file"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={
                handleFileChange
              }
            />
          </div>

          {file && (
            <div className="selected-file">
              <strong>
                {file.name}
              </strong>

              <span>
                {(
                  file.size / 1024
                ).toFixed(1)} KB
              </span>
            </div>
          )}

          {error && (
            <div className="dashboard-error">
              {error}
            </div>
          )}

          {message && (
            <div className="success-message">
              {message}
            </div>
          )}

        </div>


        {/* VALIDATION */}
        <div className="panel import-card">

          <div className="panel-header">
            <div>
              <h2>
                Validation
              </h2>

              <p className="panel-description">
                File validation status
              </p>
            </div>
          </div>

          <div className="result-grid">

            <div>
              <span>
                Total Rows
              </span>

              <strong>
                {previewRows.length}
              </strong>
            </div>

            <div>
              <span>
                Valid
              </span>

              <strong className="result-success">
                {validCount}
              </strong>
            </div>

            <div>
              <span>
                Invalid
              </span>

              <strong className="result-danger">
                {invalidCount}
              </strong>
            </div>

          </div>

          <button
            className="primary-button import-button"
            onClick={handleUpload}
            disabled={
              uploading ||
              readingFile ||
              !file ||
              !selectedAgent ||
              previewRows.length === 0 ||
              invalidCount > 0
            }
          >
            {readingFile
              ? "Reading File..."
              : uploading
              ? "Importing..."
              : "Confirm & Import"}
          </button>

        </div>

      </div>


      {/* PREVIEW */}
      {previewRows.length > 0 && (
        <div className="panel">

          <div className="panel-header">
            <div>
              <h2>
                Excel Preview
              </h2>

              <p className="panel-description">
                Review the data before import
              </p>
            </div>
          </div>

          <div className="table-wrapper">

            <table className="agent-table">

              <thead>
                <tr>
                  <th>Row</th>
                  <th>ICCID</th>
                  <th>IMSI</th>
                  <th>Phone</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>id_Package</th>
                  <th>Validation</th>
                </tr>
              </thead>

              <tbody>

                {previewRows.map(
                  (row, index) => (
                    <tr key={index}>

                      <td>
                        {row.rowNumber}
                      </td>

                      <td>
                        {row.iccid ||
                          "-"}
                      </td>

                      <td>
                        {row.imsi ||
                          "-"}
                      </td>

                      <td>
                        {row.phone_number ||
                          "-"}
                      </td>

                      <td>
                        {row.id_sim_type}
                      </td>

                      <td>
                        {row.id_sim_status}
                      </td>

                      <td>
                        {row.id_package ||
                          "-"}
                      </td>

                      <td>

                        {row.valid ? (
                          <span className="status-badge status-success">
                            Valid
                          </span>
                        ) : (
                          <span className="status-badge status-danger">
                            {row.errors.join(
                              ", "
                            )}
                          </span>
                        )}

                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>
        </div>
      )}


      {/* IMPORT RESULT */}
      {result && (
        <div className="panel import-result">

          <div className="panel-header">
            <h2>
              Import Result
            </h2>
          </div>

          <div className="result-grid">

            <div>
              <span>
                File
              </span>

              <strong>
                {result.file_name}
              </strong>
            </div>

            <div>
              <span>
                Total
              </span>

              <strong>
                {result.total_rows}
              </strong>
            </div>

            <div>
              <span>
                Imported
              </span>

              <strong className="result-success">
                {result.imported_count}
              </strong>
            </div>

            <div>
              <span>
                Failed
              </span>

              <strong className="result-danger">
                {result.failed_count}
              </strong>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}

export default SimImport;