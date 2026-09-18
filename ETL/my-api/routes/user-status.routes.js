const express = require("express");
const router = express.Router();

const {
    getAllUserStatuses,
    createUserStatus,
    updateUserStatus,
    deleteUserStatus
} = require("../controllers/user-status.controller");

router.get("/", getAllUserStatuses);

router.post("/", createUserStatus);

router.put("/:id", updateUserStatus);

router.delete("/:id", deleteUserStatus);

module.exports = router;