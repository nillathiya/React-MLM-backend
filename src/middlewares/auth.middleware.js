const common = require("../helpers/common");
const { ApiError } = require('../utils/apiError');
const { ApiResponse } = require('../utils/apiResponse');

const verifyJwt = async (req, res, next) => {
  try {
    const userToken = req.cookies?.userToken || null;
    const adminToken = req.cookies?.adminToken || null;
    const authHeader = req.header("Authorization")?.replace("Bearer ", "") || null;

    // Determine which token to use
    let token = null;
    let tokenType = null;
    
    if (authHeader) {
      token = authHeader;
      tokenType = "header";
    } else if (adminToken) {
      token = adminToken;
      tokenType = "admin";
    } else if (userToken) {
      token = userToken;
      tokenType = "user";
    }
    if (!token) {
      throw new ApiError(401, "Unauthorized access: No token provided")
    }

    try {
      // Decode and fetch the user using the Common helper
      const user = await common.getUserByJwt(token);
      console.log("login user:",user);

      if (!user) {
        throw new ApiError(400, "Invalid access token: User not found");
      }

      const isAdmin = [1, 3, 4].includes(user.role);

      req.user = user;
      req._IS_ADMIN_ACCOUNT = isAdmin;
      req.tokenType = tokenType;

      next();
    } catch (error) {
      console.log("Token is Expired");
      throw new ApiError(401, error.message || "Invalid access token");
    }
  } catch (error) {
    next(error);
  }
};

module.exports = { verifyJwt };
