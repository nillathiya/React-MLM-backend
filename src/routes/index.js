const router = require("express").Router();

const ticketRoutes = require('./ticket.route.js');
const userRoutes = require('./user.route.js');
const authRoutes = require('./auth.route.js');
const transactionRoutes = require('./transaction.route.js');
const ordersRoutes = require('./orders.route.js');
const withdrawalRoutes = require('./withdrawal.route.js');
const walletSettingsRoutes = require('./walletSettings.route.js');
const walletRoutes = require('./wallet.route.js');
const pinDetailRoutes = require('./pinDetail.route.js');
const topUpRoutes = require('./topup.route.js');
const adminSettingsRoutes = require('./adminSettings.route.js');
const rankSettingsRoutes = require('./rankSettings.route.js');
const newsEventRoutes = require('./newsEvent.route.js');
const contactUsRoutes = require('./contactUs.route.js');
const companyInfoRoutes = require('./companyInfo.route.js'
);
const userSettingRoutes=require('./userSetting.route.js');


router.use("/api/tickets", ticketRoutes);
router.use("/api/user", userRoutes);
router.use("/api/auth", authRoutes);
router.use("/api/transaction", transactionRoutes);
router.use("/api/orders", ordersRoutes);
router.use("/api/withdrawal", withdrawalRoutes);
router.use("/api/wallet-settings", walletSettingsRoutes);
router.use("/api/wallet", walletRoutes);
router.use("/api/pin-detail", pinDetailRoutes);
router.use("/api/top-up", topUpRoutes);
router.use("/api/admin-settings", adminSettingsRoutes);
router.use("/api/rank-settings", rankSettingsRoutes);
router.use("/api/news-events", newsEventRoutes);
router.use("/api/contact-us", contactUsRoutes);
router.use("/api/company-info", companyInfoRoutes);
router.use("/api/user-settings", userSettingRoutes);

module.exports = router;

