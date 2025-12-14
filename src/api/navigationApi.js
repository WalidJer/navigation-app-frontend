import { http } from "./http";

export const navigationApi = {
  health: () => http("/api/health"),
  
  // Address history
  getAddresses: () => http("/api/addresses"),
};