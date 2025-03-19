const { UserSettings } = require('../models/DB');
const { ApiError } = require('../utils/apiError');
const { ApiResponse } = require('../utils/apiResponse');

exports.getUserSettings = async (req, res, next) => {
    try {
        if (req._IS_ADMIN_ACCOUNT) {
            const settings = await UserSettings.find({ adminStatus: 1 });
            return res.status(200).json(new ApiResponse(200, settings, "Get user setting successfully"))
        }
        const settings = await UserSettings.find({ status: 1 });
        return res.status(200).json(new ApiResponse(200, settings, "Get user setting successfully"))
    } catch (error) {
        next(error)
    }
}

exports.updateUserSettings = async (req, res, next) => {
    const { id } = req.params;
    const { value, title, label, options } = req.body;
    try {
        if (!req._IS_ADMIN_ACCOUNT) {
            throw new ApiError(403, "UnAuthorized Access");
        }

        let updateData = {};


        if (value) {
            updateData.value = value;
        } if (title) {
            updateData.title = title;
        } if (label) {
            updateData.label = label;
        }
        if (options) {
            updateData.options = options;
        }
        const updatedSetting = await UserSettings.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        );
        return res.status(200).json(new ApiResponse(200, updatedSetting, " User setting updated successfully"))
    } catch (error) {
        next(error)
    }
}