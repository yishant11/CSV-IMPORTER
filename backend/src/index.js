const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const importRoute = require("./routes/import");

dotenv.config();

// Prevent server from crashing on unhandled errors
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection:", reason);
});
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "GrowEasy CSV Importer API is running" });
});

// Routes
app.use("/api", importRoute);

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    error: err.message || "Internal server error",
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
