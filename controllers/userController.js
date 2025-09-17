const User = require("../models/User");
const Purchase = require("../models/Purchase");

// @desc    Get user profile
// @route   GET /api/user/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        email: user.email,
        phone: user.phone,
        profile: user.profile,
        gameStats: user.gameStats,
        subscription: user.subscription,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user profile",
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/user/profile
// @access  Private
const updateUserProfile = async (req, res) => {
  try {
    const { firstName, lastName } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        "profile.firstName": firstName,
        "profile.lastName": lastName,
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: user.profile,
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).json({
      success: false,
      message: "Error updating user profile",
    });
  }
};

// @desc    Change password
// @route   PUT /api/user/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(req.user._id).select("+password");

    // Check current password
    const isMatch = await user.correctPassword(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({
      success: false,
      message: "Error changing password",
    });
  }
};

// @desc    Update phone number
// @route   PUT /api/user/phone
// @access  Private
const updatePhoneNumber = async (req, res) => {
  try {
    const { number, countryCode } = req.body;

    // Check if phone number already exists
    const existingUser = await User.findOne({
      "phone.number": number,
      "phone.countryCode": countryCode,
      _id: { $ne: req.user._id },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Phone number already in use",
      });
    }

    // Update phone number and mark as unverified
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        "phone.number": number,
        "phone.countryCode": countryCode,
        "phone.verified": false,
      },
      { new: true, runValidators: true }
    );

    // Generate new verification code
    const verificationCode = user.generatePhoneVerificationCode();
    await user.save();

    res.status(200).json({
      success: true,
      message: "Phone number updated. Please verify your new number.",
      data: {
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error("Error updating phone number:", error);
    res.status(500).json({
      success: false,
      message: "Error updating phone number",
    });
  }
};

// @desc    Get purchase history
// @route   GET /api/user/purchases
// @access  Private
const getPurchaseHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const purchases = await Purchase.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Purchase.countDocuments({ userId: req.user._id });

    res.status(200).json({
      success: true,
      data: purchases,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching purchase history:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching purchase history",
    });
  }
};

// @desc    Delete user account
// @route   DELETE /api/user/account
// @access  Private
const deleteUserAccount = async (req, res) => {
  try {
    const { password } = req.body;

    // Get user with password
    const user = await User.findById(req.user._id).select("+password");

    // Verify password
    const isMatch = await user.correctPassword(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Password is incorrect",
      });
    }

    // Deactivate account instead of deleting
    user.isActive = false;
    user.email = `deleted_${Date.now()}_${user.email}`;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Account deactivated successfully",
    });
  } catch (error) {
    console.error("Error deleting user account:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting user account",
    });
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  changePassword,
  updatePhoneNumber,
  getPurchaseHistory,
  deleteUserAccount,
};
