const router = require("express").Router();

const companyInfoController = require("../controllers/companyInfo.controller");
const { verifyJwt } = require("../middlewares/auth.middleware");
const { upload } = require('../utils/multer');

router.post("/create", verifyJwt, companyInfoController.create);
router.post("/update/:id", verifyJwt, upload.single("file"), companyInfoController.updateCompanyInfo);
router.post("/get", verifyJwt, companyInfoController.getAllCompanyInfo);
router.post("/delete", verifyJwt, companyInfoController.deleteCompanyInfo);

module.exports = router;