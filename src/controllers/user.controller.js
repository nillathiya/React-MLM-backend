const { User, Orders } = require('../models/DB');
const bcrypt = require('bcrypt');
// const controllerHelper = require('../helpers/controller');
// const UserOtpVerification = require('../models/UserOtpVerification');
const { PASSWORD_REGEX } = require('../helpers/constatnts');
const { ApiError } = require('../utils/apiError');
const { ApiResponse } = require('../utils/apiResponse');
const crypto = require("crypto");
const CryptoJS = require("crypto-js");
const common = require('../helpers/common');
const team = require('../helpers/team');
const businessUtils = require('../helpers/businessUtils');
const mongoose = require('mongoose');
const envConfig = require('../config/envConfig');
const transaction = require('../helpers/transaction');


// Register a new user
exports.registerUser = async (req, res, next) => {
    const { wallet, sponsorUsername, phoneNumber, hash, email } = req.body;

    try {
        const requiredFields = ["wallet","email","phoneNumber","sponsorUsername","hash"];
        const validationResult = await common.requestFieldsValidation(requiredFields, req.body);

        if (!validationResult.status) {
            throw new ApiError(400, `Missing fields: ${validationResult.missingFields.join(", ")}`);
        }

        const existingUser = await User.findOne({ walletAddress: wallet });
        if (existingUser) {
            throw new ApiError(400, "User with wallet address already exists");
        }

        let sponsorUser = null;
        if (sponsorUsername) {
            sponsorUser = await User.findOne({ username: sponsorUsername });
            if (!sponsorUser) {
                throw new ApiError(400, "Sponsor username not found");
            }
        }

        const hashResult = await transaction.verify(hash, 1, wallet);
        let status = hashResult.status === "true" ? 1 : 0;
        if (status !== 1) {
            throw new ApiError(400, "Invalid Transaction");
        }
        // Generate a unique random username
        let username;
        let isUsernameTaken = true;
        while (isUsernameTaken) {
            username = `user_${crypto.randomInt(100000, 999999)}`; // Generate random number
            isUsernameTaken = await User.exists({ username }); // Check if exists
        }

        const newUser = await User.create({
            walletAddress: wallet,
            mobile: phoneNumber,
            email,
            username: username, // Assign generated username
            uSponsor: sponsorUser ? sponsorUser._id : null,
        });

        res.status(201).json(new ApiResponse(200, { userId: newUser._id, username: username }, "User registered successfully"));

    } catch (error) {
        next(error);
    }
};

exports.get = async (req, res, next) => {
    try {
        const users = await User.find({}).populate("uSponsor", "username name")
            .sort({ _id: 1 })

        res.status(200).json(new ApiResponse(200, users, "Users fetched successfully"))
    } catch (error) {
        next(error);
    }
};

exports.getUserGenerationTree = async (req, res, next) => {
    const { userId } = req.body
    try {

        if (!userId) {
            throw new ApiError("userId Not Found");
        }
        const user = await User.findById(userId);
        if (!user) {
            throw new ApiError("User Not Found");
        }

        // Recursive function to get downline users
        const getDownlineUsers = async (sponsorIds) => {
            const users = await User.find({ uSponsor: { $in: sponsorIds } })
                .select("username name uSponsor createdAt");

            if (users.length === 0) return [];

            const children = await getDownlineUsers(users.map(user => user._id));
            return [...users, ...children];
        };

        // Get downline of the logged-in user
        const downlineUsers = await getDownlineUsers([userId]);

        // Include logged-in user at the top of the response
        const allUsers = [
            {
                _id: user._id,
                username: user.username,
                name: user.name,
                uSponsor: user.uSponsor || null,
                createdAt: user.createdAt,
            },
            ...downlineUsers,
        ];

        const encryptedAllUsers = CryptoJS.AES.encrypt(JSON.stringify(allUsers), envConfig.CRYPTO_SECRET_KEY).toString();


        res.status(200).json({
            status: 200,
            data: encryptedAllUsers,
            message: "User generation hierarchy fetched successfully",
        });
    } catch (error) {
        next(error);
    }
};


