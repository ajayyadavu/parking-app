import { useState } from "react";
import { Link } from "react-router-dom";
import { Car, Clock, Inbox, Plus, Wallet } from "lucide-react";
import api from "../services/api";
import BookingCard from "../components/BookingCard";
import EmptyState from "../components/EmptyState";
import StatCard from "../components/StatCard";
import { useToast } from "../context/ToastContext";
import { usePolling } from "../utils/hooks";
import { errorMessage, money } from "../utils/format";

const MESSAGES = {
  accept: "Request accepted. The driver has been notified.",
  reject: "Request rejected.",
  complete: "Parking completed.",
};

export default function OwnerDashboard() {
  const toast = useToast();
  const [bookings, setBookings] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("pending");
  const [busyId, setBusyId] = useState(null);

  const load = () =>
    api
      .get("/bookings/incoming")
      .then((res) => setBookings(res.data))
      .catch(() => {})
      .finally(() => setLoaded(true));

  usePolling(load, 5000);

  const handleAction = async (action, booking) => {
    setBusyId(booking.id);
    try {
      await api.put(`/bookings/${booking.id}/${action}`);
      toast.success(MESSAGES[action]);
      await load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const pending = bookings.filter((b) => b.status === "pending");
  const active = bookings.filter((b) => b.status === "accepted");
  const history = bookings.filter((b) => ["completed", "rejected", "cancelled"].includes(b.status));
  const earnings = bookings
    .filter((b) => b.status === "completed")
    .reduce((sum, b) => sum + (b.total_amount || 0), 0);

  const lists = { pending, active, history };
  const list = lists[tab];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Owner dashboard</h1>
          <p>Manage incoming parking requests and track your earnings.</p>
        </div>
        <Link to="/spots/new" className="btn btn-primary"><Plus size={16} /> Add parking spot</Link>
      </div>

      <div className="grid-stats">
        <StatCard icon={Inbox} tone="amber" label="Pending requests" value={pending.length} />
        <StatCard icon={Car} tone="green" label="Vehicles parked now" value={active.length} />
        <StatCard icon={Clock} label="Completed bookings" value={bookings.filter((b) => b.status === "completed").length} />
        <StatCard icon={Wallet} tone="green" label="Total earnings" value={money(earnings)} />
      </div>

      <div className="tabs">
        <button className={`tab ${tab === "pending" ? "on" : ""}`} onClick={() => setTab("pending")}>
          Requests {pending.length > 0 && <span className="count">{pending.length}</span>}
        </button>
        <button className={`tab ${tab === "active" ? "on" : ""}`} onClick={() => setTab("active")}>
          Parked now
        </button>
        <button className={`tab ${tab === "history" ? "on" : ""}`} onClick={() => setTab("history")}>
          History
        </button>
      </div>

      {!loaded && <div className="skeleton" />}

      {loaded && list.length === 0 && (
        <EmptyState
          icon={Inbox}
          title="Nothing here yet"
          text={tab === "pending" ? "New parking requests will appear here automatically." : "No bookings in this list."}
        />
      )}

      <div className="booking-list">
        {list.map((b) => (
          <BookingCard key={b.id} booking={b} role="owner" busy={busyId === b.id} onAction={handleAction} />
        ))}
      </div>
    </>
  );
}