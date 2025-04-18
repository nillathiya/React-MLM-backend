const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller.js");
const {verifyJwt}=require('../middlewares/auth.middleware.js');
const {upload}=require('../utils/multer.js');

router.post("/create", userController.registerUser);
router.post("/get-all", verifyJwt,userController.get);
router.post("/check-name", userController.checkUsername);
// router.post("/update/:id", userController.updateUser);
router.post("/get-directs",verifyJwt, userController.getUserDirects);
router.post("/generation-tree",verifyJwt, userController.getUserGenerationTree);
router.post("/details-with-investment",verifyJwt, userController.getUserDetailsWithInvestmnetInfo);
router.post("/update/profile",verifyJwt, upload.single("avatar"), userController.updateUserProfile);
router.post("/info/get",verifyJwt,userController.getUserById);
router.post("/get-remaining-capping",verifyJwt,userController.getUserRemainingCapping);



// router.post("/message/send", ticketController.sendMessage); // User sends a message in an open ticket
// router.post("/user/:userId", ticketController.getUserTickets); // Fetch all tickets for a user

module.exports = router;
 