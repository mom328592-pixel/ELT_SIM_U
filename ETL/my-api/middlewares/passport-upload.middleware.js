const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "passport-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  // 1. ອະນຸຍາດ extension ຮູບພາບຍອດນິຍົມ (ລວມທັງ HEIC/HEIF ຈາກ iPhone)
  const allowedExts = /\.(jpg|jpeg|png|webp|heic|heif)$/i;
  const isExtValid = allowedExts.test(path.extname(file.originalname));

  // 2. ກວດສອບ Mimetype ຖ້າເລີ່ມຕົ້ນດ້ວຍ image/ ຫຼື application/octet-stream (ກໍລະນີ Browser ບໍ່ລະບຸ Type)
  const isMimeValid = file.mimetype.startsWith("image/") || file.mimetype === "application/octet-stream";

  if (isExtValid || isMimeValid) {
    return cb(null, true);
  }

  // ຖ້າບໍ່ແມ່ນຮູບພາບແທ້ໆ ຈຶ່ງ Reject
  cb(new Error("Only image files (jpg, jpeg, png, webp, heic) are allowed"), false);
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // ເພີ່ມຂະໜາດເປັນ 10MB ເພາະຮູບຖ່າຍກ້ອງ Smartphone ມັກຈະໃຫຍ່
  fileFilter: fileFilter,
});

module.exports = upload;