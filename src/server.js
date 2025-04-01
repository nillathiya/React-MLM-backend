require('module-alias/register');
require("dotenv").config({ path: ".env.development.local" });
const express = require("express");
const http = require("http");
const path = require("path");
const socketIo = require("socket.io");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
const routes = require("./routes");
const { handleFileUploadError } = require("./utils/multer");
const { errorMiddleware } = require('./middlewares/error.middleware');
const cors = require("cors");
const envConfig = require("./config/envConfig");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: [
            "https://bitx.kxtrade.org",
            "https://bitxadmin.kxtrade.org",
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
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: [
        "https://bitx.kxtrade.org",
        "https://bitxadmin.kxtrade.org",
        "http://localhost:3000",
        "http://localhost:5173",
    ],
    credentials: true,  // ✅ Ensures cookies are sent
    methods: ["GET", "POST", "DELETE", "PUT"],
}));

// Serve static files
app.use("/uploads", express.static(path.join(__dirname, "../public/uploads")));

// Connect to DB
connectDB();
// API Routes
app.use(routes);

// Error handling middleware
app.use(handleFileUploadError);
app.use(errorMiddleware);

const PORT = envConfig.PORT;
server.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));

module.exports = app;
