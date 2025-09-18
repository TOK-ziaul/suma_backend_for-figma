const mongoose = require("mongoose");
const Game = require("./models/Game");

// Connect to MongoDB
mongoose.connect("mongodb://localhost:27017/suma_game", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function resetFinalRound() {
  try {
    const gameId = "68bee06fd006d4c724443d50"; // The game ID from the database dump

    console.log("Resetting Final Round for game:", gameId);

    const game = await Game.findById(gameId);
    if (!game) {
      console.log("Game not found");
      return;
    }

    // Create a clean Final Round
    const finalRound = {
      roundNumber: 3,
      currentRoundType: "final",
      currentTurn: 1,
      turns: [],
      completed: false,
    };

    // Replace Round 3
    game.rounds.set("3", finalRound);

    // Update game state
    game.gameState.currentRound = 3;
    game.gameState.currentRoundType = "final";
    game.gameState.gameCompleted = false;

    await game.save();
    console.log("Final Round reset successfully!");

    // Verify the change
    const updatedGame = await Game.findById(gameId);
    console.log("Updated Round 3:", updatedGame.rounds.get("3"));
  } catch (error) {
    console.error("Error resetting Final Round:", error);
  } finally {
    mongoose.connection.close();
  }
}

resetFinalRound();
