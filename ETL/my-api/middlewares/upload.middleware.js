const multer = require("multer");

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const allowedExtensions = [".xlsx", ".xls", ".csv"];

    const fileName = file.originalname.toLowerCase();

    const isAllowed = allowedExtensions.some((ext) =>
        fileName.endsWith(ext)
    );

    if (!isAllowed) {
        return cb(
            new Error("Only .xlsx, .xls and .csv files are allowed")
        );
    }

    cb(null, true);
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});

module.exports = upload;