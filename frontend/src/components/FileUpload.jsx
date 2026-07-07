"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Drag & drop + file picker upload component.
 * Validates file type (CSV) and size (max 5MB).
 *
 * @param {{ onFileSelect: (file: File) => void }} props
 */
export default function FileUpload({ onFileSelect }) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const inputRef = useRef(null);

  const MAX_SIZE = 5 * 1024 * 1024; // 5MB

  const validateAndSelect = useCallback(
    (file) => {
      setError("");

      if (!file) return;

      // Validate extension
      if (!file.name.toLowerCase().endsWith(".csv")) {
        setError("Please upload a CSV file.");
        return;
      }

      // Validate size
      if (file.size > MAX_SIZE) {
        setError("File is too large. Maximum size is 5MB.");
        return;
      }

      setSelectedFile(file);
      onFileSelect(file);
    },
    [onFileSelect]
  );

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);

      const file = e.dataTransfer.files?.[0];
      validateAndSelect(file);
    },
    [validateAndSelect]
  );

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      validateAndSelect(file);
    },
    [validateAndSelect]
  );

  const handleRemove = useCallback(
    (e) => {
      e.stopPropagation();
      setSelectedFile(null);
      setError("");
      onFileSelect(null);
      if (inputRef.current) inputRef.current.value = "";
    },
    [onFileSelect]
  );

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="slide-up">
      {/* Drag & Drop Zone */}
      <div
        id="upload-zone"
        className={`upload-zone ${dragOver ? "upload-zone--dragover" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && handleClick()}
      >
        <div className="upload-zone__icon">⬆</div>
        <p className="upload-zone__title">
          Drop your CSV file here
        </p>
        <p className="upload-zone__subtitle">or click to browse files</p>
        <p className="upload-zone__info">
          Supported file: .csv (max 5MB)
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          style={{ display: "none" }}
          id="csv-file-input"
        />
      </div>

      {/* Error message */}
      {error && (
        <div className="error-container" style={{ padding: "16px 0 0" }}>
          <p className="error-title" style={{ fontSize: "14px" }}>
            ⚠️ {error}
          </p>
        </div>
      )}

      {/* Selected file info */}
      {selectedFile && (
        <div className="file-info fade-in">
          <div className="file-info__icon">📄</div>
          <div className="file-info__details">
            <div className="file-info__name">{selectedFile.name}</div>
            <div className="file-info__size">
              {formatFileSize(selectedFile.size)}
            </div>
          </div>
          <button
            className="file-info__remove"
            onClick={handleRemove}
            title="Remove file"
            id="remove-file-btn"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
