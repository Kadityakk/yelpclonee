const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Review = require("./review");
const { removeImages } = require("../utils/imageFiles");

// GeoJSON Point, formatnya wajib [longitude, latitude] (bukan lat,lng)
const geometrySchema = new Schema(
  {
    type: {
      type: String,
      enum: ["Point"],
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  },
  { _id: false }
);

const placeSchema = new Schema({
  title: String,
  price: Number,
  description: String,
  location: String,
  // geometry boleh kosong kalau geocoding gagal / lokasi tidak ketemu di peta
  geometry: {
    type: geometrySchema,
    default: undefined,
  },
  images: [
    {
      url: String,
      // filename hanya diisi untuk gambar hasil upload user (ada file-nya di disk).
      // Foto dari Unsplash di-hotlink, jadi filename kosong dan credit/creditUrl terisi
      filename: String,
      credit: String,
      creditUrl: String,
    },
  ],
  author: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  reviews: [
    {
      type: Schema.Types.ObjectId,
      ref: "Review",
    },
  ],
});

// index buat query geospasial (cari tempat terdekat, dll)
placeSchema.index({ geometry: "2dsphere" });

// menghapus data parent place (misal data place( data pantai kuta) dihapus, reviews nya juga kehapus)
// sekalian bersihkan file gambarnya dari disk supaya tidak jadi sampah
placeSchema.post("findOneAndDelete", async function (doc) {
  if (doc) {
    await Review.deleteMany({ _id: { $in: doc.reviews } });
    await removeImages(doc.images);
  }
});

module.exports = mongoose.model("Place", placeSchema);
