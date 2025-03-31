const common = require('../helpers/common');
const businessUtils = require('../helpers/businessUtils');
const { User, IncomeTransaction, WalletSettings, Orders, PinDetail, FundTransaction } = require('../models/DB');
const team = require('../helpers/team');

async function defineRewardRanks(){
    try {
        const rankData = await common.rankSettings();
        if (!rankData?.length) return;
        console.log('rankData:', rankData);
        
        const rankLevels = rankData.find(r => r.slug === 'rank')?.value.map(Number) || [];
        const selfBusinessLevels = rankData.find(r => r.slug === 'self_business')?.value.map(Number) || [];
        const directTeamLevels = rankData.find(r => r.slug === 'direct_team')?.value.map(Number) || [];
        const downlineAchieversLevels = rankData.find(r => r.slug === 'downline_achievers')?.value.map(Number) || [];
        const rewardLevels = rankData.find(r => r.slug === 'reward')?.value.map(Number) || [];
        const totalTeamBusinessLevels = rankData.find(r => r.slug === 'total_team_business')?.value.map(Number) || [];
        const totalTeamSizeLevels = rankData.find(r => r.slug === 'total_team_size')?.value.map(Number) || [];
        const directBusinessLevels = rankData.find(r => r.slug === 'direct_business')?.value.map(Number) || [];
        
        const usersData = await User.find({ "accountStatus.activeStatus": 1, "accountStatus.blockStatus": 0 }, {'_id': 1, 'myRank': 1});
        if (!usersData?.length) return;
        
        for (let user of usersData) {
            const uCode = user._id;
            const myPackage = await businessUtils.myPackage(uCode);
            if (!myPackage || myPackage < 0) continue;
            
            const directTeam = await team.myActiveDirects(uCode);
            if (!directTeam || directTeam.length == 0) continue;
            
            const directBusiness = await Promise.all(
                directTeam.map(async (directMemberId) => {
                    return await businessUtils.myPackage(directMemberId);
                })
            ).then(results => {
                return results.reduce((sum, value) => sum + (value || 0), 0);
            });
            if (!directBusiness || directBusiness < 0) continue;

            const team = await team.mygenerationWtihPersonal(uCode);
            if (!team || team.length == 0) continue;

            const teamBusiness = await Promise.all(
                team.map(async (memberId) => {
                    return await businessUtils.myPackage(memberId);
                })
            ).then(results => {
                return results.reduce((sum, value) => sum + (value || 0), 0);
            });
            if (!teamBusiness || teamBusiness < 0) continue;
            
            let userRank = null;
            
            for (let i = 0; i < rankLevels.length; i++) {
                if (
                    myPackage >= selfBusinessLevels[i] 
                    && directTeam.length >= directTeamLevels[i] 
                    && directBusiness >= directBusinessLevels[i] 
                    && team.length>=totalTeamSizeLevels[i] 
                    && teamBusiness>=totalTeamBusinessLevels[i]
                ) {
                    userRank = rankLevels[i];
                } else {
                    break;
                }
            }
            
            if (userRank !== null) {
                console.log(`User: ${uCode}, Rank: ${userRank}`);
            }
        }
    } catch (e) {
        console.error('Error defining reward ranks:', e);
    }
}

// defineRewardRanks();

async function test() {
    const firstUser = await User.findOne({ username: 'user_578477'});
    const uCode = firstUser?._id;
    const teamSize = await team.mygenerationWtihPersonal(uCode);
    console.log('Team Size:', teamSize);
}

test();
