const { User, Orders, FundTransaction, Wallet, WalletSettings, PinDetail } = require('../models/DB');
const common = require('../helpers/common');
const { ApiError } = require('../utils/apiError');
const { ApiResponse } = require('../utils/apiResponse');
const { level } = require('../incomes/model');

const routeHandler = {};
exports.createTopUp = async (req, res, next) => {
  const postData = req.body;
  const vsuser = req.user;
  const { username, pinId, amount, txType } = postData;

  try {
    // Validate required fields
    const requiredFields = ["username", "pinId", "amount", "txType"];
    const validationResponse = await common.requestFieldsValidation(
      requiredFields,
      postData
    );
    if (!validationResponse.status) {
      throw new ApiError(400, `Missing fields: ${response.missingFields.join(", ")}`)
    }

    // Fetch pin and user details
    const [pinDetail, receiverUser] = await Promise.all([
      PinDetail.findById(pinId),
      User.findOne({ username }),
    ]);

    if (!pinDetail) {
      throw new ApiError(400, "Pin not found");
    }

    if (!receiverUser) {
      throw new ApiError(400, "Receiver user not found");
    }
    if (amount < pinDetail.pinRate) {
      throw new ApiError(400, `Top-up amount should be greater than or equal to ${pinDetail.pinRate}`);
    }
    // Wallet handling
    const walletSettings = await WalletSettings.find();
    if (!walletSettings.length) {
      throw new ApiError(400, "Wallet settings not found");
    }

    const senderWallet = await Wallet.findOne({ uCode: vsuser._id });
    if (!senderWallet) {
      throw new ApiError(400, "Sender wallet not found");
    }

    const walletType = "fund_wallet";
    const currentBalance = common.getWalletBalance(
      walletSettings,
      senderWallet,
      walletType
    );

    if (currentBalance < amount) {
      throw new ApiError(400, "Insufficient wallet balance");
    }

    if (receiverUser._id === vsuser._id) {
      // Perform transactions
      const [senderTransaction] = await Promise.all([
        common.mangeWalletAmounts(vsuser._id, walletType, -amount),
      ]);

      if (!senderTransaction.status) {
        throw new ApiError(400, senderTransaction.message || "Transaction failed");
      }
    } else {
      // Perform transactions
      const [senderTransaction, receiverTransaction] = await Promise.all([
        common.mangeWalletAmounts(vsuser._id, walletType, -amount),
        common.mangeWalletAmounts(receiverUser._id, walletType, amount),
      ]);

      if (!senderTransaction.status || !receiverTransaction.status) {
        throw new ApiError(400, senderTransaction.message ||
          receiverTransaction.message ||
          "Transaction failed");
      }
    }

    // Activate receiver account if needed
    if (receiverUser.activeStatus === 0) {
      await User.updateOne({ _id: receiverUser._id }, { $set: { activeStatus: 1 } });
    }

    // Prepare and save order
    const lastOrder = await Orders.findOne({ customerId: vsuser._id }).sort({
      createdAt: -1,
    });

    const orderPayload = {
      customerId: vsuser._id,
      pinId,
      bv:amount,
      amount,
      txType,
      status: 1,
      activeId: lastOrder ? lastOrder.activeId + 1 : 1,
    };

    const newOrder = await new Orders(orderPayload).save();

    if (!newOrder) {
      throw new ApiError(400, "Failed to create order");
    }

    // Save transaction record
    const transactionPayload = {
      uCode: vsuser._id,
      txUCode: vsuser._id === receiverUser._id ? null : receiverUser._id,
      txType: txType === "purchase" ? "topup" : "retopup",
      debitCredit: "DEBIT",
      walletType,
      amount,
      method: "ONLINE",
      state: 1,
      isRetrieveFund: false,
      remark: vsuser._id === receiverUser._id
        ? `${vsuser.username} topup of amount ${amount}`
        : `${vsuser.username} topup ${receiverUser.username} of amount ${amount}`,
    };


    const newTransaction = await new FundTransaction(transactionPayload).save();

    if (!newTransaction) {
      throw new ApiError(400, "Failed to save transaction");
    }
    const level_distribution_on_topup = await common.Settings('UserSettings','level_distribution_on_topup');
    if (level_distribution_on_topup === 'yes') {
      await level(orderPayload.customerId, orderPayload.bv, 1);
    }
    return res.status(200).json(new ApiResponse(200, newOrder, "Topup successfully"));
  } catch (err) {
    next(err);
  }
};
// routeHandler.getOrders = async (req, res) => {
//   const vsuser = req.vsuser;
//   try {
//     if (req._IS_ADMIN_ACCOUNT) {
//       const orderDetails = await Orders.find({})
//         .populate("customerId", "name email contactNumber username")
//         .populate("pinId");

