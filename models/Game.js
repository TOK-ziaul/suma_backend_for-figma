const mongoose = require("mongoose");

const playerSchema = new mongoose.Schema({
  id: { type: String, required: true },
  index: { type: Number, required: true },
  name: { type: String, required: true },
  score: { type: Number, default: 0 },
  isWinner: { type: Boolean, default: false },
});

const productSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  name: { type: String, required: true },
  image: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, default: 1 },
  row: Number,
});

const turnSchema = new mongoose.Schema({
  turnNumber: { type: Number, required: true },
  product: productSchema,
  submissions: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
  },
  scores: {
    type: Map,
    of: Number,
  },
  completed: { type: Boolean, default: false },
  completedAt: Date,
});

const roundSchema = new mongoose.Schema({
  roundNumber: { type: Number, required: true },
  currentRoundType: {
    type: String,
    enum: ["guess", "higher-lower", "going-once", "multiple-choice", "final"],
    required: true,
  },
  currentTurn: { type: Number, default: 1 },
  turns: [turnSchema],
  completed: { type: Boolean, default: false },
  completedAt: Date,
});

const gameSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    players: [playerSchema],
    rounds: {
      type: Map,
      of: roundSchema,
    },
    gameState: {
      currentRound: { type: Number, default: 0 },
      currentTurn: { type: Number, default: 1 },
      currentRoundType: {
        type: String,
        enum: [
          "guess",
          "higher-lower",
          "going-once",
          "multiple-choice",
          "final",
        ],
        default: "guess",
      },
      gameCompleted: { type: Boolean, default: false },
      winner: playerSchema,
      totalDuration: Number, // in seconds
      startedAt: Date,
      completedAt: Date,
    },
    metadata: {
      gameVersion: { type: String, default: "1.0" },
      productsDate: { type: Date, default: Date.now },
      deviceInfo: String,
      ipAddress: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for game duration in minutes
gameSchema.virtual("duration").get(function () {
  if (this.gameState.totalDuration) {
    return Math.round(this.gameState.totalDuration / 60);
  }
  return 0;
});

// Method to calculate final scores
gameSchema.methods.calculateFinalScores = function () {
  const playerScores = new Map();

  // Initialize player scores
  this.players.forEach((player) => {
    playerScores.set(player.id, 0);
  });

  // Sum scores from all rounds and turns
  if (this.rounds) {
    this.rounds.forEach((round, roundKey) => {
      if (round.turns && Array.isArray(round.turns)) {
        round.turns.forEach((turn) => {
          if (turn.scores) {
            turn.scores.forEach((score, playerId) => {
              const currentScore = playerScores.get(playerId) || 0;
              playerScores.set(playerId, currentScore + score);
            });
          }
        });
      }
    });
  }

  // Update player scores and determine winner
  let highestScore = 0;
  let winnerId = null;

  this.players.forEach((player) => {
    const finalScore = playerScores.get(player.id) || 0;
    player.score = finalScore;
    player.isWinner = false;

    if (finalScore > highestScore) {
      highestScore = finalScore;
      winnerId = player.id;
    }
  });

  // Mark winner
  const winner = this.players.find((p) => p.id === winnerId);
  if (winner) {
    winner.isWinner = true;
    this.gameState.winner = winner;
  }

  return this.save();
};

// Method to add turn result
gameSchema.methods.addTurnResult = function (roundNumber, turnData) {
  console.log("addTurnResult called with:", { roundNumber, turnData });

  if (!this.rounds) {
    this.rounds = new Map();
  }

  const roundKey = String(roundNumber);
  let round = this.rounds.get(roundKey);

  if (!round) {
    // Create new round if it doesn't exist
    round = {
      roundNumber: roundNumber,
      currentRoundType: turnData.roundType || "guess", // Fallback to 'guess' if undefined
      currentTurn: 1,
      turns: [],
      completed: false,
    };
    this.rounds.set(roundKey, round);
  }

  // Check if turn already exists, if so update it, otherwise create new one
  let existingTurn = round.turns.find(
    (t) => t.turnNumber === turnData.turnNumber
  );

  if (existingTurn) {
    // Update existing turn
    existingTurn.product = turnData.product;
    existingTurn.submissions = new Map(
      Object.entries(turnData.submissions || {})
    );
    existingTurn.scores = new Map(Object.entries(turnData.scores || {}));
    existingTurn.completed = true;
    existingTurn.completedAt = new Date();
  } else {
    // Create new turn
    const turn = {
      turnNumber: turnData.turnNumber,
      product: turnData.product,
      submissions: new Map(Object.entries(turnData.submissions || {})),
      scores: new Map(Object.entries(turnData.scores || {})),
      completed: true,
      completedAt: new Date(),
    };
    round.turns.push(turn);
  }

  // Check if round is completed based on round type
  const maxTurns = this.getMaxTurnsForRoundType(round.currentRoundType);
  if (turnData.turnNumber >= maxTurns) {
    round.completed = true;
    round.completedAt = new Date();
    round.currentTurn = turnData.turnNumber; // Set to actual turn number completed

    // Move to next round or complete game
    if (roundNumber < 3) {
      this.gameState.currentRound = roundNumber + 1;
      this.gameState.currentTurn = 1;

      // Update currentRoundType for the next round
      if (this.gameState.currentRound === 2) {
        const round2Types = ["higher-lower", "going-once", "multiple-choice"];
        this.gameState.currentRoundType =
          round2Types[Math.floor(Math.random() * round2Types.length)];
      } else if (this.gameState.currentRound === 3) {
        this.gameState.currentRoundType = "final";
      }
    } else {
      // Final round completed - mark game as completed
      this.gameState.gameCompleted = true;
      this.gameState.completedAt = new Date();
    }
  } else {
    // Move to next turn in same round
    round.currentTurn = turnData.turnNumber + 1;
    this.gameState.currentTurn = turnData.turnNumber + 1;
  }

  return this.save();
};

// Helper method to get max turns for round type
gameSchema.methods.getMaxTurnsForRoundType = function (roundType) {
  switch (roundType) {
    case "higher-lower":
      return this.players.length; // Up to max number of players
    case "guess":
    case "going-once":
    case "multiple-choice":
    case "final":
    default:
      return 3; // Default 3 turns
  }
};

// Method to add round result (legacy support)
gameSchema.methods.addRoundResult = function (roundData) {
  console.log("addRoundResult called with:", roundData);

  // Convert old format to new turn-based format
  if (roundData.products && roundData.products.length > 0) {
    // Create turns for each product
    roundData.products.forEach((product, index) => {
      const turnData = {
        turnNumber: index + 1,
        roundType: roundData.roundType, // This is correct for turnData
        product: product,
        submissions: roundData.submissions || {},
        scores: roundData.scores || {},
      };
      this.addTurnResult(roundData.roundNumber, turnData);
    });
  } else {
    // Handle case where no products (empty round)
    const turnData = {
      turnNumber: 1,
      roundType: roundData.roundType, // This is correct for turnData
      product: null,
      submissions: roundData.submissions || {},
      scores: roundData.scores || {},
    };
    this.addTurnResult(roundData.roundNumber, turnData);
  }

  return this.save();
};

// Method to complete game
gameSchema.methods.completeGame = function () {
  // Only complete if all 3 rounds are done
  const completedRounds = Object.values(this.rounds).filter(
    (round) => round.completed
  ).length;

  console.log("Complete game check:", {
    completedRounds,
    totalRounds: Object.keys(this.rounds).length,
    rounds: Object.keys(this.rounds),
  });

  this.gameState.gameCompleted = completedRounds >= 3;
  if (this.gameState.gameCompleted) {
    this.gameState.completedAt = new Date();
    console.log("Game marked as completed");
  }

  if (this.gameState.startedAt && this.gameState.completedAt) {
    this.gameState.totalDuration = Math.floor(
      (this.gameState.completedAt - this.gameState.startedAt) / 1000
    );
  }

  return this.calculateFinalScores();
};

module.exports = mongoose.model("Game", gameSchema);
