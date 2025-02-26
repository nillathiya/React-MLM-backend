const common = require('../helpers/common');
const bcrypt = require('bcrypt');
const { AdminUser, User } = require('../models/DB');
// const FrenchiseUser = require('../models/FrenchiseUser');
// const jwt = require('jsonwebtoken');
// const MessageService = require('../services/message-service');
// const UserOtpVerification = require('../models/UserOtpVerification');
// const controllerHelper = require('../helpers/controller');
const { PASSWORD_REGEX, ERROR_MESSAGES } = require('../helpers/constatnts');
const { ApiError } = require('../utils/apiError');
const { ApiResponse } = require('../utils/apiResponse');
// const mongoose = require('mongoose');

exports.userLogin = async (req, res, next) => {
    const { wallet } = req.body;
    try {
        const requiredFields = ["wallet"];
        const validationResult = await common.requestFieldsValidation(requiredFields, req.body);

        if (!validationResult.status) {
            throw new ApiError(400, `Missing fields: ${validationResult.missingFields.join(", ")}`);
        }

        const user = await User.findOne({ walletAddress: wallet }).select("-password");
        if (!user) {
            throw new ApiError(400, "User not found");
        }

        // Generate access token
        const token = await user.generateAccessToken();

        const cookieOptions = {
            httpOnly: true,
            sameSite: "Strict",
            secure: process.env.NODE_ENV === "production",
        };

        res.status(200)
            .cookie("accessToken", token, cookieOptions)
            .json(new ApiResponse(200, { user, token }, "You are successfully logged in"));
    } catch (error) {
        next(error);
    }
};


exports.adminLogin = async (req, res, next) => {
    const { username, password } = req.body;

    try {
        // Validate required fields
        const requiredFields = ["username", "password"];
        const validationResult = await common.requestFieldsValidation(requiredFields, req.body);

        if (!validationResult.status) {
            throw new ApiError(400, `Missing fields: ${validationResult.missingFields.join(", ")}`)
        }

        // Find admin user by username
        const admin = await AdminUser.findOne({ username });
        if (!admin) {
            throw new Error(404, "Admin user not found");
        }

        // Validate password
        const isPasswordValid = await bcrypt.compare(password, admin.password);
        if (!isPasswordValid) {
            throw new ApiError(400, "Invalid password");
        }

        // Generate access token
        const token = await admin.generateAccessToken();

        const cookieOptions = {
            httpOnly: true,
            sameSite: "Strict",
        };
        if (process.env.NODE_ENV === "production") {
            cookieOptions.secure = true;
        }
        res
            .status(200)
            .cookie("accessToken", token, cookieOptions)
            .json(new ApiResponse(
                200,
                { admin, token }, // Include token in the response data
                "Admin logged in successfully"
            ));
    } catch (error) {
        next(error);
    }
};

exports.checkWallet = async (req, res, next) => {
    const { wallet } = req.body;
    try {
        const requiredFields = ["wallet"];
        const validationResult = await common.requestFieldsValidation(requiredFields, req.body);

        if (!validationResult.status) {
            throw new ApiError(400, `Missing fields: ${validationResult.missingFields.join(", ")}`);
        }

        const userExist = await User.findOne({ walletAddress: wallet });

        return res.status(200).json(new ApiResponse(200, { exists: !!userExist }, userExist ? "User found" : "User not found"));

    } catch (error) {
        next(error);
    }
};

// exports.frenchiseUserLogin = async (req, res) => {
//     const { username, password } = req.body;

//     try {
//         // Validate required fields
//         const requiredFields = ["username", "password"];
//         const validationResult = await common.requestFieldsValidation(requiredFields, req.body);

//         if (!validationResult.status) {
//             return res.status(400).json({
//                 status: "error",
//                 message: `Missing fields: ${validationResult.missingFields.join(", ")}`,
//             });
//         }

//         // Find franchise user by username
//         const frenchiseUser = await FrenchiseUser.findOne({ username });
//         if (!frenchiseUser) {
//             return res.status(404).json({
//                 status: "error",
//                 message: "Franchise user not found",
//             });
//         }

//         // Validate password
//         const isPasswordValid = await bcrypt.compare(password, frenchiseUser.password);
//         if (!isPasswordValid) {
//             return res.status(401).json({
//                 status: "error",
//                 message: "Invalid password",
//             });
//         }

