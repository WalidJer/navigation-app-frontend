import { http } from "./http";

export const navigationApi = {
  health: () => http("/api/health"),

  
  getAddresses: () => http("/api/addresses"),

  navigate: (payload) =>
  http("/api/navigate", {
    method: "POST",
    body: JSON.stringify(payload),
  }),
};