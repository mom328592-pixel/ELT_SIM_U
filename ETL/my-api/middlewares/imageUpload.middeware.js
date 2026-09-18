const multer = require("multer");
const path = require("path");

// 1. ກຳນົດບ່ອນເກັບໄຟລ໌ ແລະ ເພີ່ມ Timestamp ໃສ່ຊື່ໄຟລ໌ເພື່ອບໍ່ໃຫ້ຊື່ຊ້ຳກັນ
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // ເກັບໄວ້ໃນ folder uploads/ (ຕ້ອງສ້າງ folder ນີ້ໄວ້ຢູ່ root project)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  }
});

// 2. ກວດສອບນາມສະກຸນໄຟລ໌ ແລະ MIME type ຂອງຮູບພາບ
const fileFilter = (req, file, cb) => {
  const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];
  const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];

  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExtensions.includes(ext) && allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("ອະນຸຍາດສະເພາະໄຟລ໌ຮູບພາບ (.jpg, .jpeg, .png, .webp) ເທົ່ານັ້ນ!"), false);
  }
};

// 3. ຕັ້ງຄ່າ Multer (ຈຳກັດຂະໜາດຮູບບໍ່ເກີນ 5MB)
const uploadImage = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB
  }
});

module.exports = uploadImage;