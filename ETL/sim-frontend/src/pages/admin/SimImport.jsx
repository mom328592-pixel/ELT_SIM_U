import {
  useCallback,
  useEffect,
  useState,
} from "react";

import * as XLSX from "xlsx";

import { apiFetch } from "../../api";

const API_URL =
  "https://eltsimu.onrender.com";

// =====================================================
// HELPERS
// =====================================================

const getRowValue = (
  row,
  key
) => {
  const foundKey =
    Object.keys(row).find(
      (name) =>
        name
          .trim()
          .toLowerCase() ===
        key.toLowerCase()
    );

  return foundKey
    ? row[foundKey]
    : null;
};

const normalizeText = (
  value
) => {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value).trim();
};

const looksLikeScientificNotation =
  (value) => {
    if (
      value === null ||
      value === undefined
    ) {
      return false;
    }

    return /e[+-]?\d+/i.test(
      String(value).trim()
    );
  };

// =====================================================
// COMPONENT
// =====================================================

function SimImport() {
  const [agents, setAgents] =
    useState([]);

  const [selectedAgent, setSelectedAgent] =
    useState("");

  const [file, setFile] =
    useState(null);

  const [previewRows, setPreviewRows] =
    useState([]);

  const [loadingAgents, setLoadingAgents] =
    useState(true);

  const [readingFile, setReadingFile] =
    useState(false);

  const [uploading, setUploading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [result, setResult] =
    useState(null);

  // ===================================================
  // LOAD AGENTS
  // ===================================================

  const loadAgents =
    useCallback(async () => {
      try {
        setLoadingAgents(true);

        const response =
          await apiFetch(
            "/agents"
          );

        setAgents(
          response.data || []
        );
      } catch (err) {
        console.error(
          "LOAD AGENTS ERROR:",
          err
        );

        setError(
          err.message ||
            "Failed to load agents"
        );
      } finally {
        setLoadingAgents(false);
      }
    }, []);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  // ===================================================
  // VALIDATE ROWS
  // ===================================================

  const validateRows =
    (rows) => {
      const iccidSet =
        new Set();

      const imsiSet =
        new Set();

      return rows.map(
        (row, index) => {
          const rowNumber =
            index + 2;

          const rawIccid =
            getRowValue(
              row,
              "iccid"
            );

          const rawImsi =
            getRowValue(
              row,
              "imsi"
            );

          const rawPhone =
            getRowValue(
              row,
              "phone_number"
            ) ??
            getRowValue(
              row,
              "phone"
            );

          const iccid =
            normalizeText(
              rawIccid
            );

          const imsi =
            normalizeText(
              rawImsi
            );

          const phone =
            normalizeText(
              rawPhone
            );

          const errors = [];

          // -------------------------------------------
          // ICCID
          // -------------------------------------------

          if (!iccid) {
            errors.push(
              "Missing ICCID"
            );
          }

          if (
            looksLikeScientificNotation(
              rawIccid
            )
          ) {
            errors.push(
              "ICCID is in scientific notation"
            );
          }

          // A long identifier entered as Excel Number
          // may already have lost precision.
          if (
            typeof rawIccid ===
              "number" &&
            String(
              Math.trunc(
                rawIccid
              )
            ).length >=
              15
          ) {
            errors.push(
              "ICCID must be stored as Excel Text"
            );
          }

          // -------------------------------------------
          // IMSI
          // -------------------------------------------

          if (!imsi) {
            errors.push(
              "Missing IMSI"
            );
          }

          if (
            looksLikeScientificNotation(
              rawImsi
            )
          ) {
            errors.push(
              "IMSI is in scientific notation"
            );
          }

          if (
            typeof rawImsi ===
              "number" &&
            String(
              Math.trunc(
                rawImsi
              )
            ).length >=
              15
          ) {
            errors.push(
              "IMSI must be stored as Excel Text"
            );
          }

          // -------------------------------------------
          // DUPLICATES
          // -------------------------------------------

          if (
            iccid &&
            iccidSet.has(
              iccid
            )
          ) {
            errors.push(
              "Duplicate ICCID in file"
            );
          }

          if (
            imsi &&
            imsiSet.has(
              imsi
            )
          ) {
            errors.push(
              "Duplicate IMSI in file"
            );
          }

          if (iccid) {
            iccidSet.add(
              iccid
            );
          }

          if (imsi) {
            imsiSet.add(
              imsi
            );
          }

          // -------------------------------------------
          // OTHER FIELDS
          // -------------------------------------------

          const idSimType =
            getRowValue(
              row,
              "id_sim_type"
            );

          const idSimStatus =
            getRowValue(
              row,
              "id_sim_status"
            );

          const idPackage =
            getRowValue(
              row,
              "id_package"
            );

          const qrCode =
            normalizeText(
              getRowValue(
                row,
                "qr_code"
              ) ??
                getRowValue(
                  row,
                  "qr"
                )
            );

          const activationCode =
            normalizeText(
              getRowValue(
                row,
                "activation_code"
              )
            );

          return {
            rowNumber,

            iccid,

            imsi,

            phone_number:
              phone,

            id_sim_type:
              idSimType ||
              2,

            id_sim_status:
              idSimStatus ||
              1,

            id_package:
              idPackage ||
              "",

            qr_code:
              qrCode,

            activation_code:
              activationCode,

            errors,

            valid:
              errors.length ===
              0,
          };
        }
      );
    };

  // ===================================================
  // READ FILE
  // ===================================================

  const handleFileChange =
    async (event) => {
      const selectedFile =
        event.target.files?.[0];

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

      const allowedExtensions =
        [
          ".xlsx",
          ".xls",
          ".csv",
        ];

      const allowed =
        allowedExtensions.some(
          (extension) =>
            fileName.endsWith(
              extension
            )
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

        setFile(
          selectedFile
        );

        const buffer =
          await selectedFile.arrayBuffer();

        const workbook =
          XLSX.read(
            buffer,
            {
              type: "array",
              raw: true,
            }
          );

        const sheetName =
          workbook.SheetNames[0];

        if (!sheetName) {
          throw new Error(
            "File does not contain a worksheet"
          );
        }

        const worksheet =
          workbook.Sheets[
            sheetName
          ];

        const rows =
          XLSX.utils.sheet_to_json(
            worksheet,
            {
              defval: null,
              raw: true,
            }
          );

        if (!rows.length) {
          throw new Error(
            "File contains no data"
          );
        }

        const validatedRows =
          validateRows(
            rows
          );

        setPreviewRows(
          validatedRows
        );
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

  // ===================================================
  // UPLOAD
  // ===================================================

  const handleUpload =
    async () => {
      setMessage("");
      setError("");
      setResult(null);

      if (!selectedAgent) {
        setError(
          "Please select an agent"
        );

        return;
      }

      if (!file) {
        setError(
          "Please choose an Excel or CSV file"
        );

        return;
      }

      if (!previewRows.length) {
        setError(
          "No preview data"
        );

        return;
      }

      const invalidRows =
        previewRows.filter(
          (row) =>
            !row.valid
        );

      if (
        invalidRows.length >
        0
      ) {
        setError(
          "Please fix all invalid rows before importing"
        );

        return;
      }

      // Package is required by backend workflow.
      const missingPackageRows =
        previewRows.filter(
          (row) =>
            !row.id_package
        );

      if (
        missingPackageRows.length >
        0
      ) {
        setError(
          "Every SIM row must have id_package"
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

        setResult(
          data.data
        );

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
          fileInput.value =
            "";
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
      (row) =>
        row.valid
    ).length;

  const invalidCount =
    previewRows.filter(
      (row) =>
        !row.valid
    ).length;

  return (
    <div className="page-container">

      {/* ================= HEADER ================= */}

      <div className="page-header">

        <div>
          <h1>
            SIM Import
          </h1>

          <p>
            Preview and import SIM cards from Excel or CSV
          </p>
        </div>

      </div>

      {/* ================= IMPORT FORM ================= */}

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
              value={
                selectedAgent
              }
              onChange={(event) =>
                setSelectedAgent(
                  event.target.value
                )
              }
              disabled={
                uploading
              }
            >

              <option value="">
                {loadingAgents
                  ? "Loading agents..."
                  : "Select agent"}
              </option>

              {agents.map(
                (agent) => (
                  <option
                    key={
                      agent.id_agent
                    }
                    value={
                      agent.id_agent
                    }
                  >
                    {
                      agent.agent_name
                    }
                  </option>
                )
              )}

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
              disabled={
                uploading
              }
            />

          </div>

          <div className="panel-description">

            <strong>
              Important:
            </strong>{" "}
            ICCID and IMSI must be stored as{" "}
            <strong>
              Text
            </strong>{" "}
            in Excel. Do not store them as Number.

          </div>

          {file && (
            <div className="selected-file">

              <strong>
                {
                  file.name
                }
              </strong>

              <span>
                {
                  (
                    file.size /
                    1024
                  ).toFixed(1)
                } KB
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

        {/* ================= VALIDATION ================= */}

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
                {
                  previewRows.length
                }
              </strong>

            </div>

            <div>

              <span>
                Valid
              </span>

              <strong className="result-success">
                {
                  validCount
                }
              </strong>

            </div>

            <div>

              <span>
                Invalid
              </span>

              <strong className="result-danger">
                {
                  invalidCount
                }
              </strong>

            </div>

          </div>

          <button
            className="primary-button import-button"
            onClick={
              handleUpload
            }
            disabled={
              uploading ||
              readingFile ||
              !file ||
              !selectedAgent ||
              previewRows.length ===
                0 ||
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

      {/* ================= PREVIEW ================= */}

      {previewRows.length >
        0 && (
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
                  <th>
                    Row
                  </th>
                  <th>
                    ICCID
                  </th>
                  <th>
                    IMSI
                  </th>
                  <th>
                    Phone
                  </th>
                  <th>
                    Type
                  </th>
                  <th>
                    Status
                  </th>
                  <th>
                    Package
                  </th>
                  <th>
                    Validation
                  </th>
                </tr>

              </thead>

              <tbody>

                {previewRows.map(
                  (
                    row
                  ) => (
                    <tr
                      key={
                        row.rowNumber
                      }
                    >

                      <td>
                        {
                          row.rowNumber
                        }
                      </td>

                      <td>
                        {
                          row.iccid ||
                          "-"
                        }
                      </td>

                      <td>
                        {
                          row.imsi ||
                          "-"
                        }
                      </td>

                      <td>
                        {
                          row.phone_number ||
                          "-"
                        }
                      </td>

                      <td>
                        {
                          row.id_sim_type
                        }
                      </td>

                      <td>
                        {
                          row.id_sim_status
                        }
                      </td>

                      <td>
                        {
                          row.id_package ||
                          "-"
                        }
                      </td>

                      <td>

                        {row.valid ? (
                          <span className="status-badge status-success">
                            Valid
                          </span>
                        ) : (
                          <span className="status-badge status-danger">
                            {
                              row.errors.join(
                                ", "
                              )
                            }
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

      {/* ================= RESULT ================= */}

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
                {
                  result.file_name
                }
              </strong>
            </div>

            <div>
              <span>
                Total
              </span>

              <strong>
                {
                  result.total_rows
                }
              </strong>
            </div>

            <div>
              <span>
                Imported
              </span>

              <strong className="result-success">
                {
                  result.imported_count
                }
              </strong>
            </div>

            <div>
              <span>
                Failed
              </span>

              <strong className="result-danger">
                {
                  result.failed_count
                }
              </strong>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}

export default SimImport;