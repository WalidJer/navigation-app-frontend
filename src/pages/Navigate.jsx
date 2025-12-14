import { useEffect, useMemo, useState } from "react";
import { navigationApi } from "../api/navigationApi";
import { formatDateTime } from "../utils/format";

function normalizeAddresses(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.items)) return payload.items;
  return [];
}

function formatKm(km) {
  if (km == null) return "";
  return `${km.toFixed(2)} km`;
}

function formatMin(min) {
  if (min == null) return "";
  return `${min.toFixed(1)} min`;
}

export default function Navigate() {
  const [address, setAddress] = useState("");
  const [speedMps, setSpeedMps] = useState(4); 
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [navError, setNavError] = useState("");
  const [navResult, setNavResult] = useState(null);

  async function loadHistory() {
    setLoadingHistory(true);
    setHistoryError("");
    try {
      const data = await navigationApi.getAddresses();
      setHistory(normalizeAddresses(data));
    } catch (e) {
      setHistoryError(e.message || "Failed to load address history.");
    } finally {
      setLoadingHistory(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  const canNavigate = useMemo(() => address.trim().length > 0 && !submitting, [
    address,
    submitting,
  ]);

  function isValidCoord(n) {
    return typeof n === "number" && Number.isFinite(n);
  }

  function getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported in this browser."));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        (err) => {
          reject(
            new Error(
              err?.message ||
                "Failed to get your location. Please allow location permission."
            )
          );
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setNavError("");
    setNavResult(null);

    const trimmed = address.trim();
    if (!trimmed) return;

    setSubmitting(true);
    try {
      const from = await getCurrentLocation();
      if (!from || !isValidCoord(from.lat) || !isValidCoord(from.lng)) {
        throw new Error("Invalid current location.");
      }

      const payload = {
        address: trimmed,
        from,
        speedMps: Number(speedMps),
      };

      const result = await navigationApi.navigate(payload);
      setNavResult(result);

      // refresh history list so the new address appears
      await loadHistory();
    } catch (e2) {
      setNavError(e2.message || "Navigate request failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h3>Destination Entry</h3>
      <p>Enter a destination address and start navigation.</p>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10, margin: "16px 0" }}>
        <div style={{ display: "flex", gap: 8 }}>
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
              cursor: canNavigate ? "pointer" : "not-allowed",
              minWidth: 120,
            }}
          >
            {submitting ? "Starting..." : "Navigate To"}
          </button>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <label style={{ fontSize: 14, opacity: 0.9 }}>
            Speed (m/s):
          </label>
          <input
            type="number"
            step="0.1"
            min="0.5"
            value={speedMps}
            onChange={(e) => setSpeedMps(e.target.value)}
            style={{ width: 120, padding: 8, borderRadius: 8, border: "1px solid #ccc" }}
          />
          <span style={{ fontSize: 12, opacity: 0.7 }}>
            (4 m/s ≈ fast walk / light jog)
          </span>
        </div>
      </form>

      {navError && (
        <p style={{ marginTop: 10, color: "crimson" }}>
          Error: {navError}
        </p>
      )}

      {navResult && (
        <div style={{ marginTop: 14, padding: 14, border: "1px solid #eee", borderRadius: 10 }}>
          <h4 style={{ marginTop: 0 }}>Navigation Summary</h4>

          <div style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 700 }}>
              Destination: {navResult.destination?.address}
            </div>
            {navResult.destination?.displayName && (
              <div style={{ fontSize: 12, opacity: 0.8 }}>
                {navResult.destination.displayName}
              </div>
            )}
            <div style={{ fontSize: 12, opacity: 0.75 }}>
              Cached: {navResult.destination?.cached ? "true" : "false"}
            </div>
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <div>
              <strong>Route Distance:</strong>{" "}
              {formatKm(navResult.route?.distanceKm)}
            </div>
            <div>
              <strong>Route Duration:</strong>{" "}
              {formatMin(navResult.route?.durationMin)}
            </div>
            <div>
              <strong>Remaining:</strong>{" "}
              {formatKm(navResult.live?.remainingKm)}
            </div>
            <div>
              <strong>ETA:</strong>{" "}
              {navResult.live?.etaMinutes != null
                ? formatMin(navResult.live.etaMinutes)
                : "N/A"}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 18 }}>
        <h4 style={{ margin: 0 }}>Address History</h4>
        <button
          onClick={loadHistory}
          style={{
            padding: "6px 10px",
            borderRadius: 8,
            border: "1px solid #ccc",
            cursor: "pointer",
          }}
        >
          Refresh
        </button>
      </div>

      {loadingHistory && <p style={{ marginTop: 10 }}>Loading history…</p>}
      {historyError && (
        <p style={{ marginTop: 10, color: "crimson" }}>
          Error: {historyError}
        </p>
      )}

      {!loadingHistory && !historyError && history.length === 0 && (
        <p style={{ marginTop: 10 }}>
          No saved addresses yet. Start navigation to save your first one.
        </p>
      )}

      {!loadingHistory && !historyError && history.length > 0 && (
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
                cursor: "pointer",
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