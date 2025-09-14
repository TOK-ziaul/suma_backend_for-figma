const Product = require("../models/Product");
const Game = require("../models/Game");

class GameService {
  // Point calculation for Round 1 (Price Guessing)
  calculateGuessPoints(actualPrice, guess) {
    const difference = Math.abs(actualPrice - guess);
    const percentage = difference / actualPrice;

    if (percentage <= 0.05) return 100; // Within 5%
    if (percentage <= 0.1) return 75; // Within 10%
    if (percentage <= 0.2) return 50; // Within 20%
    if (percentage <= 0.35) return 25; // Within 35%
    return 0; // More than 35% off
  }

  // Point calculation for Higher/Lower round
  calculateHigherLowerPoints(
    playerIndex,
    selectedGuesser,
    actualPrice,
    guessedPrice,
    prediction
  ) {
    if (playerIndex === selectedGuesser) {
      // Guesser gets points based on accuracy
      return this.calculateGuessPoints(actualPrice, guessedPrice);
    } else {
      // Predictors get points for correct higher/lower prediction
      const correct =
        (actualPrice > guessedPrice && prediction === "higher") ||
        (actualPrice < guessedPrice && prediction === "lower") ||
        actualPrice === guessedPrice; // Exact guess gives everyone points

      return correct ? 50 : 0;
    }
  }

  // Point calculation for Going Once round
  calculateGoingOncePoints(selectedPrice, actualPrice, selectionOrder) {
    if (selectedPrice === actualPrice) {
      // Exact match gets bonus points based on selection order
      const bonusPoints = [100, 80, 60, 40]; // Earlier selection gets more points
      return bonusPoints[selectionOrder] || 20;
    }

    // Points based on how close the selected price is
    const difference = Math.abs(actualPrice - selectedPrice);
    const percentage = difference / actualPrice;

    if (percentage <= 0.1) return 40;
    if (percentage <= 0.25) return 20;
    return 0;
  }

  // Point calculation for Multiple Choice round
  calculateMultipleChoicePoints(selectedPrice, actualPrice) {
    return selectedPrice === actualPrice ? 75 : 0;
  }

  // Point calculation for Final Round (Priciest Shelf)
  calculateFinalRoundPoints(selectedRow, correctRow) {
    return selectedRow === correctRow ? 100 : 0;
  }

  // Get products for Round 1
  async getRound1Products() {
    return await Product.getRandomProducts(3);
  }

  // Get products for Round 2 (varies by type)
  async getRound2Products(roundType, playerCount) {
    let count;
    switch (roundType) {
      case "higher-lower":
        count = playerCount; // One product per player
        break;
      case "going-once":
      case "multiple-choice":
        count = 3;
        break;
      default:
        count = 3;
    }

    return await Product.getRandomProducts(count);
  }

  // Get products for Final Round with quantities
  async getFinalRoundProducts() {
    // For now, return a single set of 3 products for the current turn
    // The frontend will handle fetching new products for each turn
    const products = await Product.getRandomProducts(3);
    const roundProducts = products.map((product, index) => ({
      ...product,
      quantity: Math.floor(Math.random() * 5) + 1, // 1-5 quantity
      row: index + 1,
    }));

    console.log("Final round products:", roundProducts);
    return roundProducts;
  }

  // Generate multiple choice options
  generateMultipleChoiceOptions(actualPrice) {
    const options = [actualPrice];

    // Generate 4 additional realistic options
    const variations = [0.5, 0.75, 1.25, 1.5, 2.0];

    while (options.length < 5) {
      const variation =
        variations[Math.floor(Math.random() * variations.length)];
      const option = Math.round(actualPrice * variation * 100) / 100;

      if (!options.includes(option) && option > 0) {
        options.push(option);
      }
    }

    // Shuffle options
    return options.sort(() => Math.random() - 0.5);
  }

  // Generate going once price reveals
  generateGoingOnceOptions(actualPrice) {
    const options = [];
    const basePrice = actualPrice;

    // Generate 5 options with varying accuracy
    const multipliers = [0.3, 0.6, 0.8, 1.0, 1.4]; // One will be correct

    multipliers.forEach((multiplier) => {
      const price = Math.round(basePrice * multiplier * 100) / 100;
      options.push(price);
    });

    return options;
  }

