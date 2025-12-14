import { useEffect, useState } from "react";
import { navigationApi } from "../api/navigationApi";

export default function Home() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    navigationApi.health()
      .then(setHealth)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <h3>Backend Connection Test</h3>
      <p>This page confirms the frontend can reach the backend.</p>

      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}

      {health ? (
        <pre style={{ background: "#f6f8fa", padding: 12, borderRadius: 8 }}>
          {JSON.stringify(health, null, 2)}
        </pre>
      ) : (
        !error && <p>Loading...</p>
      )}
    </div>
  );
}