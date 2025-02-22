const router = require("express").Router();

const ticketRoutes = require('./ticket.route.js');
const userRoutes = require('./user.route.js');
const authRoutes = require('./auth.route.js');
const transactionRoutes = require('./transaction.route.js');
const ordersRoutes = require('./orders.route.js');
const withdrawalRoutes = require('./withdrawal.route.js');
const walletSettingsRoutes = require('./walletSettings.route.js');
const walletRoutes=require('./wallet.route.js');

router.use("/api/tickets", ticketRoutes);
router.use("/api/user", userRoutes);
router.use("/api/auth", authRoutes);
router.use("/api/transaction", transactionRoutes);
router.use("/api/orders", ordersRoutes);
router.use("/api/withdrawal", withdrawalRoutes);
router.use("/api/wallet-settings", walletSettingsRoutes);
router.use("/api/wallet", walletRoutes);

module.exports = router;

