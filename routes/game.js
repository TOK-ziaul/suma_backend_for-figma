const express = require("express");
const rateLimit = require("express-rate-limit");
const { protect } = require("../middleware/auth");
const { validateGameSubmission } = require("../middleware/validation");
const gameService = require("../services/gameService");
const Product = require("../models/Product");
const {
  localizeProducts,
  getLanguageFromRequest,
} = require("../utils/localization");

const router = express.Router();

// More lenient rate limiter for game submissions
const gameSubmissionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === "development" ? 50 : 20, // Higher limit for development
  message: {
    success: false,
    message: "Too many game submissions, please slow down",
  },
});

// Create a new game
router.post("/", protect, async (req, res) => {
  try {
    const { players = [], metadata = {} } = req.body;
    const game = await gameService.createGame(req.user._id, players, metadata);
    res.status(201).json({ success: true, data: game });
  } catch (err) {
    console.error("create game error", err);
    res.status(500).json({ success: false, message: "Error creating game" });
  }
});

// Get a game
router.get("/:gameId", protect, async (req, res) => {
  try {
    const game = await gameService.getGameById(req.params.gameId, req.user._id);
    if (!game)
      return res
        .status(404)
        .json({ success: false, message: "Game not found" });
    res.json({ success: true, data: game });
  } catch (err) {
    console.error("get game error", err);
    res.status(500).json({ success: false, message: "Error fetching game" });
  }
});

// Update game state
router.put("/:gameId", protect, async (req, res) => {
  try {
    const { players, gameState, rounds } = req.body;
    const game = await gameService.updateGameState(
      req.params.gameId,
      req.user._id,
      { players, gameState, rounds }
    );
    if (!game)
      return res
        .status(404)
        .json({ success: false, message: "Game not found" });
    res.json({ success: true, data: game });
  } catch (err) {
    console.error("update game error", err);
    res.status(500).json({ success: false, message: "Error updating game" });
  }
});

// Add / update a submission for a round (legacy)
router.post(
  "/:gameId/round/:roundNumber/submission",
  protect,
  gameSubmissionLimiter,
  async (req, res) => {
    try {
      const { playerId, submission, roundType } = req.body;
      const game = await gameService.addSubmission(
        req.params.gameId,
        parseInt(req.params.roundNumber),
        playerId,
        submission,
        roundType
      );
      res.status(200).json({ success: true, data: game });
    } catch (err) {
      console.error("add submission error", err);
      res
        .status(500)
        .json({ success: false, message: "Error saving submission" });
    }
  }
);

// Add / update a submission for a turn
router.post(
  "/:gameId/round/:roundNumber/turn/:turnNumber/submission",
  protect,
  gameSubmissionLimiter,
  async (req, res) => {
    try {
      const { playerId, submission, roundType } = req.body;
      const game = await gameService.addTurnSubmission(
        req.params.gameId,
        parseInt(req.params.roundNumber),
        parseInt(req.params.turnNumber),
        playerId,
        submission,
        roundType
      );
      res.status(200).json({ success: true, data: game });
    } catch (err) {
      console.error("add turn submission error", err);
      res
        .status(500)
        .json({ success: false, message: "Error saving turn submission" });
    }
  }
);

// Finalize a turn
router.post(
  "/:gameId/round/:roundNumber/turn/:turnNumber/result",
  protect,
  async (req, res) => {
    try {
      const { roundType, product, submissions = {}, scores = {} } = req.body;
      const result = await gameService.finalizeTurn(
        req.params.gameId,
        parseInt(req.params.roundNumber),
        parseInt(req.params.turnNumber),
        roundType,
        product,
        submissions,
        scores
      );
      return res.status(201).json({ success: true, data: result });
    } catch (err) {
      console.error("finalize turn error", err);
      res.status(500).json({
        success: false,
        message: err.message || "Error finalizing turn",
      });
    }
  }
);

// Finalize a round (supports all round types) - legacy
router.post("/:gameId/round/:roundNumber/result", protect, async (req, res) => {
  try {
    const { roundType, products = [], submissions = {} } = req.body;

    // For now, all round types use the same finalizeGuessRound function
    // In the future, we can add specific handlers for different round types
    const result = await gameService.finalizeGuessRound(
      req.params.gameId,
      parseInt(req.params.roundNumber),
      products,
      submissions,
      roundType
    );
    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    console.error("finalize round error", err);
    res.status(500).json({
      success: false,
      message: err.message || "Error finalizing round",
    });
  }
});

