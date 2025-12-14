import { useEffect, useMemo, useState } from "react";
import { navigationApi } from "../api/navigationApi";
import { formatDateTime } from "../utils/format";

function normalizeAddresses(payload) {
  // Supports both:
  // 1) [ ... ]
  // 2) { items: [ ... ] }
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.items)) return payload.items;
  return [];
}

export default function Navigate() {
  const [address, setAddress] = useState("");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadHistory() {
    setLoading(true);
    setError("");
    try {
      const data = await navigationApi.getAddresses();
      setHistory(normalizeAddresses(data));
    } catch (e) {
      setError(e.message || "Failed to load address history.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  const canNavigate = useMemo(() => address.trim().length > 0, [address]);

  function onSubmit(e) {
    e.preventDefault();
    // Step 3: will call POST /api/navigate and open map view
    alert(`Step 3 will navigate to: ${address}`);
  }

  return (
    <div>
      <h3>Destination Entry</h3>
      <p>Enter a destination address, and pick from previous addresses.</p>

      <form onSubmit={onSubmit} style={{ display: "flex", gap: 8, margin: "16px 0" }}>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder='e.g., "123 Main St, St. John’s, NL"'
          style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
        />
        <button
          type="submit"
          disabled={!canNavigate}
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #333",
            background: canNavigate ? "#111" : "#777",
            color: "#fff",
            cursor: canNavigate ? "pointer" : "not-allowed"
          }}
        >
          Navigate To
        </button>
      </form>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <h4 style={{ margin: 0 }}>Address History</h4>
        <button
          onClick={loadHistory}
          style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #ccc", cursor: "pointer" }}
        >
          Refresh
        </button>
      </div>

      {loading && <p style={{ marginTop: 10 }}>Loading history…</p>}
      {error && <p style={{ marginTop: 10, color: "crimson" }}>Error: {error}</p>}

      {!loading && !error && history.length === 0 && (
        <p style={{ marginTop: 10 }}>No saved addresses yet. (Step 3 will start saving them.)</p>
      )}

      {!loading && !error && history.length > 0 && (
        <div style={{ marginTop: 10, border: "1px solid #eee", borderRadius: 10 }}>
          {history.map((item) => (
            <button
              key={item.id}
              onClick={() => setAddress(item.address || item.address_text || "")}
              style={{
                width: "100%",
                textAlign: "left",
                padding: 12,
                border: "none",
                borderBottom: "1px solid #eee",
                background: "#fff",
                cursor: "pointer"
              }}
            >
              <div style={{ fontWeight: 600 }}>
                {item.address || item.address_text}
              </div>
              <div style={{ fontSize: 12, opacity: 0.75 }}>
                Saved: {formatDateTime(item.created_at)}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}