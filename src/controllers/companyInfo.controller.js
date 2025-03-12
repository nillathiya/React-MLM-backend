const { CompanyInfo } = require('../models/DB');
const common = require('../helpers/common');
const { ApiResponse } = require('../utils/apiResponse');
const { ApiError } = require('../utils/apiError');

exports.create = async (req, res, next) => {

    const { title, label, value, type } = req.body;

    try {
        const validateFields = ["title", "label", "value", "type"];

        const response = await common.requestFieldsValidation(
            validateFields,
            req.body
        );

        if (!response.status) {
            throw new ApiError(400, `Missing fields: ${response.missingFields.join(", ")}`);
        }

        const exist = await CompanyInfo.findOne({ label });
        if (exist) {
            throw new ApiError(400, "Company Info already exist")
        }
        const created = await CompanyInfo.create({ title, label, value, type });
        return res.status(201).json(new ApiResponse(200, created, "Company info created successfully"))

    } catch (error) {
        next(error)
    }
};

exports.getAllCompanyInfo = async (req, res, next) => {
    try {
        const data = await CompanyInfo.find({});
        return res.status(200).json(new ApiResponse(200, data, "Get All Company info successfully"));
    } catch (error) {
        next(error)
    }
}
exports.updateCompanyInfo = async (req, res, next) => {
    const { id } = req.params;
    const { value, title, label } = req.body;
    const file = req.file;

    // console.log("id:", id);
    // console.log("Received req.body:", req.body);
    // console.log("Received file:", file);

    try {

        if (!req._IS_ADMIN_ACCOUNT) {
            throw new ApiError(403, "UnAuthorized Access");
        }
        let updateData = {};

        if (file) {
            updateData.value = `/uploads/${file.filename}`;
        }
        if (value) {
            updateData.value = value;
        } if (title) {
            updateData.title = title;
        } if (label) {
            updateData.label = label;
        }
        const updatedInfo = await CompanyInfo.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        );

        if (!updatedInfo) {
            throw new ApiError(404, "Company Info not found");
        }

        return res.status(200).json(new ApiResponse(200, updatedInfo, "Company Info updated successfully"))

    } catch (error) {
        next(error);
    }
};

exports.deleteCompanyInfo = async (req, res, next) => {
    const { settingId } = req.body;
    try {
        if (!req._IS_ADMIN_ACCOUNT) {
            throw new ApiError(403, "UnAuthorized Access");
        }
        if (!settingId) {
            throw new ApiError(404, "SettingId is Required")
        }
        const deletedCompanyInfo = await CompanyInfo.findByIdAndDelete(settingId);
        return res.status(200).json(new ApiResponse(200, deletedCompanyInfo, "CompanyInfo Deleted successfully"));
    } catch (error) {
        next(error)
    }
}