/**
 * Optional: advance game or mark complete
 * PATCH /api/game/:gameId/advance
 * body: { nextRoundIndex?, completeGame?: boolean }
 */
router.patch("/:gameId/advance", protect, async (req, res) => {
  try {
    const { gameId } = req.params;
    const { nextRoundIndex, completeGame } = req.body;
    const game = await gameService.advanceGame(
      gameId,
      nextRoundIndex,
      completeGame
    );
    res.status(200).json({ success: true, data: game });
  } catch (err) {
    console.error("advance game error", err);
    res.status(500).json({ success: false, message: "Error advancing game" });
  }
});

// @desc    Get products for Round 1
// @route   GET /api/game/products/round1
// @access  Private
router.get("/products/round1", protect, async (req, res) => {
  try {
    const language = getLanguageFromRequest(req);
    const products = await gameService.getRound1Products();
    const localizedProducts = localizeProducts(products, language);

    res.status(200).json({
      success: true,
      data: localizedProducts,
    });
  } catch (error) {
    console.error("Error fetching Round 1 products:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching products",
    });
  }
});

// @desc    Get products for Round 2
// @route   GET /api/game/products/round2
// @access  Private
router.get("/products/round2", protect, async (req, res) => {
  try {
    const language = getLanguageFromRequest(req);
    const { type, playerCount = 4 } = req.query;
    const products = await gameService.getRound2Products(
      type,
      parseInt(playerCount)
    );
    const localizedProducts = localizeProducts(products, language);

    res.status(200).json({
      success: true,
      data: localizedProducts,
    });
  } catch (error) {
    console.error("Error fetching Round 2 products:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching products",
    });
  }
});

// @desc    Get products for Final Round
// @route   GET /api/game/products/final
// @access  Private
router.get("/products/final", protect, async (req, res) => {
  try {
    const language = getLanguageFromRequest(req);
    const rounds = await gameService.getFinalRoundProducts();

    // Localize products in each round
    const localizedRounds = rounds.map((round) => ({
      ...round,
      products: localizeProducts(round.products, language),
    }));

    res.status(200).json({
      success: true,
      data: localizedRounds,
    });
  } catch (error) {
    console.error("Error fetching Final Round products:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching products",
    });
  }
});

// @desc    Generate multiple choice options
// @route   POST /api/game/multiple-choice-options
// @access  Private
router.post("/multiple-choice-options", protect, async (req, res) => {
  try {
    const { actualPrice } = req.body;
    const options = gameService.generateMultipleChoiceOptions(actualPrice);

    res.status(200).json({
      success: true,
      data: options,
    });
  } catch (error) {
    console.error("Error generating multiple choice options:", error);
    res.status(500).json({
      success: false,
      message: "Error generating options",
    });
  }
});

// @desc    Generate going once options
// @route   POST /api/game/going-once-options
// @access  Private
router.post("/going-once-options", protect, async (req, res) => {
  try {
    const { actualPrice } = req.body;
    const options = gameService.generateGoingOnceOptions(actualPrice);

    res.status(200).json({
      success: true,
      data: options,
    });
  } catch (error) {
    console.error("Error generating going once options:", error);
    res.status(500).json({
      success: false,
      message: "Error generating options",
    });
  }
});

// @desc    Calculate round points
// @route   POST /api/game/calculate-points
// @access  Private
router.post("/calculate-points", protect, async (req, res) => {
  try {
    const { roundType, roundData } = req.body;
    let points = {};

    switch (roundType) {
      case "guess":
        roundData.submissions.forEach((submission, playerIndex) => {
          points[playerIndex] = gameService.calculateGuessPoints(
            roundData.actualPrice,
            submission.guess
          );
        });
        break;

      case "higher-lower":
        Object.entries(roundData.submissions).forEach(
          ([playerIndex, submission]) => {
            points[playerIndex] = gameService.calculateHigherLowerPoints(
              playerIndex,
              roundData.selectedGuesser,
              roundData.actualPrice,
              roundData.guessedPrice,
              submission.prediction
            );
          }
        );
        break;

      case "going-once":
        Object.entries(roundData.submissions).forEach(
          ([playerIndex, submission]) => {
            points[playerIndex] = gameService.calculateGoingOncePoints(
              submission.selectedPrice,
              roundData.actualPrice,
              submission.selectionOrder
            );
          }
        );
        break;

      case "multiple-choice":
        Object.entries(roundData.submissions).forEach(
          ([playerIndex, submission]) => {
            points[playerIndex] = gameService.calculateMultipleChoicePoints(
              submission.selectedPrice,
              roundData.actualPrice
            );
          }
        );
        break;

      case "final":
        Object.entries(roundData.submissions).forEach(
          ([playerIndex, submission]) => {
            points[playerIndex] = gameService.calculateFinalRoundPoints(
              submission.selectedRow,
              roundData.correctRow
            );
          }
        );
        break;

      default:
        return res.status(400).json({
          success: false,
          message: "Invalid round type",
        });
    }

    res.status(200).json({
      success: true,
      data: points,
    });
  } catch (error) {
    console.error("Error calculating points:", error);
    res.status(500).json({
      success: false,
      message: "Error calculating points",
    });
  }
});

