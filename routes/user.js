const express = require("express");
const { protect } = require("../middleware/auth");
const {
  getUserProfile,
  updateUserProfile,
  changePassword,
  updatePhoneNumber,
  getPurchaseHistory,
  deleteUserAccount,
} = require("../controllers/userController");

const router = express.Router();

// @desc    Get user profile
// @route   GET /api/user/profile
// @access  Private
router.get("/profile", protect, getUserProfile);

// @desc    Update user profile
// @route   PUT /api/user/profile
// @access  Private
router.put("/profile", protect, updateUserProfile);

// @desc    Change password
// @route   PUT /api/user/change-password
// @access  Private
router.put("/change-password", protect, changePassword);

// @desc    Update phone number
// @route   PUT /api/user/phone
// @access  Private
router.put("/phone", protect, updatePhoneNumber);

// @desc    Get purchase history
// @route   GET /api/user/purchases
// @access  Private
router.get("/purchases", protect, getPurchaseHistory);

// @desc    Delete user account
// @route   DELETE /api/user/account
// @access  Private
router.delete("/account", protect, deleteUserAccount);

module.exports = router;
