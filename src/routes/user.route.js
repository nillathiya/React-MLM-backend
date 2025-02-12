const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller.js");

router.post("/create", userController.registerUser);
router.post("/get-all", userController.get);
// router.post("/message/send", ticketController.sendMessage); // User sends a message in an open ticket
// router.post("/user/:userId", ticketController.getUserTickets); // Fetch all tickets for a user

module.exports = router;
 