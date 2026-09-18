const express = require("express");
const router = express.Router();

const {
    getAllSimTypes,
    createSimType,
    updateSimType,
    deleteSimType
} = require("../controllers/sim-types.controller");

router.get("/", getAllSimTypes);
router.post("/", createSimType);
router.put("/:id", updateSimType);
router.delete("/:id", deleteSimType);

module.exports = router;