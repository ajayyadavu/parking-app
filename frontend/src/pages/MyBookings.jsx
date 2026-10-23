import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarCheck } from "lucide-react";
import api from "../services/api";
import BookingCard from "../components/BookingCard";
import EmptyState from "../components/EmptyState";
import { useToast } from "../context/ToastContext";
import { usePolling } from "../utils/hooks";
import { errorMessage } from "../utils/format";

export default function MyBookings() {
  const toast = useToast();
  const [bookings, setBookings] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("active");
  const [busyId, setBusyId] = useState(null);

  const load = () =>
    api
      .get("/bookings/my")
      .then((res) => setBookings(res.data))
      .catch(() => {})
      .finally(() => setLoaded(true));

  usePolling(load, 5000);

  const handleAction = async (action, booking) => {
    if (action === "cancel" && !window.confirm("Cancel this booking?")) return;
    setBusyId(booking.id);
    try {
      await api.put(`/bookings/${booking.id}/${action}`);
      toast.success("Booking cancelled");
      await load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const active = bookings.filter((b) => ["pending", "accepted"].includes(b.status));
  const history = bookings.filter((b) => !["pending", "accepted"].includes(b.status));
  const list = tab === "active" ? active : history;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>My bookings</h1>
          <p>Track your requests, get directions and manage your parking.</p>
        </div>
        <Link to="/search" className="btn btn-primary">Find parking</Link>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === "active" ? "on" : ""}`} onClick={() => setTab("active")}>
          Active {active.length > 0 && <span className="count">{active.length}</span>}
        </button>
        <button className={`tab ${tab === "history" ? "on" : ""}`} onClick={() => setTab("history")}>
          History
        </button>
      </div>

      {!loaded && <div className="skeleton" />}

      {loaded && list.length === 0 && (
        <EmptyState
          icon={CalendarCheck}
          title={tab === "active" ? "No active bookings" : "No past bookings yet"}
          text="Find a nearby parking spot and send a request to the owner."
          action={<Link to="/search" className="btn btn-primary">Find parking</Link>}
        />
      )}

      <div className="booking-list">
        {list.map((b) => (
          <BookingCard key={b.id} booking={b} role="driver" busy={busyId === b.id} onAction={handleAction} />
        ))}
      </div>
    </>
  );
}