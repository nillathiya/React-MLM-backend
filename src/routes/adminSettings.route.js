const express = require("express");
const router = express.Router();
const adminSettingsController = require("../controllers/adminSettings.controller");
const {verifyJwt}=require('../middlewares/auth.middleware');

router.post("/get-all",verifyJwt, adminSettingsController.getSettings);
router.post("/add",verifyJwt, adminSettingsController.addSetting);

module.exports = router;
 