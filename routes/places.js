const express = require("express");

const placeController = require("../controllers/places");

const wrapAsync = require("../utils/WrapAsync");

const { isAuthorPlace } = require("../middlewares/isAuthor");
const isValidObjectId = require("../middlewares/isValidObjectId");
const isAuth = require("../middlewares/isAuth");
const { validatePlace } = require("../middlewares/validator");
const upload = require("../configs/multer");

const router = express.Router();

// middleware

// implementing chained routes
// routes places CRUD
router
  .route("/")
  .get(wrapAsync(placeController.index))
  .post(
    isAuth,
    upload.array("image", 5),
    wrapAsync(validatePlace),
    // tidak ada validateImages: upload gambar opsional, kalau kosong
    // controller mengambilkan foto dari Unsplash
    wrapAsync(placeController.store)
  );

router.get("/create", isAuth, (req, res) => {
  res.render("places/create");
});

// routes with id
// urutannya: id divalidasi dulu, baru cek kepemilikan (isAuthorPlace query pakai id itu)
router
  .route("/:id")
  .get(isValidObjectId("/places"), wrapAsync(placeController.show))
  .put(
    isAuth,
    isValidObjectId("/places"),
    wrapAsync(isAuthorPlace),
    upload.array("image", 5),
    wrapAsync(validatePlace),
    wrapAsync(placeController.update)
  )
  .delete(
    isAuth,
    isValidObjectId("/places"),
    wrapAsync(isAuthorPlace),
    wrapAsync(placeController.destroy)
  );

// edit place
router.get(
  "/:id/edit",
  isAuth,
  isValidObjectId("/places"),
  wrapAsync(isAuthorPlace),
  wrapAsync(placeController.edit)
);

module.exports = router;
