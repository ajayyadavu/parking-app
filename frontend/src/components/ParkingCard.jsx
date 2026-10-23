import { Bike, Car, Navigation } from "lucide-react";
import { money } from "../utils/format";

export default function ParkingCard({ spot, active, onSelect, onRequest, requesting }) {
  const Icon = spot.vehicle_type === "bike" ? Bike : Car;
  return (
    <div className={`card spot ${active ? "active" : ""}`} onClick={() => onSelect(spot)}>
      <div className="spot-top">
        <div className="spot-icon"><Icon size={20} /></div>
        <div className="spot-body">
          <h3>{spot.title}</h3>
          <p>{spot.address}</p>
        </div>
        <div className="dist">{spot.distance_km} km</div>
      </div>

      <div className="chips">
        <span className="chip">{spot.available_slots} of {spot.capacity} slots free</span>
        <span className="chip">{spot.vehicle_type === "bike" ? "Bike" : "Car"}</span>
        <span className="chip">By {spot.owner_name}</span>
      </div>

      <div className="spot-foot">
        <div className="price">{money(spot.price_per_hour)}<small> / hour</small></div>
        <button
          className="btn btn-primary btn-sm"
          disabled={requesting}
          onClick={(e) => {
            e.stopPropagation();
            onRequest(spot);
          }}
        >
          <Navigation size={15} />
          {requesting ? "Sending..." : "Request parking"}
        </button>
      </div>
    </div>
  );
}