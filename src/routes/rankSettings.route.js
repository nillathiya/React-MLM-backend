const express = require("express");
const router = express.Router();
const rankSettingsController = require("../controllers/rankSettings.controller");
const { verifyJwt } = require('../middlewares/auth.middleware');

router.post("/create", verifyJwt, rankSettingsController.createRankSetting);
router.post("/update/:id", verifyJwt, rankSettingsController.updateRankSetting);
router.post("/delete/:id", verifyJwt, rankSettingsController.deleteRankSetting);
router.post("/delete-row", verifyJwt, rankSettingsController.deleteRow);
router.post("/save-row", verifyJwt, rankSettingsController.saveRow);
router.post("/get", verifyJwt, rankSettingsController.getRankSettings);
router.post("/user", verifyJwt, rankSettingsController.getUserRankAndTeamMetrics);

module.exports = router;

