import { Navigation, Sparkles } from "lucide-react";
import { money } from "../utils/format";

export default function AiPick({ pick, duration, onRequest, onSelect, requesting }) {
  if (!pick) return null;

  if (!pick.spot) {
    return (
      <div className="card ai-pick">
        <div className="ai-head">
          <span className="ai-icon"><Sparkles size={16} /></span>
          <strong>Recommendation</strong>
        </div>
        <p className="muted">{pick.reason}</p>
      </div>
    );
  }

  const { spot } = pick;
  return (
    <div className="card ai-pick" onClick={() => onSelect(spot)}>
      <div className="ai-head">
        <span className="ai-icon"><Sparkles size={16} /></span>
        <strong>{pick.ai_generated ? "Top pick" : "Closest option"}</strong>
        <span className="badge badge-completed">Best match</span>
      </div>

      <h3 className="ai-title">{spot.title}</h3>
      <p className="ai-reason">{pick.reason}</p>

      <div className="chips">
        <span className="chip">{spot.distance_km} km away</span>
        <span className="chip">{spot.available_slots} slots free</span>
        <span className="chip">
          ~{money(pick.estimated_cost)} for {duration} hr{duration === 1 ? "" : "s"}
        </span>
      </div>

      <button
        className="btn btn-primary btn-sm"
        disabled={requesting}
        onClick={(e) => {
          e.stopPropagation();
          onRequest(spot);
        }}
      >
        <Navigation size={15} />
        {requesting ? "Sending..." : "Request this spot"}
      </button>
    </div>
  );
}
