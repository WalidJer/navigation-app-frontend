import { Link } from "react-router-dom";

export default function Layout({ children }) {
  return (
    <div style={{ fontFamily: "system-ui, Arial", maxWidth: 900, margin: "0 auto", padding: 16 }}>
      <header style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Navigation App</h2>
        <nav style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
          <Link to="/">Home</Link>
          <Link to="/navigate">Navigate</Link>
        </nav>
      </header>

      <main>{children}</main>
    </div>
  );
}