  // Determine most expensive row for final round
  getMostExpensiveRow(products) {
    let maxTotal = 0;
    let maxRow = 1;

    products.forEach((product, index) => {
      const total = product.price * (product.quantity || 1);
      if (total > maxTotal) {
        maxTotal = total;
        maxRow = index + 1;
      }
    });

    return maxRow;
  }

  // Complete an existing game
  async completeGame(gameId, userId) {
    try {
      const game = await Game.findOne({ _id: gameId, userId });
      if (!game) {
        throw new Error("Game not found or access denied");
      }

      await game.completeGame();
      return game;
    } catch (error) {
      console.error("Error completing game:", error);
      throw error;
    }
  }

  // Save game result (DEPRECATED - creates new game)
  async saveGameResult(userId, gameData) {
    try {
      const game = new Game({
        userId,
        players: gameData.players,
        rounds: gameData.rounds,
        gameState: {
          currentRound: Object.values(gameData.rounds).filter(
            (round) => round.completed
          ).length,
          gameCompleted:
            Object.values(gameData.rounds).filter((round) => round.completed)
              .length >= 3, // Only complete if all 3 rounds are done
          startedAt: gameData.startedAt,
          completedAt:
            Object.values(gameData.rounds).filter((round) => round.completed)
              .length >= 3
              ? new Date()
              : undefined,
        },
        metadata: gameData.metadata || {},
      });

      await game.completeGame();
      return game;
    } catch (error) {
      console.error("Error saving game result:", error);
      throw error;
    }
  }

  // Get user's game history
  async getUserGameHistory(userId, page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;

      const games = await Game.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("userId", "email");

      const total = await Game.countDocuments({ userId });

      return {
        games,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Error fetching game history:", error);
      throw error;
    }
  }
  // Create a new game (store players and metadata)
  async createGame(userId, players = [], metadata = {}) {
    const game = new Game({
      userId,
      players,
      rounds: [], // will be populated as rounds are completed
      gameState: { currentRound: 0, startedAt: new Date() },
      metadata,
    });
    await game.save();
    return game;
  }

  // Fetch a game by id (ownership check optional)
  async getGameById(gameId, userId = null) {
    const game = await Game.findById(gameId);
    if (!game) return null;
    if (userId && String(game.userId) !== String(userId)) {
      // optional: ensure user owns the game
      return null;
    }
    return game;
  }

  // Add or update a single player's submission for a specific round
  async addSubmission(
    gameId,
    roundNumber,
    playerId,
    submission,
    roundType = "guess"
  ) {
    const game = await Game.findById(gameId);
    if (!game) throw new Error("Game not found");

    // Find or create the round skeleton
    const roundKey = String(roundNumber);
    let round = game.rounds.get(roundKey);
    if (!round) {
      round = {
        roundNumber,
        roundType: roundType, // Use the passed round type
        products: [],
        submissions: new Map(),
        scores: new Map(),
        completed: false,
      };

      // For Final Round, add turns structure
      if (roundType === "final") {
        round.turns = new Map();
      }

      game.rounds.set(roundKey, round);
    } else {
      // Fix existing Round 3 if it has wrong roundType or structure
      if (roundNumber === 3 && roundType === "final") {
        console.log("Migrating Round 3 to Final Round structure");

        // Fix roundType
        if (round.roundType !== "final") {
          console.log(
            "Fixing Round 3 roundType from",
            round.roundType,
            "to final"
          );
          round.roundType = "final";
        }

        // Add turns structure if missing
        if (!round.turns) {
          round.turns = new Map();
          console.log("Added turns structure to Round 3");
        }

        // Clear old submissions that don't match Final Round format
        if (round.submissions && round.submissions.size > 0) {
          const oldSubmissions = Array.from(round.submissions.entries());
          console.log("Found old submissions in Round 3:", oldSubmissions);

          // Clear old submissions
          round.submissions.clear();
          console.log("Cleared old submissions from Round 3");
        }
      }
    }

    // Handle Final Round submissions differently - store by turn
    if (roundType === "final") {
      // Validate Final Round submission format
      if (!submission.selectedRow && !submission.turnNumber) {
        throw new Error(
          "Final Round submissions must include selectedRow and turnNumber"
        );
      }

      const turnNumber = submission.turnNumber || 1;
      const turnKey = `turn${turnNumber}`;

      // Initialize turn if it doesn't exist
      if (!round.turns) {
        round.turns = new Map();
      }
      if (!round.turns.has(turnKey)) {
        round.turns.set(turnKey, {
          turnNumber,
          submissions: new Map(),
          products: [],
          completed: false,
        });
      }

      // Store submission for this specific turn
      const turn = round.turns.get(turnKey);
      turn.submissions.set(playerId, submission);

      // Also store in round level submissions for finalization
      if (!round.submissions) {
        round.submissions = new Map();
      }
      round.submissions.set(playerId, submission);

      console.log(
        `Final Round Turn ${turnNumber} - Player ${playerId} selected row ${submission.selectedRow}`
      );
    } else {
      // For other rounds, store directly in round submissions
      if (round.submissions && typeof round.submissions.set === "function") {
        // it's a Map
        round.submissions.set(playerId, submission);
      } else {
        round.submissions = round.submissions || {};
        round.submissions[playerId] = submission;
      }
    }

    await game.save();
    return game;
  }

