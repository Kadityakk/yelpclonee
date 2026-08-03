const Place = require("../models/place");
const { geocode } = require("../utils/geocoder");
const { removeImages, toPublicUrl } = require("../utils/imageFiles");
const { searchPhoto } = require("../utils/unsplash");

// ubah file hasil multer jadi bentuk yang disimpan di field images.
// url disimpan sebagai path browser (/images/xxx), bukan path absolut di disk
const toImageDocs = (files = []) =>
  files.map((file) => ({
    url: toPublicUrl(file.filename),
    filename: file.filename,
  }));

module.exports.index = async (req, res) => {
  const places = await Place.find();
  res.render("places/index", { places });
};

module.exports.store = async (req, res, next) => {
  const place = new Place(req.body.place);
  place.author = req.user._id;
  place.images = toImageDocs(req.files);

  // kalau user tidak upload gambar, ambilkan foto yang sesuai dari Unsplash
  // supaya setiap tempat tetap punya gambar
  if (!place.images.length) {
    const photo =
      (await searchPhoto(place.title)) || (await searchPhoto(place.location));
    if (photo) place.images = [photo];
  }

  // undefined (bukan null) supaya field-nya tidak ikut tersimpan waktu geocoding gagal
  place.geometry = (await geocode(place.location)) || undefined;
  await place.save();

  req.flash("success_msg", "Place added seccessfully");
  if (!place.geometry) {
    req.flash("error_msg", "Location was not found on the map");
  }
  res.redirect(`/places/${place._id}`);
};

module.exports.show = async (req, res) => {
  const place = await Place.findById(req.params.id)
    .populate({
      path: "reviews",
      populate: {
        path: "author",
      },
    })
    .populate("author");
  if (!place) {
    req.flash("error_msg", "Place not found");
    return res.redirect("/places");
  }
  res.render("places/show", { place });
};

module.exports.edit = async (req, res) => {
  const place = await Place.findById(req.params.id);
  if (!place) {
    req.flash("error_msg", "Place not found");
    return res.redirect("/places");
  }
  res.render("places/edit", { place });
};

module.exports.update = async (req, res) => {
  // ambil dokumennya dulu (bukan findByIdAndUpdate) supaya bisa tahu
  // lokasi lamanya dan gambar lamanya sebelum ditimpa
  const place = await Place.findById(req.params.id);
  if (!place) {
    req.flash("error_msg", "Place not found");
    return res.redirect("/places");
  }

  const previousLocation = place.location;
  const previousImages = place.images;

  place.set(req.body.place);

  // geocode ulang hanya kalau lokasinya berubah, atau sebelumnya belum punya titik peta
  if (place.location !== previousLocation || !place.geometry) {
    place.geometry = (await geocode(place.location)) || undefined;
  }

  // gambar hanya diganti kalau user benar-benar upload yang baru
  if (req.files && req.files.length) {
    place.images = toImageDocs(req.files);
  }

  await place.save();

  // file lama baru dihapus setelah data baru berhasil tersimpan
  if (req.files && req.files.length) {
    await removeImages(previousImages);
  }

  req.flash("success_msg", "Place updated seccessfully");
  if (!place.geometry) {
    req.flash("error_msg", "Location was not found on the map");
  }
  res.redirect(`/places/${req.params.id}`);
};

module.exports.destroy = async (req, res) => {
  // findByIdAndDelete memicu hook findOneAndDelete di models/place.js
  // yang menghapus review + file gambarnya
  await Place.findByIdAndDelete(req.params.id);
  req.flash("success_msg", "Place deleted seccessfully");
  res.redirect("/places");
};
