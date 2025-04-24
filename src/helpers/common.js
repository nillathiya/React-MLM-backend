const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { AdminUser, User, WalletSettings, Wallet, CompanyInfo, Plan, UserSettings, RankSettings, AdminSettings } = require('../models/DB');
const businessUtils = require('./businessUtils');

const common = {};

common.getUserByJwt = async (token) => {
  try {
    // Verify environment variable
    if (!process.env.ACCESS_TOKEN_SECRET) {
      throw new Error("ACCESS_TOKEN_SECRET is not defined");
    }

    // Verify JWT
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const { role: userRole, _id: userId } = decoded;

    // Map roles to models
    const roleToModel = {
      1: AdminUser,
      3: AdminUser,
      4: AdminUser,
      2: User,
      default: User,
    };

    // Fetch user based on role
    const model = roleToModel[userRole] || roleToModel.default;
    const user = await model.findById(userId);

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  } catch (error) {
    throw new Error(
      error.name === "TokenExpiredError"
        ? "Session expired. Please log in again."
        : error.message || "Token verification failed"
    );
  }
};
common.requestFieldsValidation = async (fields = [], postData = {}) => {
  // Ensure fields is an array and postData is an object
  if (!Array.isArray(fields)) {
    return { status: false, message: "Fields parameter must be an array" };
  }
  if (typeof postData !== "object" || postData === null) {
    return { status: false, message: "postData must be an object" };
  }

  // Find missing fields
  const missingFields = fields.filter(field => !postData[field]?.toString().trim());

  if (missingFields.length > 0) {
    return {
      status: false,
      message: "Missing required fields",
      missingFields,
    };
  }

  return { status: true, message: "All required fields are present" };
};


common.manageWalletAmounts = async (userId, slug, amount) => {
  try {
    // Ensure amount is always a number
    const amountNumber = Number(amount);
    
    // Check if amount is a valid number
    if (isNaN(amountNumber)) {
      return { status: 0, message: "Invalid amount provided. It should be a number." };
    }

    const currentUser = await User.findOne({ _id: userId });
    if (!currentUser) {
      return {
        status: 0,
        message: "User not found",
      };
    }

    const walletSetting = await WalletSettings.findOne({
      slug: slug,
    });
    if (!walletSetting || !walletSetting.slug) {
      return {
        status: 0,
        message: "WalletSetting not found",
      };
    }

    const stringWalletData = JSON.stringify(walletSetting);
    const jsonWalletData = JSON.parse(stringWalletData);
    const walletColumn = jsonWalletData["column"];
    
    const wallet = await Wallet.findOne({
      uCode: currentUser._id,
    });
    
    if (!wallet) {
      const walletData = {
        uCode: currentUser._id,
        username: currentUser.username,
      };
      walletData[walletColumn] = amountNumber; // use amountNumber here
      const newWallet = new Wallet(walletData);
      const createNewWallet = await newWallet.save();
      if (!createNewWallet) {
        return { status: 0, message: "Wallet not created" };
      }
    } else {
      const oldAmount = wallet[walletColumn];
      
      let newAmount = oldAmount || 0;
      if (amountNumber > 0) {
        newAmount = oldAmount + amountNumber;
      } else {
        newAmount = oldAmount - Math.abs(amountNumber);
      }

      if (newAmount < 0) {
        return { status: 0, message: "Wallet doesn't have enough Balance" };
      }
      
      // update wallet
      const walletUpdatedData = {
        [walletColumn]: newAmount,
      };
      const walletUpdatedResponse = await Wallet.findByIdAndUpdate(
        wallet._id,
        walletUpdatedData,
        {
          new: true,
        }
      );
      if (!walletUpdatedResponse) {
        return { status: 0, message: "Wallet not found" };
      }
    }

    return { status: 1, message: "Records updated successfully." };
  } catch (err) {
    return { status: 0, message: err.message || err };
  }
};

common.getWalletBalance = (walletSettingTable, userWallet, walletSlug) => {
  const wallet = walletSettingTable.find((item) => item.slug === walletSlug);
  if (!wallet) {
    return 0;
  }
  const walletData = JSON.parse(JSON.stringify(wallet));
  const walletColumn = walletData["column"];
  return userWallet[walletColumn] || 0;
};

common.getBalance = async (uCode, walletSlug) => {
  try {
    const currentUser = await User.findOne({ _id: uCode });
    if (!currentUser) {
      return {
        status: 0,
        message: "User not found",
      };
    }
    const walletSetting = await WalletSettings.findOne({ slug: walletSlug });
    console.log("walletSetting", walletSetting);
    if (!walletSetting) {
      return 0;
    }
    const stringWalletData = JSON.stringify(walletSetting);
    const jsonWalletData = JSON.parse(stringWalletData);
    const walletColumn = jsonWalletData["column"];
    const wallet = await Wallet.findOne({
      uCode
    });
    if (!wallet) {
      const walletData = {
        uCode,
        username: currentUser.username,
      };
      if(!walletData[walletColumn]) {
        return 0;
      }
      const newWallet = new Wallet(walletData);
      await newWallet.save();
      return 0;
    }
    return wallet[walletColumn];
  } catch (error) {
    console.error(error);
    return 0;
  }
}

// Generate a unique slug from title
common.generateSlug = (title) => {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '_');
};

common.companyInfo = async (label) => {
  const cDetails = await CompanyInfo.findOne({ label });
  return cDetails?.value;
}

common.getTotalUserCappingStatus = async (uCode) => {
  try {
    const totalBalance = await common.getBalance(uCode, "capping");
    console.log("totalBalance",totalBalance);
    const cappingMultiplier = 2;
    const myPackage = await businessUtils.myPackage(uCode);
    if (!myPackage) {
      return 0;
    }
    const totalCap = myPackage * cappingMultiplier;
    if (totalBalance > totalCap) {
      return 0;
    }
    const rcap = totalCap-totalBalance;
    console.log("rcap",rcap);
    return rcap;
  } catch (error) {
    console.error(error);
    return 0;
  }
};

common.planData = async (slug) => {
  try {
      const PlanData = await Plan.findOne({ slug });
      if (!PlanData) return;
      return PlanData;
  } catch(e) {
      console.error(`Error in plan: ${e.message}`);
  }
}

common.Settings = async (dbCollection, slug) => {
  try {
      const collection = mongoose.connection.collection(dbCollection.toLowerCase());
      const SettingsData = await collection.findOne({ slug, status: 1 });
      if (!SettingsData) return;
      return SettingsData.value;
  } catch(e) {
      console.error(`Error in settings: ${e.message}`);
  }
}

common.rankSettings = async () => {
  try {
      const rankSettingsData = await RankSettings.find({ status: 1 });
      if (!rankSettingsData) return;
      return rankSettingsData;
  } catch(e) {
      console.error(`Error in rank settings: ${e.message}`);
  }
}


module.exports = common;