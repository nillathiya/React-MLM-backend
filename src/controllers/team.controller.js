const { ApiError } = require('../utils/apiError');
const { ApiResponse } = require('../utils/apiResponse');
const team = require('../helpers/team');
const businessUtils = require('../helpers/businessUtils');
const { User } = require('../models/DB');

exports.getTeamDetails = async (req, res, next) => {
    try {
        if (!req.user) {
            return next(new ApiError(401, 'Unauthorized'));
        }

        const userId = req.user._id;
        const user = await User.findById(userId);
        if (!user) {
            return next(new ApiError(404, 'User not found'));
        }

        // Get direct team members
        const myActives = await team.myActiveDirects(userId);
        const activeDirects = myActives.length;
        const myDirects = await team.myDirects(userId);
        const directs = myDirects.length;
        const inactiveDirects = directs - activeDirects;

        // Calculate direct business
        let directBusiness = 0;
        if (activeDirects > 0) {
            const directBusinessPromises = myActives.map(async (directMemberId) => {
                return await businessUtils.myPackage(directMemberId) || 0;
            });
            const directBusinessResults = await Promise.all(directBusinessPromises);
            directBusiness = directBusinessResults.reduce((sum, value) => sum + value, 0);
        }

        // Get total team
        const myTeam = await team.mygenerationWtihPersonal(userId, 30);
        const totalTeam = myTeam.length;
        const myTeamSet = new Set(myTeam.flat());

        // Get active team members
        const activeTeamMembers = await Promise.all([...myTeamSet].map(async (memberId) => {
            const member = await User.findById(memberId);
            return member && 
                   member.accountStatus.activeStatus === 1 && 
                   member.accountStatus.blockStatus === 0 ? memberId : null;
        }));
        const activeTeam = activeTeamMembers.filter(Boolean).length;
        const inactiveTeam = totalTeam - activeTeam;

        // Calculate total business
        let totalBusiness = 0;
        if (activeTeam > 0) {
            const totalBusinessPromises = activeTeamMembers
                .filter(Boolean)
                .map(async (memberId) => {
                    return await businessUtils.myPackage(memberId) || 0;
                });
            const totalBusinessResults = await Promise.all(totalBusinessPromises);
            totalBusiness = totalBusinessResults.reduce((sum, value) => sum + value, 0);
        }

        res.status(200).json(new ApiResponse(200, {
            directs,
            activeDirects,
            inactiveDirects,
            directBusiness,
            totalTeam,
            activeTeam,
            inactiveTeam,
            totalBusiness
        }, 'Team Details'));

    } catch (error) {
        return next(error);
    }
}