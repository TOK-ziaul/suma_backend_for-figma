const express = require("express");
const rateLimit = require("express-rate-limit");
const { protect } = require("../middleware/auth");
const { validateGameSubmission } = require("../middleware/validation");
const {
  createGame,
  getGame,
  updateGame,
  addSubmission,
  addTurnSubmission,
  finalizeTurn,
  finalizeRound,
  advanceGame,
  getRound1Products,
  getRound2Products,
  getFinalRoundProducts,
  generateMultipleChoiceOptions,
  generateGoingOnceOptions,
  calculatePoints,
  completeGame,
  saveGameResult,
  getGameHistory,
  getGameStats,
  resetFinalRound,
} = require("../controllers/gameController");

const router = express.Router();

// More lenient rate limiter for game submissions
const gameSubmissionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === "development" ? 50 : 20,
  message: {
    success: false,
    message: "Too many game submissions, please slow down",
  },
});

// Create a new game
router.post("/", protect, createGame);

// Get a game
router.get("/:gameId", protect, getGame);

// Update game state
router.put("/:gameId", protect, updateGame);

// Add / update a submission for a round (legacy)
router.post(
  "/:gameId/round/:roundNumber/submission",
  protect,
  gameSubmissionLimiter,
  addSubmission
);

// Add / update a submission for a turn
router.post(
  "/:gameId/round/:roundNumber/turn/:turnNumber/submission",
  protect,
  gameSubmissionLimiter,
  addTurnSubmission
);

// Finalize a turn
router.post(
  "/:gameId/round/:roundNumber/turn/:turnNumber/result",
  protect,
  finalizeTurn
);

// Finalize a round (supports all round types) - legacy
router.post("/:gameId/round/:roundNumber/result", protect, finalizeRound);

/**
 * Optional: advance game or mark complete
 * PATCH /api/game/:gameId/advance
 * body: { nextRoundIndex?, completeGame?: boolean }
 */
router.patch("/:gameId/advance", protect, advanceGame);

// @desc    Get products for Round 1
// @route   GET /api/game/products/round1
// @access  Private
router.get("/products/round1", protect, getRound1Products);

// @desc    Get products for Round 2
// @route   GET /api/game/products/round2
// @access  Private
router.get("/products/round2", protect, getRound2Products);

// @desc    Get products for Final Round
// @route   GET /api/game/products/final
// @access  Private
router.get("/products/final", protect, getFinalRoundProducts);

// @desc    Generate multiple choice options
// @route   POST /api/game/multiple-choice-options
// @access  Private
router.post("/multiple-choice-options", protect, generateMultipleChoiceOptions);

// @desc    Generate going once options
// @route   POST /api/game/going-once-options
// @access  Private
router.post("/going-once-options", protect, generateGoingOnceOptions);

// @desc    Calculate round points
// @route   POST /api/game/calculate-points
// @access  Private
router.post("/calculate-points", protect, calculatePoints);

// @desc    Complete a game
// @route   POST /api/game/:gameId/complete
// @access  Private
router.post("/:gameId/complete", protect, completeGame);

// @desc    Save game result (DEPRECATED - use complete instead)
// @route   POST /api/game/save-result
// @access  Private
router.post("/save-result", protect, validateGameSubmission, saveGameResult);

// @desc    Get user's game history
// @route   GET /api/game/history
// @access  Private
router.get("/history", protect, getGameHistory);

// @desc    Get game statistics
// @route   GET /api/game/stats
// @access  Private
router.get("/stats", protect, getGameStats);

// Reset Final Round to clean state
router.post("/:gameId/reset-final-round", protect, resetFinalRound);

module.exports = router;
