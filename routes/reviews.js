const express = require("express");

const reviewController = require("../controllers/reviews");

const wrapAsync = require("../utils/WrapAsync");
const { isAuthorReview } = require("../middlewares/isAuthor");
const { validateReview } = require("../middlewares/validator");
const isValidObjectId = require("../middlewares/isValidObjectId");
const isAuth = require("../middlewares/isAuth");
const router = express.Router({ mergeParams: true });

// add post review.
router.post(
  "/",
  isAuth,
  isValidObjectId("/places"),
  validateReview,
  wrapAsync(reviewController.store)
);
// delete review
// id divalidasi dulu sebelum isAuthorReview query pakai review_id
router.delete(
  "/:review_id",
  isAuth,
  isValidObjectId("/places"),
  wrapAsync(isAuthorReview),
  wrapAsync(reviewController.destroy)
);

module.exports = router;
