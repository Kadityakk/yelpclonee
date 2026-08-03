const Place = require("../models/place");
const Review = require("../models/review");

// check apakah user adalah author place atau review
module.exports.isAuthorPlace = async (req, res, next) => {
  const { id } = req.params;
  const place = await Place.findById(id);

  if (!place) {
    req.flash("error_msg", "Place not found");
    return res.redirect("/places");
  }

  if (!place.author || !place.author.equals(req.user._id)) {
    req.flash("error_msg", "not authorized");
    return res.redirect("/places");
  }
  next();
};
// check apakah user adalah author review
module.exports.isAuthorReview = async (req, res, next) => {
  const { place_id, review_id } = req.params;
  const review = await Review.findById(review_id);

  if (!review) {
    req.flash("error_msg", "Review not found");
    return res.redirect(`/places/${place_id}`);
  }

  if (!review.author || !review.author.equals(req.user._id)) {
    req.flash("error_msg", "not authorized");
    return res.redirect(`/places/${place_id}`);
  }
  next();
};
