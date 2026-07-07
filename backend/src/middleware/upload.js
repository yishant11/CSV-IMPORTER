const multer = require("multer");
const path = require("path");

// Store file in memory (no disk writes needed)
const storage = multer.memoryStorage();

// Only accept CSV files, max 5MB
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedMimes = ["text/csv", "application/vnd.ms-excel", "text/plain"];

    if (ext !== ".csv") {
      return cb(new Error("Only CSV files are allowed"), false);
    }

    if (!allowedMimes.includes(file.mimetype)) {
      // Some systems report different MIME types for CSV — allow if extension is .csv
      console.warn(`Unexpected MIME type: ${file.mimetype}, but extension is .csv — allowing`);
    }

    cb(null, true);
  },
});

module.exports = upload;