//       return res.json({
//         status: "success",
//         data: orderDetails,
//       });
//     }
//     const orderDetails = await Orders.find({
//       customerId: vsuser._id,
//       status: 1,
//     })
//       .populate("customerId", "name email contactNumber username")
//       .populate("pinId");

//     return res.json({
//       status: "success",
//       data: orderDetails,
//     });
//   } catch (err) {
//     res.json({
//       status: "error",
//       message: "Server error",
//     });
//   }
// };

// routeHandler.updateOrder = async (req, res) => {
//   const vsuser = req.vsuser;
//   const postData = req.body;
//   try {
//     if (!req._IS_ADMIN_ACCOUNT) {
//       return res.status(403).json({
//         status: "error",
//         message: "Unauthorized access",
//       });
//     }
//     const requiredFields = ["id"];

//     const validationResponse = await Common.requestFieldsValidation(
//       requiredFields,
//       postData
//     );
//     if (!validationResponse.status) {
//       return res.status(400).json({
//         status: "error",
//         message: REQUIRED_FIELD,
//       });
//     }

//     const orderDetails = await Orders.findOne({ _id: postData.id });
//     if (!orderDetails) {
//       return res.status(404).json({
//         status: "error",
//         message: "Order not found",
//       });
//     }
//     const userId = orderDetails.customerId;
//     const amount = orderDetails.amount;
//     const txType = orderDetails.txType;

//     if (postData.status !== undefined) {
//       const walletSettings = await WalletSettings.find();
//       if (!walletSettings.length) {
//         return res.status(404).json({
//           status: "error",
//           message: "Wallet settings not found",
//         });
//       }

//       const senderWallet = await Wallet.findOne({ uCode: userId });
//       if (!senderWallet) {
//         return res.status(404).json({
//           status: "error",
//           message: "Sender wallet not found",
//         });
//       }

//       const walletType = "fund_wallet";
//       const currentBalance = Common.getWalletBalance(
//         walletSettings,
//         senderWallet,
//         walletType
//       );

//       if (postData.status === 0) {
//         const walletTransaction = await Common.mangeWalletAmounts(
//           userId,
//           walletType,
//           amount
//         );
//         if (!walletTransaction.status) {
//           return res.status(400).json({
//             status: "error",
//             message: walletTransaction.message,
//           });
//         }
//         const transactionPayload = {
//           uCode: userId,
//           txType: txType === "purchase" ? "topup" : "retopup",
//           debitCredit: "CREDIT",
//           walletType,
//           amount,
//           method: "ONLINE",
//           state: 1,
//           isRetrieveFund: false,
//         };

//         const newTransaction = await new FundTransaction(
//           transactionPayload
//         ).save();
//         if (!newTransaction) {
//           return res.status(500).json({
//             status: "error",
//             message: "Failed to save transaction",
//           });
//         }
//       } else {
//         if (currentBalance < amount) {
//           return res.status(400).json({
//             status: "error",
//             message: "Insufficient wallet balance",
//           });
//         }
//         const walletTransaction = await Common.mangeWalletAmounts(
//           userId,
//           walletType,
//           -amount
//         );
//         if (!walletTransaction.status) {
//           return res.status(400).json({
//             status: "error",
//             message: walletTransaction.message,
//           });
//         }
//         const transactionPayload = {
//           uCode: userId,
//           txType: txType === "purchase" ? "topup" : "retopup",
//           debitCredit: "DEBIT",
//           walletType,
//           amount,
//           method: "ONLINE",
//           state: 1,
//           isRetrieveFund: false,
//         };

//         const newTransaction = await new FundTransaction(
//           transactionPayload
//         ).save();
//         if (!newTransaction) {
//           return res.status(500).json({
//             status: "error",
//             message: "Failed to save transaction",
//           });
//         }
//       }
//     }

//     const updateDetails = {};
//     if (postData.status !== undefined) {
//       updateDetails.status = postData.status;
//     }
//     if (postData.payOutStatus !== undefined) {
//       updateDetails.payOutStatus = postData.payOutStatus;
//     }

//     const order = await Orders.updateOne(
//       { _id: postData.id },
//       {
//         $set: updateDetails,
//       }
//     );
//     return res.json({
//       status: "success",
//       data: order,
//     });
//   } catch (err) {
//     res.json({
//       status: "error",
//       message: "Server error",
//     });
//   }
// };
// async function handler(req, res) {
//   const { topUpSlug } = req.query;
//   let routeFlag = true;

//   if (req.method === "POST") {
//     switch (topUpSlug) {
//       case "createTopUp":
//         await routeHandler.createTopUp(req, res);
//         break;
//       case "getOrders":
//         await routeHandler.getOrders(req, res);
//         break;
//       case "updateOrder":
//         await routeHandler.updateOrder(req, res);
//         break;
//       default:
//         routeFlag = false;
//     }
//   } else {
//     routeFlag = false;
//   }

//   if (!routeFlag) {
//     res.status(405).send("No route found.");
//   }
// }

// export default authMiddleware(handler);
