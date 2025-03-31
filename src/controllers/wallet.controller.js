const { Wallet, User, WalletSettings } = require("../models/DB");
const { ApiError } = require("../utils/apiError");
const { ApiResponse } = require("../utils/apiResponse");
const CryptoJS = require("crypto-js");
const envConfig = require("../config/envConfig");
const common = require("../helpers/common");

exports.createUserWallet = async (req, res, next) => {
    const { userId } = req.body;

    try {
        if (!userId) {
            throw new ApiError(400, "User ID is required");
        }
        const user = await User.findById(userId);
        if (!user) {
            throw new ApiError(404, "User not found");
        }
        const existingWallet = await Wallet.findOne({ uCode: userId });
        if (existingWallet) {
            throw new ApiError(400, "User wallet already exists");
        }

        const userWallet = await Wallet.create({ uCode: userId });

        res
            .status(201)
            .json(
                new ApiResponse(
                    201,
                    { walletId: userWallet._id },
                    "User wallet created successfully"
                )
            );
    } catch (error) {
        next(error);
    }
};

exports.update = async (req, res, next) => {
    const { slug, amount, userId } = req.body;

    try {
        const mangeWalletTransaction = await common.mangeWalletAmounts(
            userId,
            slug,
            amount
        );
        if (!mangeWalletTransaction.status) {
            throw new ApiError(400, mangeWalletTransaction.message);
        }

        const userWallet = await Wallet.findOne({ uCode: userId });

        res
            .status(201)
            .json(
                new ApiResponse(201, userWallet, "User wallet updated successfully")
            );
    } catch (error) {
        next(error);
    }
};

exports.getUserWallet = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new ApiError(403, "Unauthorized Access");
        }
        const userId = req.user._id;

        const wallet = await Wallet.findOne({ uCode: userId.toString() });

        if (!wallet) {
            throw new ApiError(404, "Wallet not found");
        }

        if (!envConfig.CRYPTO_SECRET_KEY) {
            throw new ApiError(500, "Encryption key is not defined");
        }
        // Encrypt the wallet data
        const encryptedWallet = CryptoJS.AES.encrypt(
            JSON.stringify(wallet),
            envConfig.CRYPTO_SECRET_KEY
        ).toString();

        res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    encryptedWallet,
                    "User wallet fetched successfully"
                )
            );
    } catch (error) {
        next(error);
    }
};

exports.getUserWallets = async (req, res, next) => {
    try {

        if (!req._IS_ADMIN_ACCOUNT) {
            throw new ApiError(403, "Unauthorized access");
        }

        const userWallets = await Wallet.find({});

        res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    userWallets,
                    " Use wallets fetched successfully"
                )
            );
    } catch (error) {
        next(error);
    }
};
