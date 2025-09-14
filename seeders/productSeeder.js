const mongoose = require("mongoose");
const Product = require("../models/Product");
require("dotenv").config();

const products = [
  {
    id: 1,
    name: {
      en: "iPhone 15 Pro",
      ar: "آيفون 15 برو",
    },
    description: {
      en: "Latest Apple smartphone with titanium design",
      ar: "أحدث هاتف آبل مع تصميم التيتانيوم",
    },
    image: "https://images.pexels.com/photos/788946/pexels-photo-788946.jpeg",
    price: 999.99,
    category: "electronics",
    brand: "Apple",
    difficulty: "medium",
    priceRange: "premium",
  },
  {
    id: 2,
    name: {
      en: "MacBook Pro 14-inch",
      ar: "ماك بوك برو 14 بوصة",
    },
    description: {
      en: "Professional laptop with M3 chip",
      ar: "لابتوب احترافي بمعالج M3",
    },
    image: "https://images.pexels.com/photos/205421/pexels-photo-205421.jpeg",
    price: 2399.99,
    category: "electronics",
    brand: "Apple",
    difficulty: "hard",
    priceRange: "luxury",
  },
  {
    id: 3,
    name: "Nike Air Jordan 1",
    description: "Classic basketball sneakers",
    image: "https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg",
    price: 189.99,
    category: "fashion",
    brand: "Nike",
    difficulty: "medium",
    priceRange: "mid-range",
  },
  {
    id: 4,
    name: "Sony WH-1000XM4",
    description: "Noise-canceling wireless headphones",
    image: "https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg",
    price: 349.99,
    category: "electronics",
    brand: "Sony",
    difficulty: "medium",
    priceRange: "premium",
  },
  {
    id: 5,
    name: 'Samsung 65" 4K Smart TV',
    description: "Ultra HD Smart TV with HDR",
    image: "https://images.pexels.com/photos/1201996/pexels-photo-1201996.jpeg",
    price: 899.99,
    category: "electronics",
    brand: "Samsung",
    difficulty: "medium",
    priceRange: "premium",
  },
  {
    id: 6,
    name: "Rolex Submariner",
    description: "Luxury diving watch",
    image: "https://images.pexels.com/photos/190819/pexels-photo-190819.jpeg",
    price: 8995.0,
    category: "luxury",
    brand: "Rolex",
    difficulty: "hard",
    priceRange: "luxury",
  },
  {
    id: 7,
    name: "Louis Vuitton Handbag",
    description: "Designer leather handbag",
    image: "https://images.pexels.com/photos/904350/pexels-photo-904350.jpeg",
    price: 2500.0,
    category: "luxury",
    brand: "Louis Vuitton",
    difficulty: "hard",
    priceRange: "luxury",
  },
  {
    id: 8,
    name: "Pepsi 6-Pack",
    description: "6 cans of Pepsi cola",
    image: "https://images.pexels.com/photos/3008882/pexels-photo-3008882.jpeg",
    price: 5.99,
    category: "food",
    brand: "Pepsi",
    difficulty: "easy",
    priceRange: "budget",
  },
  {
    id: 9,
    name: "Premium Coffee Beans 1kg",
    description: "Arabica coffee beans from Colombia",
    image: "https://images.pexels.com/photos/894695/pexels-photo-894695.jpeg",
    price: 24.99,
    category: "food",
    brand: "Generic",
    difficulty: "medium",
    priceRange: "mid-range",
  },
  {
    id: 10,
    name: "Organic Honey 500g",
    description: "Pure organic wildflower honey",
    image: "https://images.pexels.com/photos/1638280/pexels-photo-1638280.jpeg",
    price: 12.5,
    category: "food",
    brand: "Generic",
    difficulty: "easy",
    priceRange: "budget",
  },
  {
    id: 11,
    name: "Tesla Model 3",
    description: "Electric sedan with autopilot",
    image: "https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg",
    price: 42990.0,
    category: "automotive",
    brand: "Tesla",
    difficulty: "hard",
    priceRange: "luxury",
  },
  {
    id: 12,
    name: "Dyson V15 Vacuum",
    description: "Cordless vacuum cleaner with laser detection",
    image: "https://images.pexels.com/photos/4239091/pexels-photo-4239091.jpeg",
    price: 749.99,
    category: "household",
    brand: "Dyson",
    difficulty: "medium",
    priceRange: "premium",
  },
  {
    id: 13,
    name: "Instant Pot Duo 7-in-1",
    description: "Multi-use pressure cooker",
    image: "https://images.pexels.com/photos/4518843/pexels-photo-4518843.jpeg",
    price: 89.99,
    category: "household",
    brand: "Instant Pot",
    difficulty: "easy",
    priceRange: "mid-range",
  },
  {
    id: 14,
    name: "Levi's 501 Jeans",
    description: "Classic straight-leg denim jeans",
    image: "https://images.pexels.com/photos/1598507/pexels-photo-1598507.jpeg",
    price: 69.99,
    category: "fashion",
    brand: "Levi's",
    difficulty: "easy",
    priceRange: "mid-range",
  },
  {
    id: 15,
    name: "Nintendo Switch OLED",
    description: "Gaming console with OLED screen",
    image: "https://images.pexels.com/photos/3945683/pexels-photo-3945683.jpeg",
    price: 349.99,
    category: "electronics",
    brand: "Nintendo",
    difficulty: "medium",
    priceRange: "premium",
  },
  {
    id: 16,
    name: "Starbucks Coffee Tumbler",
    description: "Reusable coffee cup with logo",
    image: "https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg",
    price: 19.99,
    category: "household",
    brand: "Starbucks",
    difficulty: "easy",
    priceRange: "budget",
  },
  {
    id: 17,
    name: "Ray-Ban Aviator Sunglasses",
    description: "Classic aviator style sunglasses",
    image: "https://images.pexels.com/photos/701877/pexels-photo-701877.jpeg",
    price: 154.99,
    category: "fashion",
    brand: "Ray-Ban",
    difficulty: "medium",
    priceRange: "mid-range",
  },
  {
    id: 18,
    name: "Yeti Rambler 20oz",
    description: "Insulated stainless steel tumbler",
    image: "https://images.pexels.com/photos/2638026/pexels-photo-2638026.jpeg",
    price: 34.99,
    category: "household",
    brand: "Yeti",
    difficulty: "medium",
    priceRange: "mid-range",
  },
  {
    id: 19,
    name: "Adidas Ultraboost 22",
    description: "Running shoes with boost technology",
    image: "https://images.pexels.com/photos/1464625/pexels-photo-1464625.jpeg",
    price: 189.99,
    category: "sports",
    brand: "Adidas",
    difficulty: "medium",
    priceRange: "mid-range",
  },
  {
    id: 20,
    name: "KitchenAid Stand Mixer",
    description: "Professional 5-quart stand mixer",
    image: "https://images.pexels.com/photos/4226796/pexels-photo-4226796.jpeg",
    price: 429.99,
    category: "household",
    brand: "KitchenAid",
    difficulty: "medium",
    priceRange: "premium",
  },
];

const seedProducts = async () => {
  console.log("SEEDED");
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Clear existing products
    await Product.deleteMany({});
    console.log("Cleared existing products");

    // Insert new products
    await Product.insertMany(products);
    console.log(`Seeded ${products.length} products`);

    process.exit(0);
  } catch (error) {
    console.error("Error seeding products:", error);
    process.exit(1);
  }
};

seedProducts();
