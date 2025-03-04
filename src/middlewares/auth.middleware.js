const common = require("../helpers/common");
const { ApiError } = require('../utils/apiError');
const { ApiResponse } = require('../utils/apiResponse');

const verifyJwt = async (req, res, next) => {
  try {
    // console.log("Cookies Received:", req.cookies);
    // console.log("Cookies Received:", req.cookies?.accessToken);
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");
    // console.log(token);

    if (!token) {
      throw new ApiError(401, "Unauthorized access: No token provided")
    }

    try {
      // Decode and fetch the user using the Common helper
      const user = await common.getUserByJwt(token);
      // console.log(user);

      if (!user) {
        throw new ApiError(400, "Invalid access token: User not found");
      }

      // if ( !user.status) {
      //   return res.status(403).json({
      //     status: "error",
      //     message: "Access Denied: Account is deactivated",
      //   });
      // }

      // Attach user and admin flag to the request object
      req.user = user;
      req._IS_ADMIN_ACCOUNT = [1, 3, 4].includes(user.role);

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
