import { MapContainer, TileLayer, Marker, Polyline, Popup } from "react-leaflet";

export default function RouteMap({ from, to, routeCoords }) {
  const center = from ?? { lat: 47.5615, lng: -52.7126 };

  return (
    <div style={{ height: 420, borderRadius: 12, overflow: "hidden", border: "1px solid #eee" }}>
      <MapContainer center={center} zoom={14} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {from && (
          <Marker position={from}>
            <Popup>Your location</Popup>
          </Marker>
        )}

        {to && (
          <Marker position={to}>
            <Popup>Destination</Popup>
          </Marker>
        )}

        {routeCoords?.length > 1 && <Polyline positions={routeCoords} />}
      </MapContainer>
    </div>
  );
}