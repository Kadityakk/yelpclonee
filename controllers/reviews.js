const Review = require("../models/review");
const Place = require("../models/place");

module.exports.store = async (req, res) => {
  const { place_id } = req.params;

  const place = await Place.findById(place_id);
  if (!place) {
    req.flash("error_msg", "Place not found");
    return res.redirect("/places");
  }

  const review = new Review(req.body.review);
  review.author = req.user._id;
  await review.save();

  place.reviews.push(review);
  await place.save();

  req.flash("success_msg", "Review added seccessfully");
  res.redirect(`/places/${place_id}`);
};

module.exports.destroy = async (req, res) => {
  const { place_id, review_id } = req.params;
  // lepas referensi dari place, lalu hapus dokumen review-nya sendiri
  await Place.findByIdAndUpdate(place_id, {
    $pull: { reviews: review_id },
  });
  await Review.findByIdAndDelete(review_id);
  req.flash("success_msg", "Review deleted seccessfully");
  res.redirect(`/places/${place_id}`);
};
