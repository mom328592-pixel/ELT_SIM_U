const express = require("express");

const router = express.Router();

const {
    getAllPackages,
    getPackageById,
    createPackage,
    updatePackage,
    deletePackage
} = require("../controllers/packages.controller");


router.get("/", getAllPackages);

router.get("/:id", getPackageById);

router.post("/", createPackage);

router.put("/:id", updatePackage);

router.delete("/:id", deletePackage);


module.exports = router;