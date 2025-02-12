const jwt = require('jsonwebtoken');
const { AdminUser, User, WalletSettings, Wallet } = require('../models/DB');

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


common.mangeWalletAmounts = async (userId, slug, amount) => {
  try {
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
      return res.json({
        status: 0,
        message: "Wallet not found",
      });
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
      walletData[walletColumn] = amount;
      const newWallet = new Wallet(walletData);
      const createNewWallet = await newWallet.save();
      if (!createNewWallet) {
        return { status: 0, message: "Wallet not created" };
      }
    } else {
      const oldAmount = wallet[walletColumn];
      let newAmount = oldAmount || 0;
      if (amount > 0) {
        newAmount = oldAmount + amount;
      } else {
        newAmount = oldAmount - Math.abs(amount);
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
    return { status: 1, message: "Records Update successfully." };
  } catch (err) {
    return { status: 0, message: err };
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


module.exports = common;