exports.checkUsername = async (req, res, next) => {
    try {
        const { username } = req.body;
        const user = await User.findOne({ username });
        if (user) {
            return res.status(200).json(new ApiResponse(200, { valid: true, activeStatus: user.activeStatus }, "check username successfully"))
        } else {
            throw new ApiError(404, "Username not found")
        }
    } catch (error) {
        next(error)
    }
};

exports.getUserDirects = async (req, res, next) => {
    const vsuser = req.user
    try {
        const user = await User.findById(vsuser._id);
        if (!user) {
            return next(new ApiError(404, "User not found"));
        }

        const users = await User.find({ uSponsor: user._id }).select(
            "username name mobile accountStatus.activeStatus createdAt"
        );

        // Fetch packages asynchronously for each user
        const directs = await Promise.all(
            users.map(async (u) => {
                const packageData = await businessUtils.myPackage(u._id);
                return {
                    _id: u._id,
                    username: u.username,
                    name: u.name,
                    mobile: u.mobile,
                    package: packageData,
                    activeStatus: u.accountStatus?.activeStatus || 0,
                    createdAt: u.createdAt,
                };
            })
        );

        res.status(200).json(new ApiResponse(200, directs, "User directs fetched successfully"));
    } catch (error) {
        next(error);
    }
};

exports.getUserDetailsWithInvestmnetInfo = async (req, res, next) => {
    const { userId } = req.body;
    try {
        if (!userId) {
            throw new ApiError(404, "UserId not found");
        }
        const user = await User.findById(userId).populate("uSponsor", "username name");

        const order = await Orders.aggregate([
            { $match: { customerId: new mongoose.Types.ObjectId(userId) } },
            { $group: { _id: null, totalAmount: { $sum: "$bv" } } }
        ]);

        const userDetails = {
            user,
            totalInvestment: order.length > 0 ? order[0].totalAmount : 0,
        };

        const encryptedUserDetails = CryptoJS.AES.encrypt(JSON.stringify(userDetails), envConfig.CRYPTO_SECRET_KEY).toString();

        return res.status(200).json(new ApiResponse(200, encryptedUserDetails, "Get user details with investment info"));

    } catch (error) {
        next(error);
    }
}

exports.updateUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const updatedData = req.body;
        console.log("updatedData", updatedData);

        const updateFields = {};

        const user = await User.findById(id);
        if (!user) {
            throw new ApiError(404, "User not found")
        }

        // Handle OTP verification if `editProfileWithOTP` is true
        if (updatedData.editProfileWithOTP) {
            const otpMsg = `Dear *${user.username}*,\n\nYour OTP for verifying ${updatedData.mobile ? "your mobile number change" : "your new mobile number"
                } is: *{otp}*\n\nDo not share this code.\n\nBest,\nTeam SwissCorp`;

            const mobile = updatedData.updatedMobile?.mobile || user.mobile;
            const countryCode = updatedData.updatedMobile?.countryCode || user.address?.countryCode;

            if (!mobile) {
                return res.status(400).json({ status: "error", message: "User does not have a registered mobile number." });
            }

            const sendOtpResponse = await controllerHelper.sendOtp(countryCode, mobile, id.toString(), otpMsg);

            if (sendOtpResponse.otpSent) {
                return res.status(200).json({
                    status: "success",
                    message: "OTP sent successfully to your mobile number.",
                    data: { userId: id.toString() },
                });
            }
            return res.status(500).json({ status: "error", message: "Failed to send OTP.", error: sendOtpResponse.error || "Unknown error" });
        }

        // Validate and hash password if provided
        if (updatedData.password) {
            if (!PASSWORD_REGEX.test(updatedData.password)) {
                throw new ApiError(400, "Password must be 8-16 characters long and contain only letters and numbers.");
            }
            updateFields.password = await bcrypt.hash(updatedData.password, 10);
        }

        // Check for existing user with the same email, username, or mobile (excluding self)
        const existingUser = await User.findOne({
            _id: { $ne: id },
            $or: [
                updatedData.email ? { email: updatedData.email } : null,
                updatedData.username ? { username: updatedData.username } : null,
                updatedData.mobile ? { mobile: updatedData.mobile } : null,
            ].filter(Boolean),
        });

        console.log(existingUser);

        if (existingUser) {
            let message = "";
            if (existingUser.email === updatedData.email) message = "Email already exists";
            if (existingUser.username === updatedData.username) message = "Username already exists";
            if (existingUser.mobile === updatedData.mobile) message = "Mobile already exists";

            throw new ApiError(400, message);
        }

        // Convert stringified JSON fields into objects
        ["accountStatus", "emailVerification"].forEach((field) => {
            if (typeof updatedData[field] === "string") {
                try {
                    updatedData[field] = JSON.parse(updatedData[field]);
                } catch (error) {
                    console.error(`Invalid JSON for ${field}:`, error);
                }
            }
        });

        // Dynamically update nested fields
        Object.entries(updatedData.accountStatus || {}).forEach(([key, value]) => {
            updateFields[`accountStatus.${key}`] = value;
        });

        Object.entries(updatedData.emailVerification || {}).forEach(([key, value]) => {
            updateFields[`emailVerification.${key}`] = value;
        });

        if (updatedData.adminRegisterStatus !== undefined) {
            updateFields.adminRegisterStatus = updatedData.adminRegisterStatus;
        }

        // Handle address updates
        Object.entries(updatedData.address || {}).forEach(([key, value]) => {
            updateFields[`address.${key}`] = value;
        });

        // Update basic fields dynamically
        ["username", "name", "email", "mobile", "gender", "dateOfBirth", "uSponsor"].forEach((field) => {
            if (updatedData[field] !== undefined) {
                updateFields[field] = updatedData[field];
            }
        });

        const updatedUser = await User.findByIdAndUpdate(id, updateFields, { new: true });

        if (!updatedUser) {
            throw new ApiError(400, "User not found");
        }

        return res.status(200).json(new ApiResponse(200, updatedUser, "User updated successfully"))

    } catch (error) {
        next(error)
    }
};

