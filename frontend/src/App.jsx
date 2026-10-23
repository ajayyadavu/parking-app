import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import AddParkingSpot from "./pages/AddParkingSpot";
import AdminPanel from "./pages/AdminPanel";
import Login from "./pages/Login";
import MyBookings from "./pages/MyBookings";
import OwnerDashboard from "./pages/OwnerDashboard";
import Register from "./pages/Register";
import SearchParking from "./pages/SearchParking";

const HOME = { driver: "/search", owner: "/dashboard", admin: "/admin" };

function RoleHome() {
  const { user } = useAuth();
  return <Navigate to={HOME[user.role] || "/login"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<RoleHome />} />

          <Route element={<ProtectedRoute roles={["driver"]} />}>
            <Route path="/search" element={<SearchParking />} />
            <Route path="/bookings" element={<MyBookings />} />
          </Route>

          <Route element={<ProtectedRoute roles={["owner"]} />}>
            <Route path="/dashboard" element={<OwnerDashboard />} />
            <Route path="/spots/new" element={<AddParkingSpot />} />
          </Route>

          <Route element={<ProtectedRoute roles={["admin"]} />}>
            <Route path="/admin" element={<AdminPanel />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}