const express = require("express");
const router = express.Router();
const contactUsController = require("../controllers/contactUs.controller");

router.post("/list", contactUsController.getAllContactMessage);
router.post("/create", contactUsController.createContactMessage);
router.post("/change-status", contactUsController.changeContactMesasgeStatus);

module.exports = router;
