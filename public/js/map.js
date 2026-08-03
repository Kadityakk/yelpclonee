// Inisialisasi peta Leaflet + tile OpenStreetMap.
// Data tempat dibaca dari tag <script type="application/json" id="map-data">
// yang di-render oleh view, jadi tidak ada data yang ditulis langsung ke dalam JS.
(() => {
  "use strict";

  const container = document.getElementById("map");
  const dataTag = document.getElementById("map-data");
  if (!container || !dataTag || typeof L === "undefined") return;

  let places = [];
  try {
    places = JSON.parse(dataTag.textContent).places || [];
  } catch (err) {
    console.error("Data peta tidak valid:", err);
    return;
  }

  // buang tempat yang geocoding-nya gagal (geometry kosong)
  const located = places.filter(
    (place) => Array.isArray(place.coordinates) && place.coordinates.length === 2
  );

  if (!located.length) {
    container.innerHTML =
      '<div class="d-flex align-items-center justify-content-center h-100 text-secondary small">Lokasi belum tersedia di peta</div>';
    return;
  }

  const map = L.map(container);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  // judul & lokasi berasal dari input user, harus di-escape sebelum masuk popup
  const escapeHtml = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        }[char])
    );

  const markers = located.map((place) => {
    // GeoJSON menyimpan [lng, lat], Leaflet minta [lat, lng]
    const [lng, lat] = place.coordinates;
    const marker = L.marker([lat, lng]).addTo(map);

    const title = place.url
      ? `<a href="${escapeHtml(
          place.url
        )}" class="fw-bold text-decoration-none">${escapeHtml(
          place.title
        )}</a>`
      : `<span class="fw-bold">${escapeHtml(place.title)}</span>`;

    marker.bindPopup(
      `${title}${
        place.location ? `<br><small>${escapeHtml(place.location)}</small>` : ""
      }`
    );
    return marker;
  });

  if (markers.length === 1) {
    const [lng, lat] = located[0].coordinates;
    map.setView([lat, lng], 13);
  } else {
    map.fitBounds(L.featureGroup(markers).getBounds(), { padding: [40, 40] });
  }
})();
