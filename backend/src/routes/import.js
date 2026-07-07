const express = require("express");
const upload = require("../middleware/upload");
const { parseCSV } = require("../services/csvParser");
const { extractWithAI } = require("../services/aiExtractor");

const router = express.Router();

/**
 * POST /api/import
 * Accepts a CSV file upload, parses it, sends records to AI for CRM field extraction,
 * and returns the structured results.
 */
router.post("/import", (req, res) => {
  // Wrap Multer in a callback so we can catch its errors properly
  upload.single("file")(req, res, async (multerErr) => {
    try {
      // Handle Multer errors
      if (multerErr) {
        console.error("Multer error:", multerErr);
        const message =
          multerErr.code === "LIMIT_FILE_SIZE"
            ? "File is too large. Maximum size is 5MB."
            : multerErr.message || "File upload failed.";
        return res.status(400).json({ success: false, error: message });
      }

      // Validate file exists
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No file uploaded. Please upload a CSV file.",
        });
      }

      console.log(`Received file: ${req.file.originalname} (${req.file.size} bytes)`);

      // Step 1: Parse CSV
      let headers, records;
      try {
        const parsed = parseCSV(req.file.buffer);
        headers = parsed.headers;
        records = parsed.records;
      } catch (parseError) {
        console.error("CSV parse error:", parseError);
        return res.status(400).json({
          success: false,
          error: `Failed to parse CSV: ${parseError.message}`,
        });
      }

      if (records.length === 0) {
        return res.status(400).json({
          success: false,
          error: "CSV file is empty or contains no valid records.",
        });
      }

      console.log(`Parsed ${records.length} records with headers: ${headers.join(", ")}`);

      // Step 2: AI extraction
      const result = await extractWithAI(records);

      console.log(`Extraction complete: ${result.totalImported} imported, ${result.totalSkipped} skipped`);

      // Step 3: Return results
      return res.json({
        success: true,
        data: {
          records: result.records,
          skipped: result.skipped,
          totalImported: result.totalImported,
          totalSkipped: result.totalSkipped,
        },
      });
    } catch (error) {
      console.error("Import error:", error.message || error);
      return res.status(500).json({
        success: false,
        error: error.message || "An error occurred during import.",
      });
    }
  });
});

module.exports = router;
