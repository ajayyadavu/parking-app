import { useEffect, useState } from "react";
import { CalendarCheck, Car, Clock, IndianRupee, MapPin, Users, Wallet } from "lucide-react";
import api from "../services/api";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";
import { useToast } from "../context/ToastContext";
import { usePolling } from "../utils/hooks";
import { dateTime, errorMessage, money } from "../utils/format";

export default function AdminPanel() {
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [rate, setRate] = useState("");
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("bookings");

  const load = () =>
    Promise.all([api.get("/admin/stats"), api.get("/admin/users"), api.get("/admin/bookings")])
      .then(([s, u, b]) => {
        setStats(s.data);
        setUsers(u.data);
        setBookings(b.data);
      })
      .catch(() => {});

  usePolling(load, 8000);

  // Pehli baar rate input me current rate bhar do
  useEffect(() => {
    if (stats && rate === "") setRate(String(stats.price_per_hour));
  }, [stats, rate]);

  const saveRate = async (e) => {
    e.preventDefault();
    const value = Number(rate);
    if (!value || value <= 0) return toast.error("Enter a valid rate");
    setSaving(true);
    try {
      await api.put("/admin/settings", { price_per_hour: value });
      toast.success(`Hourly rate updated to ${money(value)}`);
      await load();
    } catch (err) {
      toast.error(errorMessage(err, "Could not update rate"));
    } finally {
      setSaving(false);
    }
  };

  if (!stats) {
    return (
      <>
        <div className="page-head"><div><h1>Admin panel</h1></div></div>
        <div className="skeleton" />
      </>
    );
  }

  const unchanged = Number(rate) === stats.price_per_hour;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Admin panel</h1>
          <p>Platform overview, pricing and activity.</p>
        </div>
      </div>

      <div className="grid-stats">
        <StatCard icon={Wallet} tone="green" label="Total revenue" value={money(stats.revenue)} />
        <StatCard icon={CalendarCheck} label="Total bookings" value={stats.total_bookings} />
        <StatCard icon={Users} label="Drivers / Owners" value={`${stats.drivers} / ${stats.owners}`} />
        <StatCard icon={MapPin} tone="amber" label="Active spots" value={`${stats.active_spots} of ${stats.total_spots}`} />
      </div>

      <div className="admin-grid">
        <form className="card card-pad form" onSubmit={saveRate}>
          <div>
            <div className="card-title" style={{ marginBottom: 4 }}>Parking rate</div>
            <p className="muted">
              Current rate: <strong>{money(stats.price_per_hour)} / hour</strong>. The new rate applies
              to new requests only. Existing bookings keep the rate they were created with.
            </p>
          </div>
          <div className="field">
            <label>Price per hour (₹)</label>
            <div className="input-icon">
              <IndianRupee size={16} />
              <input
                className="input"
                type="number"
                min="1"
                max="10000"
                step="1"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                required
              />
            </div>
          </div>
          <button className="btn btn-primary" disabled={saving || unchanged}>
            {saving ? "Saving..." : "Update rate"}
          </button>
        </form>

        <div className="card card-pad">
          <div className="card-title">Bookings breakdown</div>
          <div className="breakdown">
            <div><i className="dot amber" /> Pending <strong>{stats.pending}</strong></div>
            <div><i className="dot green" /> Parked now <strong>{stats.accepted}</strong></div>
            <div><i className="dot blue" /> Completed <strong>{stats.completed}</strong></div>
            <div><i className="dot red" /> Rejected / cancelled <strong>{stats.closed}</strong></div>
          </div>
        </div>
      </div>

      <div className="tabs" style={{ marginTop: 24 }}>
        <button className={`tab ${tab === "bookings" ? "on" : ""}`} onClick={() => setTab("bookings")}>
          <Clock size={15} /> Bookings
        </button>
        <button className={`tab ${tab === "users" ? "on" : ""}`} onClick={() => setTab("users")}>
          <Users size={15} /> Users
        </button>
      </div>

      <div className="card table-wrap">
        {tab === "bookings" ? (
          <table className="data">
            <thead>
              <tr>
                <th>#</th>
                <th>Driver</th>
                <th>Spot</th>
                <th>Owner</th>
                <th>Status</th>
                <th>Distance</th>
                <th>Rate</th>
                <th>Amount</th>
                <th>Requested</th>
              </tr>
            </thead>
            <tbody>
              {bookings.length === 0 && (
                <tr><td colSpan={9} className="muted center-cell">No bookings yet.</td></tr>
              )}
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td>{b.id}</td>
                  <td>{b.driver_name}</td>
                  <td>{b.spot_title}</td>
                  <td>{b.owner_name}</td>
                  <td><StatusBadge status={b.status} /></td>
                  <td>{b.distance_km} km</td>
                  <td>{money(b.price_per_hour)}/hr</td>
                  <td>{b.total_amount != null ? money(b.total_amount) : "-"}</td>
                  <td>{dateTime(b.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td>
                    <span className="cell-user">
                      <span className="avatar sm">{u.name.charAt(0).toUpperCase()}</span>
                      {u.name}
                    </span>
                  </td>
                  <td>{u.email}</td>
                  <td>{u.phone}</td>
                  <td>
                    <span className={`badge role-${u.role}`}>
                      {u.role === "driver" && <Car size={12} />}
                      {u.role}
                    </span>
                  </td>
                  <td>{dateTime(u.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}