const express = require("express");
const router = express.Router();

const walletSettingsController = require("../controllers/walletSettings.controller.js");
const { verifyJwt } = require('../middlewares/auth.middleware.js');

router.post("/", verifyJwt, walletSettingsController.getWalletSettings);
router.post("/create", verifyJwt, walletSettingsController.createWalletSettings);
router.post("/update", verifyJwt, walletSettingsController.updateWalletSettings);

module.exports = router;
