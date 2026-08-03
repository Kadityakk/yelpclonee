const { placeShema } = require("../schemas/places");
const { reviewShema } = require("../schemas/review");
const ErrorHandler = require("../utils/ErrorHandler");
const { removeImages } = require("../utils/imageFiles");

// multer sudah menyimpan file ke disk sebelum validasi jalan,
// jadi kalau validasi gagal filenya harus dibuang lagi biar tidak numpuk
const cleanupUploads = async (req) => {
  if (req.files && req.files.length) {
    await removeImages(req.files.map((file) => ({ filename: file.filename })));
  }
};

// validate place data
module.exports.validatePlace = async (req, res, next) => {
  const { error } = placeShema.validate(req.body);
  if (error) {
    await cleanupUploads(req);
    const msg = error.details.map((el) => el.message).join(",");
    return next(new ErrorHandler(msg, 400));
  }
  next();
};

// validate review data
module.exports.validateReview = (req, res, next) => {
  const { error } = reviewShema.validate(req.body);
  if (error) {
    const msg = error.details.map((el) => el.message).join(",");
    return next(new ErrorHandler(msg, 400));
  }
  next();
};
