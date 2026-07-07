"use client";

import { useEffect, useState } from "react";
import Papa from "papaparse";

/**
 * Previews parsed CSV data in a responsive table with sticky headers.
 * Parses the file client-side using PapaParse — no server round-trip.
 *
 * @param {{ file: File }} props
 */
export default function CsvPreview({ file }) {
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!file) return;

    setLoading(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data;
        const cols = data.length > 0 ? Object.keys(data[0]) : [];

        setHeaders(cols);
        setTotalRows(data.length);
        // Show first 100 rows for preview
        setRows(data.slice(0, 100));
        setLoading(false);
      },
      error: (err) => {
        console.error("CSV parse error:", err);
        setLoading(false);
      },
    });
  }, [file]);

  if (loading) {
    return (
      <div className="card slide-up">
        <div className="loading-container" style={{ padding: "40px" }}>
          <div className="loading-spinner" />
          <p className="loading-subtitle">Parsing CSV file...</p>
        </div>
      </div>
    );
  }

  if (headers.length === 0) {
    return (
      <div className="card slide-up">
        <div className="empty-state">
          <p>No data found in the CSV file.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card slide-up">
      <div className="card__header">
        <h3 className="card__title">📋 Data Preview</h3>
        <span className="card__badge">
          {totalRows} row{totalRows !== 1 ? "s" : ""}
          {totalRows > 100 ? " (showing first 100)" : ""}
        </span>
      </div>
      <div className="table-container" id="preview-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              {headers.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <td style={{ color: "var(--color-text-tertiary)", fontSize: "12px" }}>
                  {i + 1}
                </td>
                {headers.map((h) => (
                  <td key={h} title={row[h] || ""}>
                    {row[h] || "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
