const mongoose = require("mongoose");
const Game = require("./models/Game");

// Connect to MongoDB
mongoose.connect("mongodb://localhost:27017/suma_game");

async function checkGame() {
  try {
    const gameId = "68bee06fd006d4c724443d50";
    const game = await Game.findById(gameId);

    if (game) {
      console.log("Game found!");
      console.log("Round 3 roundType:", game.rounds.get("3")?.roundType);
      console.log("Round 3 has turns:", !!game.rounds.get("3")?.turns);
      console.log(
        "Game state currentRoundType:",
        game.gameState.currentRoundType
      );
    } else {
      console.log("Game not found");
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    mongoose.connection.close();
  }
}

checkGame();
