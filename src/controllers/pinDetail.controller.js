const { PinDetail } = require('../models/DB');
const { ApiError } = require('../utils/apiError');
const { ApiResponse } = require('../utils/apiResponse');
const common = require('../helpers/common');

exports.createPinDetail = async (req, res, next) => {
    const postData = req.body;
    try {
        if (!req._IS_ADMIN_ACCOUNT) {
            throw new ApiError(403, "You are not authorized to perform this action");
        }
        const validateFields = ["pinType", "pinRate"];

        const response = await common.requestFieldsValidation(
            validateFields,
            postData
        );

        if (!response.status) {
            throw new ApiError(400, `Missing fields: ${response.missingFields.join(", ")}`)

        }

        const pinDetail = new PinDetail(postData);
        const result = await pinDetail.save();

        return res.status(200).json(new ApiResponse(200, {}, "PinDeatil created successfully"));
    } catch (err) {
        next(err);
    }
};

exports.getPinDetails = async (req, res, next) => {
    try {
        const pinDetails = await PinDetail.find({});

        return res.status(200).json(new ApiResponse(200, pinDetails, "PinDeatil created successfully"));
    } catch (err) {
        next(err);
    }
};