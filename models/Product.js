const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true },
    name: {
      en: { type: String, required: true },
      ar: { type: String, required: true },
    },
    description: {
      en: String,
      ar: String,
    },
    image: { type: String, required: true },
    price: { type: Number, required: true },
    category: {
      type: String,
      enum: [
        "electronics",
        "fashion",
        "food",
        "luxury",
        "household",
        "sports",
        "beauty",
        "automotive",
      ],
      required: true,
    },
    brand: String,
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
    priceRange: {
      type: String,
      enum: ["budget", "mid-range", "premium", "luxury"],
      required: true,
    },
    metadata: {
      priceDate: { type: Date, default: Date.now },
      source: String,
      region: { type: String, default: "US" },
      currency: { type: String, default: "USD" },
    },
    gameStats: {
      timesUsed: { type: Number, default: 0 },
      averageGuess: Number,
      accuracyRate: Number, // percentage of correct guesses
      lastUsed: Date,
    },
    // isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

// Method to update game stats
productSchema.methods.updateGameStats = function (guesses) {
  this.gameStats.timesUsed += 1;
  this.gameStats.lastUsed = new Date();

  if (guesses && guesses.length > 0) {
    const totalGuesses = guesses.reduce((sum, guess) => sum + guess, 0);
    this.gameStats.averageGuess = totalGuesses / guesses.length;

    // Calculate accuracy (within 20% of actual price)
    const accurateGuesses = guesses.filter((guess) => {
      const difference = Math.abs(this.price - guess);
      const percentage = difference / this.price;
      return percentage <= 0.2;
    });

    this.gameStats.accuracyRate =
      (accurateGuesses.length / guesses.length) * 100;
  }

  return this.save();
};

// Static method to get random products
productSchema.statics.getRandomProducts = function (
  count = 3,
  excludeIds = []
) {
  return this.aggregate([
    { $match: { id: { $nin: excludeIds } } },
    { $sample: { size: count } },
  ]);
};

// Static method to get products by difficulty
productSchema.statics.getProductsByDifficulty = function (
  difficulty,
  count = 3
) {
  return this.aggregate([
    { $match: { difficulty } },
    { $sample: { size: count } },
  ]);
};

// Static method to get products by price range
productSchema.statics.getProductsByPriceRange = function (
  priceRange,
  count = 3
) {
  return this.aggregate([
    { $match: { priceRange } },
    { $sample: { size: count } },
  ]);
};

module.exports = mongoose.model("Product", productSchema);
