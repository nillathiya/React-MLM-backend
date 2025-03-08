const express = require("express");
const router = express.Router();

const { verifyJwt } = require('../middlewares/auth.middleware');
const { upload } = require('../utils/multer');
const newsEventController = require("../controllers/newsEvent.controller");

router.post("/create", verifyJwt, upload.array('image', 5), newsEventController.createNewsEvent);
router.post("/list", verifyJwt, newsEventController.getPublishedNewsEvents);
router.post("/get-all", verifyJwt, newsEventController.getAllNewsEvents);
router.post("/detail", verifyJwt, newsEventController.getNewsEventById);
router.post("/update", verifyJwt, upload.array('image', 5), newsEventController.updateNewsEvent);
router.post("/delete", verifyJwt, newsEventController.deleteNewsEvent);
router.post("/toggle-publish", verifyJwt, newsEventController.togglePublishStatus);

module.exports = router;
