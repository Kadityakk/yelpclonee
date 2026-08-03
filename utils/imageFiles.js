const fs = require("fs/promises");
const path = require("path");

// satu-satunya sumber kebenaran lokasi file gambar di disk.
// dipakai bareng configs/multer.js supaya simpan & hapus selalu ke folder yang sama
const IMAGE_DIR = path.join(__dirname, "../public/images");

module.exports.IMAGE_DIR = IMAGE_DIR;

// path yang dipakai di browser, ini yang disimpan ke field images.url
module.exports.toPublicUrl = (filename) => `/images/${filename}`;

// hapus file gambar dari disk. file yang sudah tidak ada diabaikan (ENOENT),
// dan kegagalan hapus file tidak boleh menggagalkan request
module.exports.removeImages = async (images = []) => {
  await Promise.all(
    images.map(async (image) => {
      if (!image || !image.filename) return;
      try {
        await fs.unlink(path.join(IMAGE_DIR, image.filename));
      } catch (err) {
        if (err.code !== "ENOENT") {
          console.error(`Gagal hapus gambar ${image.filename}:`, err.message);
        }
      }
    })
  );
};
