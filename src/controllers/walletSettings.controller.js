const { ApiError } = require('../utils/apiError');
const { ApiResponse } = require('../utils/apiResponse');
const common = require('../helpers/common');
const { WalletSettings } = require('../models/DB');

exports.getWalletSettings = async (req, res, next) => {
    try {
        const settings = await WalletSettings.find({});
        return res.status(200).json(new ApiResponse(200, settings, "settings get successfully"));
    } catch (err) {
        next(err);
    }
};

exports.createWalletSettings = async (req, res, next) => {
    try {
        const postData = req.body;

        const validateFields = [
            "slug",
            "name",
            "wallet",
            "type",
        ];
        const response = await common.requestFieldsValidation(
            validateFields,
            postData
        );

        if (!response.status) {
            throw new ApiError(400, `Missing fields: ${response.missingFields.join(", ")}`)
        }

        // Create new wallet setting
        const newWalletSetting = new WalletSettings({
            parentId: postData.parentId || null,
            slug: postData.slug,
            name: postData.name,
            wallet: postData.wallet,
            type: postData.type,
            binary: postData.binary || 0,
            matrix: postData.matrix || 0,
            universal: postData.universal || 0,
            singleLeg: postData.singleLeg || 0,
        });

        // Save to database
        await newWalletSetting.save();

        return res.status(200).json(new ApiResponse(200, newWalletSetting, "Wallet Setting created successfully"));

    } catch (error) {
        next(error);
    }
};


exports.updateWalletSettings = async (req, res, next) => {
    try {
        if (!req._IS_ADMIN_ACCOUNT) {
            throw new ApiError(403, "Unauthorized access");
        }
        const { id } = req.body;
        const updateData = req.body;

        const walletSetting = await WalletSettings.findById(id);
        if (!walletSetting) {
            throw new ApiError(404, "Wallet setting not found");
        }

        Object.assign(walletSetting, updateData);
        await walletSetting.save();

        return res.status(200).json(new ApiResponse(200, walletSetting, "Wallet Setting updated successfully"));
    } catch (error) {
        next(error);
    }
};
