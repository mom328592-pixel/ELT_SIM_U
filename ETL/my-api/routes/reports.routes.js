const express = require("express");

const router = express.Router();

const {
    getDashboardReports
} = require("../controllers/reports.controller");


router.get(
    "/dashboard",
    getDashboardReports
);


module.exports = router;