"use client";

import { useState } from "react";

/**
 * CRM field labels in display order.
 */
const CRM_FIELDS = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "country_code", label: "Country Code" },
  { key: "mobile_without_country_code", label: "Mobile" },
  { key: "company", label: "Company" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "country", label: "Country" },
  { key: "lead_owner", label: "Lead Owner" },
  { key: "crm_status", label: "Status" },
  { key: "crm_note", label: "Notes" },
  { key: "data_source", label: "Source" },
  { key: "created_at", label: "Created At" },
  { key: "possession_time", label: "Possession Time" },
  { key: "description", label: "Description" },
];

/**
 * Status badge color map.
 */
const STATUS_CLASS = {
  GOOD_LEAD_FOLLOW_UP: "status-badge--good",
  DID_NOT_CONNECT: "status-badge--noconnect",
  BAD_LEAD: "status-badge--bad",
  SALE_DONE: "status-badge--sale",
};

const STATUS_LABEL = {
  GOOD_LEAD_FOLLOW_UP: "Good Lead",
  DID_NOT_CONNECT: "Not Connected",
  BAD_LEAD: "Bad Lead",
  SALE_DONE: "Sale Done",
};

/**
 * Displays AI-extracted CRM records and skipped records in tabbed tables.
 *
 * @param {{ records: object[], skipped: object[] }} props
 */
export default function ResultsTable({ records, skipped }) {
  const [activeTab, setActiveTab] = useState("imported");

  return (
    <div className="slide-up">
      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === "imported" ? "tab--active" : ""}`}
          onClick={() => setActiveTab("imported")}
          id="tab-imported"
        >
          ✅ Imported ({records.length})
        </button>
        <button
          className={`tab ${activeTab === "skipped" ? "tab--active" : ""}`}
          onClick={() => setActiveTab("skipped")}
          id="tab-skipped"
        >
          ⚠️ Skipped ({skipped.length})
        </button>
      </div>

      {/* Imported records table */}
      {activeTab === "imported" && (
        <div className="card" style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTop: "none" }}>
          {records.length === 0 ? (
            <div className="empty-state">No records were imported.</div>
          ) : (
            <div className="table-container" id="results-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    {CRM_FIELDS.map((f) => (
                      <th key={f.key}>{f.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {records.map((record, i) => (
                    <tr key={i}>
                      <td style={{ color: "var(--color-text-tertiary)", fontSize: "12px" }}>
                        {i + 1}
                      </td>
                      {CRM_FIELDS.map((f) => (
                        <td key={f.key} title={record[f.key] || ""}>
                          {f.key === "crm_status" && record[f.key] ? (
                            <span
                              className={`status-badge ${
                                STATUS_CLASS[record[f.key]] || ""
                              }`}
                            >
                              {STATUS_LABEL[record[f.key]] || record[f.key]}
                            </span>
                          ) : (
                            record[f.key] || "—"
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Skipped records table */}
      {activeTab === "skipped" && (
        <div className="card" style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTop: "none" }}>
          {skipped.length === 0 ? (
            <div className="empty-state">No records were skipped. 🎉</div>
          ) : (
            <div className="table-container" id="skipped-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Reason</th>
                    <th>Original Data</th>
                  </tr>
                </thead>
                <tbody>
                  {skipped.map((item, i) => (
                    <tr key={i}>
                      <td style={{ color: "var(--color-text-tertiary)", fontSize: "12px" }}>
                        {i + 1}
                      </td>
                      <td>
                        <span className="status-badge status-badge--bad">
                          {item.reason || "Unknown"}
                        </span>
                      </td>
                      <td
                        style={{ maxWidth: "400px" }}
                        title={JSON.stringify(item.original)}
                      >
                        {JSON.stringify(item.original).substring(0, 120)}
                        {JSON.stringify(item.original).length > 120 ? "…" : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
