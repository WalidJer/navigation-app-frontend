import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { navigationApi } from "../api/navigationApi";

export default function Home() {
  const nav = useNavigate();

  // backend: checking | ok | down
  const [backend, setBackend] = useState("checking");

  // geo permission: checking | granted | prompt | denied | unknown
  const [geo, setGeo] = useState("checking");

  useEffect(() => {
    // Backend health
    navigationApi
      .health()
      .then(() => setBackend("ok"))
      .catch(() => setBackend("down"));

    // Location permission (best-effort)
    let cancelled = false;

    async function checkPermission() {
      try {
        if (!navigator.permissions?.query) {
          if (!cancelled) setGeo("unknown");
          return;
        }

        const p = await navigator.permissions.query({ name: "geolocation" });

        // ensure state updates happen async
        await Promise.resolve();

        if (cancelled) return;
        setGeo(p.state); // "granted" | "prompt" | "denied"

        // keep updated if user changes it in browser settings
        p.onchange = async () => {
          await Promise.resolve();
          if (!cancelled) setGeo(p.state);
        };
      } catch {
        if (!cancelled) setGeo("unknown");
      }
    }

    checkPermission();

    return () => {
      cancelled = true;
    };
  }, []);

  const backendBadge = (() => {
    if (backend === "checking")
      return { text: "Checking backend…", bg: "#f3f3f3", fg: "#111" };
    if (backend === "ok")
      return { text: "Backend Connected ✅", bg: "#e7f7ee", fg: "#0b6b2b" };
    return { text: "Backend Down ❌", bg: "#fdecec", fg: "#9b1c1c" };
  })();

  const geoBadge = (() => {
    if (geo === "checking")
      return { text: "Checking location permission…", bg: "#f3f3f3", fg: "#111" };
    if (geo === "granted")
      return { text: "Location Allowed ✅", bg: "#e7f7ee", fg: "#0b6b2b" };
    if (geo === "prompt")
      return { text: "Location will be requested on Start", bg: "#fff7e6", fg: "#8a5a00" };
    if (geo === "denied")
      return { text: "Location Blocked ❌ (enable in Chrome)", bg: "#fdecec", fg: "#9b1c1c" };
    return { text: "Location permission unknown", bg: "#f3f3f3", fg: "#111" };
  })();

  const canStart = backend === "ok"; // we can still navigate, but it's nicer to require backend ok

  return (
    <div style={{ maxWidth: 900 }}>
      <div
        style={{
          padding: 18,
          borderRadius: 14,
          border: "1px solid #eee",
          background: "#fff",
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: 6 }}>Real-Time Navigation</h3>
        <p style={{ marginTop: 0, opacity: 0.8, lineHeight: 1.5 }}>
          Enter a destination and see your <strong>route</strong>, <strong>distance</strong>, and{" "}
          <strong>ETA</strong> update as your location changes.
        </p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
          <Badge {...backendBadge} />
          <Badge {...geoBadge} />
        </div>

        {geo === "denied" && (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 12,
              border: "1px solid #fde1e1",
              background: "#fff5f5",
              color: "#7a1212",
              lineHeight: 1.5,
            }}
          >
            <strong>Location is blocked.</strong>
            <div style={{ marginTop: 6, fontSize: 13 }}>
              In Chrome: click the 🔒 icon in the address bar → <em>Site settings</em> →{" "}
              <em>Location</em> → Allow. Then refresh.
            </div>
          </div>
        )}

        <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={() => nav("/navigate")}
            disabled={!canStart}
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              border: "1px solid #111",
              background: canStart ? "#111" : "#777",
              color: "#fff",
              cursor: canStart ? "pointer" : "not-allowed",
              minWidth: 180,
            }}
          >
            Start Navigation
          </button>

          <button
            onClick={() => nav("/debug")}
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              border: "1px solid #ccc",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            Debug
          </button>
        </div>
      </div>

      <div style={{ marginTop: 16, padding: 16, border: "1px solid #eee", borderRadius: 14 }}>
        <h4 style={{ marginTop: 0 }}>What you can demo</h4>
        <ul style={{ margin: 0, lineHeight: 1.7 }}>
          <li>Type an address (or pick from history)</li>
          <li>Geocoding + saving history to Postgres</li>
          <li>Route line + markers on the map</li>
          <li>Remaining distance + ETA updating (watch position / reroute)</li>
        </ul>
      </div>
    </div>
  );
}

function Badge({ text, bg, fg }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "6px 10px",
        borderRadius: 999,
        background: bg,
        color: fg,
        fontSize: 13,
        border: "1px solid rgba(0,0,0,0.06)",
      }}
    >
      {text}
    </span>
  );
}