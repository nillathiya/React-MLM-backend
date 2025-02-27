const User = require('../models/User');
const bcrypt = require('bcrypt');
// const controllerHelper = require('../helpers/controller');
// const UserOtpVerification = require('../models/UserOtpVerification');
const { PASSWORD_REGEX } = require('../helpers/constatnts');
const { ApiError } = require('../utils/apiError');
const { ApiResponse } = require('../utils/apiResponse');
const crypto = require("crypto");
const common = require('../helpers/common');

// Register a new user
exports.registerUser = async (req, res, next) => {
    const { wallet, sponsorUsername } = req.body;

    try {
        const requiredFields = ["wallet"];
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

        // Generate a unique random username
        let username;
        let isUsernameTaken = true;
        while (isUsernameTaken) {
            username = `user_${crypto.randomInt(100000, 999999)}`; // Generate random number
            isUsernameTaken = await User.exists({ username }); // Check if exists
        }

        const newUser = await User.create({
            walletAddress: wallet,
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
        const {
            searchterm,
            status,
            isActive,
            blockStatus,
            limit = 2,
            page = 1,
            includeTotalMachine = "false",
        } = req.query;

        // Validate and set pagination defaults
        const itemsPerPage = Math.max(parseInt(limit, 10) || 2, 1);
        const currentPage = Math.max(parseInt(page, 10) || 1, 1);

        const filterConditions = {};

        if (status) {
            filterConditions.status = { $regex: status, $options: 'i' };
        }
        if (isActive !== undefined) {
            filterConditions['accountStatus.isActive'] = isActive === '1' ? 'true' : 'false';
        }

        if (blockStatus !== undefined) {
            filterConditions['accountStatus.blockStatus'] = blockStatus === '1' ? 'true' : 'false';
        }

        // Search across multiple fields
        if (searchterm) {
            filterConditions.$or = [
                { name: { $regex: searchterm, $options: 'i' } },
                { email: { $regex: searchterm, $options: 'i' } },
                { mobile: { $regex: searchterm, $options: 'i' } },
                { username: { $regex: searchterm, $options: 'i' } },
            ];
        }

        // Fetch users with filters and pagination
        const users = await User.find(filterConditions)
            .sort({ createdAt: -1 })
            .skip((currentPage - 1) * itemsPerPage)
            .limit(itemsPerPage);

        const totalRecords = await User.countDocuments(filterConditions);

        let updatedUsers = users;

        if (includeTotalMachine === 'true') {
            const userPromises = users.map(async (user) => {
                const { userTotalMachines } = await controllerHelper.getUserTotalMachine(user._id);
                const userObj = user.toObject();
                userObj.userTotalMachine = userTotalMachines;
                return userObj;
            });
            updatedUsers = await Promise.all(userPromises);
        }

        res.status(200).json(new ApiResponse(200, updatedUsers, "Users fetched successfully", {
            totalRecords,
            totalPages: Math.ceil(totalRecords / itemsPerPage),
            currentPage,
            itemsPerPage,
        }))

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

// exports.getById = async (req, res) => {
//     const { id } = req.params;

//     try {
//         if (!id) {
//             return res.status(400).json({
//                 status: "error",
//                 message: "ID parameter is required"
//             });
//         }
//         const user = await User.findById(id);

//         if (!user) {
//             return res.status(404).json({
//                 status: "error",
//                 message: "User not found"
//             });
//         }
//         return res.status(200).json({
//             status: "success",
//             message: "User retrieved successfully",
//             data: user
//         });
//     } catch (error) {
//         return res.status(500).json({
//             status: "error",
//             message: "Internal server error",
//             error: error.message
//         });
//     }
// };

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
