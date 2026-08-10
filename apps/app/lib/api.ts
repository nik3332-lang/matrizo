import { createApiClient } from '@matrizo/shared';

import { useAuthStore } from '../stores/auth';

// For native devices/simulators, localhost won't reach your dev machine —
// set EXPO_PUBLIC_API_URL (e.g. in a .env file) to your machine's LAN IP,
// such as http://192.168.1.23:8787/api/v1. Works as-is for web.
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8787/api/v1';

export const api = createApiClient({
  baseUrl: BASE_URL,
  getAccessToken: () => useAuthStore.getState().accessToken,
});
