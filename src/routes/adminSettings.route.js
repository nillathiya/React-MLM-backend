const express = require("express");
const router = express.Router();
const adminSettingsController = require("../controllers/adminSettings.controller");
const {verifyJwt}=require('../middlewares/auth.middleware');

router.post("/get",verifyJwt, adminSettingsController.getSettings);
router.post("/add",verifyJwt, adminSettingsController.addSetting);
router.post("/update/:id",verifyJwt, adminSettingsController.updateAdminSettings);

module.exports = router;
 