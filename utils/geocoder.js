// forward geocoding memakai Nominatim (OpenStreetMap) - gratis, tanpa API key.
// Syarat pemakaian Nominatim: wajib kirim User-Agent yang jelas & maksimal 1 request/detik.
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "BestPlace/1.0 (belajar express - yelpclone)";

const MAX_ATTEMPTS = 3;
const THROTTLE_MS = 1100;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// satu kali panggil Nominatim
const search = async (query) => {
  const url = `${NOMINATIM_URL}?format=jsonv2&limit=1&q=${encodeURIComponent(
    query
  )}`;

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return null;

    const results = await response.json();
    if (!results.length) return null;

    const { lat, lon } = results[0];
    return {
      type: "Point",
      coordinates: [parseFloat(lon), parseFloat(lat)], // GeoJSON: [lng, lat]
    };
  } catch (err) {
    console.error(`Geocoding gagal untuk "${query}":`, err.message);
    return null;
  }
};

// ubah teks lokasi jadi GeoJSON Point [longitude, latitude].
// return null kalau lokasi tidak ketemu atau Nominatim tidak bisa dihubungi,
// supaya simpan/update place tetap jalan walaupun geocoding gagal
module.exports.geocode = async (location) => {
  if (!location || !location.trim()) return null;

  const parts = location
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  // Nominatim sering gagal kalau bagian paling depan terlalu spesifik
  // ("Jl. Malioboro, Yogyakarta City, ..."). Jadi kalau query lengkap gagal,
  // bagian terdepan dibuang satu per satu. Sisa bagian belakang (kota/provinsi)
  // sengaja dipertahankan supaya hasilnya lebih kasar tapi tetap di area yang benar --
  // membuang bagian belakang malah bisa nyasar ke kota bernama sama di negara lain.
  const attempts = Math.min(parts.length, MAX_ATTEMPTS);

  for (let i = 0; i < attempts; i++) {
    const point = await search(parts.slice(i).join(", "));
    if (point) return point;
    if (i < attempts - 1) await sleep(THROTTLE_MS);
  }

  return null;
};
