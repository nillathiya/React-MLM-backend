const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller.js");
const {verifyJwt}=require('../middlewares/auth.middleware.js');

router.post("/create", userController.registerUser);
router.post("/get-all", userController.get);
router.post("/check-name", userController.checkUsername);
router.post("/update/:id", userController.updateUser);
router.post("/get-directs",verifyJwt, userController.getUserDirects);
router.post("/generation-tree",verifyJwt, userController.getUserGenerationTree);

// router.post("/message/send", ticketController.sendMessage); // User sends a message in an open ticket
// router.post("/user/:userId", ticketController.getUserTickets); // Fetch all tickets for a user

module.exports = router;
 