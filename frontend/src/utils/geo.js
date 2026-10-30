// OpenStreetMap Nominatim (free). Policy: max 1 request/second, isliye Enter par search.
export async function searchPlaces(query, limit = 5) {
  const url =
    "https://nominatim.openstreetmap.org/search?format=jsonv2" +
    `&limit=${limit}&countrycodes=in&accept-language=en&q=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("place search failed");
  const data = await res.json();
  return data.map((d) => ({
    name: d.display_name,
    lat: Number(d.lat),
    lng: Number(d.lon),
  }));
}

// Pehla result (Find parking page isi ko use karta hai)
export async function geocode(query) {
  const results = await searchPlaces(query, 1);
  return results[0] ? { lat: results[0].lat, lng: results[0].lng } : null;
}

export function currentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("unsupported"));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      reject
    );
  });
}