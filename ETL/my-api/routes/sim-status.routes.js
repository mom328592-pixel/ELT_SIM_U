const express = require("express");

const router = express.Router();

const {
    getAllSimStatuses,
    createSimStatus,
    updateSimStatus,
    deleteSimStatus
} = require(
    "../controllers/sim-status.controller"
);

router.get("/", getAllSimStatuses);

router.post("/", createSimStatus);

router.put("/:id", updateSimStatus);

router.delete("/:id", deleteSimStatus);

module.exports = router;