import { Link, NavLink } from "react-router-dom";

export default function Layout({ children }) {
  const linkStyle = ({ isActive }) => ({
    textDecoration: "none",
    padding: "6px 10px",
    borderRadius: 8,
    color: isActive ? "#fff" : "#111",
    background: isActive ? "#111" : "transparent",
    border: isActive ? "1px solid #111" : "1px solid transparent",
  });

  return (
    <div
      style={{
        fontFamily: "system-ui, Arial",
        maxWidth: 900,
        margin: "0 auto",
        padding: 16,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: 20,
          paddingBottom: 12,
          borderBottom: "1px solid #eee",
        }}
      >
        {/* App Brand */}
        <h2 style={{ margin: 0 }}>🧭 Navigation App</h2>

        {/* Main Navigation */}
        <nav
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <NavLink to="/" style={linkStyle}>
            Home
          </NavLink>

          <NavLink to="/navigate" style={linkStyle}>
            Navigate
          </NavLink>

          {/* Dev / Debug link (intentionally subtle) */}
          <Link
            to="/debug"
            style={{
              marginLeft: 6,
              fontSize: 13,
              opacity: 0.6,
              textDecoration: "none",
            }}
            title="Developer tools"
          >
            Debug
          </Link>
        </nav>
      </header>

      <main>{children}</main>
    </div>
  );
}