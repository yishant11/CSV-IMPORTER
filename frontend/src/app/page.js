"use client";

import { useState, useCallback, useEffect } from "react";
import Stepper from "@/components/Stepper";
import FileUpload from "@/components/FileUpload";
import CsvPreview from "@/components/CsvPreview";
import StatsCards from "@/components/StatsCards";
import ResultsTable from "@/components/ResultsTable";
import { uploadAndProcess } from "@/lib/api";

/**
 * Steps:
 * 1 = Upload CSV
 * 2 = Preview data + Confirm
 * 3 = Processing (loading)
 * 4 = Results
 */
export default function Home() {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState("light");

  // Apply theme to HTML element
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  }, []);

  // Step 1: File selected
  const handleFileSelect = useCallback((selectedFile) => {
    if (selectedFile) {
      setFile(selectedFile);
      setError("");
      setStep(2);
    } else {
      setFile(null);
      setStep(1);
    }
  }, []);

  // Step 2 → 3: Confirm and process
  const handleConfirm = useCallback(async () => {
    if (!file) return;

    setStep(3);
    setError("");

    try {
      const result = await uploadAndProcess(file);

      if (result.success) {
        setResults(result.data);
        setStep(4);
      } else {
        throw new Error(result.error || "Import failed");
      }
    } catch (err) {
      console.error("Import error:", err);
      setError(err.message || "Something went wrong during import.");
      setStep(2); // Go back to preview on error
    }
  }, [file]);

  // Reset to start
  const handleReset = useCallback(() => {
    setStep(1);
    setFile(null);
    setResults(null);
    setError("");
  }, []);

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="app-header__brand">
          <div className="app-header__logo">G</div>
          <div>
            <h1 className="app-header__title">CSV Importer</h1>
            <p className="app-header__subtitle">
              AI-powered CRM lead import tool
            </p>
          </div>
        </div>
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          id="theme-toggle-btn"
        >
          {theme === "light" ? "🌙" : "☀️"}
        </button>
      </header>

      {/* Stepper */}
      <Stepper currentStep={step} />

      {/* Step 1: Upload */}
      {step === 1 && <FileUpload onFileSelect={handleFileSelect} />}

      {/* Step 2: Preview + Confirm */}
      {step === 2 && (
        <div className="slide-up">
          <CsvPreview file={file} />

          {/* Error message */}
          {error && (
            <div className="error-container fade-in">
              <div className="error-icon">❌</div>
              <p className="error-title">Import Failed</p>
              <p className="error-message">{error}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="btn-group">
            <button
              className="btn btn--outline"
              onClick={handleReset}
              id="back-btn"
            >
              ← Back
            </button>
            <button
              className="btn btn--primary"
              onClick={handleConfirm}
              id="confirm-btn"
            >
              🚀 Confirm Import
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Processing */}
      {step === 3 && (
        <div className="loading-container slide-up">
          <div className="loading-spinner" />
          <p className="loading-title">AI is processing your data...</p>
          <p className="loading-subtitle">
            Mapping fields to GrowEasy CRM format. This may take a moment.
          </p>
          <div className="progress-bar-container">
            <div
              className="progress-bar"
              style={{ width: "60%" }}
            />
          </div>
        </div>
      )}

      {/* Step 4: Results */}
      {step === 4 && results && (
        <div className="slide-up">
          <StatsCards
            totalImported={results.totalImported}
            totalSkipped={results.totalSkipped}
          />
          <ResultsTable
            records={results.records}
            skipped={results.skipped}
          />
          <div className="btn-group" style={{ marginTop: "32px" }}>
            <button
              className="btn btn--primary"
              onClick={handleReset}
              id="import-another-btn"
            >
              📁 Import Another CSV
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
