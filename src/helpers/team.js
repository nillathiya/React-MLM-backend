require("dotenv").config({ path: ".env.development.local" });
const { User, Orders } = require('../models/DB');
// const connectionDB = require('../config/db');
const team = {};

// Get Directs 
team.myActiveDirects = async (uCode) => {
    try {
        const users = await User.find({ uSponsor: uCode, 'accountStatus.activeStatus': 1 }).select("_id");
        return users.map((user) => user._id);
    } catch (error) {
        console.error("Error Fetching Active Directs:", error);
        return []
    }
};

team.myDirects = async (uCode) => {
    try {
        const users = await User.find({ uSponsor: uCode }).select("_id");
        return users.map(user => user._id);
    }
    catch (error) {
        console.error(error);
        return []
    }
}

// getGenerationalReferrals
team.mygenerationWtihPersonal = async (uCode, level=30) => {
    try {
        if (!level) return [];
        let currentLevelUsers = new Set([uCode]);
        const allReferrals = new Set([uCode]);

        for (let i = 0; i < level && currentLevelUsers.size > 0; i++) {
            const users = await User.find({ uSponsor: { $in: [...currentLevelUsers] } })
                .select("_id")
                .lean();

            if (users.length === 0) break;

            currentLevelUsers = new Set(users.map(user => user._id));
            currentLevelUsers.forEach(id => allReferrals.add(id));
        }
        return [...allReferrals];

    }
    catch (error) {
        console.error("Error fetching  generational referrals:", error);
        return []
    }
}

team.myActivegenerationWtihPersonal = async (uCode, level=30) => {
    try {
        if (!level) return [];
        let currentLevelUsers = new Set([uCode]);
        const allReferrals = new Set([uCode]);

        for (let i = 0; i < level && currentLevelUsers.size > 0; i++) {
            const users = await User.find({ uSponsor: { $in: [...currentLevelUsers] }, 'accountStatus.activeStatus': 1 })
                .select("_id")
                .lean();

            if (users.length === 0) break;

            currentLevelUsers = new Set(users.map(user => user._id));
            currentLevelUsers.forEach(id => allReferrals.add(id));
        }
        return [...allReferrals];

    }
    catch (error) {
        console.error("Error fetching active generational referrals:", error);
        return []
    }
}

// team.myActiveGeneration() = async (uCode, level=30) => {
//     try {
//         let currentLevelUsers = new Set([uCode]);
//         const allReferrals = new Set([uCode]);
//         for (let i = 0; i < level && currentLevelUsers.size > 0; i++) {
//             const users = await User.find({ uSponsor: { $in: [...currentLevelUsers] }, 'accountStatus.activeStatus': 1 })
//                 .select("_id")
//                 .lean();

//             if (users.length === 0) break;

//             currentLevelUsers = new Set(users.map(user => user._id));
//             currentLevelUsers.forEach(id => allReferrals.add(id));
//         }
//     } catch (error) {
//         console.error("Error fetching active generations:", error);
//         return [];
//     }
// };


// (async () => {
//     await connectionDB();





//     try {
//         const activeUsers = await team.mygenerationWtihPersonal("67bfeebc40efe9cb102c6654");
//         console.log("Active Users:", activeUsers);
//     } catch (error) {
//         console.error(error.message);
//     }
// })();


module.exports = team;