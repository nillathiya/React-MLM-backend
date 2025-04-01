const { UserSettings } = require("../models/DB");
const { ApiError } = require("../utils/apiError");
const { ApiResponse } = require("../utils/apiResponse");

exports.getUserSettings = async (req, res, next) => {
  try {
    if (req._IS_ADMIN_ACCOUNT) {
      const settings = await UserSettings.find({ adminStatus: 1 });
      return res
        .status(200)
        .json(new ApiResponse(200, settings, "Get user setting successfully"));
    }
    const settings = await UserSettings.find({ status: 1 });
    return res
      .status(200)
      .json(new ApiResponse(200, settings, "Get user setting successfully"));
  } catch (error) {
    next(error);
  }
};

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
    }
    if (title) {
      updateData.title = title;
    }
    if (label) {
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
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          updatedSetting,
          " User setting updated successfully"
        )
      );
  } catch (error) {
    next(error);
  }
};

exports.createUserSetting = async (req, res, next) => {
  const { title, name, slug, options, value, type, status, adminStatus } = req.body;

  try {
    // Check if the setting already exists
    const existingSetting = await UserSettings.findOne({ slug });
    if (existingSetting) {
      return res.status(400).json({ message: "Setting with this slug already exists" });
    }
    // Create a new setting
    const newSetting = new UserSettings({
      title,
      name,
      slug,
      options,
      value,
      type,
      status,
      adminStatus
    });

    await newSetting.save();
    res.status(201).json(new ApiResponse(201, newSetting, "Setting Created!"));
  } catch (error) {
    next(error);
  }
};
