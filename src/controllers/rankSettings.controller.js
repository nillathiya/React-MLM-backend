const { RankSettings, User, Plan } = require('../models/DB');
const businessUtils = require('../helpers/businessUtils');
const team = require('../helpers/team');
const common = require('../helpers/common');
const { ApiResponse } = require('../utils/apiResponse');
const { ApiError } = require('../utils/apiError');
const mongoose = require('mongoose');

// Create new rank setting (column)
exports.createRankSetting = async (req, res, next) => {
    const { title, value } = req.body;

    try {
        if (!req._IS_ADMIN_ACCOUNT) {
            throw new ApiError(403, "Unauthorized access");
        }

        // Required Fields Validation
        const validateFields = ["title", "value"];
        const response = await common.requestFieldsValidation(validateFields, { title, value });

        if (!response?.status) {
            throw new ApiError(400, `Missing fields: ${response?.missingFields?.join(", ")}`);
        }

        // Ensure title exists before generating slug
        if (!title || typeof title !== "string") {
            throw new ApiError(400, "Title is required and must be a string");
        }

        const slug = common.generateSlug(title);

        const newSetting = new RankSettings({ title, slug, value });
        await newSetting.save();

        return res.status(201).json(new ApiResponse(201, newSetting, "Rank setting created successfully"));
    } catch (error) {
        next(error);
    }
};


exports.updateRankSetting = async (req, res, next) => {
    try {
        const updatedData = req.body;

        if (!req._IS_ADMIN_ACCOUNT) {
            throw new ApiError(403, "Unauthorized access");
        }

        // Required Fields Validation
        const validateFields = ["title", "value",];
        const response = await common.requestFieldsValidation(validateFields, updatedData);

        if (!response.status) {
            throw new ApiError(400, `Missing fields: ${response.missingFields.join(", ")}`);
        }

        if (updatedData.title) {
            updatedData.slug = common.generateSlug(updatedData.title);
        }

        const updatedSetting = await RankSettings.findByIdAndUpdate(req.params.id, updatedData, { new: true });


        if (!updatedSetting) {
            throw new ApiError(404, "Rank setting not found");
        }

        return res.status(200).json(new ApiResponse(200, updatedSetting, "Rank setting updated successfully"));
    } catch (error) {
        next(error);
    }
};

exports.getRankSettings = async (req, res, next) => {
    try {
        const filter = {};
        if (req.query.status) {
            filter.status = req.query.status;
        }

        const rankSettings = await RankSettings.find(filter).sort({ createdAt: -1 });

        return res.status(200).json(
            new ApiResponse(200, rankSettings, "Rank settings fetched successfully")
        );
    } catch (error) {
        next(error);
    }
};

// Delete rank setting (column)
exports.deleteRankSetting = async (req, res, next) => {
    try {
        const setting = await RankSettings.findByIdAndDelete(req.params.id);
        if (!setting) {
            throw new ApiError(404, "Rank setting not found");
        }
        return res.status(200).json(
            new ApiResponse(200, {}, 'Rank setting deleted')
        );
    } catch (error) {
        next(error)
    }
};

exports.deleteRow = async (req, res, next) => {
    try {
        const { rowIndex } = req.body;

        if (typeof rowIndex !== "number" || rowIndex < 0) {
            throw new ApiError(400, "Invalid row index");
        }

        // Find all RankSettings documents
        const settings = await RankSettings.find();
        if (!settings.length) {
            throw new ApiError(404, "No settings found");
        }

        // Remove the value at the given index for all settings
        settings.forEach((setting) => {
            if (Array.isArray(setting.value) && rowIndex < setting.value.length) {
                setting.value.splice(rowIndex, 1);
            }
        });

        // Save all updated documents
        await Promise.all(
            settings.map(async (setting) => {
                try {
                    await setting.save();
                } catch (error) {
                    throw new ApiError(500, 'Error saving changes');
                }
            })
        );

        return res.status(200).json(new ApiResponse(200, settings, "Row deleted successfully from all settings"));
    } catch (error) {
        next(error);
    }
};

exports.saveRow = async (req, res, next) => {
    try {
        const { rowIndex, rowData } = req.body;

        if (typeof rowIndex !== 'number' || rowIndex < 0) {
            throw new ApiError(400, 'Invalid row index');
        }

        const settings = await RankSettings.find();
        if (!settings.length) {
            throw new ApiError(404, 'No settings found');
        }

        settings.forEach((setting) => {
            rowData.forEach(({ slug, value }) => {
                if (setting.slug === slug) {
                    while (setting.value.length <= rowIndex) {
                        setting.value.push('');
                    }
                    setting.value[rowIndex] = value;
                }
            });
        });


        await Promise.all(settings.map((setting) => setting.save()));

        return res.status(200).json(new ApiResponse(200, settings, 'Row updated successfully'));
    } catch (error) {
        next(error);
    }
};

exports.getUserRankAndTeamMetrics = async (req, res, next) => {
    const vsuser = req.user;
    try {
        const user = await User.findById(vsuser._id);
        if (!user) {
            throw new ApiError(404, "User not found");
        }
        const userId = user._id;

        // Fetch rank settings
        const rankSettings = await RankSettings.find();
        const selfPackage = await businessUtils.myPackage(userId); // self-business
        const myActives = await team.myActiveDirects(userId);
        const myDirectTeam = myActives.length; // direct-team
        const directBusiness = await businessUtils.myPackage(myActives); // direct-business
        const activeGeneration = await team.myActivegenerationWtihPersonal(userId, 5);
        const totalTeamSize = activeGeneration.length // total-team-size
        const topLegs = await businessUtils.getTopLegs(userId);
        const totalTeamBusiness = topLegs.reduce((sum, b) => sum + b, 0); //total-team-business

        const rankData = {
            rank: "Royalty",
            selfBusiness: selfPackage,
            directTeam: myDirectTeam,
            directBusiness: directBusiness,
            teamSize: totalTeamSize,
            teamBusiness: totalTeamBusiness,
        };
        return res.status(200).json(new ApiResponse(200, rankData, "Rank settings fetched successfully"));
    }

    catch (error) {
        next(error);
    }
};
