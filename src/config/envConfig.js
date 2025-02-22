require("dotenv").config();

const envConfig = {
    APP_ENV: process.env.NODE_ENV || "development",
    PORT: process.env.PORT || 5000,

    // Database
    MONGO_URI: process.env.MONGO_URI,

    // Authentication
    ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET,
    ACCESS_TOKEN_EXPIRY: process.env.ACCESS_TOKEN_EXPIRY || "7d",

    // Whatsapp message
    WHATSLINE_API_KEY: process.env.WHATSLINE_API_KEY,
    WHATSLINE_AUTH_KEY: process.env.WHATSLINE_AUTH_KEY,

    // Connect wallet
    WEB3_API_KEY: process.env.WEB3_API_KEY,

    // Security & Encryption
    CRYPTO_SECRET_KEY: process.env.CRYPTO_SECRET_KEY,
};

module.exports = envConfig;
