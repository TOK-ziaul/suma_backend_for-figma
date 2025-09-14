const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

// Import database connection
const connectDB = require("./config/database");

// Import i18n configuration
const { middleware: i18nMiddleware, t } = require("./config/i18n");

// Import routes
const authRoutes = require("./routes/auth");
const gameRoutes = require("./routes/game");
const userRoutes = require("./routes/user");

// Connect to database
connectDB();

const app = express();

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "http:"],
        scriptSrc: ["'self'"],
        connectSrc: [
          "'self'",
          "http://localhost:3000",
          "http://localhost:8000",
        ],
      },
    },
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "development" ? 1000 : 100, // Higher limit for development
  message: (req) => ({
    success: false,
    message: t("rateLimit.tooManyRequests", { lng: req.language || "en" }),
  }),
});
app.use(limiter);

// CORS configuration
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5174",
  "http://localhost:5173",
  process.env.CLIENT_URL,
].filter(Boolean);

const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// i18n middleware
app.use(i18nMiddleware);

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// Health check endpoint
app.get("/health", (req, res) => {
  const lng = req.language || "en";
  res.status(200).json({
    success: true,
    message: t("server.running", { lng }),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/game", gameRoutes);
app.use("/api/user", userRoutes);

// 404 handler
app.use("*", (req, res) => {
  const lng = req.language || "en";
  res.status(404).json({
    success: false,
    message: t("server.routeNotFound", { lng }),
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Global error handler:", err);
  const lng = req.language || "en";

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: t("server.validationError", { lng }),
      errors,
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: t("server.fieldExists", { field, lng }),
    });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: t("server.invalidToken", { lng }),
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: t("server.tokenExpired", { lng }),
    });
  }

  // Default error
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || t("server.internalServerError", { lng }),
  });
});

const PORT = process.env.PORT || 8000;

const server = app.listen(PORT, () => {
  console.log(
    `🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`
  );
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  console.error("Unhandled Promise Rejection:", err);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});

module.exports = app;
