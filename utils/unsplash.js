// Cari foto di Unsplash sesuai nama/lokasi tempat.
// Butuh Access Key gratis dari https://unsplash.com/developers,
// simpan di file .env sebagai UNSPLASH_ACCESS_KEY (lihat .env.example).
const SEARCH_URL = "https://api.unsplash.com/search/photos";

// Sesuai panduan API Unsplash, gambar WAJIB di-hotlink ke URL yang mereka
// kembalikan (tidak boleh di-download & disimpan sendiri), dan wajib
// mencantumkan nama fotografer + link ke Unsplash.
// Karena itu foto Unsplash disimpan tanpa "filename": tidak ada file di disk,
// jadi utils/imageFiles.js otomatis melewatinya waktu menghapus gambar.
const UTM = "?utm_source=BestPlace&utm_medium=referral";

module.exports.isEnabled = () => Boolean(process.env.UNSPLASH_ACCESS_KEY);

// return { url, credit, creditUrl } atau null kalau tidak ketemu / API bermasalah
module.exports.searchPhoto = async (query) => {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey || !query || !query.trim()) return null;

  const url = `${SEARCH_URL}?query=${encodeURIComponent(
    query
  )}&per_page=1&orientation=landscape&content_filter=high`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
        "Accept-Version": "v1",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (response.status === 401) {
      console.error("Unsplash menolak Access Key. Cek UNSPLASH_ACCESS_KEY di .env");
      return null;
    }
    if (response.status === 403) {
      console.error("Kuota Unsplash habis (demo: 50 request/jam). Coba lagi nanti.");
      return null;
    }
    if (!response.ok) {
      console.error(`Unsplash error ${response.status} untuk "${query}"`);
      return null;
    }

    const data = await response.json();
    const photo = data.results && data.results[0];
    if (!photo) return null;

    return {
      url: photo.urls.regular,
      credit: photo.user.name,
      creditUrl: `${photo.user.links.html}${UTM}`,
    };
  } catch (err) {
    console.error(`Gagal ambil foto Unsplash untuk "${query}":`, err.message);
    return null;
  }
};
