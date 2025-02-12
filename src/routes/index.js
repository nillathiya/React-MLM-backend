const router = require("express").Router();

const ticketRoutes = require('./ticket.route.js');
const userRoutes = require('./user.route.js');
const authRoutes = require('./auth.route.js');
const transactionRoutes = require('./transaction.route.js');

router.use("/api/tickets", ticketRoutes);
router.use("/api/user", userRoutes);
router.use("/api/auth", authRoutes);
router.use("/api/transaction", transactionRoutes);

module.exports = router;