const transformRequestBody = (body) => {
    const transformedBody = { ...body };

    // Construct address only if it contains valid data
    const address = {};

    if (body["address.line1"]) address.line1 = body["address.line1"];
    if (body["address.line2"]) address.line2 = body["address.line2"];
    if (body["address.countryCode"]) address.countryCode = body["address.countryCode"];

    if (body["address.city"] && body["address.city"] !== "null") {
        try {
            address.city = JSON.parse(body["address.city"]);
        } catch (error) {
            address.city = body["address.city"];
        }
    }

    if (body["address.state"] && body["address.state"] !== "null") {
        try {
            address.state = JSON.parse(body["address.state"]);
        } catch (error) {
            address.state = body["address.state"];
        }
    }

    if (body["address.country"] && body["address.country"] !== "null") {
        try {
            address.country = JSON.parse(body["address.country"]);
        } catch (error) {
            address.country = body["address.country"];
        }
    }

    if (Object.keys(address).length > 0) {
        transformedBody.address = address;
    }

    // Remove old flat keys to avoid conflicts
    delete transformedBody["address.line1"];
    delete transformedBody["address.line2"];
    delete transformedBody["address.countryCode"];
    delete transformedBody["address.city"];
    delete transformedBody["address.state"];
    delete transformedBody["address.country"];

    return transformedBody;
};

exports.updateUserProfile = async (req, res, next) => {
    try {
        const userId = req._IS_ADMIN_ACCOUNT ? req.body.userId : req.user?._id;

        if (!userId) {
            throw new ApiError(401, "Unauthorized. Please provide a valid user ID.");
        }

        // console.log("Raw Request Body:", req.body);

        const updatedData = transformRequestBody(req.body);
        // console.log("Transformed Data:", updatedData);

        const updateFields = { ...updatedData };
        // Handle password update
        if (req.body.password) {
            const salt = await bcrypt.genSalt(10);
            updateFields.password = await bcrypt.hash(req.body.password, salt);
        }
        // Ensure rank is only updated if it's different
        if (req.body.rank !== undefined) {
            const newRank = Number(req.body.rank);
            if (req.user.myRank !== newRank) {
                updateFields.myRank = newRank;
            }
        }

        if (req.file) {
            updateFields.profilePicture = `/uploads/${req.file.filename}`;
        }

        // Ensure only provided fields are updated
        const user = await User.findByIdAndUpdate(userId, { $set: updateFields }, { new: true });

        if (!user) {
            throw new ApiError(404, "User not found");
        }

        return res.status(200).json(new ApiResponse(200, user, "User profile updated"));

    } catch (error) {
        console.error("Error updating user:", error);
        next(error);
    }
};


