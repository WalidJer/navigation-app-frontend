import { useEffect, useState } from "react";
import { navigationApi } from "../api/navigationApi";

export default function Debug() {
  const [health, setHealth] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadAll() {
    setLoading(true);
    setError("");

    try {
      const h = await navigationApi.health();
      setHealth(h);

      const a = await navigationApi.getAddresses();
      setAddresses(Array.isArray(a) ? a : a.items || []);
    } catch (e) {
      setError(e.message || "Debug request failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  return (
    <div style={{ maxWidth: 820 }}>
      <h3 style={{ marginTop: 0 }}>Debug Panel</h3>
      <p style={{ opacity: 0.8 }}>
        Developer utilities to verify backend connectivity and API behavior.
      </p>

      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}

      {loading && !error && <p>Loading debug data…</p>}

      {!loading && !error && (
        <>
          {/* Backend health */}
          <div style={{ marginTop: 16, padding: 14, border: "1px solid #eee", borderRadius: 10 }}>
            <h4 style={{ marginTop: 0 }}>Backend Health</h4>
            <pre style={{ background: "#f6f8fa", padding: 12, borderRadius: 8 }}>
              {JSON.stringify(health, null, 2)}
            </pre>
          </div>

          {/* Address stats */}
          <div style={{ marginTop: 16, padding: 14, border: "1px solid #eee", borderRadius: 10 }}>
            <h4 style={{ marginTop: 0 }}>Saved Addresses</h4>
            <p>
              Total saved destinations:{" "}
              <strong>{addresses.length}</strong>
            </p>

            {addresses.length > 0 && (
              <ul style={{ fontSize: 13, opacity: 0.85 }}>
                {addresses.slice(0, 5).map((a) => (
                  <li key={a.id}>
                    {a.address || a.address_text}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Actions */}
          <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
            <button
              onClick={loadAll}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid #ccc",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              Refresh Debug Data
            </button>
          </div>
        </>
      )}
    </div>
  );
}