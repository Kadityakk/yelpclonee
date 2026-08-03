require("dotenv").config({ quiet: true });

const ejsMate = require("ejs-mate");
const express = require("express");
const session = require("express-session");
const flash = require("connect-flash");
const methodOverride = require("method-override");
const mongoose = require("mongoose");
const ErrorHandler = require("./utils/ErrorHandler");
const wrapAsync = require("./utils/WrapAsync");
const path = require("path");
const passport = require("passport");
const multer = require("multer");
const LocalStrategy = require("passport-local");
const User = require("./models/user");
const app = express();

//connect to mongodb
mongoose
  .connect("mongodb://127.0.0.1/bestplace")
  .then((result) => {
    console.log("connected to mongodb");
  })
  .catch((err) => {
    console.log(err);
  });

app.engine("ejs", ejsMate);
app.set("view engine", "ejs");

app.set("views", path.join(__dirname, "views"));

// middleware
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: "secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      expires: Date.now() * 1000 * 60 * 60 * 24 * 7,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);

app.use(flash());

// password authentication
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  // dipakai layout: menandai menu yang sedang aktif
  res.locals.currentPath = req.path;
  // default semua halaman dibungkus .container; landing page menimpanya jadi true
  res.locals.fullWidth = false;
  next();
});

// root/home
app.get("/", wrapAsync(require("./controllers/home").index));

//routes
app.use("/", require("./routes/auth"));
app.use("/places", require("./routes/places"));
app.use("/places/:place_id/reviews", require("./routes/reviews"));

// route catch all page not found // errorhandler
app.use((req, res, next) => {
  next(new ErrorHandler("Page Not Found", 404)); // ganti nama file errorhandler jadi kapital
});

// app.use((err, req, res, next) => {
//   const { statusCode = 500 } = err;
//   if (!err.message) err.message = "Oh no, something went wrong";
//   res.status(statusCode).render("error", { err });
// });
app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }
  // error bawaan multer (file kegedean / kebanyakan) tidak punya statusCode,
  // tanpa ini upload yang ditolak akan tampil sebagai error 500
  if (err instanceof multer.MulterError) {
    err.statusCode = 400;
    if (err.code === "LIMIT_FILE_SIZE") err.message = "Max image size is 5MB";
    if (err.code === "LIMIT_FILE_COUNT") err.message = "Max 5 images per place";
  }
  const { statusCode = 500 } = err;
  if (!err.message) err.message = "Oh no, something went wrong";
  res.status(statusCode).render("error", { err });
});

app.listen(3000, () => {
  console.log(`server is running on http://127.0.0.1:3000`);
});
