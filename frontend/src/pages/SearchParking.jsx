import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Locate, MapPin, Search } from "lucide-react";
import api from "../services/api";
import MapView from "../components/MapView";
import ParkingCard from "../components/ParkingCard";
import Segmented from "../components/Segmented";
import EmptyState from "../components/EmptyState";
import { useToast } from "../context/ToastContext";
import { errorMessage } from "../utils/format";

const DEFAULT = { lat: 28.6139, lng: 77.209 }; // Delhi

export default function SearchParking() {
  const toast = useToast();
  const navigate = useNavigate();
  const [point, setPoint] = useState(DEFAULT);
  const [radius, setRadius] = useState(5);
  const [vehicle, setVehicle] = useState("");
  const [query, setQuery] = useState("");
  const [spots, setSpots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [requestingId, setRequestingId] = useState(null);
  const [flyTo, setFlyTo] = useState(null);

  // Point, radius ya vehicle badle to automatically search
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = { lat: point.lat, lng: point.lng, radius_km: radius };
    if (vehicle) params.vehicle_type = vehicle;

    api
      .get("/parking/nearby", { params })
      .then((res) => !cancelled && setSpots(res.data))
      .catch((err) => !cancelled && toast.error(errorMessage(err, "Search failed")))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [point, radius, vehicle]);

  const useMyLocation = () => {
    if (!navigator.geolocation) return toast.error("Location is not supported in this browser");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPoint(p);
        setFlyTo([p.lat, p.lng]);
      },
      () => toast.error("Location permission denied. Search a place or click on the map.")
    );
  };

  // Place ke naam se search (OpenStreetMap Nominatim, free)
  const searchPlace = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`
      );
      const data = await res.json();
      if (!data.length) return toast.error("Place not found. Try a more specific name.");
      const p = { lat: Number(data[0].lat), lng: Number(data[0].lon) };
      setPoint(p);
      setFlyTo([p.lat, p.lng]);
    } catch {
      toast.error("Could not search this place right now");
    }
  };

  const selectSpot = (spot) => {
    setActiveId(spot.id);
    setFlyTo([spot.latitude, spot.longitude]);
  };

  const requestSpot = async (spot) => {
    setRequestingId(spot.id);
    try {
      await api.post("/bookings", {
        spot_id: spot.id,
        driver_latitude: point.lat,
        driver_longitude: point.lng,
      });
      toast.success("Request sent. You will be notified when the owner replies.");
      navigate("/bookings");
    } catch (err) {
      toast.error(errorMessage(err, "Could not send request"));
    } finally {
      setRequestingId(null);
    }
  };

  const markers = useMemo(
    () => [
      { lat: point.lat, lng: point.lng, kind: "me", title: "Your search location" },
      ...spots.map((s) => ({
        lat: s.latitude,
        lng: s.longitude,
        kind: s.id === activeId ? "selected" : "spot",
        title: s.title,
        subtitle: `${s.distance_km} km away · ₹${s.price_per_hour}/hour`,
      })),
    ],
    [point, spots, activeId]
  );

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Find parking</h1>
          <p>Search a place or click on the map. Results update automatically.</p>
        </div>
      </div>

      <div className="search-layout">
        <div className="search-panel">
          <div className="card search-controls">
            <form className="search-row" onSubmit={searchPlace}>
              <div className="input-icon">
                <Search size={16} />
                <input className="input" placeholder="Search area, e.g. Connaught Place" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
              <button className="btn btn-primary">Go</button>
            </form>

            <button type="button" className="btn btn-secondary btn-sm" onClick={useMyLocation}>
              <Locate size={15} /> Use my current location
            </button>

            <div className="control-row">
              <Segmented
                value={radius}
                onChange={setRadius}
                options={[
                  { value: 1, label: "1 km" },
                  { value: 2, label: "2 km" },
                  { value: 5, label: "5 km" },
                  { value: 10, label: "10 km" },
                ]}
              />
              <Segmented
                value={vehicle}
                onChange={setVehicle}
                options={[
                  { value: "", label: "All" },
                  { value: "car", label: "Car" },
                  { value: "bike", label: "Bike" },
                ]}
              />
            </div>
          </div>

          <div className="results">
            <div className="results-head">
              <span>{loading ? "Searching..." : `${spots.length} spot${spots.length === 1 ? "" : "s"} found`}</span>
              <span>Sorted by distance</span>
            </div>

            {loading && spots.length === 0 && (
              <>
                <div className="skeleton" />
                <div className="skeleton" />
              </>
            )}

            {!loading && spots.length === 0 && (
              <EmptyState
                icon={MapPin}
                title="No parking nearby"
                text="Try a larger radius or click another place on the map."
              />
            )}

            {spots.map((s) => (
              <ParkingCard
                key={s.id}
                spot={s}
                active={s.id === activeId}
                onSelect={selectSpot}
                onRequest={requestSpot}
                requesting={requestingId === s.id}
              />
            ))}
          </div>
        </div>

        <div className="search-map">
          <MapView
            center={[point.lat, point.lng]}
            markers={markers}
            flyTo={flyTo}
            onMapClick={(lat, lng) => setPoint({ lat, lng })}
          />
        </div>
      </div>
    </>
  );
}