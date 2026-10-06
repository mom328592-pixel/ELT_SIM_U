const express = require("express");

const router = express.Router();

const {
    getAllSimTypes,
    createSimType,
    updateSimType,
    deleteSimType,
} = require("../controllers/sim-types.controller");

// =====================================================
// GET ALL SIM TYPES
// =====================================================

router.get(
    "/",
    getAllSimTypes
);

// =====================================================
// CREATE SIM TYPE
// =====================================================

router.post(
    "/",
    createSimType
);

// =====================================================
// UPDATE SIM TYPE
// =====================================================

router.put(
    "/:id",
    updateSimType
);

// =====================================================
// DELETE SIM TYPE
// =====================================================

router.delete(
    "/:id",
    deleteSimType
);

module.exports = router;