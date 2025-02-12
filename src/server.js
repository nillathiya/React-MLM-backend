require('module-alias/register');
require("dotenv").config();
const express = require("express");
const http = require("http");
const path = require("path");
const socketIo = require("socket.io");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
const routes = require("./routes");
const { handleFileUploadError } = require("./utils/multer");
const {errorMiddleware}=require('./middlewares/error.middleware');
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: [
            "https://test.swisscorpminer.com",
            "https://admin.swisscorpminer.com",
            "http://localhost:3000",
            "http://localhost:5173",
        ],
        methods: ["GET", "POST", "DELETE", "PUT"],
        credentials: true,
    },
});

// Store io globally
global.io = io;

// Initialize socket handlers
require("./sockets/socketHandlers")(io);

// Middleware setup
app.use(
    cors({
        origin: [
            "https://test.swisscorpminer.com",
            "https://admin.swisscorpminer.com",
            "http://localhost:3000",
            "http://localhost:5173",
        ],
        methods: ["GET", "POST", "DELETE", "PUT"],
        credentials: true,
    })
);
app.use(express.json());
app.use(cookieParser());

// Serve static files
app.use("/uploads", express.static(path.join(__dirname, "../public/uploads")));

// Connect to DB
connectDB();
// API Routes
app.use(routes);

// Error handling middleware
app.use(handleFileUploadError);
app.use(errorMiddleware);

const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));

module.exports = app;
