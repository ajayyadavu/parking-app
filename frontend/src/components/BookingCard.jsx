import { useEffect, useMemo, useState } from "react";
import { Clock, ExternalLink, MapPin, Phone } from "lucide-react";
import MapView from "./MapView";
import StatusBadge from "./StatusBadge";
import { dateTime, money } from "../utils/format";

const STEPS = ["Requested", "Confirmed", "Completed"];
const STEP_INDEX = { pending: 0, accepted: 1, completed: 2 };

function useNow(active) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, [active]);
  return now;
}

export default function BookingCard({ booking: b, role, busy, onAction }) {
  const isDriver = role === "driver";
  const running = b.status === "accepted";
  const closed = b.status === "rejected" || b.status === "cancelled";
  const now = useNow(running);

  let minutes = 0;
  let estimate = 0;
  if (running && b.start_time) {
    minutes = Math.max(0, Math.floor((now - new Date(b.start_time).getTime()) / 60000));
    estimate = Math.max(1, Math.ceil(minutes / 60)) * b.price_per_hour;
  }

  const showMap = isDriver && running;
  const markers = useMemo(
    () => [
      { lat: b.driver_latitude, lng: b.driver_longitude, kind: "me", title: "Your location" },
      { lat: b.spot_latitude, lng: b.spot_longitude, kind: "selected", title: b.spot_title },
    ],
    [b.driver_latitude, b.driver_longitude, b.spot_latitude, b.spot_longitude, b.spot_title]
  );
  const line = useMemo(
    () => [
      [b.driver_latitude, b.driver_longitude],
      [b.spot_latitude, b.spot_longitude],
    ],
    [b.driver_latitude, b.driver_longitude, b.spot_latitude, b.spot_longitude]
  );

  const directions =
    `https://www.google.com/maps/dir/?api=1&origin=${b.driver_latitude},${b.driver_longitude}` +
    `&destination=${b.spot_latitude},${b.spot_longitude}`;

  const contactName = isDriver ? b.owner_name : b.driver_name;
  const contactPhone = isDriver ? b.owner_phone : b.driver_phone;

  return (
    <article className="card booking">
      <div className="booking-head">
        <div>
          <h3>{isDriver ? b.spot_title : `${b.driver_name} → ${b.spot_title}`}</h3>
          <p><MapPin size={13} /> {b.spot_address}</p>
        </div>
        <StatusBadge status={b.status} />
      </div>

      {!closed && (
        <div className="steps">
          {STEPS.map((label, i) => {
            const current = STEP_INDEX[b.status];
            const cls = i < current || b.status === "completed" ? "done" : i === current ? "now" : "";
            return (
              <div key={label} style={{ display: "contents" }}>
                <div className={`step ${cls}`}><i>{i + 1}</i>{label}</div>
                {i < STEPS.length - 1 && <div className="step-line" />}
              </div>
            );
          })}
        </div>
      )}

      <div className="details">
        <div className="detail"><small>Distance</small><strong>{b.distance_km} km</strong></div>
        <div className="detail"><small>Rate</small><strong>{money(b.price_per_hour)}/hr</strong></div>
        <div className="detail">
          <small>{running ? "Parked since" : "Requested"}</small>
          <strong>{dateTime(running ? b.start_time : b.created_at)}</strong>
        </div>
        <div className="detail">
          <small>{b.status === "completed" ? "Total amount" : running ? "Estimate" : "Amount"}</small>
          <strong>
            {b.status === "completed" ? money(b.total_amount) : running ? `~${money(estimate)}` : "-"}
          </strong>
        </div>
      </div>

      {running && (
        <span className="running">
          <Clock size={14} /> Running for {Math.floor(minutes / 60)}h {minutes % 60}m
        </span>
      )}

      {contactPhone && (
        <div className="contact">
          <Phone size={16} />
          {isDriver ? "Owner" : "Driver"}: {contactName} ·{" "}
          <a href={`tel:${contactPhone}`}>{contactPhone}</a>
        </div>
      )}

      {showMap && (
        <>
          <div className="booking-map">
            <MapView center={[b.spot_latitude, b.spot_longitude]} markers={markers} line={line} fit />
          </div>
          <a className="btn btn-secondary btn-sm" href={directions} target="_blank" rel="noreferrer">
            <ExternalLink size={15} /> Get directions
          </a>
        </>
      )}

      <div className="booking-actions">
        {isDriver && (b.status === "pending" || running) && (
          <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => onAction("cancel", b)}>
            Cancel booking
          </button>
        )}
        {!isDriver && b.status === "pending" && (
          <>
            <button className="btn btn-success btn-sm" disabled={busy} onClick={() => onAction("accept", b)}>
              Accept
            </button>
            <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => onAction("reject", b)}>
              Reject
            </button>
          </>
        )}
        {!isDriver && running && (
          <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => onAction("complete", b)}>
            Mark as completed
          </button>
        )}
      </div>
    </article>
  );
}