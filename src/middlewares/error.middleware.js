const { ApiError } = require("../utils/apiError");

const errorMiddleware = (err, req, res, next) => {
  console.error("Error Log:", err); // Keep for debugging

  // Handle Mongoose Validation Errors
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      status: "error",
      message: "Validation Error",
      errors,
    });
  }

  // Handle MongoDB Duplicate Key Error (11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0]; 
    return res.status(400).json({
      status: "error",
      message: `${field} must be unique.`,
    });
  }

  // Handle Custom API Errors
  if (err instanceof ApiError) {
    return res.status(err.statusCode || 500).json({
      status: "error",
      message: err.message || "Server Error",
      errors: err.errors || [],
    });
  }

  // Default Internal Server Error
  return res.status(500).json({
    status: "error",
    message: err.message || "Internal Server Error",
  });
};

module.exports = { errorMiddleware };
