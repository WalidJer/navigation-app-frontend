import { http } from "./http";

export const navigationApi = {
  health: () => http("/api/health"),

  
  getAddresses: () => http("/api/addresses"),

  navigate: (payload) =>
  http("/api/navigate", {
    method: "POST",
    body: JSON.stringify(payload),
  }),

  navMetrics: (payload) =>
  http("/api/nav/metrics", {
    method: "POST",
    body: JSON.stringify(payload),
  }),
};