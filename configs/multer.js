const multer = require("multer");
const ErrorHandler = require("../utils/ErrorHandler");
const { IMAGE_DIR } = require("../utils/imageFiles");

// membuat storage engine untuk multer untuk menyimpan file gambar yang diupload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, IMAGE_DIR);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB per gambar
    files: 5,
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      // argumen pertama cb wajib Error, kalau tidak file diam-diam ikut ter-upload
      cb(new ErrorHandler("Only image files are allowed!", 400));
    }
  },
});

module.exports = upload;
