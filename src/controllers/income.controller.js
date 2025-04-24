const incomeModel = require('../incomes/model');
const { ApiError } = require('../utils/apiError');
const { ApiResponse } = require('../utils/apiResponse');

exports.roiIncome = (req, res, next) => {
    try {
        if (!req._IS_ADMIN_ACCOUNT) {
            throw new ApiError(403, "Unauthorized access");
        }
        // Start the async function but do not await it
        incomeModel.roiIncome()
            .then(() => {
                console.log('ROI income calculation completed.');
            })
            .catch((err) => {
                console.error('Error during ROI income calculation:', err);
            });

        // Send response immediately
        return res.status(200).json(new ApiResponse(200, {}, 'ROI income process started.'))
    } catch (e) {
        next(e);
    }
};

exports.rewardIncome = (req, res, next) => {
    try {
        if (!req._IS_ADMIN_ACCOUNT) {
            throw new ApiError(403, "Unauthorized access");
        }
        // Start the async function but do not await it
        incomeModel.rewarDistribution()
            .then(() => {
                console.log('Reward income calculation completed.');
            })
            .catch((err) => {
                console.error('Error during Reward income calculation:', err);
            });

        // Send response immediately
        return res.status(200).json(new ApiResponse(200, {}, 'Reward income process started.'))
    } catch (e) {
        next(e);
    }
};

exports.weeklyClosing = (req, res, next) => {
    try {
        if (!req._IS_ADMIN_ACCOUNT) {
            throw new ApiError(403, "Unauthorized access");
        }
        // Start the async function but do not await it
        incomeModel.weeklyDistribution()
            .then(() => {
                console.log('Weekly Distribution completed.');
            })
            .catch((err) => {
                console.error('Error during Weekly Distribution calculation:', err);
            });

        // Send response immediately
        return res.status(200).json(new ApiResponse(200, {}, 'Weekly Distribution process started.'))
    } catch (e) {
        next(e);
    }
};

exports.monthlyClosing = (req, res, next) => {
    try {
        if (!req._IS_ADMIN_ACCOUNT) {
            throw new ApiError(403, "Unauthorized access");
        }
        // Start the async function but do not await it
        incomeModel.monthlyDistribution()
            .then(() => {
                console.log('Monthly Distribution completed.');
            })
            .catch((err) => {
                console.error('Error during Monthly Distribution calculation:', err);
            });

        // Send response immediately
        return res.status(200).json(new ApiResponse(200, {}, 'Monthly Distribution process started.'))
    } catch (e) {
        next(e);
    }
};

exports.resetWeekMonth = (req, res, next) => {
    try {
        if (!req._IS_ADMIN_ACCOUNT) {
            throw new ApiError(403, "Unauthorized access");
        }
        // Start the async function but do not await it
        incomeModel.resetWeeklyMonthlyPool()
            .then(() => {
                console.log('Reset week month completed.');
            })
            .catch((err) => {
                console.error('Error during Reset week month calculation:', err);
            });

        // Send response immediately
        return res.status(200).json(new ApiResponse(200, {}, 'Reset week month process started.'))
    } catch (e) {
        next(e);
    }
}

exports.dailyDirect = (req, res, next) => {
    try {
        if (!req._IS_ADMIN_ACCOUNT) {
            throw new ApiError(403, "Unauthorized access");
        }
        // Start the async function but do not await it
        incomeModel.daily_direct()
            .then(() => {
                console.log('Daily Direct completed.');
            })
            .catch((err) => {
                console.error('Error during Daily Direct calculation:', err);
            });

        // Send response immediately
        return res.status(200).json(new ApiResponse(200, {}, 'Daily Direct process started.'))
    } catch (e) {
        next(e);
    }
}