  // Finalize a round: calculate points and persist the round via model method
  // Expects `products` (array), `submissions` (object playerId-> { guess }), roundNumber, and roundType
  async finalizeGuessRound(
    gameId,
    roundNumber,
    products = [],
    submissions = {},
    roundType = "guess"
  ) {
    console.log("Finalizing guess round:", {
      gameId,
      roundNumber,
      products,
      submissions,
    });

    const game = await Game.findById(gameId);
    if (!game) throw new Error("Game not found");

    // Handle multiple products for Round 1 or single product for other rounds
    if (!Array.isArray(products) || products.length === 0) {
      throw new Error("Missing products to finalize round");
    }

    // Calculate total points for each player across all products
    const points = {};

    // Initialize points for all players
    Object.keys(submissions).forEach((playerId) => {
      points[playerId] = 0;
    });

    // Handle Final Round scoring differently
    if (roundType === "final") {
      // For Final Round: calculate points based on current turn's products and submissions
      console.log("Calculating Final Round points:", { products, submissions });

      if (products && products.length > 0) {
        // Calculate total value for each row (price × quantity)
        const rowValues = products.map((product, index) => ({
          row: index + 1,
          value: product.price * (product.quantity || 1),
        }));

        // Find the row with highest value
        const correctRow = rowValues.reduce((max, current) =>
          current.value > max.value ? current : max
        ).row;

        console.log("Row values:", rowValues);
        console.log("Correct row:", correctRow);

        // Calculate points for each player
        Object.entries(submissions).forEach(([playerId, submission]) => {
          // Handle both object format and direct value format
          let selectedRow;
          if (
            typeof submission === "object" &&
            submission.selectedRow !== undefined
          ) {
            selectedRow = parseInt(submission.selectedRow);
          } else {
            selectedRow = parseInt(submission);
          }

          const isCorrect = selectedRow === correctRow;
          points[playerId] = isCorrect ? 100 : 0;

          console.log(
            `Player ${playerId}: Selected ${selectedRow}, Correct: ${correctRow}, Points: ${points[playerId]}`
          );
        });
      }

      console.log(`Final Round points:`, points);
    } else {
      // Calculate points for each product (existing logic for other rounds)
      products.forEach((product, productIndex) => {
        if (typeof product.price !== "number") {
          throw new Error(`Missing price for product ${productIndex}`);
        }

        const actualPrice = product.price;
        console.log(`Product ${productIndex + 1} actual price:`, actualPrice);

        // Calculate points for this product
        Object.entries(submissions).forEach(([playerId, sub]) => {
          let guess;

          if (roundType === "guess" && sub.guesses) {
            // Round 1: multiple products, guesses stored by product index
            guess = parseFloat(sub.guesses[productIndex] || 0);
          } else {
            // Other rounds: single product, guess directly in submission
            guess = parseFloat(sub.guess || 0);
          }

          const productPoints = this.calculateGuessPoints(actualPrice, guess);
          points[playerId] += productPoints;

          console.log(
            `Player ${playerId} - Product ${
              productIndex + 1
            }: guess=${guess}, points=${productPoints}, total=${
              points[playerId]
            }`
          );
        });
      });
    }

    console.log("Total calculated points:", points);

    // Build roundData to persist (model.addRoundResult will convert submissions/scores to Maps)
    const roundData = {
      roundNumber,
      roundType: roundType,
      products,
      submissions, // plain object: { playerId: { guess: n }, ... }
      scores: points,
    };

    // For Final Round, include the turns data
    if (roundType === "final") {
      const game = await Game.findById(gameId);
      const round = game.rounds.get(String(roundNumber));
      if (round && round.turns) {
        roundData.turns = round.turns;
      }
    }
    console.log("Round data to save:", roundData);
    console.log("Products in roundData:", products);
    console.log("Products length:", products?.length);

    // Use Game model method addRoundResult (instance method) — it pushes and updates currentRound.
    await game.addRoundResult(roundData);
    console.log(
      "Round result added, current round:",
      game.gameState.currentRound
    );

    // Return the updated game and computed points
    // Reload fresh from DB to ensure maps converted properly
    const updatedGame = await Game.findById(gameId);
    console.log("Updated game from DB:", {
      currentRound: updatedGame.gameState.currentRound,
      rounds: updatedGame.rounds,
      players: updatedGame.players,
    });
    return { game: updatedGame, points };
  }

