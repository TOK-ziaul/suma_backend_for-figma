const express = require("express");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const User = require("../models/User");
const { protect } = require("../middleware/auth");
const {
  validateRegister,
  validateLogin,
  validatePasswordReset,
  validateNewPassword,
  validatePhoneVerification,
} = require("../middleware/validation");
const emailService = require("../services/emailService");
const smsService = require("../services/smsService");
const {
  getErrorResponse,
  getSuccessResponse,
  getDataResponse,
  getLanguageFromRequest,
} = require("../utils/translation");

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

// Generate JWT Token
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// Send token response
const sendTokenResponse = (user, statusCode, res, lng = "en") => {
  const token = signToken(user._id);

  const options = {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  };

  res
    .status(statusCode)
    .cookie("token", token, options)
    .json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        phone: {
          number: user.phone.number,
          countryCode: user.phone.countryCode,
          verified: user.phone.verified,
        },
        subscription: user.subscription,
        gameStats: user.gameStats,
        preferences: user.preferences,
      },
    });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
router.post("/register", authLimiter, validateRegister, async (req, res) => {
  try {
    const { email, password, phone, language = "en" } = req.body;
    const lng = getLanguageFromRequest(req);

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json(getErrorResponse("auth.userExists", {}, lng));
    }

    // Check if phone number exists
    const existingPhone = await User.findOne({
      "phone.number": phone.number,
      "phone.countryCode": phone.countryCode,
    });
    if (existingPhone) {
      return res
        .status(400)
        .json(getErrorResponse("auth.phoneExists", {}, lng));
    }

    // Create user
    const user = await User.create({
      email,
      password,
      phone: {
        number: phone.number,
        countryCode: phone.countryCode,
        verified: false,
      },
      preferences: {
        language: language,
        theme: "light",
      },
    });

    // Generate phone verification code
    const verificationCode = user.generatePhoneVerificationCode();
    await user.save();

    // Send verification code via SMS
    const fullPhoneNumber = `${phone.countryCode}${phone.number}`;
    await smsService.sendVerificationSMS(fullPhoneNumber, verificationCode);

    // Send welcome email
    await emailService.sendWelcomeEmail(email, email.split("@")[0]);

    sendTokenResponse(user, 201, res, lng);
  } catch (error) {
    console.error("Registration error:", error);
    const lng = getLanguageFromRequest(req);
    res
      .status(500)
      .json(
        getErrorResponse("auth.serverError", { action: "registration" }, lng)
      );
  }
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post("/login", authLimiter, validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;
    const lng = getLanguageFromRequest(req);

    // Check for user and include password
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res
        .status(401)
        .json(getErrorResponse("auth.invalidCredentials", {}, lng));
    }

    // Check if account is locked
    if (user.isLocked) {
      return res
        .status(423)
        .json(getErrorResponse("auth.accountLocked", {}, lng));
    }

    // Check password
    const isMatch = await user.correctPassword(password, user.password);

    if (!isMatch) {
      await user.incLoginAttempts();
      return res
        .status(401)
        .json(getErrorResponse("auth.invalidCredentials", {}, lng));
    }

    // Reset login attempts on successful login
    if (user.loginAttempts > 0) {
      await user.resetLoginAttempts();
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    sendTokenResponse(user, 200, res, lng);
  } catch (error) {
    console.error("Login error:", error);
    const lng = getLanguageFromRequest(req);
    res
      .status(500)
      .json(getErrorResponse("auth.serverError", { action: "login" }, lng));
  }
});

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Private
router.post("/logout", (req, res) => {
  const lng = getLanguageFromRequest(req);

  res.cookie("token", "none", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json(getSuccessResponse("auth.userLoggedOut", {}, lng));
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
router.get("/me", protect, async (req, res) => {
  const lng = getLanguageFromRequest(req);
  res.status(200).json({
    success: true,
    user: req.user,
  });
});

// @desc    Verify phone number
// @route   POST /api/auth/verify-phone
// @access  Private
router.post(
  "/verify-phone",
  protect,
  verificationLimiter,
  validatePhoneVerification,
  async (req, res) => {
    try {
      const { code } = req.body;
      const user = req.user;

      const lng = getLanguageFromRequest(req);

      // Check if code matches and hasn't expired
      if (
        user.phone.verificationCode !== code ||
        !user.phone.verificationExpires ||
        user.phone.verificationExpires < Date.now()
      ) {
        return res
          .status(400)
          .json(getErrorResponse("auth.invalidVerificationCode", {}, lng));
      }

      // Mark phone as verified
      user.phone.verified = true;
      user.phone.verificationCode = undefined;
      user.phone.verificationExpires = undefined;
      await user.save();

      res.status(200).json(getSuccessResponse("auth.phoneVerified", {}, lng));
    } catch (error) {
      console.error("Phone verification error:", error);
      res
        .status(500)
        .json(
          getErrorResponse(
            "auth.serverError",
            { action: "phone verification" },
            lng
          )
        );
    }
  }
);

// @desc    Resend phone verification
// @route   POST /api/auth/resend-verification
// @access  Private
router.post(
  "/resend-verification",
  protect,
  verificationLimiter,
  async (req, res) => {
    try {
      const { method = "sms" } = req.body; // 'sms' or 'whatsapp'
      const user = req.user;

      const lng = getLanguageFromRequest(req);

      if (user.phone.verified) {
        return res
          .status(400)
          .json(getErrorResponse("auth.phoneAlreadyVerified", {}, lng));
      }

      // Generate new verification code
      const verificationCode = user.generatePhoneVerificationCode();
      await user.save();

      const fullPhoneNumber = `${user.phone.countryCode}${user.phone.number}`;

      // Send verification code
      let result;
      if (method === "whatsapp") {
        result = await smsService.sendWhatsAppVerification(
          fullPhoneNumber,
          verificationCode
        );
      } else {
        result = await smsService.sendVerificationSMS(
          fullPhoneNumber,
          verificationCode
        );
      }

      if (!result.success) {
        return res
          .status(500)
          .json(getErrorResponse("auth.failedToSendCode", {}, lng));
      }

      res
        .status(200)
        .json(
          getSuccessResponse(
            "auth.verificationCodeSent",
            { method: method.toUpperCase() },
            lng
          )
        );
    } catch (error) {
      console.error("Resend verification error:", error);
      const lng = getLanguageFromRequest(req);
      res
        .status(500)
        .json(
          getErrorResponse(
            "auth.serverError",
            { action: "resending verification" },
            lng
          )
        );
    }
  }
);

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
router.post("/forgot-password", validatePasswordReset, async (req, res) => {
  try {
    const { email } = req.body;

    const lng = getLanguageFromRequest(req);

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json(getErrorResponse("auth.noUserFound", {}, lng));
    }

    // Generate reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // Send reset email
    const result = await emailService.sendPasswordResetEmail(
      user.email,
      resetToken,
      user.email.split("@")[0]
    );

    if (!result.success) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });

      return res
        .status(500)
        .json(getErrorResponse("auth.emailNotSent", {}, lng));
    }

    res.status(200).json(getSuccessResponse("auth.passwordResetSent", {}, lng));
  } catch (error) {
    console.error("Forgot password error:", error);
    res
      .status(500)
      .json(
        getErrorResponse(
          "auth.serverError",
          { action: "password reset request" },
          lng
        )
      );
  }
});

