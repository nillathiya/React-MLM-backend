const { Orders, User } = require('../models/DB');
const team = require('./team');
const businessUtils = {}

// Ensure userId is mongoose objectId
businessUtils.myPackage = async (userId) => {
    try {
        // console.log("userId",userId);
        // Ensure userId is renamed to customerId in the condition for consistency
        const matchCondition = Array.isArray(userId)
            ? { customerId: { $in: userId }, status: 1 }
            : { customerId: userId, status: 1 };

        // console.log("matchCondition", matchCondition);
        
        const result = await Orders.aggregate([
            { $match: matchCondition },
            { $group: { _id: "$customerId", totalBV: { $sum: "$bv" } } }
        ]);

        // console.log("result: ", result);

        if (!result.length) return 0;

        // Return appropriate value based on input type
        if (Array.isArray(userId)) {
            // For array input, return array of results or sum of all totals
            return result.reduce((sum, item) => sum + item.totalBV, 0);
        } else {
            // For single ID, return single total
            return result[0].totalBV;
        }
    } catch (error) {
        console.error("Error in myPackage:", error);
        return 0;
    }
};

businessUtils.getTopLegs = async (userId) => {
    try {
        const directUsers = await team.myActiveDirects(userId);
        // console.log("directUsers",directUsers)
        if (directUsers.length === 0) return [];

        // Fetch user generations in parallel
        const generations = await Promise.all(
            directUsers.map(id => team.myActivegenerationWtihPersonal(id, 5))
        );
        // console.log("generations",generations)

        // Flatten array of user generations and build a lookup map
        const userGenMap = new Map();
        directUsers.forEach((directUser, index) => {
            userGenMap.set(directUser._id, generations[index]);
        });
        // console.log("userGenMap",userGenMap)

        const directUsersTeamBusiness = [];
        for (const [key, value] of userGenMap.entries()) {
            let orderData = await businessUtils.myPackage(value);
            // console.log("Active Directs Team Business", orderData);
            directUsersTeamBusiness.push(orderData)
        }
        // console.log("Direct Users Team Business",directUsersTeamBusiness)

        return directUsersTeamBusiness.sort((a, b) => b - a); // desc
    } catch (error) {
        console.log("error getting direct users team business", error);
        return [];
    }
}

module.exports = businessUtils;