// @desc    Complete a game
// @route   POST /api/game/:gameId/complete
// @access  Private
router.post("/:gameId/complete", protect, async (req, res) => {
  try {
    const game = await gameService.completeGame(
      req.params.gameId,
      req.user._id
    );

    // Update user's game stats
    const winner = game.players.find((p) => p.isWinner);
    const userPlayer = game.players.find(
      (p) => p.name === req.user.email.split("@")[0]
    );

    if (userPlayer) {
      await req.user.updateGameStats({
        totalScore: userPlayer.score,
        won: userPlayer.isWinner,
      });
    }

    // Mark free trial as used if applicable
    if (
      !req.user.subscription.freeTrialUsed &&
      req.user.subscription.type === "free"
    ) {
      req.user.subscription.freeTrialUsed = true;
      await req.user.save();
    }

    res.status(200).json({
      success: true,
      data: game,
    });
  } catch (error) {
    console.error("Error completing game:", error);
    res.status(500).json({
      success: false,
      message: "Error completing game",
    });
  }
});

// @desc    Save game result (DEPRECATED - use complete instead)
// @route   POST /api/game/save-result
// @access  Private
router.post(
  "/save-result",
  protect,
  validateGameSubmission,
  async (req, res) => {
    try {
      const gameData = req.body;
      const game = await gameService.saveGameResult(req.user._id, gameData);

      // Update user's game stats
      const winner = game.players.find((p) => p.isWinner);
      const userPlayer = game.players.find(
        (p) => p.name === req.user.email.split("@")[0]
      );

      if (userPlayer) {
        await req.user.updateGameStats({
          totalScore: userPlayer.score,
          won: userPlayer.isWinner,
        });
      }

      // Mark free trial as used if applicable
      if (
        !req.user.subscription.freeTrialUsed &&
        req.user.subscription.type === "free"
      ) {
        req.user.subscription.freeTrialUsed = true;
        await req.user.save();
      }

      res.status(201).json({
        success: true,
        data: game,
      });
    } catch (error) {
      console.error("Error saving game result:", error);
      res.status(500).json({
        success: false,
        message: "Error saving game result",
      });
    }
  }
);

// @desc    Get user's game history
// @route   GET /api/game/history
// @access  Private
router.get("/history", protect, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const result = await gameService.getUserGameHistory(
      req.user._id,
      parseInt(page),
      parseInt(limit)
    );

    res.status(200).json({
      success: true,
      data: result.games,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("Error fetching game history:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching game history",
    });
  }
});

// @desc    Get game statistics
// @route   GET /api/game/stats
// @access  Private
router.get("/stats", protect, async (req, res) => {
  try {
    const user = req.user;

    res.status(200).json({
      success: true,
      data: {
        gamesPlayed: user.gameStats.gamesPlayed,
        gamesWon: user.gameStats.gamesWon,
        winRate:
          user.gameStats.gamesPlayed > 0
            ? Math.round(
                (user.gameStats.gamesWon / user.gameStats.gamesPlayed) * 100
              )
            : 0,
        bestScore: user.gameStats.bestScore,
        averageScore: user.gameStats.averageScore,
        totalPoints: user.gameStats.totalPoints,
      },
    });
  } catch (error) {
    console.error("Error fetching game stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching game statistics",
    });
  }
});

// Reset Final Round to clean state
router.post("/:gameId/reset-final-round", protect, async (req, res) => {
  try {
    const game = await gameService.resetFinalRound(req.params.gameId);
    res.json({ success: true, data: game });
  } catch (error) {
    console.error("Error resetting final round:", error);
    res.status(500).json({
      success: false,
      message: "Error resetting final round",
    });
  }
});

module.exports = router;
