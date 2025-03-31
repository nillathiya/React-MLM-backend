const express = require("express");
const router = express.Router();
const userSettingsController = require("../controllers/userSettings.controller.js");
const { verifyJwt } = require('../middlewares/auth.middleware.js');

router.post("/get", verifyJwt, userSettingsController.getUserSettings);
router.post("/update/:id", verifyJwt, userSettingsController.updateUserSettings);
router.post("/create", verifyJwt, userSettingsController.createUserSetting);

module.exports = router;