// @desc    Refresh token
// @route   POST /api/auth/refresh
// @access  Public
router.post("/refresh", async (req, res) => {
  try {
    const { token } = req?.cookies || {};

    const lng = getLanguageFromRequest(req);

    if (!token) {
      return res
        .status(401)
        .json(getErrorResponse("auth.noRefreshToken", {}, lng));
    }

    // Verify refresh token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res
        .status(401)
        .json(getErrorResponse("auth.invalidRefreshToken", {}, lng));
    }

    // Generate new access token
    const newAccessToken = signToken(user._id);

    res.status(200).json({
      success: true,
      accessToken: newAccessToken,
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(401).json(getErrorResponse("auth.invalidRefreshToken", {}, lng));
  }
});

// @desc    Reset password
// @route   PUT /api/auth/reset-password
// @access  Public
router.put("/reset-password", validateNewPassword, async (req, res) => {
  try {
    const { token, password } = req.body;

    // Get hashed token
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      passwordResetToken: resetPasswordToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    const lng = getLanguageFromRequest(req);

    if (!user) {
      return res
        .status(400)
        .json(getErrorResponse("auth.invalidResetToken", {}, lng));
    }

    // Set new password
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error("Reset password error:", error);
    res
      .status(500)
      .json(
        getErrorResponse("auth.serverError", { action: "password reset" }, lng)
      );
  }
});

// @desc    Update user language preference
// @route   PUT /api/auth/language
// @access  Private
router.put("/language", protect, async (req, res) => {
  try {
    const { language } = req.body;
    const lng = getLanguageFromRequest(req);

    if (!language || !["en", "ar"].includes(language)) {
      return res
        .status(400)
        .json(getErrorResponse("validation.languageInvalid", {}, lng));
    }

    req.user.preferences.language = language;
    await req.user.save();

    res
      .status(200)
      .json(getSuccessResponse("auth.languageUpdated", { language }, lng));
  } catch (error) {
    console.error("Language update error:", error);
    const lng = getLanguageFromRequest(req);
    res
      .status(500)
      .json(
        getErrorResponse("auth.serverError", { action: "language update" }, lng)
      );
  }
});

module.exports = router;
