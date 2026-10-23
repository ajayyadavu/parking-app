import { NavLink, useNavigate } from "react-router-dom";
import { CalendarCheck, Car, LayoutDashboard, LogOut, Plus, Search, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const LINKS = {
  driver: [
    { to: "/search", label: "Find parking", icon: Search },
    { to: "/bookings", label: "My bookings", icon: CalendarCheck },
  ],
  owner: [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/spots/new", label: "Add spot", icon: Plus },
  ],
  admin: [{ to: "/admin", label: "Admin", icon: ShieldCheck }],
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="app-header">
      <div className="header-inner">
        <div className="brand">
          <span className="brand-mark"><Car size={20} /></span>
          ParkEasy
        </div>

        <nav className="nav">
          {(LINKS[user.role] || []).map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to}>
              <Icon size={17} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="header-right">
          <div className="user-chip">
            <div className="avatar">{user.name.charAt(0).toUpperCase()}</div>
            <div className="user-meta">
              <strong>{user.name}</strong>
              <span className="role-tag">{user.role}</span>
            </div>
          </div>
          <button className="icon-btn" onClick={handleLogout} title="Logout">
            <LogOut size={17} />
          </button>
        </div>
      </div>
    </header>
  );
}