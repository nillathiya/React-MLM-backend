const express = require("express");
const router = express.Router();
const rankSettingsController = require("../controllers/rankSettings.controller");
const { verifyJwt } = require('../middlewares/auth.middleware');

router.post("/create", verifyJwt, rankSettingsController.createRankSetting);
router.post("/update", verifyJwt, rankSettingsController.updateRankSetting);
router.post("/get", verifyJwt, rankSettingsController.getRankSettings);
router.post("/user", verifyJwt, rankSettingsController.getUserRankAndTeamMetrics);

module.exports = router;
