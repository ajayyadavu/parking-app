import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Locate, MapPin, Search } from "lucide-react";
import api from "../services/api";
import MapView from "../components/MapView";
import ParkingCard from "../components/ParkingCard";
import Segmented from "../components/Segmented";
import EmptyState from "../components/EmptyState";
import AiSearchBar from "../components/AiSearchBar";
import AiPick from "../components/AiPick";
import { useToast } from "../context/ToastContext";
import { currentPosition, geocode } from "../utils/geo";
import { errorMessage } from "../utils/format";

const DEFAULT = { lat: 28.6139, lng: 77.209 }; // Delhi

export default function SearchParking() {
  const toast = useToast();
  const navigate = useNavigate();
  const [point, setPoint] = useState(DEFAULT);
  const [radius, setRadius] = useState(5);
  const [vehicle, setVehicle] = useState("");
  const [duration, setDuration] = useState(1);
  const [query, setQuery] = useState("");
  const [spots, setSpots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [requestingId, setRequestingId] = useState(null);
  const [flyTo, setFlyTo] = useState(null);

  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPick, setAiPick] = useState(null);

  useEffect(() => {
    api.get("/ai/status").then((res) => setAiEnabled(res.data.enabled)).catch(() => {});
  }, []);

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

  const moveTo = (p) => {
    setAiPick(null);
    setPoint(p);
    setFlyTo([p.lat, p.lng]);
  };

  const useMyLocation = async () => {
    try {
      moveTo(await currentPosition());
    } catch {
      toast.error("Location permission denied. Search a place or click on the map.");
    }
  };

  const searchPlace = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    try {
      const found = await geocode(query);
      if (!found) return toast.error("Place not found. Try a more specific name.");
      moveTo(found);
    } catch {
      toast.error("Could not search this place right now");
    }
  };

  // AI: text -> intent -> map move -> recommendation
  const runAi = async (text) => {
    setAiLoading(true);
    setAiPick(null);
    try {
      const { data: intent } = await api.post("/ai/parse", { text });

      let target = point;
      if (intent.place) {
        const found = await geocode(intent.place);
        if (!found) {
          toast.error(`Could not find "${intent.place}" on the map`);
          return;
        }
        target = found;
      } else if (intent.use_current_location) {
        try {
          target = await currentPosition();
        } catch {
          toast.error("Location permission denied. Please name a place instead.");
          return;
        }
      }

      const nextRadius = intent.radius_km ?? radius;
      const nextVehicle = intent.vehicle_type ?? vehicle;
      const nextDuration = intent.duration_hours ?? 1;

      setPoint(target);
      setRadius(nextRadius);
      setVehicle(nextVehicle);
      setDuration(nextDuration);
      setFlyTo([target.lat, target.lng]);

      const { data: rec } = await api.post("/ai/recommend", {
        lat: target.lat,
        lng: target.lng,
        radius_km: nextRadius,
        vehicle_type: nextVehicle || null,
        duration_hours: nextDuration,
      });
      setAiPick(rec);
      if (rec.spot) setActiveId(rec.spot.id);
    } catch (err) {
      toast.error(errorMessage(err, "AI search failed. Please try again."));
    } finally {
      setAiLoading(false);
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
          <p>Ask AI, search a place, or click on the map. Results update automatically.</p>
        </div>
      </div>

      <div className="search-layout">
        <div className="search-panel">
          {aiEnabled && <AiSearchBar onSubmit={runAi} loading={aiLoading} />}

          <AiPick
            pick={aiPick}
            duration={duration}
            onSelect={selectSpot}
            onRequest={requestSpot}
            requesting={aiPick?.spot && requestingId === aiPick.spot.id}
          />

          <div className="card search-controls">
            <form className="search-row" onSubmit={searchPlace}>
              <div className="input-icon">
                <Search size={16} />
                <input
                  className="input"
                  placeholder="Search area, e.g. Connaught Place"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
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
            onMapClick={(lat, lng) => moveTo({ lat, lng })}
          />
        </div>
      </div>
    </>
  );
}