  // Update game state
  async updateGameState(gameId, userId, gameState) {
    const { players, gameState: gameStateData, rounds } = gameState;

    const updateData = {
      players,
      rounds,
      updatedAt: new Date(),
    };

    // Update nested gameState if provided
    if (gameStateData) {
      updateData.$set = {
        "gameState.currentRound": gameStateData.currentRound,
        "gameState.currentRoundType": gameStateData.currentRoundType,
        "gameState.gameCompleted": gameStateData.gameCompleted,
      };
    }

    const game = await Game.findOneAndUpdate(
      { _id: gameId, userId },
      updateData,
      { new: true }
    );

    if (!game) {
      throw new Error("Game not found or access denied");
    }

    return game;
  }

  // Reset Final Round to clean state
  async resetFinalRound(gameId) {
    const game = await Game.findById(gameId);
    if (!game) throw new Error("Game not found");

    // Create a clean Final Round
    const finalRound = {
      roundNumber: 3,
      roundType: "final",
      products: [],
      submissions: new Map(),
      scores: new Map(),
      completed: false,
      turns: new Map(),
    };

    // Replace Round 3
    game.rounds.set("3", finalRound);

    // Update game state
    game.gameState.currentRound = 3;
    game.gameState.currentRoundType = "final";
    game.gameState.gameCompleted = false;

    await game.save();
    console.log("Reset Final Round to clean state");
    return game;
  }

  // Add submission for a specific turn
  async addTurnSubmission(
    gameId,
    roundNumber,
    turnNumber,
    playerId,
    submission,
    roundType
  ) {
    const game = await Game.findById(gameId);
    if (!game) throw new Error("Game not found");

    const roundKey = String(roundNumber);
    let round = game.rounds.get(roundKey);

    if (!round) {
      // Create new round if it doesn't exist
      round = {
        roundNumber: roundNumber,
        roundType: roundType,
        currentTurn: 1,
        turns: [],
        completed: false,
      };
      game.rounds.set(roundKey, round);
    }

    // Find or create the turn
    let turn = round.turns.find((t) => t.turnNumber === turnNumber);
    if (!turn) {
      turn = {
        turnNumber: turnNumber,
        product: null,
        submissions: new Map(),
        scores: new Map(),
        completed: false,
      };
      round.turns.push(turn);
    }

    // Add submission to the turn (ensure consistent format)
    const submissionValue = submission.guess || submission; // Handle both formats
    turn.submissions.set(playerId, submissionValue);

    await game.save();
    return game;
  }

  // Finalize a turn
  async finalizeTurn(
    gameId,
    roundNumber,
    turnNumber,
    roundType,
    product,
    submissions,
    scores
  ) {
    const game = await Game.findById(gameId);
    if (!game) throw new Error("Game not found");

    const turnData = {
      turnNumber: turnNumber,
      roundType: roundType,
      product: product,
      submissions: submissions,
      scores: scores,
    };

    await game.addTurnResult(roundNumber, turnData);
    return game;
  }
}

module.exports = new GameService();
