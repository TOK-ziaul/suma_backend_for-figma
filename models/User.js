const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    phone: {
      number: {
        type: String,
        required: [true, "Phone number is required"],
        match: [/^\d{10,15}$/, "Please enter a valid phone number"],
      },
      countryCode: {
        type: String,
        required: [true, "Country code is required"],
        match: [/^\+\d{1,4}$/, "Please enter a valid country code"],
      },
      verified: {
        type: Boolean,
        default: false,
      },
      verificationCode: String,
      verificationExpires: Date,
    },
    profile: {
      firstName: String,
      lastName: String,
      avatar: String,
    },
    gameStats: {
      gamesPlayed: { type: Number, default: 0 },
      gamesWon: { type: Number, default: 0 },
      totalPoints: { type: Number, default: 0 },
      bestScore: { type: Number, default: 0 },
      averageScore: { type: Number, default: 0 },
    },
    subscription: {
      type: { type: String, enum: ["free", "premium"], default: "free" },
      freeTrialUsed: { type: Boolean, default: false },
      purchaseDate: Date,
      expiresAt: Date,
    },
    preferences: {
      language: {
        type: String,
        enum: ["en", "ar"],
        default: "en",
      },
      theme: {
        type: String,
        enum: ["light", "dark"],
        default: "light",
      },
    },
    passwordResetToken: String,
    passwordResetExpires: Date,
    loginAttempts: { type: Number, default: 0 },
    lockUntil: Date,
    lastLogin: Date,
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for full phone number
userSchema.virtual("phone.full").get(function () {
  return `${this.phone.countryCode}${this.phone.number}`;
});

// Virtual for account locked
userSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware to hash password
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Method to check password
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Method to handle login attempts
userSchema.methods.incLoginAttempts = function () {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 },
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };

  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }

  return this.updateOne(updates);
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 },
  });
};

// Method to generate phone verification code
userSchema.methods.generatePhoneVerificationCode = function () {
  const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
  this.phone.verificationCode = code;
  this.phone.verificationExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  return code;
};

// Method to generate password reset token
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = require("crypto").randomBytes(32).toString("hex");

  this.passwordResetToken = require("crypto")
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

  return resetToken;
};

// Method to update game stats
userSchema.methods.updateGameStats = function (gameResult) {
  this.gameStats.gamesPlayed += 1;
  this.gameStats.totalPoints += gameResult.totalScore;

  if (gameResult.won) {
    this.gameStats.gamesWon += 1;
  }

  if (gameResult.totalScore > this.gameStats.bestScore) {
    this.gameStats.bestScore = gameResult.totalScore;
  }

  this.gameStats.averageScore = Math.round(
    this.gameStats.totalPoints / this.gameStats.gamesPlayed
  );

  return this.save();
};

module.exports = mongoose.model("User", userSchema);
