const express = require("express");
const router = express.Router();

const {
    getFileHistory,
    getFileHistoryById,
    deleteFileHistory
} = require("../controllers/sim-file-history.controller");

router.get("/", getFileHistory);
router.get("/:id", getFileHistoryById);
router.delete(
    "/:id",
    deleteFileHistory
);

module.exports = router;