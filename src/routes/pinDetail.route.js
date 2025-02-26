const express = require("express");
const router = express.Router();
const pinDetailController = require("../controllers/pinDetail.controller");
const { verifyJwt } = require('../middlewares/auth.middleware');

router.post("/create", verifyJwt, pinDetailController.createPinDetail);
router.post("/get", verifyJwt, pinDetailController.getPinDetails);

module.exports = router;