//         // Generate access token
//         const token = await frenchiseUser.generateAccessToken();

//         const cookieOptions = {
//             httpOnly: true,
//             saemSite: "Strict", // Helps prevent CSRF attacks
//         };
//         if (process.env.NODE_ENV === "production") {
//             cookieOptions.secure = true;
//         }

//         res
//             .status(200)
//             .cookie("accessToken", token, cookieOptions)
//             .json({
//                 status: "success",
//                 message: "Franchise user logged in successfully",
//                 token,
//                 data: frenchiseUser
//             });

//     } catch (error) {
//         // Handle internal server errors
//         return res.status(500).json({
//             status: "error",
//             message: "Internal Server Error",
//             error: error.message,
//         });
//     }
// };

exports.registerAdmin = async (req, res, next) => {
    try {
        const { role, username, password, email, amount, status } = req.body;

        const requiredFields = ["role", "username", "password", "email",];
        const validationResult = await common.requestFieldsValidation(requiredFields, req.body);

        if (!validationResult.status) {
            throw new ApiError(400, `Missing fields: ${validationResult.missingFields.join(", ")}`)

        }

        // Check if the email or username already exists
        const existingAdmin = await AdminUser.findOne({ $or: [{ email }, { username }] });
        if (existingAdmin) {
            throw new ApiError(400, existingAdmin.email === email
                ? "Email already exists"
                : "Username already exists");
        }

        if (!PASSWORD_REGEX.test(password)) {
            throw new ApiError(400, ERROR_MESSAGES.INVALID_PASSWORD);
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create the admin user
        const newAdmin = await AdminUser.create({
            role,
            username,
            password: hashedPassword,
            email,
            amount: amount || 0,
            status: status || 1,
        });

        // Respond with success
        return res.status(200).json(new ApiResponse(200, {
            id: newAdmin._id,
            role: newAdmin.role,
            username: newAdmin.username,
            email: newAdmin.email,
            amount: newAdmin.amount,
            status: newAdmin.status
        }, "Admin user registered successfully"))

    } catch (error) {
        next(error);
    }
};

exports.getAllAdmins = async (req, res, next) => {
    try {
        const admins = await AdminUser.find({});
        return res.status(200).json(new ApiResponse(200, admins, "Get All Admins successfully"));
    } catch (error) {
        next(error)
    }
}

exports.logout = async (req, res, next) => {
    try {
        res.clearCookie("accessToken", {
            path: "/",
            domain: process.env.NODE_ENV === "production" ? ".yourdomain.com" : undefined,
            sameSite: "Strict",
            secure: process.env.NODE_ENV === "production",
        });

        return res.status(200).json(new ApiResponse(200, {}, "Logged out successfully"));
    } catch (error) {
        next(error);
    }
};

// exports.changeUserPassword = async (req, res) => {
//     const { confirmPassword, newPassword, oldPassword } = req.body;
//     const userId = req.user._id

//     try {

//         // Validate required fields
//         const requiredFields = ["confirmPassword", "newPassword", "oldPassword"];
//         const validationResult = await common.requestFieldsValidation(requiredFields, req.body);

//         if (!validationResult.status) {
//             return res.status(400).json({
//                 status: "error",
//                 message: `Missing fields: ${validationResult.missingFields.join(", ")}`,
//             });
//         }

//         if (!PASSWORD_REGEX.test(newPassword)) {
//             return res.status(400).json({
//                 status: "error",
//                 message: ERROR_MESSAGES.INVALID_PASSWORD,
//             });
//         }


//         // Fetch the user based on role
//         let user;
//         if ([1, 3, 4].includes(req.user.role)) {
//             user = await AdminUser.findById(userId);
//         } else if (req.user.role === 2) {
//             user = await FrenchiseUser.findById(userId);
//         } else {
//             user = await User.findById(userId);
//         }

//         if (!user) {
//             return res.status(404).json({ status: "error", message: "User not found" });
//         }

//         // Validate old password
//         const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
//         if (!isOldPasswordValid) {
//             return res.status(400).json({ status: "error", message: "Invalid old password" });
//         }

//         // Validate confirm password matches new password
//         if (confirmPassword !== newPassword) {
//             return res.status(400).json({ status: "error", message: "Confirm password does not match new password" });
//         }

//         // Hash the new password
//         const hashedPassword = await bcrypt.hash(newPassword, 10);

//         // Update the user's password
//         user.password = hashedPassword;
//         await user.save();

//         return res.status(200).json({ status: "success", message: "Password changed successfully" });
//     } catch (error) {
//         return res.status(500).json({
//             status: "error",
//             message: "Internal Server Error",
//             error: error.message,
//         });
//     }
// };


// exports.impersonation = async (req, res) => {
//     const { userId } = req.body;

//     console.log("req user", req.user);
//     // Verify if the requester is an admin
//     if (!req.user || !req._IS_ADMIN_ACCOUNT) {
//         return res.status(403).json({ status: "error", message: 'Unauthorized' });
//     }

//     try {
//         // Find the user to impersonate
//         const user = await User.findById(userId);
//         if (!user) {
//             return res.status(404).json({ status: "error", message: 'User not found' });
//         }

//         // Generate a JWT token for the user
//         const token = jwt.sign(
//             { _id: user._id, impersonated: true },
//             process.env.ACCESS_TOKEN_SECRET,
//             { expiresIn: '1h' }
//         );

//         res.json({ status: "success", message: "Successfully created token", token });
//     } catch (error) {
//         res.status(500).json({ status: "error", message: 'Error impersonating user', error: error.message });
//     }
// }

// exports.checkUserToken = async (req, res) => {
//     const { token } = req.body;

//     try {
//         // Validate token presence
//         if (!token) {
//             return res.status(400).json({ status: "error", message: "Token is required" });
//         }

//         // Verify the token
//         let decodedToken;
//         try {
//             decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

//             // Ensure the user is an administrator
//             if (!decodedToken?.impersonated) {
//                 return res.status(403).json({ status: "error", message: "You must be an administrator" });
//             }
//         } catch (err) {
//             return res.status(401).json({ status: "error", message: "Invalid or expired token" });
//         }

//         // Fetch the user from the database
//         const user = await User.findById(decodedToken._id).select("-password");
//         if (!user) {
//             return res.status(404).json({ status: "error", message: "User not found" });
//         }

//         // Define secure cookie options
//         const cookieOptions = {
//             httpOnly: true,
//             sameSite: "Strict", // Prevent CSRF attacks
//             secure: process.env.NODE_ENV === "production", // Secure cookies in production
//             maxAge: 3600000, // 1 hour in milliseconds
//         };

//         // Respond with success and set the token as a cookie
//         res
//             .status(200)
//             .cookie("accessToken", token, cookieOptions)
//             .json({
//                 status: "success",
//                 message: "You are successfully logged in.",
//                 token,
//                 data: {
//                     _id: user._id,
//                     usernam: user.username,
//                     email: user.email,
//                     name: user.name,

//                 }
//             });

//     } catch (error) {
//         return res.status(500).json({
//             status: "error",
//             message: "Internal Server Error",
//             error: error.message,
//         });
//     }
// };

// exports.userForgotPassword = async (req, res) => {
//     const { countryCode, mobile, username } = req.body;

//     try {
//         // Validate required fields
//         const requiredFields = ["countryCode", "mobile", "username"];
//         const validationResult = await common.requestFieldsValidation(requiredFields, req.body);

//         if (!validationResult.status) {
//             return res.status(400).json({
//                 status: "error",
//                 message: `Missing fields: ${validationResult.missingFields.join(", ")}`,
//             });
//         }

//         // Check if the user exists
//         const user = await User.findOne({ username });
//         if (!user) {
//             return res.status(404).json({ status: "error", message: "Username is invalid" });
//         }

//         if (user?.mobile !== mobile) {
//             return res.status(404).json({ status: "error", message: "Phone number is invalid as you register" });
//         }

//         // Generate OTP
//         const otp = `${Math.floor(100000 + Math.random() * 900000)}`;

//         const fullMobile = `${countryCode}${mobile}`;
//         const formattedMobile = fullMobile.startsWith('+') ? fullMobile.slice(1) : fullMobile;

//         await UserOtpVerification.deleteMany({ userId: user._id });
//         const newOtpVerification = new UserOtpVerification({
//             userId: user._id,
//             otp,
//             expiresAt: new Date(Date.now() + 3 * 60 * 1000),
//         });
//         await newOtpVerification.save();

//         // WhatsApp message
//         const whatsappMsg = `Dear *${username}*,\n\nYou have requested to reset your password for your SwissCorp account.\n\nYour One-Time Password (OTP) is: *${otp}*\n\nPlease note: This OTP will expire in 3 minutes. Do not share this code with anyone for your account's security.\n\nIf you did not request this, please ignore this message.\n\nFor any assistance, please write to us at: support@swisscorpminer.com\n\nBest regards,\nTeam SwissCorp`;

//         // Send WhatsApp message
//         try {
//             await MessageService.sendWhatsApp(formattedMobile, whatsappMsg);
//         } catch (error) {
//             console.error("Error sending WhatsApp message:", error);
//             return res.status(500).json({
//                 status: "error",
//                 message: "Failed to send OTP. Please try again later.",
//             });
//         }

//         return res.status(200).json({
//             status: "success",
//             message: "OTP sent successfully to your WhatsApp number.",
//             data: { userId: user._id }
//         });

//     } catch (error) {
//         console.error("Error in userForgotPassword:", error);
//         return res.status(500).json({
//             status: "error",
//             message: "Internal Server Error",
//             error: error.message,
//         });
//     }
// };

// exports.verifyOtp = async (req, res) => {
//     const { otp, userId } = req.body;
//     try {
//         if (!otp) {
//             return res.status(400).json({
//                 status: "error",
//                 message: "OTP is required",
//             });
//         }
//         if (!userId) {
//             return res.status(400).json({
//                 status: "error",
//                 message: "Process OTP is Failed,Please try later",
//             });
//         }
//         const userOtpVerificationRecord = await UserOtpVerification.findOne({ userId });
//         if (!userOtpVerificationRecord) {
//             return res.status(400).json({
//                 status: "error",
//                 message: "Process OTP is Failed,Please try later",
//             });
//         }
//         const currentTime = new Date();
//         if (currentTime > userOtpVerificationRecord.expiresAt) {
//             // Remove expired OTP record
//             await UserOtpVerification.deleteOne({ userId });

//             return res.status(400).json({
//                 status: "error",
//                 message: "OTP has expired. Please request a new one.",
//             });
//         }

//         const isOtpValid = await userOtpVerificationRecord.isOtpCorrect(otp);
//         if (!isOtpValid) {
//             return res.status(400).json({
//                 status: "error",
//                 message: "Invalid OTP",
//             });
//         }
//         await UserOtpVerification.deleteOne({ userId });
//         return res.status(200).json({
//             status: "success",
//             message: "OTP is verified successfully",
//         });
//     } catch (error) {
//         return res.status(500).json({
//             status: "error",
//             message: "Internal Server Error",
//             error: error.message,
//         });
//     }
// }

// exports.resetPassword = async (req, res) => {
//     const { newPassword, userId } = req.body;
//     try {
//         if (!newPassword) {
//             return res.status(400).json({
//                 status: "error",
//                 message: "Password is required",
//             });
//         }
//         if (!userId) {
//             return res.status(400).json({
//                 status: "error",
//                 message: "Reset Password is Failed,Please try later",
//             });
//         }
//         if (!PASSWORD_REGEX.test(password)) {
//             return res.status(400).json({
//                 status: "error",
//                 message: ERROR_MESSAGES.INVALID_PASSWORD,
//             });
//         }

//         const hashedPassword = await bcrypt.hash(newPassword, 10);
//         const userExist = await User.findById(userId);
//         if (!userExist) {
//             return res.status(400).json({
//                 status: "error",
//                 message: "You are not allowed to reset password",
//             });
//         }
//         const user = await User.findByIdAndUpdate(userId, { password: hashedPassword }, { new: true });
//         if (!user) {
//             return res.status(400).json({
//                 status: "error",
//                 message: "Reset Password is Failed,Please try later",
//             });
//         }

//         return res.status(200).json({
//             status: "success",
//             message: "Password has been reset successfully",
//         });

//     } catch (error) {
//         return res.status(500).json({
//             status: "error",
//             message: "Internal Server Error",
//             error: error.message,
//         });
//     }
// }

// exports.resendOtpVerificationCode = async (req, res) => {
//     const { userId } = req.body;
//     try {
//         if (!userId) {
//             return res.status(400).json({
//                 status: "error",
//                 message: "Process OTP is Failed,Please try later",
//             });
//         }
//         const user = await User.findById(userId);
//         if (!user) {
//             return res.status(404).json({
//                 status: "error",
//                 message: "User not found",
//             });
//         }
//         const otp = `${Math.floor(100000 + Math.random() * 900000)}`;
//         const fullMobile = `${user.address.countryCode}${user.mobile}`;
//         const formattedMobile = fullMobile.startsWith('+') ? fullMobile.slice(1) : fullMobile;


//         await UserOtpVerification.deleteMany({ userId });
//         const newOtpVerification = new UserOtpVerification({
//             userId: user._id,
//             otp,
//             expiresAt: new Date(Date.now() + 3 * 60 * 1000),
//         });
//         await newOtpVerification.save();
//         const whatsappMsg = `Dear *${user.username}*,\n\nYou have requested to reset your password for your SwissCorp account.\n\nYour One-Time Password (OTP) is: *${otp}*\n\nPlease note: This OTP will expire in 3 minutes. Do not share this code with anyone for your account's security.\n\nIf you did not request this, please ignore this message.\n\
//         For any assistance, please write to us at: support@swisscorpminer.com\n\nBest regards,\nTeam SwissCorp`;

//         try {
//             await MessageService.sendWhatsApp(formattedMobile, whatsappMsg);
//         } catch (error) {
//             console.error("Error sending WhatsApp message:", error);
//             return res.status(500).json({
//                 status: "error",
//                 message: "Failed to send OTP. Please try again later.",
//             });
//         }
//         return res.status(200).json({
//             status: "success",
//             message: "OTP sent successfully to your WhatsApp number.",
//             data: { userId: user._id }
//         });

//     } catch (error) {
//         console.error("Error in resendOtpVerificationCode:", error);
//         return res.status(500).json({
//             status: "error",
//             message: "Internal Server Error",
//             error: error.message,
//         });

//     }
// }

// exports.RegisterWithOtp = async (req, res) => {
//     const { username, countryCode, mobileNumber } = req.body;
//     try {

//         // Validate required fields
//         const requiredFields = ["username", "countryCode", "mobileNumber"];
//         const validationResult = await common.requestFieldsValidation(requiredFields, req.body);

//         if (!validationResult.status) {
//             return res.status(400).json({
//                 status: "error",
//                 message: `Missing fields: ${validationResult.missingFields.join(", ")}`,
//             });
//         }

//         const userId = new mongoose.Types.ObjectId();
//         console.log("Generated userId:", userId.toString());

//         const whatsappMsg = `Dear *${username}*,\n\nWelcome to SwissCorp! Thank you for registering with us.\n\nYour One-Time Password (OTP) for account verification is: *{otp}*\n\nThis OTP is valid for 3 minutes. Please do not share this code with anyone to ensure the security of your account.\n\nIf you did not request this, please ignore this message.\n\nFor any assistance, feel free to reach out to us at: support@swisscorpminer.com\n\nBest regards,\nTeam SwissCorp`;

//         const sendOtpResponse = await controllerHelper.sendOtp(countryCode, mobileNumber, userId.toString(), whatsappMsg);

//         if (sendOtpResponse.otpSent) {
//             return res.status(200).json({
//                 status: "success",
//                 message: "OTP sent successfully to your mobile number.",
//                 data: { userId: userId.toString() },
//             });
//         } else {
//             return res.status(500).json({
//                 status: "error",
//                 message: "Failed to send OTP. Please try again later.",
//                 error: sendOtpResponse.error || "Unknown error",
//             });
//         }
//     } catch (error) {
//         console.error("RegisterWithOtp Error:", error);
//         return res.status(500).json({
//             status: "error",
//             message: "Internal Server Error",
//             error: error.message,
//         });
//     }
// }

// exports.loginWithOtp = async (req, res) => {
//     const { username, password } = req.body;

//     try {
//         // Validate required fields
//         const requiredFields = ["username", "password"];
//         const validationResult = await common.requestFieldsValidation(requiredFields, req.body);
//         if (!validationResult.status) {
//             return res.status(400).json({
//                 status: "error",
//                 message: `Missing fields: ${validationResult.missingFields.join(", ")}`,
//             });
//         }

//         // Find user
//         const user = await User.findOne({ username });
//         if (!user) {
//             return res.status(401).json({
//                 status: "error",
//                 message: "Invalid username or password"
//             });
//         }

//         // Validate password first
//         const isPasswordValid = await bcrypt.compare(password, user.password);
//         if (!isPasswordValid) {
//             return res.status(401).json({
//                 status: "error",
//                 message: "Invalid username or password"
//             });
//         }

//         // Check if user has valid contact details
//         if (!user.address?.countryCode || !user.mobile) {
//             return res.status(400).json({
//                 status: "error",
//                 message: "User does not have a valid mobile number.",
//             });
//         }

//         // Generate OTP
//         const otp = Math.floor(100000 + Math.random() * 900000); // 6-digit OTP
//         const finalUsername = user.username || "User";

//         // OTP message
//         const whatsappMsg = `Dear *${finalUsername}*,\n\nWelcome to SwissCorp! Thank you for logging in with us.\n\nYour One-Time Password (OTP) for account verification is: *${otp}*\n\nThis OTP is valid for 3 minutes. Please do not share this code with anyone.\n\nIf you did not request this, please ignore this message.\n\nFor assistance, contact support@swisscorpminer.com.\n\nBest regards,\nTeam SwissCorp`;

//         // Send OTP
//         const sendOtpResponse = await controllerHelper.sendOtp(user.address.countryCode, user.mobile, user._id, whatsappMsg);

//         if (sendOtpResponse.otpSent) {
//             return res.status(200).json({
//                 status: "success",
//                 message: "OTP sent successfully to your mobile number.",
//                 data: { userId: user._id },
//             });
//         } else {
//             return res.status(500).json({
//                 status: "error",
//                 message: "Failed to send OTP. Please try again later.",
//                 error: sendOtpResponse.error || "Unknown error",
//             });
//         }
//     } catch (error) {
//         console.error("Error in loginWithOtp:", error);
//         return res.status(500).json({
//             status: "error",
//             message: "Internal Server Error",
//             error: error.message,
//         });
//     }
// };

// exports.loginVerifyOtp = async (req, res) => {
//     const { otp, userId } = req.body;
//     try {
//         // Validate input fields
//         if (!otp) {
//             return res.status(400).json({
//                 status: "error",
//                 message: "OTP is required.",
//             });
//         }
//         if (!userId) {
//             return res.status(400).json({
//                 status: "error",
//                 message: "User ID is required to verify OTP.",
//             });
//         }

//         // Fetch OTP record
//         const userOtpVerificationRecord = await UserOtpVerification.findOne({ userId });
//         if (!userOtpVerificationRecord) {
//             return res.status(400).json({
//                 status: "error",
//                 message: "OTP verification failed. Please request a new OTP.",
//             });
//         }

//         // Check OTP expiration
//         if (new Date() > userOtpVerificationRecord.expiresAt) {
//             await UserOtpVerification.deleteOne({ userId });
//             return res.status(400).json({
//                 status: "error",
//                 message: "OTP has expired. Please request a new one.",
//             });
//         }

//         // Validate OTP
//         const isOtpValid = await userOtpVerificationRecord.isOtpCorrect(otp);
//         if (!isOtpValid) {
//             return res.status(400).json({
//                 status: "error",
//                 message: "Invalid OTP. Please try again.",
//             });
//         }

//         // Fetch user details
//         const user = await User.findById(userId);
//         if (!user) {
//             return res.status(404).json({
//                 status: "error",
//                 message: "User not found. Unable to complete login.",
//             });
//         }
//         await UserOtpVerification.deleteOne({ userId });

//         // Generate access token
//         const token = await user.generateAccessToken();
//         const cookieOptions = {
//             httpOnly: true,
//             sameSite: "Strict",
//             expires: new Date(Date.now() + 24 * 60 * 60 * 1000)
//         };
//         if (process.env.NODE_ENV === "production") {
//             cookieOptions.secure = true;
//         }

//         res
//             .status(200)
//             .cookie("accessToken", token, cookieOptions)
//             .json({
//                 status: "success",
//                 message: "You are successfully logged in.",
//                 token: token,
//                 data: user,
//             });
//     } catch (error) {
//         console.error("Error in loginVerifyOtp:", error);
//         return res.status(500).json({
//             status: "error",
//             message: "Internal Server Error",
//             error: error.message,
//         });
//     }
// };
