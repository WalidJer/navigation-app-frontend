import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { navigationApi } from "../api/navigationApi";

export default function Home() {
  const nav = useNavigate();
  const [status, setStatus] = useState("checking"); // checking | ok | down

  useEffect(() => {
    navigationApi.health()
      .then(() => setStatus("ok"))
      .catch(() => setStatus("down"));
  }, []);

  const badge = (() => {
    if (status === "checking") return { text: "Checking backend…", bg: "#f3f3f3", fg: "#111" };
    if (status === "ok") return { text: "Backend Connected ✅", bg: "#e7f7ee", fg: "#0b6b2b" };
    return { text: "Backend Down ❌", bg: "#fdecec", fg: "#9b1c1c" };
  })();

  return (
    <div style={{ maxWidth: 820 }}>
      
      <p style={{ marginTop: 0, opacity: 0.8 }}>
        Enter a destination and get distance, ETA, and a route map in real time.
      </p>

      <div
        style={{
          display: "inline-block",
          padding: "6px 10px",
          borderRadius: 999,
          background: badge.bg,
          color: badge.fg,
          fontSize: 13,
          marginTop: 8,
        }}
      >
        {badge.text}
      </div>

      <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          onClick={() => nav("/navigate")}
          style={{
            padding: "12px 16px",
            borderRadius: 10,
            border: "1px solid #111",
            background: "#111",
            color: "#fff",
            cursor: "pointer",
            minWidth: 180,
          }}
        >
          Start Navigation
        </button>

        <button
          onClick={() => nav("/debug")}
          style={{
            padding: "12px 16px",
            borderRadius: 10,
            border: "1px solid #ccc",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          Debug
        </button>
      </div>

      <div style={{ marginTop: 22, padding: 14, border: "1px solid #eee", borderRadius: 10 }}>
        <h4 style={{ marginTop: 0 }}>What you can do</h4>
        <ul style={{ marginBottom: 0 }}>
          <li>Save destination history</li>
          <li>See route distance + duration</li>
          <li>Track remaining distance + ETA</li>
          <li>View route on a live map</li>
        </ul>
      </div>
    </div>
  );
}