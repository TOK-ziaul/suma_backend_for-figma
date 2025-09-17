const express = require("express");
const rateLimit = require("express-rate-limit");
const { protect } = require("../middleware/auth");
const {
  validateRegister,
  validateLogin,
  validatePasswordReset,
  validateNewPassword,
  validatePhoneVerification,
} = require("../middleware/validation");
const {
  getErrorResponse,
  getLanguageFromRequest,
} = require("../utils/translation");
const {
  register,
  login,
  logout,
  getMe,
  verifyPhone,
  resendVerification,
  forgotPassword,
  refreshToken,
  resetPassword,
  updateLanguage,
} = require("../controllers/authController");

const router = express.Router();

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: (req) =>
    getErrorResponse(
      "rateLimit.tooManyAuthAttempts",
      {},
      getLanguageFromRequest(req)
    ),
});

const verificationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // limit each IP to 3 verification attempts per minute
  message: (req) =>
    getErrorResponse(
      "rateLimit.tooManyVerificationAttempts",
      {},
      getLanguageFromRequest(req)
    ),
});

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
router.post("/register", authLimiter, validateRegister, register);

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post("/login", authLimiter, validateLogin, login);

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Private
router.post("/logout", logout);

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
router.get("/me", protect, getMe);

// @desc    Verify phone number
// @route   POST /api/auth/verify-phone
// @access  Private
router.post(
  "/verify-phone",
  protect,
  verificationLimiter,
  validatePhoneVerification,
  verifyPhone
);

// @desc    Resend phone verification
// @route   POST /api/auth/resend-verification
// @access  Private
router.post(
  "/resend-verification",
  protect,
  verificationLimiter,
  resendVerification
);

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
router.post("/forgot-password", validatePasswordReset, forgotPassword);

// @desc    Refresh token
// @route   POST /api/auth/refresh
// @access  Public
router.post("/refresh", refreshToken);

// @desc    Reset password
// @route   PUT /api/auth/reset-password
// @access  Public
router.put("/reset-password", validateNewPassword, resetPassword);

// @desc    Update user language preference
// @route   PUT /api/auth/language
// @access  Private
router.put("/language", protect, updateLanguage);

module.exports = router;
