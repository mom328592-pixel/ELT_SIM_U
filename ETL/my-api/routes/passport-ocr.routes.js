const express = require("express");
const router = express.Router();
const upload = require("../middlewares/passport-upload.middleware");
const { processPassportOCR } = require("../controllers/passport-ocr.controller");

// Route ນີ້ຈະຖືກເອີ້ນຜ່ານ Path: POST /public/passport/ocr
router.post(
  "/passport/ocr",
  (req, res, next) => {
    upload.single("passport")(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || "Invalid file format",
        });
      }
      next();
    });
  },
  processPassportOCR
);

module.exports = router;