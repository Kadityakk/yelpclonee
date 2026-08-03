const mongoose = require("mongoose");

module.exports = (redirectUrl = "/") => {
  return async (req, res, next) => {
    // cek SEMUA param id yang ada di request, bukan cuma yang pertama ketemu.
    // di route review ada place_id dan review_id sekaligus, dua-duanya harus valid
    const paramIds = ["id", "place_id", "review_id"].filter(
      (param) => req.params[param]
    );

    const hasInvalidId = paramIds.some(
      (param) => !mongoose.Types.ObjectId.isValid(req.params[param])
    );

    if (hasInvalidId) {
      req.flash("error_msg", "Invalid Id / data tidak ditemukan");
      return res.redirect(redirectUrl);
    }

    next();
  };
};
// membuat validasi object id
// jika objectId tidak valid maka redirect ke halaman utama
