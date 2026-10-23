import { useAuth } from "../context/AuthContext";

export default function Home() {
  const { user } = useAuth();

  const messages = {
    driver: "Driver dashboard: yaha parking search hogi (Step 4).",
    owner: "Owner dashboard: yaha apni parking add karoge aur requests dekhoge (Step 4-5).",
    admin: "Admin panel: yaha rate change hoga (Step 6).",
  };

  return (
    <div className="card">
      <h2>Welcome, {user.name}!</h2>
      <p>{messages[user.role]}</p>
    </div>
  );
}