import { Car, MapPin, ShieldCheck, Zap } from "lucide-react";

export default function AuthShell({ children }) {
  return (
    <div className="auth-shell">
      <section className="auth-hero">
        <div className="brand light">
          <span className="brand-mark"><Car size={20} /></span>
          ParkEasy
        </div>

        <div>
          <h1>Find parking in seconds. Earn from your empty space.</h1>
          <p>
            ParkEasy connects drivers with nearby owners who have free parking space,
            with transparent hourly pricing and instant confirmation.
          </p>
          <ul className="auth-features">
            <li><span><MapPin size={18} /></span>Search nearby spots with live distance</li>
            <li><span><Zap size={18} /></span>Owners accept requests in real time</li>
            <li><span><ShieldCheck size={18} /></span>Simple pricing, no hidden charges</li>
          </ul>
        </div>

        <small>© ParkEasy</small>
      </section>

      <section className="auth-panel">{children}</section>
    </div>
  );
}