const mongoose = require("mongoose");
const envConfig = require("./envConfig");

const connectDB = async () => {
  try {
    await mongoose.connect(envConfig.MONGO_URI);
    console.log("MongoDB connected");
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

module.exports = connectDB;