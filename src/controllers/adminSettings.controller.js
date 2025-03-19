const { AdminUser, AdminSettings } = require('../models/DB');
const { ApiError } = require('../utils/apiError');
const { ApiResponse } = require('../utils/apiResponse');
const common = require('../helpers/common');


exports.getSettings = async (req, res, next) => {
    try {
        if (!req._IS_ADMIN_ACCOUNT) {
            throw new ApiError(403, "Unauthorized access.");
        }

        const settingData = await AdminSettings.find({ adminStatus: 1 });

        if (!settingData) {
            throw new ApiError(404, "Get Settings data failed.");
        }

        return res.status(200).json(new ApiResponse(200, settingData, "Settings retrieved successfully."))

    } catch (err) {
        next(err)
    }
};

exports.addSetting = async (req, res, next) => {
    const postData = req.body || {}; // Ensure postData is not null
    try {
        if (!req._IS_ADMIN_ACCOUNT) {
            throw new ApiError(403, "Unauthorized access.");
        }

        const validateFields = ["title", "name", "slug", "type", "options", "value"];
        const response = await common.requestFieldsValidation(validateFields, postData);

        if (!response.status) {
            throw new ApiError(400, `Missing fields: ${response.missingFields.join(", ")}`);
        }

        const newSettingsData = {
            title: postData.title,
            name: postData.name,
            slug: postData.slug,
            type: postData.type,
            options: postData.options || "", // Ensure it's not undefined
            value: postData.value || "",     // Ensure it's not undefined
            status: postData.status || 0,
            adminStatus: postData.adminStatus || 0,
        };

        const newSetting = new AdminSettings(newSettingsData);
        await newSetting.save();

        return res.status(201).json(new ApiResponse(201, {}, "Settings added successfully."));
    } catch (error) {
        next(error);
    }
};


exports.updateAdminSettings = async (req, res, next) => {
    const { id } = req.params;
    const { value, title, label } = req.body;
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
        const updatedSetting = await AdminSettings.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        );
        return res.status(200).json(new ApiResponse(200, updatedSetting, " Admin setting updated successfully"))
    } catch (error) {
        next(error)
    }
}