exports.getUserById = async (req, res, next) => {
    const { userId } = req.body;
    try {
        const user = await User.findById(userId);
        if (!user) {
            throw new ApiError(404, "User not found");
        }
        return res.status(200).json(new ApiResponse(200, user, "Get user successfully"))
    } catch (error) {
        next(error);
    }
}

// // Delete user
// exports.deleteUser = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const deletedUser = await User.findByIdAndDelete(id);
//         if (!deletedUser) {
//             return res.status(404).json({ status: "error", message: "User not found" });
//         }
//         res.status(200).json({ status: "success", message: "User deleted  successfully", data: deletedUser });
//     } catch (error) {
//         res.status(500).json({ status: "error", message: "Internal server error", error: error.message });
//     }
// };

// exports.editProfileWithOTP = async (req, res) => {
//     const { userId } = req.body;
//     try {

//         if (!userId) {
//             return res.status(400).json({ status: "error", message: "User ID is required" });
//         }

//         const user = await User.findById(userId);
//         if (!user) {
//             return res.status(404).json({ status: "error", message: "User not found" });
//         }

//         const whatsappMsg = `Dear *${user.username}*,\n\nWelcome to SwissCorp! Thank you for registering with us.\n\nYour One-Time Password (OTP) for account verification is: *{otp}*\n\nThis OTP is valid for 3 minutes. Please do not share this code with anyone to ensure the security of your account.\n\nIf you did not request this, please ignore this message.\n\nFor any assistance, feel free to reach out to us at: support@swisscorpminer.com\n\nBest regards,\nTeam SwissCorp`;

//         const sendOtpResponse = await controllerHelper.sendOtp(user.address.countryCode, user.mobile, userId.toString(), whatsappMsg);

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

// // exports.editProfileWithEmailVerification = async (req, res) => {
// //     const { userId } = req.body;
// //     try {
// //         if (!userId) {
// //             return res.status(400).json({ status: "error", message: "User ID is required" });
// //         }
// //         const user = await User.findById(userId);
// //         if (!user) {
// //             return res.status(404).json({ status: "error", message: "User not found" });
// //         }
// //         const verifyEmailUrl = `${process.env.APP_URL}/verify-email/${user._id}`;
// //         const whatsappMsg = `Dear *${user.username}*,\n\nWelcome to SwissCorp! Thank you for registering with us.\n\nPlease verify your email by clicking on the following link:\n\n*${verifyEmailUrl}*\n\nThis link is valid for 24 hours. If you did not request this, please ignore this message.\n\nFor any assistance, feel free to reach out to us at:
// //         support@swisscorpminer.com\n\nBest regards,\nTeam SwissCorp`;
// //         const sendEmailResponse = await controllerHelper.sendEmail(user.email, "Verify your email address", whatsappMsg);
// //         if (sendEmailResponse.emailSent) {
// //             return res.status(200).json({
// //                 status: "success",
// //                 message: "Email verification link sent successfully to your email address.",
// //                 data: { userId: userId.toString() },
// //             });
// //         } else {
// //             return res.status(500).json({
// //                 status: "error",
// //                 message: "Failed to send email verification link. Please try again later.",
// //                 error: sendEmailResponse.error || "Unknown error",
// //             });
// //         }
// //         // TODO: Implement email verification process
// //         // const verificationToken = jwt.sign({ userId: userId }, process.env.JWT_SECRET, { expiresIn: "24h" });
// //         // const verifyEmailUrl = `${process.env.APP_URL}/verify-email/${userId}/${verificationToken}`;
// //         // await sendEmail(user.email, "Verify your email address", `Please verify your email by clicking on the following link:\n\n${verifyEmailUrl}\n\nThis link is valid for 24 hours.`);
// //     } catch (error) {
