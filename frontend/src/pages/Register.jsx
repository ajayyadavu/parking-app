import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Car, MapPin } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import AuthShell from "../components/AuthShell";
import { useToast } from "../context/ToastContext";
import { errorMessage } from "../utils/format";

const ROLES = [
  { value: "driver", title: "I need parking", text: "Find and request nearby spots", icon: Car },
  { value: "owner", title: "I have space", text: "Rent out my parking space", icon: MapPin },
];

export default function Register() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "", role: "driver" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await register(form);
      toast.success("Account created. Please login.");
      navigate("/login");
    } catch (err) {
      setError(errorMessage(err, "Registration failed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell>
      <div className="auth-card">
        <h2>Create your account</h2>
        <p className="sub">It takes less than a minute.</p>

        <form className="form" onSubmit={handleSubmit}>
          {error && <div className="form-error">{error}</div>}

          <div className="role-picker">
            {ROLES.map(({ value, title, text, icon: Icon }) => (
              <button
                type="button"
                key={value}
                className={`role-option ${form.role === value ? "on" : ""}`}
                onClick={() => setForm({ ...form, role: value })}
              >
                <Icon size={20} />
                <strong>{title}</strong>
                <small>{text}</small>
              </button>
            ))}
          </div>

          <div className="form-grid">
            <div className="field">
              <label>Full name</label>
              <input className="input" value={form.name} onChange={set("name")} required />
            </div>
            <div className="field">
              <label>Phone</label>
              <input className="input" value={form.phone} onChange={set("phone")} required />
            </div>
          </div>
          <div className="field">
            <label>Email</label>
            <input className="input" type="email" value={form.email} onChange={set("email")} required />
          </div>
          <div className="field">
            <label>Password</label>
            <input className="input" type="password" placeholder="Minimum 6 characters" minLength={6} value={form.password} onChange={set("password")} required />
          </div>

          <button className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="muted" style={{ marginTop: 18, textAlign: "center" }}>
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </AuthShell>
  );
}