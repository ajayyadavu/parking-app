import { useState } from "react";
import { MapPin, Search } from "lucide-react";
import { searchPlaces } from "../utils/geo";
import { useToast } from "../context/ToastContext";

export default function PlaceSearch({ onSelect, placeholder = "Search place, e.g. Connaught Place Delhi" }) {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const search = async (e) => {
    e.preventDefault();
    if (query.trim().length < 3) return toast.error("Type at least 3 letters");
    setLoading(true);
    try {
      const found = await searchPlaces(query.trim());
      setResults(found);
      if (found.length === 0) toast.error("Place not found. Try adding the city name.");
    } catch {
      toast.error("Could not search right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const pick = (place) => {
    onSelect(place);
    setResults([]);
    setQuery(place.name.split(",").slice(0, 2).join(","));
  };

  return (
    <div className="place-search">
      <div className="search-row">
        <div className="input-icon">
          <Search size={16} />
          <input
            className="input"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search(e)}
          />
        </div>
        <button type="button" className="btn btn-primary" onClick={search} disabled={loading}>
          {loading ? "..." : "Search"}
        </button>
      </div>

      {results.length > 0 && (
        <ul className="place-results">
          {results.map((r, i) => (
            <li key={i}>
              <button type="button" onClick={() => pick(r)}>
                <MapPin size={15} />
                <span>{r.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}