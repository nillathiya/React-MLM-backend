const express = require("express");
const router = express.Router();
const teamController = require("../controllers/team.controller");
const { verifyJwt } = require('../middlewares/auth.middleware');

router.post("/user-team-details", verifyJwt, teamController.getTeamDetails);

module.exports = router;