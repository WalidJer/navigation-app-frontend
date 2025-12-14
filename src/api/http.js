const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

export async function http(path, options = {}) {
  const url = `${baseUrl}${path}`;

  const resp = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const contentType = resp.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await resp.json()
    : await resp.text();

  if (!resp.ok) {
    const message =
      data?.error?.message || data?.message || `Request failed (${resp.status})`;
    throw new Error(message);
  }

  return data;
}