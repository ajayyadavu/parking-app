import { useEffect, useMemo, useState } from "react";
import { Bike, Car, Locate, MapPin } from "lucide-react";
import api from "../services/api";
import MapView from "../components/MapView";
import Segmented from "../components/Segmented";
import StatusBadge from "../components/StatusBadge";
import { useToast } from "../context/ToastContext";
import { errorMessage } from "../utils/format";

const DEFAULT = [28.6139, 77.209]; // Delhi

export default function AddParkingSpot() {
  const toast = useToast();
  const [form, setForm] = useState({ title: "", address: "", capacity: 1, vehicle_type: "car" });
  const [position, setPosition] = useState(null);
  const [flyTo, setFlyTo] = useState(null);
  const [mySpots, setMySpots] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const loadSpots = () => api.get("/parking/my").then((res) => setMySpots(res.data));

  useEffect(() => {
    loadSpots();
  }, []);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const useMyLocation = () => {
    if (!navigator.geolocation) return toast.error("Location is not supported in this browser");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = [pos.coords.latitude, pos.coords.longitude];
        setPosition(p);
        setFlyTo(p);
      },
      () => toast.error("Location permission denied. Click on the map instead.")
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!position) return toast.error("Click on the map to choose the parking location");
    setSubmitting(true);
    try {
      await api.post("/parking", {
        ...form,
        capacity: Number(form.capacity),
        latitude: position[0],
        longitude: position[1],
      });
      toast.success("Parking spot added");
      setForm({ title: "", address: "", capacity: 1, vehicle_type: "car" });
      setPosition(null);
      loadSpots();
    } catch (err) {
      toast.error(errorMessage(err, "Could not add parking spot"));
    } finally {
      setSubmitting(false);
    }
  };

  const toggle = async (id) => {
    try {
      await api.put(`/parking/${id}/toggle`);
      loadSpots();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const markers = useMemo(() => {
    const list = mySpots.map((s) => ({
      lat: s.latitude,
      lng: s.longitude,
      kind: s.is_active ? "spot" : "off",
      title: s.title,
      subtitle: s.is_active ? "Active" : "Inactive",
    }));
    if (position) list.push({ lat: position[0], lng: position[1], kind: "selected", title: "New parking location" });
    return list;
  }, [mySpots, position]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Add parking spot</h1>
          <p>Share your free space and start receiving requests.</p>
        </div>
      </div>

      <div className="split">
        <form className="card card-pad form" onSubmit={handleSubmit}>
          <div className="field">
            <label>Title</label>
            <input className="input" placeholder="In front of Sharma Kirana Store" minLength={3} value={form.title} onChange={set("title")} required />
          </div>
          <div className="field">
            <label>Address</label>
            <input className="input" placeholder="Street, area, city" minLength={3} value={form.address} onChange={set("address")} required />
          </div>
          <div className="form-grid">
            <div className="field">
              <label>Capacity (vehicles)</label>
              <input className="input" type="number" min="1" max="500" value={form.capacity} onChange={set("capacity")} required />
            </div>
            <div className="field">
              <label>Vehicle type</label>
              <Segmented
                value={form.vehicle_type}
                onChange={(v) => setForm({ ...form, vehicle_type: v })}
                options={[
                  { value: "car", label: "Car" },
                  { value: "bike", label: "Bike" },
                ]}
              />
            </div>
          </div>

          <div className="field">
            <label>Location</label>
            <button type="button" className="btn btn-secondary btn-sm" onClick={useMyLocation}>
              <Locate size={15} /> Use my current location
            </button>
            <p className="muted">
              {position
                ? `Selected: ${position[0].toFixed(5)}, ${position[1].toFixed(5)}`
                : "Or click on the map to drop a pin."}
            </p>
          </div>

          <button className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? "Saving..." : "Add parking spot"}
          </button>
        </form>

        <div className="split-map">
          <MapView center={DEFAULT} flyTo={flyTo} markers={markers} onMapClick={(lat, lng) => setPosition([lat, lng])} />
        </div>
      </div>

      <h2 className="section-title">My parking spots</h2>
      {mySpots.length === 0 && <p className="muted">You have not added any spots yet.</p>}
      <div className="spot-grid">
        {mySpots.map((s) => {
          const Icon = s.vehicle_type === "bike" ? Bike : Car;
          return (
            <div key={s.id} className="card card-pad">
              <div className="spot-top">
                <div className="spot-icon"><Icon size={20} /></div>
                <div className="spot-body">
                  <h3>{s.title}</h3>
                  <p><MapPin size={12} /> {s.address}</p>
                </div>
                <span className={`badge ${s.is_active ? "badge-active" : "badge-off"}`}>
                  {s.is_active ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="chips">
                <span className="chip">{s.available_slots} of {s.capacity} slots free</span>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => toggle(s.id)}>
                {s.is_active ? "Deactivate" : "Activate"}
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}