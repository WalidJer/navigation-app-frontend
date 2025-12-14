import { http } from "./http";

export const navigationApi = {
  health: () => http("/api/health"),
};