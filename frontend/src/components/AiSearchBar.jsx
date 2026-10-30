import { useState } from "react";
import { Sparkles } from "lucide-react";

const EXAMPLES = [
  "mujhe Connaught Place ke paas 2 ghante ke liye car parking chahiye",
  "bike parking near me for 1 hour",
  "Karol Bagh me car parking, 2 km ke andar",
];

export default function AiSearchBar({ onSubmit, loading }) {
  const [text, setText] = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (text.trim().length >= 3) onSubmit(text.trim());
  };

  return (
    <div className="card ai-bar">
      <div className="ai-head">
        <span className="ai-icon"><Sparkles size={16} /></span>
        <strong>Smart search</strong>
        <span className="muted">Hindi, Hinglish ya English me likho</span>
      </div>

      <form className="search-row" onSubmit={submit}>
        <input
          className="input"
          placeholder="e.g. 2 ghante ke liye car parking chahiye Connaught Place ke paas"
          value={text}
          maxLength={300}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="btn btn-primary" disabled={loading || text.trim().length < 3}>
          {loading ? "Thinking..." : "Find"}
        </button>
      </form>

      <div className="chips">
        {EXAMPLES.map((ex) => (
          <button key={ex} type="button" className="chip chip-btn" onClick={() => setText(ex)}>
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
