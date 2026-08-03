const Place = require("../models/place");
const Review = require("../models/review");
const User = require("../models/user");

const FEATURED_LIMIT = 6;

// rata-rata rating dipakai untuk bintang di kartu landing page
const withRating = (place) => {
  const reviews = place.reviews || [];
  const total = reviews.reduce((sum, review) => sum + (review.rating || 0), 0);
  return {
    _id: place._id,
    title: place.title,
    location: place.location,
    price: place.price,
    images: place.images,
    reviewCount: reviews.length,
    avgRating: reviews.length ? total / reviews.length : null,
  };
};

module.exports.index = async (req, res) => {
  const [featured, mapPlaces, placeCount, reviewCount, userCount] =
    await Promise.all([
      // _id pada ObjectId urut waktu, jadi ini = tempat terbaru
      Place.find().sort({ _id: -1 }).limit(FEATURED_LIMIT).populate("reviews"),
      Place.find({ geometry: { $exists: true } }).select("title location geometry"),
      Place.countDocuments(),
      Review.countDocuments(),
      User.countDocuments(),
    ]);

  res.render("home", {
    featured: featured.map(withRating),
    mapPlaces,
    stats: { placeCount, reviewCount, userCount },
    // landing page pakai lebar penuh, halaman lain tetap di dalam .container
    fullWidth: true,
  });
};
