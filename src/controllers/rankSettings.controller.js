const { RankSettings, User, Plan } = require('../models/DB');
const businessUtils = require('../helpers/businessUtils');
const team = require('../helpers/team');
const common = require('../helpers/common');
const { ApiResponse } = require('../utils/apiResponse');
const { ApiError } = require('../utils/apiError');
const mongoose = require('mongoose');


exports.createRankSetting = async (req, res, next) => {
    const postData = req.body;
    try {

        if (!req._IS_ADMIN_ACCOUNT) {
            throw new ApiError(403, "Unauthorized access");
        }
        // Required Fields Validation
        const validateFields = ["title", "slug", "value", "status"];
        const response = await common.requestFieldsValidation(validateFields, postData);

        if (!response.status) {
            throw new ApiError(400, `Missing fields: ${response.missingFields.join(", ")}`);
        }

        // Prepare Data for Saving
        const newSettings = new RankSettings({
            title: postData.title,
            slug: postData.slug,
            type: postData.type || "",
            value: Array.isArray(postData.value) ? postData.value : [postData.value],
            status: postData.status ?? 1,
        });

        await newSettings.save();

        return res.status(201).json(new ApiResponse(201, newSettings, "Rank setting created successfully"));
    } catch (error) {
        next(error);
    }
};

exports.updateRankSetting = async (req, res, next) => {
    try {
        const updateData = req.body;

        if (!req._IS_ADMIN_ACCOUNT) {
            throw new ApiError(403, "Unauthorized access");
        }

        // Required Fields Validation
        if (!updateData.id) {
            throw new ApiError(400, "Missing field: id");
        }

        const updateFields = {};
        if (updateData.slug) updateFields.slug = updateData.slug;
        if (updateData.title) updateFields.title = updateData.title;
        if (updateData.type) updateFields.type = updateData.type;
        if (updateData.value) updateFields.value = Array.isArray(updateData.value) ? updateData.value : [updateData.value];
        if (updateData.status !== undefined) updateFields.status = updateData.status;

        const updatedRankSetting = await RankSettings.findByIdAndUpdate(
            updateData.id,
            updateFields,
            { new: true }
        );

        if (!updatedRankSetting) {
            throw new ApiError(404, "Rank setting not found");
        }

        return res.status(200).json(new ApiResponse(200, updatedRankSetting, "Rank setting updated successfully"));
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

        const rankData={
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
