import { useEffect, useMemo, useRef, useState } from "react";
import { navigationApi } from "../api/navigationApi";
import { formatDateTime } from "../utils/format";
import RouteMap from "../components/RouteMap";

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

function isValidCoord(n) {
  return typeof n === "number" && Number.isFinite(n);
}

// small haversine helper (meters)
function haversineMeters(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;

  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);

  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);

  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
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

  const [activeFrom, setActiveFrom] = useState(null);
  const [activeTo, setActiveTo] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]); // Leaflet coords: [lat,lng]

  // Demo Mode
  const [demoMode, setDemoMode] = useState(true);
  const [demoStep, setDemoStep] = useState(5); // how many points to jump per click
  const demoIndexRef = useRef(0);

  // geolocation watch
  const watchIdRef = useRef(null);
  const lastMetricsAtRef = useRef(0);

  // reroute controls
  const lastRerouteAtRef = useRef(0);
  const lastRerouteFromRef = useRef(null);

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

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  const canNavigate = useMemo(
    () => address.trim().length > 0 && !submitting,
    [address, submitting]
  );

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

  function stopNavigation() {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    lastMetricsAtRef.current = 0;
    lastRerouteAtRef.current = 0;
    lastRerouteFromRef.current = null;

    demoIndexRef.current = 0;

    setNavError("");
    setNavResult(null);
    setActiveFrom(null);
    setActiveTo(null);
    setRouteCoords([]);
  }

  function setRouteFromGeoJson(routeGeometry) {
    const coords = routeGeometry?.coordinates || [];
    // GeoJSON: [lng,lat] -> Leaflet: [lat,lng]
    setRouteCoords(coords.map(([lng, lat]) => [lat, lng]));
    demoIndexRef.current = 0;
  }

  async function updateLiveMetrics(from, to) {
    const metrics = await navigationApi.navMetrics({
      from,
      to,
      speedMps: Number(speedMps),
    });

    setNavResult((prev) =>
      prev
        ? {
            ...prev,
            live: {
              remainingMeters: metrics.remainingMeters,
              remainingKm: metrics.remainingKm,
              etaSeconds: metrics.etaSeconds,
              etaMinutes: metrics.etaMinutes,
            },
          }
        : prev
    );
  }

  async function rerouteNow(from, to) {
    const route = await navigationApi.route({ from, to });

    setNavResult((prev) =>
      prev
        ? {
            ...prev,
            route: {
              distanceMeters: route.distanceMeters,
              durationSeconds: route.durationSeconds,
              distanceKm: route.distanceKm,
              durationMin: route.durationMin,
              geometry: route.geometry,
            },
          }
        : prev
    );

    setRouteFromGeoJson(route.geometry);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setNavError("");
    setNavResult(null);

    const trimmed = address.trim();
    if (!trimmed) return;

    setSubmitting(true);
    try {
      // 1) choose starting "from"
      const from = demoMode
        ? // Nice default start for demo if browser location is unavailable:
          (await getCurrentLocation().catch(() => ({
            lat: 47.5615,
            lng: -52.7126,
          })))
        : await getCurrentLocation();

      if (!from || !isValidCoord(from.lat) || !isValidCoord(from.lng)) {
        throw new Error("Invalid current location.");
      }

      // 2) call /api/navigate
      const result = await navigationApi.navigate({
        address: trimmed,
        from,
        speedMps: Number(speedMps),
      });

      setNavResult(result);

      const dest = result.destination;
      const to = { lat: dest.latitude, lng: dest.longitude };

      setActiveFrom(from);
      setActiveTo(to);

      setRouteFromGeoJson(result.route?.geometry);

      // reset reroute trackers for this session
      lastRerouteAtRef.current = Date.now();
      lastRerouteFromRef.current = from;

      // 3) if not demo mode, start watchPosition
      if (!demoMode) {
        if (watchIdRef.current != null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
        }

        watchIdRef.current = navigator.geolocation.watchPosition(
          async (pos) => {
            const newFrom = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setActiveFrom(newFrom);

            // throttle metrics calls
            const now = Date.now();
            if (now - lastMetricsAtRef.current >= 2000) {
              lastMetricsAtRef.current = now;
              try {
                await updateLiveMetrics(newFrom, to);
              } catch {
                // ignore metrics errors
              }
            }

            // optional auto reroute
            const lastFrom = lastRerouteFromRef.current;
            const moved = lastFrom ? haversineMeters(lastFrom, newFrom) : 0;
            const timeSince = now - lastRerouteAtRef.current;

            const MOVED_THRESHOLD_METERS = 30;
            const MIN_REROUTE_INTERVAL_MS = 10000;

            if (moved >= MOVED_THRESHOLD_METERS && timeSince >= MIN_REROUTE_INTERVAL_MS) {
              try {
                await rerouteNow(newFrom, to);
                lastRerouteAtRef.current = now;
                lastRerouteFromRef.current = newFrom;
              } catch {
                //
              }
            }
          },
          () => {},
          { enableHighAccuracy: true, maximumAge: 1000 }
        );
      } else {
        // Demo Mode: make sure no watch is running
        if (watchIdRef.current != null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
      }

      await loadHistory();
    } catch (e2) {
      setNavError(e2.message || "Navigate request failed.");
    } finally {
      setSubmitting(false);
    }
  }

  // Demo: move along route line by jumping forward N points
  async function simulateMove() {
    if (!demoMode) return;
    if (!navResult || !activeTo) return;
    if (!routeCoords || routeCoords.length < 2) return;

    // current index -> next index
    const currentIndex = demoIndexRef.current;
    const nextIndex = Math.min(currentIndex + Number(demoStep), routeCoords.length - 1);
    demoIndexRef.current = nextIndex;

    const [lat, lng] = routeCoords[nextIndex];
    const newFrom = { lat, lng };

    setActiveFrom(newFrom);

    // update metrics immediately (no throttle needed)
    try {
      await updateLiveMetrics(newFrom, activeTo);
    } catch {
      //
    }


  }

  const navActive = !!(activeFrom && activeTo && navResult);

  return (
    <div>
      <h3>Destination Entry</h3>
      <p>Enter a destination address and start navigation.</p>

      {/* Demo Mode controls */}
      <div
        style={{
          marginTop: 10,
          padding: 12,
          borderRadius: 10,
          border: "1px solid #eee",
          background: "#fafafa",
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <label style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={demoMode}
            onChange={(e) => setDemoMode(e.target.checked)}
          />
          <strong>Demo Mode</strong>
        </label>

        <span style={{ fontSize: 12, opacity: 0.75 }}>
          Simulate movement along the route (great for laptop demos).
        </span>

        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
          <label style={{ fontSize: 12, opacity: 0.8 }}>Step:</label>
          <input
            type="number"
            min="1"
            step="1"
            value={demoStep}
            onChange={(e) => setDemoStep(e.target.value)}
            style={{ width: 80, padding: 6, borderRadius: 8, border: "1px solid #ccc" }}
            disabled={!demoMode}
          />
          <button
            type="button"
            onClick={simulateMove}
            disabled={!demoMode || !navActive}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #ccc",
              background: demoMode && navActive ? "#fff" : "#f3f3f3",
              cursor: demoMode && navActive ? "pointer" : "not-allowed",
            }}
          >
            Simulate Move
          </button>
        </div>
      </div>

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

          <button
            type="button"
            onClick={stopNavigation}
            disabled={!navActive}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid #ccc",
              background: navActive ? "#fff" : "#f3f3f3",
              cursor: navActive ? "pointer" : "not-allowed",
              minWidth: 120,
            }}
          >
            Stop
          </button>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ fontSize: 14, opacity: 0.9 }}>Speed (m/s):</label>
          <input
            type="number"
            step="0.1"
            min="0.5"
            value={speedMps}
            onChange={(e) => setSpeedMps(e.target.value)}
            style={{ width: 120, padding: 8, borderRadius: 8, border: "1px solid #ccc" }}
          />
          <span style={{ fontSize: 12, opacity: 0.7 }}>(4 m/s ≈ fast walk / light jog)</span>

          <button
            type="button"
            disabled={!navActive}
            onClick={() => rerouteNow(activeFrom, activeTo)}
            style={{
              marginLeft: "auto",
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #ccc",
              background: navActive ? "#fff" : "#f3f3f3",
              cursor: navActive ? "pointer" : "not-allowed",
            }}
          >
            Re-route now
          </button>
        </div>
      </form>

      {navError && <p style={{ marginTop: 10, color: "crimson" }}>Error: {navError}</p>}

      {navResult && (
        <div style={{ marginTop: 14, padding: 14, border: "1px solid #eee", borderRadius: 10 }}>
          <h4 style={{ marginTop: 0 }}>Navigation Summary</h4>

          <div style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 700 }}>Destination: {navResult.destination?.address}</div>
            {navResult.destination?.displayName && (
              <div style={{ fontSize: 12, opacity: 0.8 }}>{navResult.destination.displayName}</div>
            )}
            <div style={{ fontSize: 12, opacity: 0.75 }}>
              Cached: {navResult.destination?.cached ? "true" : "false"}
            </div>
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <div>
              <strong>Route Distance:</strong> {formatKm(navResult.route?.distanceKm)}
            </div>
            <div>
              <strong>Route Duration:</strong> {formatMin(navResult.route?.durationMin)}
            </div>
            <div>
              <strong>Remaining:</strong> {formatKm(navResult.live?.remainingKm)}
            </div>
            <div>
              <strong>ETA:</strong>{" "}
              {navResult.live?.etaMinutes != null ? formatMin(navResult.live.etaMinutes) : "N/A"}
            </div>
          </div>

          {activeFrom && activeTo && (
            <div style={{ marginTop: 14 }}>
              <h4 style={{ margin: "10px 0" }}>Map</h4>
              <RouteMap from={activeFrom} to={activeTo} routeCoords={routeCoords} />
            </div>
          )}
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
      {historyError && <p style={{ marginTop: 10, color: "crimson" }}>Error: {historyError}</p>}

      {!loadingHistory && !historyError && history.length === 0 && (
        <p style={{ marginTop: 10 }}>No saved addresses yet. Start navigation to save your first one.</p>
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
              <div style={{ fontWeight: 600 }}>{item.address || item.address_text}</div>
              <div style={{ fontSize: 12, opacity: 0.75 }}>Saved: {formatDateTime(item.created_at)}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}