const router = require("express").Router();
const incomeController = require("../controllers/income.controller");
const { verifyJwt } = require("../middlewares/auth.middleware");

router.post("/roi",
    verifyJwt,
    incomeController.roiIncome);

router.post("/weekly",
    verifyJwt,
    incomeController.weeklyClosing);

router.post("/monthly",
    verifyJwt,
    incomeController.monthlyClosing);

router.post("/resetWeekMonth",
    verifyJwt,
    incomeController.resetWeekMonth);

module.exports = router;